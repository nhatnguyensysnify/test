(function () {
    'use strict';
    angular.module('app.event').factory('eventTrackingService', eventTrackingService);
    /** @ngInject **/
    function eventTrackingService(authService, firebaseDataRef, DataUtils, appUtils) {
        var items = firebaseDataRef.child('event-tracking');
        // ; $rootScope.storage.currentUser;

        var service = {
            create: create,
            get: get,
            compareValue: compareValue
        };

        return service;

        function create(eventId, add, currentUser) {
            currentUser = currentUser ? currentUser : authService.getCurrentUser();
            // var currentUser = authService.getCurrentUser();
            var time = moment();
            var key = time.format('x'),
                fullKey = eventId + '/' + key;
            var trackingRef = items.child(fullKey);
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

                add.modifiedBy = text.join(' ') || currentUser.email;
                return trackingRef.set(add).then(function (result) {
                    return { result: true, id: fullKey };
                }).catch(function (error) {
                    console.log(error);
                    return { result: false, errorMsg: error.message };
                });
            });
        }

        function get(eventId) {
            var trackingRef = items.child(eventId);
            return DataUtils.getListDataFirebaseLoadOnce(trackingRef, true).then(function (data) {
                if (data) {
                    return data.sort(function (a, b) {
                        return b.$id - a.$id;
                    });
                }
                return [];
            });
        }

        function compareValue(eventId, newData) {
            var ref = firebaseDataRef.child('events/' + eventId),
                compare = null;
            return DataUtils.getDataFirebaseLoadOnce(ref).then(function (oldData) {
                if (oldData) {
                    oldData = _fillFullObjEventFromApp(oldData);
                    oldData = flattenNestedObject(oldData, 'mailingAddress');
                    newData = flattenNestedObject(newData, 'mailingAddress');

                    compare = _.omitBy(newData, function (value, key) {
                        if (key === 'requester' || key === 'representativeAttended' || key === 'areaManager') {
                            var oldRe = Object.keys(oldData[key]),
                                newRe = Object.keys(value);

                            return _.isEqual(newRe, oldRe);
                        }

                        return _.isEqual(value, oldData[key]);
                    });
                    return _mapObj(compare, oldData);
                }
                return null;
            });
        }

        function _mapObj(comepare, oldData) {
            var result = [];
            if (comepare) {
                let ignoreField = [
                    'timestampCreated',
                    'timestampModified',
                    'managers',
                    'managerRefs',
                    '$id',
                    'lastSystemUpdated',
                    'fees',
                    'mailingAddress'
                ];
                _.forEach(comepare, function (value, key) {
                    if (ignoreField.indexOf(key) === -1) {
                        var obj = {
                            field: key,
                            old: oldData[key] !== undefined && oldData[key] !== null ? oldData[key] : 'null',
                            new: value
                        };

                        if (key === 'region') {
                            obj.oldState = oldData.state || '';
                            obj.newState = comepare.state || oldData.state || '';
                        }

                        if (obj.old || obj.new) {
                            result.push(obj);
                        }
                    }
                });
            }
            return result;
        }

        function _fillFullObjEventFromApp(data) {
            let obj = {
                sysCloseRate: data.sysCloseRate || 0,
                sysSold: data.sysSold || 0,
                sysTotalRevenue: data.sysTotalRevenue || 0,
                sysTotalAnnualMember: data.sysTotalAnnualMember || 0,
                sysTotalMonthlyMember: data.sysTotalMonthlyMember || 0,
                sysMultiState: data.sysMultiState || 0,
                sysMinorChildren: data.sysMinorChildren || 0,
                sysHunterShield: data.sysHunterShield || 0,
                sysBailBond: data.sysBailBond || 0,
                iptBailBond: data.iptBailBond || 0,
                sysGITC: data.sysGITC || 0,
                sysCareerShield: data.sysCareerShield || 0,
                iptGITC: data.iptGITC || 0,
                iptCareerShield: data.iptCareerShield || 0,
                iptHunterShield: data.iptHunterShield || 0,
                iptMinorChildren: data.iptMinorChildren || 0,
                iptMultiState: data.iptMultiState || 0,
                iptTotalMonthlyMember: data.iptTotalMonthlyMember || 0,
                iptTotalAnnualMember: data.iptTotalAnnualMember || 0,
                iptCloseRate: data.iptCloseRate || 0,
                iptTotalRevenue: data.iptTotalRevenue || 0,
                iptNewMember: data.iptNewMember || 0,
                iptTotalAttendees: data.iptTotalAttendees || 0,
                iptTotalAttendeesRegistered: data.iptTotalAttendeesRegistered || 0,
                iptAnE: data.iptAnE || 0,
                iptGSW: data.iptGSW || 0,
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
                requesterId: data.requesterId || '',
                areaManager: data.areaManager || {},
                startDate: data.startDate || '',
                type: data.type || '',
                modifiedBy: data.modifiedBy || '',
                territory: data.territory || '',
                status: data.status,
                mailingAddress: data.mailingAddress,
                lockedVerifyStatus: data.lockedVerifyStatus !== undefined ? data.lockedVerifyStatus : false,
            };
            if (data.verifyStatus !== undefined) {
                obj.verifyStatus = data.verifyStatus || 0;
            }
            return obj;
        }
        function flattenNestedObject(object, fieldName) {
            if (!object) {
                return {};
            }
            let result = angular.copy(object);
            if (!result[fieldName]) {
                return object;
            }
            let objNest = result[fieldName];
            _.forEach(objNest, (value, key) => {
                result[fieldName + '-' + key] = value;
            });
            return result;
        }

    }
})();
