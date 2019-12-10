(function () {
    'use strict';
    angular.module('app.settings').factory('settingsTrackingService', settingsTrackingService);
    /** @ngInject **/
    function settingsTrackingService(authService, firebaseDataRef, DataUtils, appUtils) {
        var items = firebaseDataRef.child('settings-tracking');
            // ; $rootScope.storage.currentUser;

        var service = {
            create: create,
            get: get,
            compareValue: compareValue
        };

        return service;

        function create(add) {
            var currentUser = authService.getCurrentUser();
            var time = moment();
            var key = time.format('x');
            var trackingRef = items.child(key);
            return appUtils.getDeviceInfo().then(function (rs) {
                add.from = 'Smart Admin';
                //add.modifiedBy = currentUser.email;
                add.timestampString = appUtils.formatDateTimeString(time);
                add.deviceInfo = {
                    os: rs.os || '',
                    appVersion: rs.appVersion || '',
                    buildVersion: rs.buildVersion || '',
                    geoCode: rs.geoCode || '',
                    osVersion: rs.browser_version || '',
                    deviceName: rs.browser
                };
                var text = [],
                    fName = _.trim(currentUser.firstName),
                    lName = _.trim(currentUser.lastName),
                    repCode = _.trim(currentUser.repCode || currentUser.username || '');

                if (fName) {
                    text.push(fName);
                }
                if (lName) {
                    text.push(lName);
                }
                if (repCode) {
                    text.push('(' + repCode + ')');
                }

                add.modifiedBy = text.join(' ') ||  currentUser.email;
                add.modifiedByUserId = currentUser.uid;
                return trackingRef.set(add).then(function (result) {
                    return { result: true, id: key };
                }).catch(function (error) {
                    console.log(error);
                    return { result: false, errorMsg: error.message };
                });
            });
        }

        function get() {
            var trackingRef = items;
            return DataUtils.getListDataFirebaseLoadOnce(trackingRef, true).then(function (data) {
                if (data) {
                    return data.sort(function (a, b) {
                        return b.$id - a.$id;
                    });
                }
                return [];
            });
        }

        function compareValue(newData) {
            var ref = firebaseDataRef.child('app-options/'),
                compare = null;
            return DataUtils.getDataFirebaseLoadOnce(ref).then(function (oldData) {
                if (oldData) {
                    // oldData = _fillFullObjEventFromApp(oldData);
                    // oldData = getValue(oldData);
                    compare = _.omitBy(newData, function (value, key) {
                        return _.isEqual(value, oldData[key]);
                    });
                    compare = getValue(compare);
                    return _mapObj(compare, oldData);
                }
                return null;
            });
        }

        function _mapObj(comepare, oldData) {
            
            var result = [];
            if (comepare) {
                _.forEach(comepare, function (value, key) {
                    if (key !== 'timestampCreated' && key != 'timestampModified' && key !== 'managers' && key !== 'managerRefs' && key != '$id' && key != 'lastSystemUpdated') {
                        var obj = {
                            field: key,
                            old: oldData[key] !== undefined && oldData[key] !== null ? oldData[key] : 'null',
                            new: value
                        };
                        if (obj.old || obj.new) {
                            result.push(obj);
                        }
                    }
                });
            }
            return result;
        }
        function getValue(data){
            
            let result = angular.copy(data);
            _.forEach(result, function(value, key){
                if(key.indexOf('$') >-1 || key == 'forEach'){
                    delete result[key];
                }
            });
            return result;
        }
        function _fillFullObjEventFromApp(data) {
            return {
                adminEmail: data.adminEmail || '',
                adminURL: data.adminURL || 0,
                appURL: data.appURL || 0,
                webURL: data.webURL || 0,
                allowSignUp: data.allowSignUp || 0,
                requireLogin: data.requireLogin || 0,
                briefMaxChar: data.briefMaxChar || 0,
                commentsPerPage: data.commentsPerPage || 0,
                postsPerPage: data.postsPerPage || 0,
                feedImageDirectory: data.feedImageDirectory || 0,
                membershipApplicationPaymentImageDirectory: data.membershipApplicationPaymentImageDirectory || 0,
                membershipApplicationImageDirectory: data.membershipApplicationImageDirectory || 0,
                forceUpdate: data.forceUpdate || 0,
                appName: data.appName || 0,
                appLogo: data.appLogo || 0,
                androidBuildVersion: data.androidBuildVersion || 0,
                androidDownloadURL: data.androidDownloadURL || 0,
                iosBuildVersion: data.iosBuildVersion || 0,
                iosDownloadURL: data.iosDownloadURL || 0,
                bottomMenu: data.bottomMenu || 0,
                topMenuLocation: data.topMenuLocation || 0,
                iptNewMember: data.iptNewMember || 0,
                availableScheduleRange: data.availableScheduleRange || 0,
                iptTotalAttendeesRegistered: data.iptTotalAttendeesRegistered || 0,
                estTotalRevenue: data.estTotalRevenue || 0,
                estProspectiveMember: data.estProspectiveMember || 0,
                estAttendees: data.estAttendees || 0,
                description: data.description || "",
                endDate: data.endDate || '',
                facilityCode: data.facilityCode || '',
                facilityId: data.facilityId || '',
                isActive: data.isActive !== undefined ? data.isActive : true,
                name: data.name || '',
                state: data.state || '',
                region: data.region || '',
                regionCode: data.regionCode || '',
                representativeAttended: data.representativeAttended || {},
                requester: data.requester || {},
                areaManager: data.areaManager || {},
                startDate: data.startDate || '',
                type: data.type || '',
                modifiedBy: data.modifiedBy || '',
                territory: data.territory || '',
                status: data.status
            };
        }

    }
})();
