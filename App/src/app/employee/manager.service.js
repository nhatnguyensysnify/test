(function() {
    'use strict';
    angular.module('app.employee').factory('managerService', managerService);
    /** @ngInject **/
    function managerService($rootScope, firebaseDataRef, departmentSevice, employeeService, memAppSnapshotService, appUtils, DataUtils, searchService) {
        var employeeRef = firebaseDataRef.child('users'),
            eventRef = firebaseDataRef.child('events'),
            applicationRef = firebaseDataRef.child('membership-applications');

        var service = {
            moveAllData: moveAllData,
            replaceManager: replaceManager,
            replaceManagersEvent: replaceManagersEvent,
            _generateAclEmployee: _generateAclEmployee,
            _generateAliasEmployee: _generateAliasEmployee,
            _generateManagersApplication: _generateManagersApplication,
            _deleteApplication: _deleteApplication
        };

        return service;

        function moveAllData(fromNode, toNode, index) {
            var types = ['users', 'events', 'applications'];
            if (!index) {
                index = 0;
            }
            return moveData(fromNode, toNode, types[index]).then(function() {
                if ((index + 1) < types.length) {
                    console.log('start: ' + types[index + 1]);
                    return moveAllData(fromNode, toNode, index + 1);
                }
                return true;
            });
        }

        function moveData(fromNode, toNode, dataType, from) {
            // console.log(fromNode);
            // console.log(toNode);
            console.log('====================');
            var settings = _getSettingsByType(dataType),
                ts = appUtils.getTimestamp(),
                fAlias = fromNode.alias && fromNode.alias.split(','),
                // fManagers = fromNode.managers,
                tAlias = toNode.alias && toNode.alias.split(',')[0],
                tManagers = toNode.managers || [],
                newManagers = angular.copy(tManagers);

            newManagers.unshift(tAlias);

            // console.log(angular.copy(fAlias));
            // console.log(angular.copy(tAlias));
            // console.log(angular.copy(tManagers));
            // console.log(angular.copy(newManagers));
            console.log('++++++++++++++++++++++++++');
            var query = {
                index: settings.elastic.index,
                type: settings.elastic.type,
                size: 100,
                from: from || 0,
                body: {
                    query: {
                        bool: {
                            must: []
                        }
                    }
                }
            };
            // search by alias
            query.body.query.bool.must.push({
                bool: {
                    should: _.map(fAlias, function(alias) {
                        return { match: { managers: alias } };
                    })
                }
            });

            return searchService.search(query, settings.path).then(function(rs) {
                //console.log(rs);
                var total = rs.totalRecords,
                    to = query.from + query.size,
                    data = rs && rs.items || [],
                    update = {},
                    updateSnapshot = null;
                if (dataType == 'applications') {
                    updateSnapshot = {};
                }

                _.forEach(data, function(item) {
                    var hasManagerRefs = !!item.managerRefs,
                        managerRefs = item.managerRefs || [item.managers];
                    _.each(managerRefs, function(itemManagers, maRefIndex) {
                        if (!itemManagers) {
                            itemManagers = [];
                        }
                        var index = null;
                        for (var i = 0; i < fAlias.length; i++) {
                            index = itemManagers.indexOf(fAlias[i]);
                            if (index > -1) {
                                break;
                            }
                        }
                        if (index > -1) {
                            var slice = angular.copy(itemManagers).slice(0, index),
                                updateManagers = slice.concat(newManagers);
                            managerRefs[maRefIndex] = updateManagers;
                            if (hasManagerRefs) {
                                update[item.$id + '/managerRefs/' + maRefIndex] = updateManagers;
                            }
                            // update[item.$id + '/managers'] = updateManagers;
                            // update[item.$id + '/timestampModified'] = ts;
                        }
                    }); // end ManagerRefs
                    item.managers = _.uniq(_.flatten(managerRefs));

                    if (dataType == 'applications') {
                        update[item.appId + '/managers'] = item.managers;
                        update[item.appId + '/timestampModified'] = ts;
                        updateSnapshot[item.$id + '/managers'] = item.managers;
                        updateSnapshot[item.$id + '/timestampModified'] = ts;
                    } else {
                        update[item.$id + '/managers'] = item.managers;
                        update[item.$id + '/timestampModified'] = ts;
                    }
                });
                // console.log(update);
                // console.log(updateSnapshot);
                var promise = settings.ref.update(update);
                if (updateSnapshot) {
                    promise = promise.then(function() {
                        return settings.snapshotRef.update(updateSnapshot);
                    });
                }
                return promise.then(function() {
                    if (total > to) {
                        return moveData(fromNode, toNode, dataType, to);
                    }
                    return true;
                });
            });

        }


        function replaceManager(alias, managers, type, from) {
            var settings = _getSettingsByType(type);
            var ts = appUtils.getTimestamp();
            var query = {
                index: settings.elastic.index,
                type: settings.elastic.type,
                size: 100,
                from: from || 0
            };

            query.body = {};
            query.body.query = {
                bool: {
                    must: [{
                        match: {
                            managers: alias
                        }
                    }]
                }
            };
            // console.log('replaceManager');
            // console.log(query);
            return searchService.search(query, settings.path).then(function(rs) {
                var total = rs.totalRecords,
                    to = query.from + query.size,
                    data = rs && rs.items || [],
                    update = {};

                _.forEach(data, function(item) {
                    if (!item.managers) {
                        item.managers = [];
                    }
                    var index = item.managers.indexOf(alias);
                    if (index !== -1) {
                        var slice = angular.copy(item.managers).slice(0, index),
                            updateManagers = slice.concat(managers);
                        update[item.$id + '/managers'] = updateManagers;
                        update[item.$id + '/timestampModified'] = ts;
                    }
                });

                settings.ref.update(update).then(function() {
                    if (total > to) {
                        replaceManager(alias, managers, type, to);
                    }
                });
            });
        }

        function replaceManagersEvent(from, alias) {
            var settings = $rootScope.storage.appSettings.elasticSearch.events;
            var ts = appUtils.getTimestamp();
            var query = {
                index: settings.index,
                type: settings.type,
                size: 100,
                from: from || 0
            };

            query.body = {};
            if (alias) {
                query.body.query = {
                    bool: {
                        must: [{
                            match: {
                                managers: alias
                            }
                        }]
                    }
                };
            } else {
                query.body.query = {
                    match_all: {}
                };
            }
            return searchService.search(query, 'events').then(function(rs) {
                var total = rs.totalRecords,
                    to = query.from + query.size,
                    data = rs && rs.items || [],
                    update = {},
                    all = [];

                _.forEach(data, function(item) {
                    var managerIds = [];
                    if (item.requester) {
                        var requesterIds = Object.keys(item.requester);
                        if (requesterIds && requesterIds.length > 0) {
                            managerIds = managerIds.concat(requesterIds);
                        }
                    }

                    if (item.representativeAttended) {
                        var representativeIds = Object.keys(item.representativeAttended);
                        if (representativeIds && representativeIds.length > 0) {
                            managerIds = managerIds.concat(representativeIds);
                        }
                    }
                    var managers = [],
                        reqs = [];
                    if (managerIds && managerIds.length > 0) {
                        _.forEach(managerIds, function(managerId, index) {
                            var req = employeeService.getUser(managerId).then(function(user) {
                                if (user) {
                                    var managerRef = [];
                                    if (user.managers && user.managers.length > 0) {
                                        managerRef = user.managers;
                                    }
                                    if (user.alias) {
                                        managerRef.unshift(user.alias);
                                    }
                                    update[item.$id + '/managerRefs/' + index] = managerRef;
                                    managers = managers.concat(managerRef);
                                }
                            });
                            reqs.push(req);
                        });
                    }
                    var reqAll = Promise.all(reqs).then(function() {
                        update[item.$id + '/managers'] = _.uniq(_.flatten(managers));
                        update[item.$id + '/timestampModified'] = ts;
                    });
                    all.push(reqAll);
                });

                return Promise.all(all).then(function() {
                    return eventRef.update(update).then(function() {
                        //console.log('finish : ' + to);
                        if (total > to) {
                            replaceManagersEvent(to, alias);
                        }
                    });
                });
            });
        }

        function _getSettingsByType(type) {
            var settings = null;
            switch (type) {
                case 'users':
                    settings = {
                        elastic: $rootScope.storage.appSettings.elasticSearch.users,
                        ref: employeeRef,
                        path: 'users'
                    };
                    break;
                case 'events':
                    settings = {
                        elastic: $rootScope.storage.appSettings.elasticSearch.events,
                        ref: eventRef,
                        path: 'events'
                    };
                    break;
                case 'applications':
                    settings = {
                        elastic: $rootScope.storage.appSettings.elasticSearch.application,
                        ref: applicationRef,
                        snapshotRef: firebaseDataRef.child('membership-application-snapshot'),
                        path: 'membership-applications'
                    };
                    break;
                default:
                    break;
            }
            return settings;
        }

        function _generateAclEmployee(roles) {
            var ts = appUtils.getTimestamp();
            return employeeRef.once('value').then(function(snap) {
                var data = snap && snap.val();
                var reqs = [];
                _.forEach(data, function(item, uid) {
                    var acl = {
                        roles: {}
                    };
                    if (item.userRoles && item.userRoles.length > 0) {
                        _.forEach(item.userRoles, function(roleId) {
                            if (roles[roleId]) {
                                acl.roles[roleId] = true;
                            }
                        });
                        if (Object.keys(acl.roles).length === 0) {
                            acl.roles['-KTlccaZaxPCGDaFPSc5'] = true;
                        }
                    } else {
                        if (!item.acl) {
                            acl.roles['-KTqlt0WbRBekRyP6pYN'] = true;
                        }
                    }

                    var req = employeeRef.child(uid).update({ managers: [], acl: acl, timestampModified: ts });
                    reqs.push(req);
                });

                return Promise.all(reqs);
            });
        }

        function _generateAliasEmployee(roles) {
            var ts = appUtils.getTimestamp();
            return employeeRef.once('value').then(function(snap) {
                var data = snap && snap.val();
                var reqs = [];
                var index = 1;
                _.forEach(data, function(item, uid) {
                    var myRoles = angular.copy(item.acl && item.acl.roles);
                    if (myRoles) {
                        var assigned = [];
                        _.forEach(Object.keys(myRoles), function(roleId) {
                            if (roles[roleId]) {
                                roles[roleId].id = roleId;
                                assigned.push(roles[roleId]);
                            }
                        });

                        //console.log(assigned);
                        var highestRole = _.minBy(assigned, 'number');
                        if (highestRole) {
                            var acl = {
                                roles: {}
                            };
                            acl.roles[highestRole.id] = true;
                            var alias = highestRole.prefix + '_' + index;
                            index++;
                            item.alias = alias;
                            item.$id = uid;
                            var req = employeeRef.child(uid).update({ managers: [], alias: alias, acl: acl, timestampModified: ts }).then(function() {
                                departmentSevice.create(item);
                            });
                            reqs.push(req);
                        }
                    }
                });
                //console.log(index);
                return Promise.all(reqs);
            });
        }

        function _generateManagersApplication(from) {
            var searchSetting = $rootScope.storage.appSettings.elasticSearch.application;
            var ts = appUtils.getTimestamp();
            var query = {
                index: searchSetting.index,
                type: searchSetting.type,
                size: 500,
                from: from || 0
            };

            query.body = {};
            query.body.query = {
                match_all: {}
            };

            return searchService.search(query, 'membership-applications').then(function(rs) {
                var total = rs.totalRecords,
                    to = query.from + query.size;
                var data = rs && rs.items || [],
                    reqs = [];
                _.forEach(data, function(item) {
                    var repCode = item.representativeCode || 'null';
                    var req = employeeService.getUserByRepCode(repCode).then(function(user) {
                        var managers = [];
                        if (user && user.managers && user.managers.length > 0) {
                            managers = user.managers;
                        }
                        if (user && user.alias) {
                            managers.unshift(user.alias);
                        }
                        var update = { managers: managers, timestampModified: ts };
                        if (item.appId) {
                            return applicationRef.child(item.appId).update(update).then(function() {
                                return memAppSnapshotService.create(item.appId);
                            });
                        }
                    });
                    reqs.push(req);
                });
                return Promise.all(reqs).then(function() {
                    console.log('finish : ' + to);
                    if (total > to) {
                        _generateManagersApplication(to);
                    }
                });
            });
        }

        function _deleteApplication(from) {
            var searchSetting = $rootScope.storage.appSettings.elasticSearch.application;
            var ts = appUtils.getTimestamp();
            var query = {
                index: searchSetting.index,
                type: searchSetting.type,
                size: 500,
                from: from || 0
            };

            query.body = {};
            query.body.query = {
                match_all: {}
            };

            return searchService.search(query, 'membership-applications').then(function(rs) {
                console.log(rs);
                var total = rs.totalRecords,
                    to = query.from + query.size;
                var data = rs && rs.items || [],
                    reqs = [];
                _.forEach(data, function(item) {
                    reqs.push(applicationRef.child(item.$id).remove());
                });
                return Promise.all(reqs).then(function() {
                    console.log('finish : ' + to);
                    if (total > to) {
                        _deleteApplication(to);
                    }
                });
            });
        }
    }
})();