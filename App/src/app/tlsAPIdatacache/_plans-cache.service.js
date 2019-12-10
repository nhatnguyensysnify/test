(function () {
    'use strict';
    angular.module('app.tlsApiDataCache').factory('plansCacheService', plansCacheService);
    /** @ngInject */
    function plansCacheService($rootScope, APP_CONFIG, firebaseDataRef, DataUtils, tlsApiDataCacheService, authService, notificationService) {
        var planRef = firebaseDataRef.child('membership-plans');

        var service = {
            refreshPlans: refreshPlans
        };

        return service;

        function refreshPlans() {
            //Check running status
            var currentUser = authService.getCurrentUser();
            return tlsApiDataCacheService.getStatusCache('tls-api-data-cache/plan').then(function (status) {
                if (!status || status.isProcessing) return false;

                //flag status is running
                return tlsApiDataCacheService.setStatusCache('tls-api-data-cache/plan', true);
            }).then(function (canStart) {
                console.log('refresh Plans: ' + canStart);
                if (!canStart) return;
                //Start job
                //
                tlsApiDataCacheService.updatedByCache('tls-api-data-cache/plan', currentUser);
                var apiJob = _getPlansTLS();
                var getRegionStatesJob = firebaseDataRef.child('membership-regions-state').once("value").then(snapshot => {
                    return snapshot.val();
                });
                //Await to retrieve data from TLS
                return Promise.all([apiJob, getRegionStatesJob]).then(function (results) {
                    if (!!!results || results.length == 0) return;

                    //Handle data
                    var plans = results[0];
                    var regionStates = results[1];
                    var plans2Ignore = [];
                    console.log('==================Plans API==================');
                    console.log('Plans TLS', plans.length);
                    plans = _.sortBy(plans, (item) => {
                        return item.region_id;
                    });

                    plans = _.groupBy(_.map(plans, item => {
                        console.log('Region id ' + item.region_id, regionStates[item.region_id]);
                        var stateCode = 'unknown';
                        if (regionStates[item.region_id]) {
                            stateCode = regionStates[item.region_id].stateIso;
                        }
                        console.log('code ------- ' + stateCode);
                        return {
                            state_code: stateCode,
                            region_id: item.region_id,
                            name: item.rate_name,
                            recurring_price: item.recurring_price,
                            billing_rate_guid: item.billing_rate_guid,
                            plan_id: item.plan_id,
                            cycle_id: item.cycle_id,
                            setup_price: item.setup_price,
                            //plan_provider_id: item.plan_provider_id,
                            sku: item.rate_name.replace(/[ ,.*+?^${}/()|[\]\\]/g, "_").replace("'", "").toLowerCase()
                        };
                    }), plan => {
                        return plan.state_code;
                    });

                    var logData = {
                        ignored: plans2Ignore,
                        created: {},
                        updated: {},
                        deleted: {},
                        totalIgnoredRecords: plans2Ignore.length,
                    };

                    return Promise.all(_.map(plans, (val, key) => {
                        if (key && val) {
                            console.log('State ' + key + ' has ' + val.length);
                            return _processPlansByState(key, val, logData);
                        }
                    })).then(() => {
                        logData.status = 'succeeded';
                        var q = [];
                        q.push(tlsApiDataCacheService.logDailyTracking(`membership-plans`, logData).then(function (referenceId) {
                            var notiObj = {
                                subject: 'Refresh Data TLS Plans',
                                recipients: '',
                                event: 'refresh-api-data',
                                channel: 'email',
                                data: {
                                    name: 'Plans',
                                    referenceId: referenceId,
                                    ignoredLength: logData.totalIgnoredRecords
                                },
                                createdDate: new Date()
                            };
                            return notificationService.create(notiObj);
                        }));
                        q.push(tlsApiDataCacheService.setStatusCache('tls-api-data-cache/plan', false));
                        q.push(tlsApiDataCacheService.updateTLSCacheTimestamp());
                        q.push(tlsApiDataCacheService.updateCacheTimestamp('membership-plans'));
                        return Promise.all(q);
                    }).then(function () {
                        console.log('Refresh Plans Finish');
                    });
                });
            });
        }

        function _processPlansByState(stateCode, plansTLS, logData) {
            if (!stateCode || !plansTLS) {
                return new Promise(function (resolve, reject) {
                    resolve(true);
                });
            }
            console.log('Start ProcessPlansByState');
            var fbPlans;
            return firebaseDataRef.child('membership-plans/' + stateCode).once("value").then(function (snap) {
                var PlansPersisted = tlsApiDataCacheService.toArray(snap && snap.val());
                console.log(PlansPersisted);
                fbPlans = _.clone(PlansPersisted);
                return tlsApiDataCacheService.fillterToDel(fbPlans, plansTLS, ['plan_id', 'cycle_id']).then(function (data2Del) {
                    console.log('data2Del', data2Del.length);
                    console.log(data2Del);
                    var allRemove = [];
                    if (data2Del) {
                        allRemove = _.map(data2Del, plan => {
                            return _removePlanState(stateCode, plan.key);
                        });
                    }
                    return Promise.all(allRemove).then(function () {
                        logData.deleted[stateCode] = data2Del;
                        return PlansPersisted;
                    });
                }).then(function (PlansPersisted) {
                    fbPlans = _.clone(PlansPersisted);
                    return tlsApiDataCacheService.fillterToAdd(fbPlans, plansTLS, ['plan_id', 'cycle_id']).then(function (data2Add) {
                        console.log('data2Add', data2Add.length);
                        var allAdded = [];
                        if (data2Add) {
                            allAdded = _.map(data2Add, plan => {
                                return _addPlanByState(stateCode, plan).then(key => {
                                    plan.key = key;
                                });
                            });
                        }
                        return Promise.all(allAdded).then(function () {
                            logData.created[stateCode] = data2Add;
                            return PlansPersisted;
                        });
                    });
                }).then(function (PlansPersisted) {
                    fbPlans = _.clone(PlansPersisted);
                    var plansBackUp = JSON.parse(JSON.stringify(PlansPersisted));
                    //filter to Update
                    return tlsApiDataCacheService.fillterToUpdate(fbPlans, plansTLS, ['plan_id', 'cycle_id']).then(function (data2Update) {
                        console.log('data2Update', data2Update.length);
                        var allUpdated = [];
                        if (data2Update) {
                            allUpdated = _.map(data2Update, plan => {
                                return _updatePlanByState(stateCode, _.clone(plan)).then(function () {
                                    plan.oldValue = _.find(plansBackUp, item => {
                                        return item.key == plan.key;
                                    }).value || {};
                                });
                            });
                        }
                        return Promise.all(allUpdated).then(function () {
                            logData.updated[stateCode] = data2Update;
                        });
                    });
                }).then(function () {
                    console.log('Process Plans promise done');
                });
            });
        }

        function _getPlansTLS() {
            /* jshint ignore:start */
            //get all config from firebase
            var setting = $rootScope.storage.appSettings;
            var payload = {
                "request": "TLS_API",
                "data_to_submit[source]": "CardFlight",
                "token": "T3MPC%40rdFl1ght666",
                "action": "getListOfPlans"
            };
            var url = APP_CONFIG.externalUrl;//'https://apiqa.texaslawshield.com/v1/tlsapi.php';
            if (setting) {
                payload["data_to_submit[source]"] = setting.TLSAPISourceForWeb;
                payload["token"] = setting.TLSAPIDefaultToken;
                url = setting.TLSAPIUrl;
                //url = 'https://api.texaslawshield.com/v1/tlsapi.php';
            }

            var opts = {
                method: 'POST',
                url: url,
                data: $.param(payload),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            };
            /* jshint ignore:end */
            return tlsApiDataCacheService.callApi(opts);
        }

        function _addPlanByState(stateCode, add) {
            var ref = planRef.child(stateCode),
                key = ref.push().key;
            return ref.child(key).update(add).then(function (result) {
                return { result: true, errorMsg: "", key: key };
            }).catch(function (error) {
                return { result: false, errorMsg: error };
            });
        }

        function _updatePlanByState(stateCode, update) {
            var key = angular.copy(update.key);
            var value = DataUtils.stripDollarPrefixedKeys(update.value);
            return planRef.child(stateCode + "/" + key).update(value).then(function () {
                return { result: true, errorMsg: "" };
            }).catch(function (error) {
                return { result: false, errorMsg: error };
            });
        }

        function _removePlanState(stateCode, key) {
            return planRef.child(stateCode + "/" + key).remove();
        }
    }
})();
