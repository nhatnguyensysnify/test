(function () {
    'use strict';
    angular.module('app.employee').factory('employeeService', employeeService);
    /** @ngInject **/
    function employeeService($rootScope, $q, $http, authService, firebaseDataRef, departmentSevice, appUtils, DataUtils, searchService) {
        var employees = firebaseDataRef.child('users'),
            employeeLogRef = firebaseDataRef.child('employee-logs'),
            specifyRoles = $rootScope.storage.appSettings && $rootScope.storage.appSettings.specifyPermissionsRoles || null,
            adminRole = specifyRoles && specifyRoles.admin || '-KTlccaZaxPCGDaFPSc5',
            autoGenerateConfig = $rootScope.storage.appSettings && $rootScope.storage.appSettings.autoGenerateAvailability;

        var daysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
        var employeeService = {
            getAll: getAll,
            getUser: getUser,
            getUserByEmail: getUserByEmail,
            getUserByRepCode: getUserByRepCode,
            getUserByAlias: getUserByAlias,
            getEmployeeHistory: getEmployeeHistory,
            createUser: createUser,
            updateUser: updateUser,
            //updateAlias: updateAlias,
            deleteUser: deleteUser,
            restoreUser: restoreUser,
            resetPassword: resetPassword,
            changePassword: changePassword,
            unAuthorizedUser: unAuthorizedUser,
            authorizedUser: authorizedUser,
            updateAvatar: updateAvatar,
            updateLastAddedShift: updateLastAddedShift,
            checkPhoneExist: checkPhoneExist,
            checkUniqueRepcode: checkUniqueRepcode,
            addUserToRole: addUserToRole,
            checkUserIsDeleted: checkUserIsDeleted,
            search: search,
            saveUserRole: saveUserRole,
            getAvailability: getAvailability,
            index: index,
            _mapObj: _mapObj
            //searchQuery: searchQuery,
            //searchQueryPopup: searchQueryPopup,
            //searchByAlias: searchByAlias,
            //removeManager: removeManager,
            //reUpdateManager: reUpdateManager,
        };

        return employeeService;

        function getAll() {
            return DataUtils.getListDataFirebaseLoadOnce(employees, true);
        }

        function getUser(uid) {
            var employee = firebaseDataRef.child('users/' + uid);
            return DataUtils.getDataFirebaseLoadOnce(employee, true);
        }

        function getUserByEmail(email) {
            return employees.orderByChild('email').equalTo(email).once('value').then(function (snapshot) {
                if (snapshot && snapshot.val()) {
                    var user = _.find(snapshot.val(), function (value, key) {
                        value.$id = key;
                        return !value.isDeleted || value.isDeleted === '';
                    });

                    return user || null;
                }
                return null;
            });
        }

        function getUserByRepCode(repCode) {
            var ref = employees.orderByChild('repCode').equalTo(repCode).once("value");
            return ref.then(function (snapshot) {
                if (snapshot && snapshot.val()) {
                    return _.find(snapshot.val(), function (value, key) {
                        value.$id = key;
                        return value;
                    });
                }
                return null;
            });
        }

        function getUserByAlias(alias) {
            //console.log(alias);
            var ref = employees.orderByChild('alias').equalTo(alias).once("value");
            return ref.then(function (snapshot) {
                if (snapshot && snapshot.val()) {
                    return _.find(snapshot.val(), function (value, key) {
                        value.$id = key;
                        return value;
                    });
                }
                return null;
            });
        }

        function createUser(userToAdd, authUid) {
            var ts = appUtils.getTimestamp();
            var str = userToAdd.email.split('@'),
                username = str[0].replace(/[&\/\\#,+()$~%.'":*?<>{}_]/g, '-');
            userToAdd.isAuthorized = true;
            userToAdd.timestampCreated = userToAdd.timestampModified = ts;
            userToAdd.isDeleted = false;
            userToAdd.externalId = 'mcm-' + authUid;
            userToAdd.username = username;
            userToAdd.uid = authUid;
            delete userToAdd['password']; // jshint ignore:line
            return employees.child(authUid).set(userToAdd).then(function (result) {
                return { result: true, userKey: authUid };
            }).catch(function (error) {
                return { result: false, errorMsg: error };
            }).then(function (res) {
                return index(authUid, { priority: true }).then(function () {
                    return res;
                });
            });
        }

        function updateUser(userToUpdate) {
            var key = angular.copy(userToUpdate.$id),
                ts = appUtils.getTimestamp();
            userToUpdate.timestampModified = ts;
            if (!userToUpdate.repCode) {
                userToUpdate.repCode = '';

            }
            userToUpdate.isActive = userToUpdate.isAuthorized;
            userToUpdate.uid = key;
            userToUpdate = validateUserModel(userToUpdate);
            userToUpdate = DataUtils.stripDollarPrefixedKeys(userToUpdate);
            delete userToUpdate['password']; // jshint ignore:line
            delete userToUpdate.licenses; // TLS-1277
            var ref = firebaseDataRef.child('users/' + key);
            
            return compareUpdateValue(ref, userToUpdate).then(function (diffValue) {
                //console.log(userToUpdate);
                // return ref.update(userToUpdate).then(function() {
                return _update(key, userToUpdate).then(function () {
                    return { result: true, errorMsg: "", diffValue: diffValue || {} };
                }).catch(function (error) {
                    return { result: false, errorMsg: error, diffValue: diffValue || {} };
                });
            });
        }

        // function updateAlias(userToUpdate) {
        // 	var key = angular.copy(userToUpdate.$id),
        // 		ts = appUtils.getTimestamp();
        // 	var ref = firebaseDataRef.child('users/' + key);
        // 	return ref.update({ alias: userToUpdate.alias, managers: userToUpdate.managers || [], timestampModified: ts }).then(function () {
        // 		return { result: true, errorMsg: "" };
        // 	}).catch(function (error) {
        // 		return { result: false, errorMsg: error };
        // 	});
        // }

        function deleteUser(uid) {
            var ref = employees.child(uid),
                ts = appUtils.getTimestamp(),
                data = {
                    isDeleted: true,
                    timestampModified: ts
                };
            return compareUpdateValue(ref, data).then(function (diffValue) {
                //console.log(diffValue);
                return ref.update(data).then(function (result) {
                    //index user
                    index(uid);
                    return { result: true, diffValue: diffValue };
                }).catch(function (error) {
                    return { result: false, errorMsg: error, diffValue: diffValue };
                });
            });
        }

        function restoreUser(uid) {
            var ref = employees.child(uid),
                ts = appUtils.getTimestamp(),
                data = {
                    isDeleted: false,
                    timestampModified: ts
                };
            return compareUpdateValue(ref, data).then(function (diffValue) {
                //console.log(diffValue);
                // return ref.update(data).then(function(result) {
                return _update(uid).then(function (result) {
                    //index user
                    index(uid);
                    return { result: true, diffValue: diffValue };
                }).catch(function (error) {
                    return { result: false, errorMsg: error, diffValue: diffValue };
                });
            });
        }

        function resetPassword(email) {
            return authService.resetPasswordAuth(email);
        }

        function changePassword(newPass) {
            var currentUser = authService.getCurrentUser();
            return authService.changePasswordAuth(currentUser, newPass);
        }

        function authorizedUser(uid) {
            var ref = employees.child(uid),
                ts = appUtils.getTimestamp(),
                data = {
                    isAuthorized: true,
                    timestampModified: ts
                };

            return compareUpdateValue(ref, data).then(function (diffValue) {
                //console.log(diffValue);
                // return ref.update(data).then(function(result) {
                return _update(uid, data).then(function (result) {
                    //index user
                    index(uid);
                    return { result: true, diffValue: diffValue };
                }).catch(function (error) {
                    return { result: false, errorMsg: error, diffValue: diffValue };
                });
            });
        }

        function unAuthorizedUser(uid) {
            var ref = employees.child(uid),
                ts = appUtils.getTimestamp(),
                data = {
                    isAuthorized: false,
                    timestampModified: ts
                };

            return compareUpdateValue(ref, data).then(function (diffValue) {
                //console.log(diffValue);
                // return ref.update(data).then(function(result) {
                return _update(uid, data).then(function (result) {
                    //index user
                    index(uid);
                    return { result: true, diffValue: diffValue };
                }).catch(function (error) {
                    return { result: false, errorMsg: error, diffValue: diffValue };
                });
            });
        }

        function updateAvatar(uid, photoURL) {
            var ref = employees.child(uid),
                ts = appUtils.getTimestamp(),
                data = {
                    photoURL: photoURL,
                    timestampModified: ts
                };

            return compareUpdateValue(ref, data).then(function (diffValue) {
                //console.log(diffValue);
                // return ref.update(data).then(function(result) {
                return _update(uid, data).then(function (result) {
                    return { result: true, diffValue: diffValue };
                }).catch(function (error) {
                    return { result: false, errorMsg: error, diffValue: diffValue };
                });
            });
        }

        function updateLastAddedShift(uid, lastAddedShift) {
            var ref = employees.child(uid),
                ts = appUtils.getTimestamp(),
                data = {
                    lastAddedShift: lastAddedShift,
                    timestampModified: ts
                };

            return compareUpdateValue(ref, data).then(function (diffValue) {
                let lastAddedShift = _.find(diffValue, function (i) { return i.field == 'lastAddedShift'; });
                if (lastAddedShift.new <= lastAddedShift.old) {
                    return { result: false, errorMsg: '', diffValue: diffValue };
                }
                // return ref.update(data).then(function(result) {
                return _update(uid, data).then(function (result) {
                    return { result: true, diffValue: diffValue };
                }).catch(function (error) {
                    return { result: false, errorMsg: error, diffValue: diffValue };
                });
            });
        }

        function checkPhoneExist(phone) {
            if ($.trim(phone) === '') {
                return $q.when({ data: [] });
            }
            return employees.orderByChild('primaryPhone').equalTo(phone).once('value').then(function (snapshot) {
                if (snapshot && snapshot.val()) {
                    var user = _.find(snapshot.val(), function (value, key) {
                        value.$id = key;
                        return !value.isDeleted || value.isDeleted === '';
                    });
                    return { data: user || null };
                }
                return $q.when({ data: [] });
            });
        }

        function checkUniqueRepcode(repCode) {
            if ($.trim(repCode) === '') {
                return $q.when({ data: [] });
            }
            return employees.orderByChild('repCode').equalTo(repCode).once('value').then(function (snapshot) {
                if (snapshot && snapshot.val()) {
                    var user = _.find(snapshot.val(), function (value, key) {
                        value.$id = key;
                        return !value.isDeleted || value.isDeleted === '';
                    });
                    return { data: user || null };
                }
                return $q.when({ data: [] });
            });
        }

        function checkUserIsDeleted(email) {
            return employees.orderByChild('email').equalTo(email).once('value').then(function (snapshot) {
                if (snapshot && snapshot.val()) {
                    var user = _.find(snapshot.val(), function (value, key) {
                        value.$id = key;
                        return value.isDeleted;
                    });
                    return user || null;
                }
                return null;
            });
        }

        function searchQuery(cri) {

            var searchSetting = $rootScope.storage.appSettings.elasticSearch.users;
            //create query
            var query = {
                index: searchSetting.index,
                type: searchSetting.type,
                size: parseInt(cri.size),
                from: parseInt(cri.from)
            };

            query.body = {};
            query.body.query = {
                bool: {
                    must_not: [],
                    must: []
                }
            };

            var queryBody = query.body.query.bool;
            //search by keyword
            if ($.trim(cri.keyword) !== '') {
                queryBody.must.push({
                    match_phrase_prefix: {
                        _all: cri.keyword
                    }
                });
            }

            //search by authorized/unauthorized
            if (cri.isAuthorized !== undefined) {
                queryBody.must.push({
                    match: {
                        isAuthorized: cri.isAuthorized
                    }
                });
            }

            //search all employee but ignore 1 employee with id
            if (cri.ignoreEmployee) {
                queryBody.must_not.push({
                    match: {
                        _id: cri.ignoreEmployee
                    }
                });
            }

            //search by role
            if (cri.role) {
                var roles = (cri.role + '').split(',');
                var roleQuery = {
                    bool: {
                        should: []
                    }
                };
                _.each(roles, function (role) {
                    var bool = {
                        exists: {
                            field: 'acl.roles.' + _.trim(role)
                        }
                    };
                    roleQuery.bool.should.push(bool);
                });
                queryBody.must.push(roleQuery);
            }


            //search by manager & alias
            if (cri.alias && $.trim(cri.alias) !== '' && cri.alias.replace(/'/g, "") !== 'All') {
                var aliasQuery = {
                    bool: {
                        should: []
                    }
                };

                aliasQuery.bool.should.push({
                    match: {
                        managers: cri.alias
                    }
                });

                aliasQuery.bool.should.push({
                    match: {
                        alias: cri.alias
                    }
                });

                queryBody.must.push(aliasQuery);
            }

            //search all employee and move to top with employeeId
            if (cri.employeeId) {
                queryBody.must.push({
                    match: {
                        _id: cri.employeeId
                    }
                });

                var bool = {};
                /* jshint ignore:start */
                bool['_script'] = {
                    type: 'number',
                    script: {
                        lang: 'painless',
                        inline: "doc['uid.raw'].value == '" + cri.employeeId + "' ? 0 : 1;", // source for 6.0
                        params: {
                            factor: 1.1
                        }
                    },
                    order: "asc"
                };
                /* jshint ignore:end */
                query.body.sort = {};
                query.body.sort = bool;
            }

            if (cri.ids) {
                queryBody.must.push({
                    ids: {
                        values: cri.ids //['VuV2KhqJnhbkYwfwxu4aVLrHNnW2']
                    }
                });
                //  queryBody.filter = {
                //     ids: {
                //         values: ['VuV2KhqJnhbkYwfwxu4aVLrHNnW2']
                //     }
                // };
            }

            if (cri.licenseExp) {
                queryBody.must.push({
                    range: {
                        licenseExps: {
                            gte: parseInt(cri.timestampStart),
                            lte: parseInt(cri.timestampEnd)
                        }
                    }
                });
            }

            if (cri.licenseType !== undefined && _.trim(cri.licenseType) !== 'All') {
                queryBody.must.push({
                    exists: {
                        field: 'licenseTypes.' + cri.licenseType
                    }
                });
            }

            if (cri.hireType && _.trim(cri.hireType) !== 'All') {
                queryBody.must.push({
                    match: {
                        typeOfHire: cri.hireType
                    }
                });
            }

            if (cri.states && $.trim(cri.states) !== '' && cri.states.replace(/'/g, "") !== 'All') {
                var states = (cri.states + '').split(',');
                var stateQuery = {
                    bool: {
                        should: []
                    }
                };
                _.each(states, function (state) {
                    bool = {
                        exists: {
                            field: 'workingStates.' + state
                        }
                    };
                    stateQuery.bool.should.push(bool);
                });
                queryBody.must.push(stateQuery);
            }

            if (cri.issuingStates && $.trim(cri.issuingStates) !== '' && cri.issuingStates.replace(/'/g, "") !== 'All') {
                var issuingStates = (cri.issuingStates + '').split(',');
                var issuingStatesQuery = {
                    bool: {
                        should: []
                    }
                };
                _.each(issuingStates, function (issuingState) {
                    bool = {
                        exists: {
                            field: 'issuingStates.' + issuingState
                        }
                    };
                    issuingStatesQuery.bool.should.push(bool);
                });
                queryBody.must.push(issuingStatesQuery);
            }

            //Filter multiple territory
            if (cri.territories && $.trim(cri.territories) !== '' && cri.territories.replace(/'/g, "") !== 'All') {
                var territories = (cri.territories + '').split(',');
                var territoryQuery = {
                    bool: {
                        should: []
                    }
                };
                _.each(territories, function (territory) {
                    bool = {
                        exists: {
                            field: 'workingTerritories.' + territory
                        }
                    };
                    territoryQuery.bool.should.push(bool);
                });
                queryBody.must.push(territoryQuery);
            }

            //filter by managers
            if (cri.requester && $.trim(cri.requester) !== '' && cri.requester.replace(/'/g, "") !== 'All') {
                var requesterQuery = {
                    bool: {
                        should: []
                    }
                };

                requesterQuery.bool.should.push({
                    match: {
                        managers: cri.requester
                    }
                });

                requesterQuery.bool.should.push({
                    match: {
                        alias: cri.requester
                    }
                });

                queryBody.must.push(requesterQuery);
            }
            //console.log('cri.sort', JSON.parse(JSON.stringify(cri)));

            if (cri.sort && $.trim(cri.sort) !== '') {

                //console.log('cri.sort', cri.sort);

                if (cri.sort.indexOf(':') === -1) { //already had sort clause
                    query.sort = cri.sort + ':desc';
                } else {
                    query.sort = cri.sort;
                }
            } else {
                query.sort = ['repCode.keyword', 'firstName.keyword', 'lastName.keyword'];
            }

            //console.log(query);
            return query;
        }

        function search(cri) {
            var query = searchQuery(cri);
            return searchService.search(query, 'users');
        }

        function getEmployeeHistory(cri) {
            var result = {
                items: [],
                totalRecords: 0
            };

            var ref = employeeLogRef.child(cri.uid).orderByKey().startAt(cri.timestampStart + '').endAt(cri.timestampEnd + '').once("value");
            return ref.then(function (res) {
                var data = res.val();
                if (data !== null) {
                    var items = _.map(data, function (val, key) {
                        val.timestampCreated = key;
                        return val;
                    });

                    result.items = items.sort(function (a, b) {
                        return b.timestampCreated - a.timestampCreated;
                    });
                    result.totalRecords = items.length;
                }
                return result;
            });
        }

        function addUserToRole(userIds, roleName) {
            //Add Role
            var reqs = [],
                ts = appUtils.getTimestamp(),
                employeeTracking = [];
            var currentUser = authService.getCurrentUser();
            _.forEach(userIds, function (id) {
                var req = getUser(id).then(function (res) {
                    var ref = firebaseDataRef.child('users/' + id);
                    if (res) {
                        var acl = {
                            roles: {}
                        };

                        if (res.acl) {
                            acl = res.acl;
                        }

                        if (!acl.roles) {
                            acl.roles = {};
                        }

                        acl.roles[roleName] = true;

                        //Employee Log
                        var tracking = {
                            id: id,
                            data: {
                                action: appUtils.logEmployeeAction.updateProfile.value,
                                updateBy: currentUser.email || ''
                            }
                        };

                        // return ref.update({
                        return _update(id, {
                            acl: acl,
                            timestampModified: ts
                        }).then(function (rs) {
                            tracking.data.status = 'Success';
                            tracking.data.message = 'Changed role.';
                            employeeTracking.push(tracking);
                        }).catch(function (err) {
                            tracking.data.status = 'Failed';
                            tracking.data.message = 'Change role has error.';
                            employeeTracking.push(tracking);
                        });
                    }
                });
                reqs.push(req);
            });

            return $q.all(reqs).then(function (result) {
                return { result: true, tracking: employeeTracking };
            }).catch(function (error) {
                return { result: false, errorMsg: error, tracking: employeeTracking };
            });
        }

        function saveUserRole(user) {
            var ts = appUtils.getTimestamp();
            var uid = angular.copy(user.$id),
                ref = employees.child(uid);

            user = DataUtils.stripDollarPrefixedKeys(user);
            var dataUpdate = { alias: user.alias, acl: user.acl, managers: user.managers || [], timestampModified: ts };
            return compareUpdateValue(ref, dataUpdate).then(function (diffValue) {
                //console.log(diffValue);
                // return ref.update(dataUpdate).then(function(res) {
                return _update(uid, dataUpdate).then(function (result) {
                    DataUtils.updateTimeStampModifiedNode('users');

                    //trigger to generate Availability for that user.
                    var isRep = appUtils.checkSpecifyRole(user, 'rep');
                    if(!isRep){
                        //call to API
                        console.log('not Rep.....', autoGenerateConfig);
                        $http({
                            method: 'GET',
                            url: autoGenerateConfig.apiUrl + uid
                        }).then((res) => {
                            console.log(res.status, res.data);
                        });
                    }
                    return { result: true, diffValue: diffValue };
                }).catch(function (error) {
                    return { result: false, errorMsg: error, diffValue: diffValue };
                });
            });
        }

        function compareUpdateValue(ref, newData) {
            var compare = null;
            return DataUtils.getDataFirebaseLoadOnce(ref, true).then(function (oldData) {
                if (oldData) {
                    compare = _.omitBy(newData, function (value, key) {
                        if (key === 'acl') {
                            var oldRe = Object.keys(oldData[key].roles),
                                newRe = Object.keys(value.roles);
                            return _.isEqual(newRe, oldRe);
                        }
                        return _.isEqual(value, oldData[key]);
                    });
                    return _mapObj(compare, oldData);
                }
                return null;
            });
        }

        function _mapObj(compare, oldData) {
            var result = [];
            if (compare) {
                _.forEach(compare, function (value, key) {
                    if (key !== 'timestampCreated' && key != 'timestampModified' && key != '$id') {
                        var obj = {
                            field: key,
                            old: oldData[key] !== undefined ? oldData[key] : '',
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

        function _update(id, updateData) {
            var parentRef = firebaseDataRef.child('users'),
                ref = parentRef.child(id);
            return ref.update(updateData).then(function (res) {
                return index(id).then(function () {
                    return res;
                }).catch(function () {
                    return res;
                });
            });
        }

        function index(id) {
            var setting = $rootScope.storage.appSettings.elasticSearch.users;
            return searchService.index(id, setting);
        }

        function getAvailability(cri, allStates) {
            //console.log('getAvailability', cri);

            var query = searchQuery({
                from: 0,
                size: 0,
                // alias: cri.alias,
                isAuthorized: true,
                alias: cri.alias,
                // states: cri.state
            });

            // // query.body = {};
            // query.body.query = {
            //     bool: {
            //         must_not: [],
            //         must: []
            //     }
            // };
            var queryBody = query.body.query.bool;
           
            var bool = {
                multi_match: {
                    query: 'CORP',
                    type: "phrase_prefix",
                    fields: ["alias"]
                }
            };
            queryBody.must_not.push(bool);

            query.body.aggs = {};
            // query.body.aggs = {
            //     groupByState:
            //         { terms: { field: "workingStates.*", include: [true], size: 10000 }, }
            // };
            _.forEach(allStates, function (stateItem) {
                query.body.aggs[stateItem.iso] = {
                    terms: {
                        field: "workingStates." + stateItem.iso,
                        include: [true],
                        size: 10000
                    },
                    aggs: {
                        users: {
                            top_hits: {
                                size: 20000
                            }
                        }
                    }
                };
                // _.forEach(daysOfWeek, function (day) {
                //     query.body.aggs[stateItem.iso].aggs[day] = {
                //         terms: {
                //             field: "availability." + day,
                //             include: [status],
                //             size: 20000
                //         },
                //         aggs: {
                //             users: {
                //                 top_hits: {
                //                     size: 20000
                //                 }
                //             }
                //         }
                //     };
                // });
            });

            query.body.aggs.US = {
                terms: {
                    field: "_type",
                    include: 'user',
                    size: 10000
                },
                aggs: {
                    users: {
                        top_hits: {
                            size: 20000
                        }
                    }
                }
            };
            // _.forEach(daysOfWeek, function (day) {
            //     query.body.aggs.US.aggs[day] = {
            //         terms: {
            //             field: "availability." + day,
            //             include: [status],
            //             size: 20000
            //         },
            //         aggs: {
            //             users: {
            //                 top_hits: {
            //                     size: 20000
            //                 }
            //             }
            //         }
            //     };
            // });

            // _.forEach(daysOfWeek, function (day) {
            //     query.body.aggs[day] = {
            //         terms: {
            //             field: "availability." + day,
            //             include: [status],
            //             size: 20000
            //         },
            //         aggs: {
            //             users: {
            //                 top_hits: {
            //                     size: 20000
            //                 }
            //             }
            //         }
            //     };
            // });

            return searchService.search(query, 'users').then(function (rs) {
                var aggregations = (rs && rs.aggregations) || null;
                var result = null;
                if (aggregations) {
                    result = {};
                    _.forEach(aggregations, function (itemState, isoState) {
                        if (itemState) {
                            let aggregationsByState = itemState.buckets && itemState.buckets.length > 0 ? itemState.buckets[0] : {};
                            result[isoState] = {};
                            // _.forEach(daysOfWeek, function (day) {
                            // var buckets = (aggregationsByState[day] && aggregationsByState[day].buckets) || null;
                            if (aggregationsByState) {
                                // var bucket = buckets[0];
                                var users = (aggregationsByState && aggregationsByState.users && aggregationsByState.users.hits && aggregationsByState.users.hits.hits) || [];
                                result[isoState] = {
                                    count: (aggregationsByState && aggregationsByState.doc_count) || 0,
                                    users: searchService.convertDataSnapshot(users, '')
                                };
                            }
                            // });
                        }
                    });
                }

                return result;
            });
        }


        function validateUserModel(model){

            if(!model.displayName){
                model.displayName = '';
            }

            if(!model.firstName){
                model.firstName = '';
            }

            if(!model.lastName){
                model.lastName = '';
            }
            
            if(!model.address){
                model.address = '';
            }

            if(!model.city){
                model.city = '';
            }

            if(!model.zipCode){
                model.zipCode = '';
            }

            if(!model.primaryPhone){
                model.primaryPhone = '';
            }

            if(!model.notificationEmail){
                model.notificationEmail = '';
            }

            return model;
        }
    }
})();