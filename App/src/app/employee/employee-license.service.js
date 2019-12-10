(function() {
    'use strict';
    angular.module('app.employee').factory('employeeLicenseService', employeeLicenseService);
    /** @ngInject **/
    function employeeLicenseService($stateParams, appUtils, DataUtils, firebaseDataRef, authService, employeeLogService, employeeService, toaster) {
        var services = {
            all: all,
            add: add,
            upd: upd,
            del: del,
            err: err,
            obj: obj,
            viewObj: viewObj,
            logField: "number"
        };

        //prop
        const path = "licenses",
            source = authService.getCurrentUser().$id,
            licenseStateEnum = appUtils.licenseStateEnum,
            licenseTypeEnum = appUtils.licenseTypeEnum,
            appointedEnum = appUtils.appointedEnum,
            formatDate = appUtils.formatDateString,
            toTimeStamp = appUtils.toTimeStamp;

        function userId() { return $stateParams.id; }

        function licsRef() {
            return firebaseDataRef.child('users').child(userId()).child(path);
        }

        //console.log("userId =" + userId());

        //method
        function all() {
            return licsRef().once('value').then(function(res) {
                var lics = res.val();
                var data = [];
                for (var key in lics) {
                    var row = lics[key];
                    row.id = key;
                    data.push(row);
                }
                return data;
            });
        }

        function viewObj(obj) {
            return {
                issueState: licenseStateEnum[obj.issueState],
                issueDate: formatDate(moment.utc(obj.issueDate)),
                type: licenseTypeEnum[obj.type],
                number: obj.number,
                expirationDate: formatDate(moment.utc(obj.expirationDate)),
                appointed: appointedEnum[obj.appointed],

                //readonly
                id: obj.id,
                //timestampCreated: formatDate(moment(obj.timestampCreated)),
                timestampModified: formatDate(moment(obj.timestampModified))
            };
        }

        function obj(issueState) {
            if(!issueState){
                issueState = null;
            }
            return {
                issueState: issueState,
                issueDate: null,
                type: null,
                number: null,
                expirationDate: null,
                appointed: 0,

                //readonly
                timestampCreated: formatDate(moment(appUtils.getTimestamp())),
            };
        }

        function newObj(obj) {
            return {
                issueState: obj.issueState,
                issueDate: toTimeStamp(obj.issueDate),
                type: obj.type,
                number: obj.number,
                expirationDate: toTimeStamp(obj.expirationDate),
                appointed: obj.appointed,

                //readonly
                timestampCreated: appUtils.getTimestamp(),
                timestampModified: appUtils.getTimestamp(),
                createdBy: source,
                modifiedBy: source
            };
        }

        function modObj(obj) {
            return {
                issueState: obj.issueState,
                issueDate: toTimeStamp(obj.issueDate),
                type: obj.type,
                number: obj.number,
                expirationDate: toTimeStamp(obj.expirationDate),
                appointed: obj.appointed,

                //readonly
                id: obj.id,
                timestampModified: appUtils.getTimestamp(),
                modifiedBy: source
            };
        }

        function add(obj) {
            var _newObj = newObj(obj);
            var key = licsRef().push().key;
            return _compareUpdateValue(licsRef(), key, _newObj).then(function(diffValue) {
                return licsRef().child(key).update(_newObj).then(function(res) {
                    log('Add employee license:' + _newObj[services.logField] + '.', diffValue);
                    _newObj.id = key;
                    return _newObj;
                }).then(function(_newObj) {
                    return DataUtils.updateTimeStampModifiedNode('users/' + userId()).then(function() {
                        return employeeService.index(userId()).then(function() {
                            return _newObj;
                        });
                    });
                });
            });

        }

        function upd(id, obj) {
            var _modObj = modObj(obj);
            //console.log("upd " + id + " = " + JSON.stringify(_modObj));
            return _compareUpdateValue(licsRef(), id, _modObj).then(function(diffValue) {
                return licsRef().child(id).update(_modObj).then(function() {
                    log('Update employee license:' + _modObj[services.logField] + '.', diffValue);
                    _modObj.id = id;
                    return _modObj;
                }).then(function(_modObj) {
                    //_modObj.timestampCreated = toTimeStamp(obj.timestampCreated);
                    return DataUtils.updateTimeStampModifiedNode('users/' + userId()).then(function() {
                        return employeeService.index(userId()).then(function() {
                            return _modObj;
                        });
                    });
                });
            });
        }

        function del(obj) {
            //treat create employees log with diff value license remove
            var delLicense = _.clone(obj);
            var diffValue = {
                field: 'licenses',
                subField: delLicense.id,
                old: delLicense,
                new: ""
            };
            //end treat create employees log with diff value license remove
            return licsRef().child(obj.id).remove().then(function() {
                log('Delete employee license:' + obj[services.logField] + '.', [diffValue]);
                return true;
            }).then(function() {
                return DataUtils.updateTimeStampModifiedNode('users/' + userId()).then(function() {
                    return employeeService.index(userId()).then(function() {
                        return true;
                    });
                });
            });
        }

        function log(mess, diffValue) {
            var currentUser = authService.getCurrentUser();
            var employeeLog = {
                action: appUtils.logEmployeeAction.updateLicense.value,
                updateBy: currentUser.email || '',
                status: 'Success',
                message: mess,
                diffValue: diffValue
            };
            toaster.pop('success', 'Success', mess);
            return employeeLogService.create(userId(), employeeLog);
        }

        function _compareUpdateValue(ref, licenseId, updateData) {
            var compare = null;
            return DataUtils.getDataFirebaseLoadOnce(ref, true).then(function(oldData) {
                if (!oldData) {
                    oldData = {};
                }
                delete oldData['$id']; // jshint ignore:line
                var newData = _.clone(oldData),
                    update = _.clone(updateData);
                if (update) {
                    delete update['id']; // jshint ignore:line
                    newData[licenseId] = update;
                } else {
                    delete newData[licenseId];
                }
                compare = _.omitBy(newData, function(value, key) {
                    return _.isEqual(value, oldData[key]);
                });
                var diffValue = employeeService._mapObj(compare, oldData);
                diffValue = _.map(diffValue, function(diff) {
                    diff.subField = _.clone(diff.field);
                    diff.field = 'licenses';
                    return diff;
                });
                //console.log(diffValue);
                return diffValue;
            });
        }

        var err = {
            required: function(val) {
                if (val === null || val === undefined || val === "") return true;
            },
            minlength: function(length, val) {
                if (val !== null && val !== undefined && val.length < length)
                    return true;
            },
            maxlength: function(length, val) {
                if (val !== null && val !== undefined && val.length > length)
                    return true;
            },
            isDate: function(val) { // format : MM/DD/YYYY
                /* let tmp = val.split('/');
                if (tmp.length != 3) return true;
    
                let [MM, DD, YYYY] = tmp;
                //console.log((typeof MM) + "/" + (typeof DD) + "/" + typeof (YYYY)); */
            },
            invalid: function(err) {
                //console.log(JSON.stringify(err));
                if (JSON.stringify(err) !== "{}")
                    return true;
            },


            number: function(val) {
                if (this.required(val) || this.minlength(2, val) || this.maxlength(30, val))
                    return true;
            },
            issueDate: function(val) {
                if (this.required(val) || this.isDate(val))
                    return true;
            }

        };
        services.err = err;

        return services;
    }
})();