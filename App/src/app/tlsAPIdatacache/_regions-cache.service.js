(function () {
    'use strict';
    angular.module('app.tlsApiDataCache').factory('regionsCacheService', regionsCacheService);
    /** @ngInject */
    function regionsCacheService($rootScope, APP_CONFIG, firebaseDataRef, DataUtils, tlsApiDataCacheService, authService, notificationService) {
        var regionRef = firebaseDataRef.child('membership-regions'),
            regionStateRef = firebaseDataRef.child('membership-regions-state');

        var service = {
            refreshRegions: refreshRegions
        };

        return service;

        function refreshRegions() {
            //Check running status
            var currentUser = authService.getCurrentUser();
            return tlsApiDataCacheService.getStatusCache('tls-api-data-cache/region').then(function (status) {
                if (!status || status.isProcessing) return false;

                //flag status is running
                return tlsApiDataCacheService.setStatusCache('tls-api-data-cache/region', true);
            }).then(function (canStart) {
                console.log('refresh Regions: ' + canStart);
                if (!canStart) return;
                //Start job
                //
                tlsApiDataCacheService.updatedByCache('tls-api-data-cache/region', currentUser);
                var apiJob = _getRegionsTLS();
                var getRegionStatesJob = DataUtils.getDataFirebaseLoadOnce('membership-regions-state', true);

                //Await to retrieve data from TLS
                return Promise.all([apiJob, getRegionStatesJob]).then(function (results) {
                    if (!!!results || results.length == 0) return;

                    //Handle data
                    var rawData = results[0].states;
                    var regionStates = results[1];
                    console.log('==================Regions API==================');
                    console.log('Regions TLS', rawData.length);
                    //Check data model is valid or not
                    var regionRequiredFields = ["state_id", "region_id", "state_code", "state_name", "region_guid"];
                    var region2Ignore = [];
                    rawData = _.filter(rawData, item => {
                        var diffKeys = _.difference(regionRequiredFields, _.keys(item));
                        if (diffKeys.length == 0) {
                            return true;
                        } else {
                            region2Ignore.push(item);
                            return false;
                        }
                    });


                    rawData = _.sortBy(rawData, (item) => {
                        return item.region_id;
                    });

                    var regionGroups = _.groupBy(_.map(rawData, item => {
                        console.log('Region id ' + item.region_id, regionStates[item.region_id]);
                        var stateCode = 'unknown';
                        if (regionStates[item.region_id]) {
                            stateCode = regionStates[item.region_id].stateIso;
                        }
                        console.log('code ------- ' + stateCode);
                        //extract plan type from region name
                        var code = "standard";
                        if (item.region_guid && item.region_guid.toLowerCase().indexOf("leo") > -1) {
                            code = "leo";
                        } else if (item.region_guid && item.region_guid.toLowerCase().indexOf("security") > -1) {
                            code = "sec";
                        } else if (item.region_guid && item.region_guid.toLowerCase().indexOf("nfa") > -1) {
                            code = "ignore";
                        } else if (item.region_guid && item.region_guid.toLowerCase().indexOf("walker rice pc") > -1) {
                            code = "ignore";
                        }

                        //setup options setting
                        var enablePromoCode = true,
                            enableWaivedSetupFee = true;

                        if (item.state_code == "CA") {
                            enablePromoCode = false;
                            //enableWaivedSetupFee = false;
                        }

                        return {
                            id: item.region_id,
                            stateid: item.state_id,
                            statename: item.state_name,
                            statecode: item.state_code,
                            guid: item.region_guid,
                            code: code,
                            settings: {
                                enable_promo_code: enablePromoCode,
                                enable_waived_setup_fee: enableWaivedSetupFee
                            }
                        };
                    }), region => {
                        return region.statecode;
                    });

                    var logData = {
                        ignored: region2Ignore,
                        created: {},
                        updated: {},
                        deleted: {},
                        totalIgnoredRecords: region2Ignore.length,
                    };

                    return Promise.all(_.map(regionGroups, (val, key) => {
                        if (key && val) {
                            console.log('State ' + key + ' has ' + val.length);
                            return _processRegionsByState(key, val, logData);
                        }
                    })).then(() => {
                        logData.status = 'succeeded';
                        var q = [];
                        q.push(tlsApiDataCacheService.logDailyTracking(`membership-regions`, logData).then(function (referenceId) {
                            var notiObj = {
                                subject: 'Refresh Data TLS Regions',
                                recipients: '',
                                event: 'refresh-api-data',
                                channel: 'email',
                                data: {
                                    name: 'Regions',
                                    referenceId: referenceId,
                                    ignoredLength: logData.totalIgnoredRecords
                                },
                                createdDate: new Date()
                            };
                            return notificationService.create(notiObj);
                        }));
                        q.push(tlsApiDataCacheService.setStatusCache('tls-api-data-cache/region', false));
                        q.push(tlsApiDataCacheService.updateTLSCacheTimestamp());
                        q.push(tlsApiDataCacheService.updateCacheTimestamp('membership-regions'));
                        q.push(tlsApiDataCacheService.updateCacheTimestamp('membership-regions-state'));
                        return Promise.all(q);
                    }).then(function () {
                        console.log('Refresh Regions Finish');
                    });
                });
            });
        }

        function _processRegionsByState(stateCode, regionsTLS, logData) {
            if (!stateCode || !regionsTLS) {
                return new Promise(function (resolve, reject) {
                    resolve(true);
                });
            }
            console.log('Start ProcessRegionsByState');
            regionsTLS = _.filter(regionsTLS, region => {
                return region.code != 'ignore';
            });
            var fbRegions;
            return firebaseDataRef.child('membership-regions/' + stateCode).once("value").then(function (snap) {
                var regionsPersisted = tlsApiDataCacheService.toArray(snap && snap.val());
                console.log(regionsPersisted);
                fbRegions = _.clone(regionsPersisted);
                return tlsApiDataCacheService.fillterToDel(fbRegions, regionsTLS, ['id']).then(function (data2Del) {
                    console.log('data2Del', data2Del.length);
                    console.log(data2Del);
                    var allRemove = [];
                    if (data2Del) {
                        _.forEach(data2Del, region => {
                            allRemove.push(_removeRegionByState(stateCode, region.key));
                            allRemove.push(_removeRegionState(region.value.id));
                        });
                    }
                    return Promise.all(allRemove).then(function () {
                        logData.deleted[stateCode] = data2Del;
                        return regionsPersisted;
                    });
                }).then(function (regionsPersisted) {
                    fbRegions = _.clone(regionsPersisted);
                    return tlsApiDataCacheService.fillterToAdd(fbRegions, regionsTLS, ['id']).then(function (data2Add) {
                        console.log('data2Add', data2Add.length);
                        var allAdded = [];
                        if (data2Add) {
                            allAdded = _.map(data2Add, region => {
                                return _addRegionByState(stateCode, _.clone(region)).then(keyRegion => {
                                    var regionState = {
                                        key: keyRegion,
                                        stateIso: stateCode,
                                        stateid: region.stateid
                                    };
                                    region.key = keyRegion;
                                    return _setRegionState(region.id, regionState);
                                });
                            });
                        }
                        return Promise.all(allAdded).then(function () {
                            logData.created[stateCode] = data2Add;
                            return regionsPersisted;
                        });
                    });
                }).then(function (regionsPersisted) {
                    fbRegions = _.clone(regionsPersisted);
                    var regionsBackUp = JSON.parse(JSON.stringify(regionsPersisted));
                    //filter to Update
                    return tlsApiDataCacheService.fillterToUpdate(fbRegions, regionsTLS, ['id']).then(function (data2Update) {
                        console.log('data2Update', data2Update.length);
                        var allUpdated = [];
                        if (data2Update) {
                            allUpdated = _.map(data2Update, region => {
                                return _updateRegionByState(stateCode, _.clone(region)).then(function () {
                                    var regionState = {
                                        key: region.key,
                                        stateIso: stateCode,
                                        stateid: region.value.stateid
                                    };
                                    region.oldValue = _.find(regionsBackUp, item => {
                                        return item.key == region.key;
                                    }).value || {};
                                    return _updateRegionState(region.value.id, regionState);
                                });
                            });
                        }
                        return Promise.all(allUpdated).then(function () {
                            logData.updated[stateCode] = data2Update;
                        });
                    });
                }).then(function () {
                    console.log('Process Regions promise done');
                });
            });
        }

        function _getRegionsTLS() {
            /* jshint ignore:start */
            //get all config from firebase
            var setting = $rootScope.storage.appSettings;
            var payload = {
                "request": "TLS_API",
                "data_to_submit[source]": "CardFlight",
                "token": "T3MPC%40rdFl1ght666",
                "action": "getRegions"
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

        function _addRegionByState(stateCode, add) {
            var ref = regionRef.child(stateCode),
                key = ref.push().key;
            return ref.child(key).update(add).then(function (result) {
                return { result: true, errorMsg: "", key: key };
            }).catch(function (error) {
                return { result: false, errorMsg: error };
            });
        }

        function _setRegionState(regionId, regionState) {
            return regionStateRef.child(regionId).set(regionState).then(function () {
                return { result: true, errorMsg: "" };
            }).catch(function (error) {
                return { result: false, errorMsg: error };
            });
        }

        function _updateRegionByState(stateCode, update) {
            var key = angular.copy(update.key);
            var value = DataUtils.stripDollarPrefixedKeys(update.value);
            return regionRef.child(stateCode + "/" + key).update(value).then(function () {
                return { result: true, errorMsg: "" };
            }).catch(function (error) {
                return { result: false, errorMsg: error };
            });
        }

        function _updateRegionState(regionId, regionState) {
            return regionStateRef.child(regionId).update(regionState).then(function () {
                return { result: true, errorMsg: "" };
            }).catch(function (error) {
                return { result: false, errorMsg: error };
            });
        }

        function _removeRegionByState(stateCode, key) {
            return regionRef.child(stateCode + "/" + key).remove();
        }

        function _removeRegionState(regionId) {
            return regionStateRef.child(regionId).remove();
        }
    }
})();
