(function () {
    'use strict';
    angular.module('app.employeeLog').factory('employeeLogService', employeeLogService);
    /** @ngInject **/
    function employeeLogService($rootScope, firebaseDataRef, DataUtils, appUtils, authService) {
        var items = firebaseDataRef.child('employee-logs'),
            dailyRef = firebaseDataRef.child('employee-logs-daily');

        var service = {
            create: create,
            createWithEmail: createWithEmail,
            update: update,
            get: get,
            getSingleLog: getSingleLog,
            getByPaths: getByPaths,
            _renderlastActivity: _renderlastActivity
        };

        return service;

        function create(uid, add, timestampKey) {
            var time = timestampKey ? moment(parseInt(timestampKey)) : moment();
            var key = _.clone(time).format('x'),
                fullKey = uid + '/' + key,
                logRef = items.child(fullKey);

            return appUtils.getDeviceInfo().then(function (rs) {
                add.deviceInfo = {
                    os: rs.os || '',
                    appVersion: rs.appVersion || '',
                    buildVersion: rs.buildVersion || '',
                    geoCode: rs.geoCode || '',
                    osVersion: rs.browser_version || '',
                    deviceName: rs.browser
                };
                add.timestampString = appUtils.formatDateTimeString(time);
                add.source = 'Smart Admin';
                add = DataUtils.stripDollarPrefixedKeys(add);
                return logRef.set(add).then(function (result) {
                    if (add.action && (add.action === 'uploadImage' || add.action === 'uploadPDF')) {
                        var dailyKey = key;
                        return dailyRef.child(dailyKey).set({
                            uid: uid,
                            timestamp: dailyKey
                        });
                    }
                }).then(function () {
                    // var currentUser = authService.getCurrentUser();
                    // if (currentUser.$id === uid) {
                        var timestamp = time.valueOf();
                        return firebaseDataRef.child('users/' + uid).update({
                            timestampActivity: timestamp
                            //timestampModified: timestamp
                        }).then(function () {
                            var setting = $rootScope.storage.appSettings.elasticSearch.users;
                            return authService.indexUser(uid, setting);
                        });
                    // }
                    // return true;
                }).then(function () {
                    return { result: true, id: fullKey };
                }).catch(function (error) {
                    console.log(error);
                    return { result: false, errorMsg: error.message };
                });
            });
        }

        function _renderlastActivity() {
            return DataUtils.getListDataFirebaseLoadOnce(firebaseDataRef.child('users'), true).then(function (users) {
                var setting = $rootScope.storage.appSettings.elasticSearch.users;
                var reqs = _.map(users, function (user) {
                    return items.child(user.$id).limitToLast(1).once("value").then(function (data) {
                        var snap = data && data.val();
                        var keys = Object.keys(snap), key = keys[0], timestamp = parseInt(key);
                        return firebaseDataRef.child('users/' + user.$id).update({
                            timestampActivity: timestamp,
                            timestampModified: timestamp
                        }).then(function () {
                            return authService.indexUser(user.$id, setting);
                        });
                    });
                });
                return Promise.all(reqs).then(function (rs) {
                    console.log('_renderlastActivity');
                    console.log(rs);
                });
            });
        }

        function createWithEmail(email, add, timestampKey) {
            return firebaseDataRef.child('users').orderByChild('email').equalTo(email).once('value').then(function (snapshot) {
                if (snapshot && snapshot.val()) {
                    var user = _.find(snapshot.val(), function (value, key) {
                        value.$id = key;
                        return value;
                    });
                    if (user) {
                        create(user.$id, add, timestampKey);
                    }
                }
                return { result: false, errorMsg: 'Cannot create employee log' };
            });
        }

        function update(key, updateData) {
            updateData = DataUtils.stripDollarPrefixedKeys(updateData);
            return items.child(key).update(updateData).then(function (res) {
                return { result: true, id: key };
            }).catch(function (error) {
                console.log(error);
                return { result: false, errorMsg: error };
            });
        }

        function get(cri) {
            var result = {
                items: [],
                totalRecords: 0
            };

            var ref = items.child(cri.uid).orderByKey().startAt(cri.timestampStart + '').endAt(cri.timestampEnd + '').once("value");
            return ref.then(function (res) {
                var data = res.val();
                if (data !== null) {
                    var items = _.map(data, function (val, key) {
                        val.timestampCreated = key;
                        return val;
                    });

                    items = _.filter(items, function (item, key) {
                        //filter action
                        var actionFlag = false;
                        if (!cri.action || cri.action === '' || cri.action === 'All') {
                            if (cri.eventId && cri.eventId !== 'All') {
                                if (item.action === 'uploadImage' || item.action === 'uploadPDF') {
                                    actionFlag = true;
                                }
                            } else {
                                actionFlag = true;
                            }
                        } else if (item.action && item.action === cri.action) {
                            actionFlag = true;
                        }

                        //filter facility
                        var factilityFlag = false;
                        if (!cri.facility || cri.facility === '' || cri.facility === 'All') {
                            factilityFlag = true;
                        } else if (item.fileInfo && item.fileInfo.facility && item.fileInfo.facility.id && item.fileInfo.facility.id === cri.facility) {
                            factilityFlag = true;
                        }

                        //filter event
                        var eventFlag = false;
                        if (!cri.eventId || cri.eventId === '' || cri.eventId === 'All') {
                            eventFlag = true;
                        } else if (item.fileInfo && item.fileInfo.eventId && item.fileInfo.eventId === cri.eventId) {
                            eventFlag = true;
                        }

                        return actionFlag && factilityFlag && eventFlag;
                    });

                    result.items = items.sort(function (a, b) {
                        return b.timestampCreated - a.timestampCreated;
                    });

                    result.totalRecords = items.length;
                }

                return result;
            });
        }

        function getSingleLog(uid, key) {
            var ref = items.child(uid + '/' + key);
            return DataUtils.getDataFirebaseLoadOnce(ref, true).then(function (data) {
                if (data) {
                    data.timestampCreated = key;
                }
                return data;
            });
        }

        function getByPaths(paths, cri) {
            var result = {
                items: [],
                totalRecords: 0
            };
            var reqs = _.map(paths, function (path) {
                return DataUtils.getDataFirebaseLoadOnce(items.child(path), true).then(function (data) {
                    if (data) {
                        data.timestampCreated = data.$id || '';
                    }
                    return data;
                });
            });
            return Promise.all(reqs).then(function (rs) {
                var items = _.filter(rs || [], function (item, key) {
                    //console.log(item);
                    if (!item) {
                        return false;
                    }
                    return true;
                    // //filter time
                    // var timeFlag = false;
                    // if (item.$id >= cri.timestampStart && item.$id <= cri.timestampEnd ) {
                    //     timeFlag = true;
                    // }

                    // //filter action
                    // var actionFlag = false;
                    // if (!cri.action || cri.action === '' || cri.action === 'All') {
                    //     if (cri.eventId && cri.eventId !== 'All') {
                    //         if (item.action === 'uploadImage' || item.action === 'uploadPDF') {
                    //             actionFlag = true;
                    //         }
                    //     } else {
                    //         actionFlag = true;
                    //     }
                    // } else if (item.action && item.action === cri.action) {
                    //     actionFlag = true;
                    // }

                    // //filter facility
                    // var factilityFlag = false;
                    // if (!cri.facility || cri.facility === '' || cri.facility === 'All') {
                    //     factilityFlag = true;
                    // } else if (item.fileInfo && item.fileInfo.facility && item.fileInfo.facility.id && item.fileInfo.facility.id === cri.facility) {
                    //     factilityFlag = true;
                    // }

                    // //filter event
                    // var eventFlag = false;
                    // if (!cri.eventId || cri.eventId === '' || cri.eventId === 'All') {
                    //     eventFlag = true;
                    // } else if (item.fileInfo && item.fileInfo.eventId && item.fileInfo.eventId === cri.eventId) {
                    //     eventFlag = true;
                    // }

                    // return timeFlag && actionFlag && factilityFlag && eventFlag;
                });

                result.items = items.sort(function (a, b) {
                    return b.timestampCreated - a.timestampCreated;
                });

                result.totalRecords = items.length;

                return result;
            });
        }
    }
})();