(function () {
    'use strict';
    angular.module('app.tlsApiDataCache').factory('addonsCacheService', addonsCacheService);
    /** @ngInject */
    function addonsCacheService($rootScope, APP_CONFIG, firebaseDataRef, DataUtils, tlsApiDataCacheService, authService, notificationService) {
        var addonRef = firebaseDataRef.child('membership-addons');

        var service = {
            refreshAddons: refreshAddons
        };

        return service;

        function refreshAddons() {
            //Check running status
            var currentUser = authService.getCurrentUser();
            return tlsApiDataCacheService.getStatusCache('tls-api-data-cache/addon').then(function (status) {
                if (!status || status.isProcessing) return false;

                //flag status is running
                return tlsApiDataCacheService.setStatusCache('tls-api-data-cache/addon', true);
            }).then(function (canStart) {
                console.log('refresh Addons: ' + canStart);
                if (!canStart) return;
                //Start job
                //
                tlsApiDataCacheService.updatedByCache('tls-api-data-cache/addon', currentUser);

                var regionIdsGroupByCode = {};
                var apiJob = _getAddonsTLS();
                var getRegionStatesJob = firebaseDataRef.child('membership-regions-state').once("value").then(snapshot => {
                    return snapshot.val();
                });
                var getMembershipRegionsJob = firebaseDataRef.child('membership-regions').once("value").then(snapshot => {
                    var allRegionGroups = snapshot.val();
                    _.each(allRegionGroups, function (regions, stateCode) {
                        _.each(regions, function (region) {
                            if (!regionIdsGroupByCode[region.code]) {
                                regionIdsGroupByCode[region.code] = [];
                            }
                            regionIdsGroupByCode[region.code].push(region.id);
                        });
                    });
                    return regionIdsGroupByCode;
                });
                //Await to retrieve data from TLS
                return Promise.all([apiJob, getRegionStatesJob, getMembershipRegionsJob]).then(function (results) {
                    if (!!!results || results.length == 0) return;

                    //Handle data
                    var addons = results[0];
                    var regionStates = results[1];
                    let addons2Ignore = [];

                    console.log('==================Addons API==================');
                    console.log('Addons TLS', addons.length);
                    /* jshint ignore:start */

                    addons = _.filter(addons, function (item) {
                        var valid = true;
                        if (regionIdsGroupByCode['sec'].indexOf(item.region_id) > -1) {
                            valid = false;
                        }
                        if (regionIdsGroupByCode['leo'].indexOf(item.region_id) > -1) {
                            var lName = item.rate_name.toLowerCase();
                            valid = lName.indexOf('multi-state protection') > -1 ||
                                lName.indexOf('career shield protection') > -1 ||
                                lName.indexOf('minor children') > -1 ||
                                lName.indexOf('gunowner identity theft') > -1 ||
                                lName.indexOf('hunter shield') > -1 ||
                                lName.indexOf('bail bond') > -1;
                        }
                        return valid;
                    });
                    /* jshint ignore:end */

                    //console.log(regionStates);
                    addons = _.sortBy(addons, (item) => {
                        return item.region_id;
                    });

                    addons = _.groupBy(_.map(addons, item => {
                        //console.log('Region id ' + item.region_id, regionStates[item.region_id]);
                        let stateCode = 'unknown';
                        if (regionStates[item.region_id]) {
                            stateCode = regionStates[item.region_id].stateIso;
                        }
                        //console.log('code ------- ' + stateCode);
                        return {
                            addon_id: item.addon_id,
                            cycle_id: item.cycle_id,
                            plan_id: item.plan_id,
                            plan_name: item.plan_name,
                            rate_name: item.rate_name,
                            recurring_price: Number(item.recurring_price).toFixed(2),
                            region_id: item.region_id,
                            setup_price: Number(item.setup_price).toFixed(2),
                            sku: item.rate_name.replace(/[ ,.*+?^${}/()|[\]\\]/g, "_").replace("'", "").toLowerCase(),
                            state_code: stateCode
                        };
                    }), addon => {
                        return addon.state_code;
                    });

                    let logData = {
                        ignored: addons2Ignore,
                        created: {},
                        updated: {},
                        deleted: {},
                        totalIgnoredRecords: addons2Ignore.length,
                    };

                    return Promise.all(_.map(addons, (val, key) => {
                        if (key && val) {
                            return _processAddonsByState(key, val, logData);
                        }
                    })).then(() => {
                        logData.status = 'succeeded';
                        var q = [];
                        q.push(tlsApiDataCacheService.logDailyTracking(`membership-addons`, logData).then(function (referenceId) {
                            var notiObj = {
                                subject: 'Refresh Data TLS Addons',
                                recipients: '',
                                event: 'refresh-api-data',
                                channel: 'email',
                                data: {
                                    name: 'Addons',
                                    referenceId: referenceId,
                                    ignoredLength: logData.totalIgnoredRecords
                                },
                                createdDate: new Date()
                            };
                            return notificationService.create(notiObj);
                        }));
                        q.push(tlsApiDataCacheService.setStatusCache('tls-api-data-cache/addon', false));
                        q.push(tlsApiDataCacheService.updateTLSCacheTimestamp());
                        q.push(tlsApiDataCacheService.updateCacheTimestamp('membership-addons'));
                        return Promise.all(q);
                    }).then(function () {
                        console.log('Refresh Addons Finish');
                    });
                });
            });
        }

        function _processAddonsByState(stateCode, addonsTLS, logData) {
            if (!stateCode || !addonsTLS) {
                return new Promise(function (resolve, reject) {
                    resolve(true);
                });
            }
            console.log('Start ProcessAddonsByState');
            var fbAddons;
            return firebaseDataRef.child('membership-addons/' + stateCode).once("value").then(function (snap) {
                var addonsPersisted = tlsApiDataCacheService.toArray(snap && snap.val());
                console.log(addonsPersisted);
                fbAddons = _.clone(addonsPersisted);
                return tlsApiDataCacheService.fillterToDel(fbAddons, addonsTLS, ['addon_id', 'plan_id', 'cycle_id', 'region_id']).then(function (data2Del) {
                    console.log('data2Del', data2Del.length);
                    console.log(data2Del);
                    var allRemove = [];
                    if (data2Del) {
                        allRemove = _.map(data2Del, addon => {
                            return _removeAddonState(stateCode, addon.key);
                        });
                    }
                    return Promise.all(allRemove).then(function () {
                        logData.deleted[stateCode] = data2Del;
                        return addonsPersisted;
                    });
                }).then(function (addonsPersisted) {
                    fbAddons = _.clone(addonsPersisted);
                    return tlsApiDataCacheService.fillterToAdd(fbAddons, addonsTLS, ['addon_id', 'plan_id', 'cycle_id', 'region_id']).then(function (data2Add) {
                        console.log('data2Add', data2Add.length);
                        var allAdded = [];
                        if (data2Add) {
                            allAdded = _.map(data2Add, addon => {
                                return _addAddonByState(stateCode, addon).then(key => {
                                    addon.key = key;
                                });
                            });
                        }
                        return Promise.all(allAdded).then(function () {
                            logData.created[stateCode] = data2Add;
                            return addonsPersisted;
                        });
                    });
                }).then(function (addonsPersisted) {
                    fbAddons = _.clone(addonsPersisted);
                    var addonsBackUp = JSON.parse(JSON.stringify(addonsPersisted));
                    //filter to Update
                    return tlsApiDataCacheService.fillterToUpdate(fbAddons, addonsTLS, ['addon_id', 'plan_id', 'cycle_id', 'region_id']).then(function (data2Update) {
                        console.log('data2Update', data2Update.length);
                        var allUpdated = [];
                        if (data2Update) {
                            allUpdated = _.map(data2Update, addon => {
                                return _updateAddonByState(stateCode, _.clone(addon)).then(function () {
                                    addon.oldValue = _.find(addonsBackUp, item => {
                                        return item.key == addon.key;
                                    }).value || {};
                                });
                            });
                        }
                        return Promise.all(allUpdated).then(function () {
                            logData.updated[stateCode] = data2Update;
                        });
                    });
                }).then(function () {
                    console.log('Process Addons promise done');
                });
            });
        }

        function _getAddonsTLS() {
            /* jshint ignore:start */
            //get all config from firebase
            var setting = $rootScope.storage.appSettings;
            var payload = {
                "request": "TLS_API",
                "data_to_submit[source]": "FASmartAdmin",
                "token": "T3MPC%40rdFl1ght666",
                "action": "getListOfAddons"
            };
            var url = APP_CONFIG.externalUrl; //'https://apiqa.texaslawshield.com/v1/tlsapi.php';
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

        function _addAddonByState(stateCode, add) {
            var ref = addonRef.child(stateCode),
                key = ref.push().key;
            return ref.child(key).update(add).then(function (result) {
                return { result: true, errorMsg: "", key: key };
            }).catch(function (error) {
                return { result: false, errorMsg: error };
            });
        }

        function _updateAddonByState(stateCode, update) {
            var key = angular.copy(update.key);
            var value = DataUtils.stripDollarPrefixedKeys(update.value);
            return addonRef.child(stateCode + "/" + key).update(value).then(function () {
                return { result: true, errorMsg: "" };
            }).catch(function (error) {
                return { result: false, errorMsg: error };
            });
        }

        function _removeAddonState(stateCode, key) {
            return addonRef.child(stateCode + "/" + key).remove();
        }
    }
})();
