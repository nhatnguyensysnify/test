(function () {
    'use strict';
    angular.module('app.membership').factory('memAppService', memAppService);
    /** @ngInject **/
    function memAppService($q, $rootScope, firebaseDataRef, $firebaseObject, employeeService, eventQueueService, appUtils, DataUtils, memAppSnapshotService, membershipSnapshotService, memAppDeviceInfoService, searchService) {
        var items = firebaseDataRef.child('membership-applications');
        var searchRef = firebase.database().ref("/membership-application-snapshot");

        var service = {
            getById: getById,
            getByEvent: getByEvent,
            getWithLoad: getWithRealtime,
            recycleFile: recycleFile,
            getWaivedSetupFee: getWaivedSetupFee,
            create: create,
            update: update,
            remove: remove,
            getPaymentMethodTxt: getPaymentMethodTxt,
            updateMemberShipId: updateMemberShipId,
            changeAppStatus: changeAppStatus,
            search: search,
            searchByEvents: searchByEvents,
            updateProcessFile: updateProcessFile,
            updatePhysicalFiles: updatePhysicalFiles,
            markPriority: markPriority,
            lockSubmitApp: lockSubmitApp,
            unlockSubmitApp: unlockSubmitApp,
            clearApplicationDataForTesting: clearApplicationDataForTesting,
            getApplicationSnapshot: getApplicationSnapshot,
            getDataGolbalReport: getDataGolbalReport
            //searchQuery: searchQuery,
            //searchVerifiedQuery: searchVerifiedQuery,
            //searchApplicationByAuthor: searchApplicationByAuthor,
        };
        
        var searchedItems = {};

        return service;

        function getById(id) {
            var ref = firebaseDataRef.child('membership-applications/' + id);
            // load not cache
            return DataUtils.getDataFirebaseLoadOnce(ref, true);
        }

        function getByEvent(eventId) {
            // return searchRef.orderByChild('eventId').equalTo(eventId).once('value').then(function (snapshot) {
            //     return DataUtils.toAFArray(snapshot && snapshot.val() || []);
            // });
            var searchSetting = $rootScope.storage.appSettings.elasticSearch.application;
            //create query
            var query = {
                index: searchSetting.index,
                type: searchSetting.type,
                size: 5000,
                from: 0
            };

            query.body = {};
            query.body.query = {
                bool: {
                    must: [{
                        multi_match: {
                            query: eventId,
                            type: "phrase_prefix",
                            fields: ["eventId"]
                        }
                    }]
                }
            };

            return searchService.search(query, 'membership-application-snapshot');
        }

        function getApplicationSnapshot(appId) {
            return searchRef.orderByChild('appId').equalTo(appId).once('value').then(function (snapshot) {
                if (snapshot && snapshot.val()) {
                    var application = _.find(snapshot.val(), function (value, key) {
                        value.$id = key;
                        return value;
                    });

                    return application || null;
                }
                return null;
            });
        }

        function getWithRealtime(id) {
            var ref = firebaseDataRef.child('membership-applications/' + id);
            // return $firebaseObject(ref).$loaded().then(function (data) {
            //   return data || null;
            // });
            return DataUtils.getDataFirebaseLoadOnce(ref, true).then(function (data) {
                return data || null;
            });
        }

        function getWaivedSetupFee(id) {
            var ref = firebaseDataRef.child('membership-applications/' + id + '/waivedSetupFee');
            return DataUtils.getDataFirebaseLoadOnce(ref);
        }

        function recycleFile(appId, data) {
            var ts = appUtils.getTimestamp();
            var ref = firebaseDataRef.child('membership-applications/' + appId);
            return ref.update({
                physicalFiles: DataUtils.stripDollarPrefixedKeys(data)
            }).then(function () {
                firebaseDataRef.child('membership-applications/' + appId).update({ timestampModified: ts });
                return { result: true, errorMsg: "" };
            }).catch(function (error) {
                console.log(error);
                return { result: false, errorMsg: error.message };
            });
        }

        function create(add) {
            var ts = appUtils.getTimestamp();
            if (add.signatureDate !== '') {
                var timestamp = moment(add.signatureDate).startOf('day').valueOf();
                if (_.isNaN(timestamp)) {
                    add.timestampSignatured = ts;
                } else {
                    add.timestampSignatured = timestamp;
                }
            } else {
                add.timestampSignatured = ts;
            }

            add.timestampCreated = add.timestampModified = ts;
            add.isOffline = false;
            var key = items.push().key;
            var repCode = add.representativeCode || 'null';
            return employeeService.getUserByRepCode(repCode).then(function (user) {
                var managers = [];
                if (user) {
                    if (user.managers && user.managers.length > 0) {
                        managers = user.managers;
                    }
                    if (user.alias) {
                        managers.unshift(user.alias);
                    }
                }
                add.managers = managers;
                add = DataUtils.stripDollarPrefixedKeys(add);
                return items.child(key).update(add).then(function (rs) {
                    // memAppSnapshotService.create(key);
                    memAppSnapshotService.create(key, {priority: true});

                    memAppDeviceInfoService.create(key);
                    // if(add.eventId && _.trim(add.eventId) !== '' && (add.status === 4 || _.trim(add.status + '') === '4' || add.status === 8 || _.trim(add.status + '') === '8')){
                    if (add.eventId && _.trim(add.eventId) !== '') {
                        eventQueueService.create(add.eventId);
                    }
                    return { result: true, errorMsg: "", id: key };
                }).catch(function (error) {
                    console.log(error);
                    return { result: false, errorMsg: error.message };
                });
            });

        }

        function updateMemberShipId(id, membershipId) {
            var ref = firebaseDataRef.child('membership-applications/' + id),
                ts = appUtils.getTimestamp();
            return DataUtils.getDataFirebaseLoadOnce(ref).then(function (data) {
                if (data) {
                    data.membershipId = membershipId;
                    return ref.update({
                        membershipId: membershipId,
                        timestampModified: ts
                    }).then(function () {
                        memAppSnapshotService.update(id || '');
                        memAppDeviceInfoService.create(id);
                        var memberRef = firebaseDataRef.child("/membership/" + membershipId);
                        if (parseInt(data.status) === 4) {
                            //handle update membership information if billing approved and create membership-snapshot
                            memberRef.update({
                                timestampCreated: data.timestampCreated,
                                isActive: true,
                                timestampModified: ts
                            }).then(function () {
                                membershipSnapshotService.create(membershipId || '');
                            });
                        } else {
                            //handle update membership information is not member and delete membership-snapshot
                            memberRef.update({
                                isActive: false,
                                timestampModified: ts
                            }).then(function () {
                                var snapRef = firebaseDataRef.child("/membership/" + membershipId + "/timestampCreated");
                                DataUtils.firebaseLoadOnce(snapRef, false).then(function (timeStamp) {
                                    if (timeStamp) {
                                        firebaseDataRef.child("/membership-snapshot/" + timeStamp).remove();
                                    }
                                });
                            });
                        }
                        return { result: true, errorMsg: "" };
                    }).catch(function (error) {
                        console.log(error);
                        return { result: false, errorMsg: error.message };
                    });
                }
                return { result: false, errorMsg: 'Item not found.' };
            });
        }

        function changeAppStatus(id, status) {
            var ref = firebaseDataRef.child('membership-applications/' + id),
                ts = appUtils.getTimestamp();
            return DataUtils.getDataFirebaseLoadOnce(ref).then(function (data) {
                if (data) {
                    return ref.update({
                        status: status,
                        timestampModified: ts
                    }).then(function () {
                        memAppSnapshotService.update(id || '');
                        memAppDeviceInfoService.create(id);
                        // if(data.eventId && _.trim(data.eventId) !== '' && (data.status === 4 || _.trim(data.status + '') === '4' || data.status === 8 || _.trim(data.status + '') === '8')){
                        if (data.eventId && _.trim(data.eventId) !== '') {
                            eventQueueService.create(data.eventId);
                        }
                        var memberRef = firebaseDataRef.child("/membership/" + data.membershipId);
                        if (parseInt(status) === 4) {
                            //handle update membership information if billing approved and create membership-snapshot
                            memberRef.update({
                                timestampCreated: data.timestampCreated,
                                isActive: true,
                                timestampModified: ts
                            }).then(function () {
                                membershipSnapshotService.create(data.membershipId || '');
                            });
                        } else {
                            //handle update membership information is not member and delete membership-snapshot
                            memberRef.update({
                                isActive: false,
                                timestampModified: ts
                            }).then(function () {
                                var snapRef = firebaseDataRef.child("/membership/" + data.membershipId + "/timestampCreated");
                                DataUtils.firebaseLoadOnce(snapRef, false).then(function (timeStamp) {
                                    if (timeStamp) {
                                        firebaseDataRef.child("/membership-snapshot/" + timeStamp).remove();
                                    }
                                });
                            });
                        }
                        return { result: true, errorMsg: "" };
                    }).catch(function (error) {
                        console.log(error);
                        return { result: false, errorMsg: error.message };
                    });
                }
                return { result: false, errorMsg: 'Item not found.' };
            });
        }

        function update(update) {
            var ts = appUtils.getTimestamp(),
                key = angular.copy(update.$id);
            if (update.signatureDate !== '') {
                var timestamp = moment(update.signatureDate).startOf('day').valueOf();
                if (_.isNaN(timestamp)) {
                    update.timestampSignatured = update.timestampCreated;
                } else {
                    update.timestampSignatured = timestamp;
                }
            } else {
                update.timestampSignatured = update.timestampCreated;
            }
            update.timestampModified = ts;
            var repCode = update.representativeCode || 'null';
            return employeeService.getUserByRepCode(repCode).then(function (user) {
                var managers = [];
                if (user && user.managers && user.managers.length > 0) {
                    managers = user.managers;
                }
                if (user && user.alias) {
                    managers.unshift(user.alias);
                }
                update.managers = managers;
                update = DataUtils.stripDollarPrefixedKeys(update);
                return items.child(key).update(update).then(function () {
                    var updateSnapshotR = memAppSnapshotService.update(key || '');
                    memAppDeviceInfoService.create(key);
                    //if(update.eventId && _.trim(update.eventId) !== '' && (update.status === 4 || _.trim(update.status + '') === '4' || update.status === 8 || _.trim(update.status + '') === '8')){
                    if (update.eventId && _.trim(update.eventId) !== '') {
                        eventQueueService.create(update.eventId);
                    }
                    var memberRef = firebaseDataRef.child("/membership/" + update.membershipId);
                    if (parseInt(update.status) === 4) {
                        //handle update membership information if billing approved and create membership-snapshot
                        memberRef.update({
                            timestampCreated: update.timestampCreated,
                            isActive: true,
                            timestampModified: ts
                        }).then(function () {
                            membershipSnapshotService.create(update.membershipId || '');
                        });
                    } else {
                        //handle update membership information is not member and delete membership-snapshot
                        memberRef.update({
                            isActive: false,
                            timestampModified: ts
                        }).then(function () {
                            var snapRef = firebaseDataRef.child("/membership/" + update.membershipId + "/timestampCreated");
                            DataUtils.firebaseLoadOnce(snapRef, false).then(function (timeStamp) {
                                if (timeStamp) {
                                    firebaseDataRef.child("/membership-snapshot/" + timeStamp).remove();
                                }
                            });
                        });
                    }
                    // return { result: true, errorMsg: "" };
                    return updateSnapshotR.then(function () {
                        return { result: true, errorMsg: "" };
                    });
                }).catch(function (error) {
                    console.log(error);
                    return { result: false, errorMsg: error.message };
                });
            });
        }
        /* old code will be remove */
        function _update(update) {
            var ts = appUtils.getTimestamp(),
                key = angular.copy(update.$id);
            if (update.signatureDate !== '') {
                var timestamp = moment(update.signatureDate).startOf('day').valueOf();
                if (_.isNaN(timestamp)) {
                    update.timestampSignatured = update.timestampCreated;
                } else {
                    update.timestampSignatured = timestamp;
                }
            } else {
                update.timestampSignatured = update.timestampCreated;
            }
            update.timestampModified = ts;
            var repCode = update.representativeCode || 'null';
            return employeeService.getUserByRepCode(repCode).then(function (user) {
                var managers = [];
                if (user && user.managers && user.managers.length > 0) {
                    managers = user.managers;
                }
                if (user && user.alias) {
                    managers.unshift(user.alias);
                }
                update.managers = managers;
                update = DataUtils.stripDollarPrefixedKeys(update);
                return items.child(key).update(update).then(function () {
                    memAppSnapshotService.update(key || '');
                    memAppDeviceInfoService.create(key);
                    //if(update.eventId && _.trim(update.eventId) !== '' && (update.status === 4 || _.trim(update.status + '') === '4' || update.status === 8 || _.trim(update.status + '') === '8')){
                    if (update.eventId && _.trim(update.eventId) !== '') {
                        eventQueueService.create(update.eventId);
                    }
                    var memberRef = firebaseDataRef.child("/membership/" + update.membershipId);
                    if (parseInt(update.status) === 4) {
                        //handle update membership information if billing approved and create membership-snapshot
                        memberRef.update({
                            timestampCreated: update.timestampCreated,
                            isActive: true,
                            timestampModified: ts
                        }).then(function () {
                            membershipSnapshotService.create(update.membershipId || '');
                        });
                    } else {
                        //handle update membership information is not member and delete membership-snapshot
                        memberRef.update({
                            isActive: false,
                            timestampModified: ts
                        }).then(function () {
                            var snapRef = firebaseDataRef.child("/membership/" + update.membershipId + "/timestampCreated");
                            DataUtils.firebaseLoadOnce(snapRef, false).then(function (timeStamp) {
                                if (timeStamp) {
                                    firebaseDataRef.child("/membership-snapshot/" + timeStamp).remove();
                                }
                            });
                        });
                    }
                    return { result: true, errorMsg: "" };
                }).catch(function (error) {
                    console.log(error);
                    return { result: false, errorMsg: error.message };
                });
            });
        }

        function updatePhysicalFiles(update) {
            var ref = firebaseDataRef.child('membership-applications/' + update.$id);
            return ref.update({
                physicalFiles: DataUtils.stripDollarPrefixedKeys(update.physicalFiles)
            }).then(function (result) {
                memAppDeviceInfoService.create(update.$id);
                return { result: true, errorMsg: "" };
            }).catch(function (error) {
                console.log(error);
                return { result: false, errorMsg: error.message };
            });
        }

        function markPriority(update, key) {
            var ref = firebaseDataRef.child('membership-applications/' + key);
            return ref.update({
                priority: update.priority === undefined ? false : update.priority
            }).then(function (result) {
                var updateSnapshotR = memAppSnapshotService.update(key || '');
                memAppDeviceInfoService.create(key);

                return updateSnapshotR.then(function () {
                    return { result: true, errorMsg: "" };
                });
                // return memAppSnapshotService.update(key);
            }).catch(function (error) {
                console.log(error);
                return { result: false, errorMsg: error.message };
            });
        }

        function remove(id) {
            var ref = firebaseDataRef.child('membership-applications/' + update.$id);
            return DataUtils.getDataFirebaseLoadOnce(ref).then(function (item) {
                if (item) {
                    var obj = {
                        uid: item.uid || '',
                        timestampCreated: item.timestampCreated || ''
                    };
                    return ref.remove().then(function () {
                        memAppSnapshotService.remove(obj);
                        return { result: true, errorMsg: "" };
                    }).catch(function (error) {
                        console.log(error);
                        return { result: false, errorMsg: error.message };
                    });
                }
                return { result: false, errorMsg: "Item could not be found!" };
            });
        }

        function getPaymentMethodTxt(val) {
            var text = _.result(_.find(appUtils.appPaymentMethods, function (obj) {
                return obj.key === val;
            }), 'value');

            return text;
        }

        function getDataGolbalReport(cri){
            var p, size = 10000;
            cri.size = 0;
			p = search(cri);
			return p.then(function(data){
				if(data && data.totalRecords !== 0){
					var pages = Math.ceil(data.totalRecords / size);
					var reqs = [];
					for(var i = 0; i < pages; i++){
						var _cri = angular.copy(cri);
						_cri.size = size;
						_cri.from = i * _cri.size;
						reqs.push(search(_cri));
					}
					return Promise.all(reqs).then(function(res){
						var result = [];
						if(res && res.length > 0){
							_.forEach(res, function(r){
								if(r && r.items && r.items.length > 0){
									result = result.concat(r.items);
								}
							});
						}
						return {items: result};
					});
				}
				return data;
			});
        }

        function search(cri) {
            // console.log(angular.copy(cri));
            var bool;
            var searchSetting = $rootScope.storage.appSettings.elasticSearch.application;
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
                    must: [],
                    must_not: [],
                    should: []
                }
            };

            var dateRange = {
                range: {
                    timestampCreated: {
                        gte: cri.timestampStart,
                        lte: cri.timestampEnd
                    }
                }
            };

            if (cri.isDashboard) {
                dateRange = {
                    range: {
                        timestampSignatured: {
                            gte: cri.timestampStart,
                            lte: cri.timestampEnd
                        }
                    }
                };
            }

            query.body.query.bool.must.push(dateRange);

            var statusCri = angular.copy(cri.status);
            if (statusCri === 'All' && cri.members) {
                statusCri = '4,8';
            }

            if (statusCri === '-1' && cri.event) {
                statusCri = 'All';
            }

            if (statusCri !== 'All') {
                var statuses = (statusCri + '').split(',');
                var statusQuery = {
                    bool: {
                        should: []
                    }
                };
                _.each(statuses, function (status) {
                    status = parseInt(status);
                    if (status && status === -1) {
                        var notStatuses = [4, 8, 6, 7];
                        _.each(notStatuses, function (s) {
                            var bool = {
                                match: {
                                    status: s
                                }
                            };
                            query.body.query.bool.must_not.push(bool);
                        });
                    } else {
                        bool = {
                            match: {
                                status: status
                            }
                        };
                        statusQuery.bool.should.push(bool);
                    }
                });
                query.body.query.bool.must.push(statusQuery);
            }

            if (cri.alias) {
                query.body.query.bool.must.push({
                    match: {
                        managers: cri.alias
                    }
                });
            }

            if (cri.event) {
                query.body.query.bool.must.push({
                    multi_match: {
                        query: cri.event,
                        type: "phrase_prefix",
                        fields: ["eventId"]
                    }
                });
            }

            if (cri.clients && $.trim(cri.clients) !== '' && cri.clients.replace(/'/g, "") !== 'All') {
                query.body.query.bool.must.push({
                    match: {
                        representativeCode: cri.clients
                    }
                });
            }

            // if (cri.clients && $.trim(cri.clients) !== '' && cri.clients.replace(/'/g, "") !== 'All') {
            //   var arr = angular.copy(cri.clients).split(','),
            //     repCode = arr && arr[0] || '',
            //     alias = arr && arr[1] || '';

            //   var boolJoin = {
            //     bool: {
            //       should: []
            //     }
            //   };

            //   if (alias) {
            //     boolJoin.bool.should.push({
            //       match: {
            //         managers: alias
            //       }
            //     });
            //   }

            //   boolJoin.bool.should.push({
            //     match: {
            //       representativeCode: repCode
            //     }
            //   });
            //   query.body.query.bool.must.push(boolJoin);
            // }
            // if(cri.aliass){

            // }

            // if (cri.region && $.trim(cri.region) !== '' && cri.region !== 'All') {
            //     bool = {
            //         match: {
            //             region: cri.region
            //         }
            //     };
            //     query.body.query.bool.must.push(bool);
            // }

            if (cri.state && $.trim(cri.state) !== '' && cri.state !== 'All') {
                var stateQuery = {
                    bool: {
                        should: [{
                            match: {
                                state: cri.state
                            }
                        },
                        {
                            match: {
                                region: cri.state  //for old structure region in snapshot === state
                            }
                        }]
                    }
                };

                query.body.query.bool.must.push(stateQuery);
            }

            //Filter multiple plantype
            if (cri.plantypes && $.trim(cri.plantypes) !== '' && cri.plantypes.replace(/'/g, "") !== 'All') {
                var plantypes = (cri.plantypes + '').split(',');
                var plantypesQuery = {
                    bool: {
                        should: []
                    }
                };
                _.each(plantypes, function(plantype) {
                    bool = {
                        match: {
                            region: plantype
                        }
                    };
                    plantypesQuery.bool.should.push(bool);
                });
                query.body.query.bool.must.push(plantypesQuery);
            }

            if ($.trim(cri.keyword) !== '') {
                bool = {
                    match_phrase_prefix: {
                        _all: cri.keyword.toLowerCase()
                    }
                };

                query.body.query.bool.must.push(bool);
            }

            query.sort = ['priority:desc'];

            if (cri.sort) {
                var sortField = '';
                if (cri.isDashboard) {
                    sortField = 'timestampSignatured:' + cri.sort;
                } else {
                    sortField = 'timestampCreated:' + cri.sort;
                }
                query.sort.push(sortField);
            }
            // console.log(query);
            return searchService.search(query, 'membership-application-snapshot');
        }



        function searchByEvents(cri) {
            var searchSetting = $rootScope.storage.appSettings.elasticSearch.application;
            var bool;
            var query = {
                index: searchSetting.index,
                type: searchSetting.type,
                size: parseInt(cri.size),
                from: parseInt(cri.from)
            };

            query.body = {};
            query.body.query = {
                bool: {
                    must: [],
                    must_not: [],
                    should: []
                }
            };

            var queryBody = query.body.query.bool;
            //get multiple event
            var events = (cri.event + '').split(',');
            var eventsQuery = {
                bool: {
                    should: []
                }
            };
            _.each(events, function (eventId) {
                var bool = {
                    match: {
                        eventId: eventId
                    }
                };
                eventsQuery.bool.should.push(bool);
            });

            queryBody.must.push(eventsQuery);

            //
            if (cri.status && cri.status !== 'All') {
                var statuses = (cri.status + '').split(',');
                var statusQuery = {
                    bool: {
                        should: []
                    }
                };
                _.each(statuses, function (status) {
                    status = parseInt(status);
                    if (status && status === -1) {
                        var notStatuses = [4, 8, 6, 7];
                        _.each(notStatuses, function (s) {
                            var bool = {
                                match: {
                                    status: s
                                }
                            };
                            query.body.query.bool.must_not.push(bool);
                        });
                    } else {
                        bool = {
                            match: {
                                status: status
                            }
                        };
                        statusQuery.bool.should.push(bool);
                    }
                });
                queryBody.must.push(statusQuery);
            }

            if ($.trim(cri.keyword) !== '') {
                bool = {
                    match_phrase_prefix: {
                        _all: term.toLowerCase()
                    }
                };

                query.body.query.bool.must.push(bool);
            }

            query.sort = ['priority:desc'];

            if (cri.sort) {
                var sortField = 'timestampSignatured:' + desc;
                query.sort.push(sortField);
            }

            return searchService.search(query, 'membership-application-snapshot');
        }

        function updateProcessFile(id, updateField) {
            var ref = firebaseDataRef.child('membership-applications/' + id),
                ts = appUtils.getTimestamp();
            return DataUtils.getDataFirebaseLoadOnce(ref).then(function (data) {
                if (data) {
                    updateField = DataUtils.stripDollarPrefixedKeys(updateField);
                    return ref.update({
                        status: updateField.status,
                        physicalFiles: updateField.physicalFiles,
                        timestampModified: ts
                    }).then(function () {
                        memAppSnapshotService.update(id || '');
                        memAppDeviceInfoService.create(id);
                        var memberRef = firebaseDataRef.child("/membership/" + data.membershipId);
                        if (parseInt(updateField.status) === 4) {
                            //handle update membership information if billing approved and create membership-snapshot
                            memberRef.update({
                                timestampCreated: data.timestampCreated,
                                isActive: true,
                                timestampModified: ts
                            }).then(function () {
                                membershipSnapshotService.create(data.membershipId || '');
                            });
                        } else {
                            //handle update membership information is not member and delete membership-snapshot
                            memberRef.update({
                                isActive: false,
                                timestampModified: ts
                            }).then(function () {
                                var snapRef = firebaseDataRef.child("/membership/" + data.membershipId + "/timestampCreated");
                                DataUtils.firebaseLoadOnce(snapRef, false).then(function (timeStamp) {
                                    if (timeStamp) {
                                        firebaseDataRef.child("/membership-snapshot/" + timeStamp).remove();
                                    }
                                });
                            });
                        }
                        return { result: true, errorMsg: "" };
                    }).catch(function (error) {
                        console.log(error);
                        return { result: false, errorMsg: error.message };
                    });
                }
                return { result: false, errorMsg: 'Item not found.' };
            });

        }
        // tdang add
        function lockSubmitApp(appId) {
            console.log('lockSubmit------------------------');
            var ts = appUtils.getTimestamp(),
                ref = firebaseDataRef.child('membership-applications/' + appId);
            return ref.update({
                submitting: true,
                timestampModified: ts
            });

        }

        function unlockSubmitApp(appId) {
            console.log('unlockSubmit----------------------------');
            var ts = appUtils.getTimestamp(),
                ref = firebaseDataRef.child('membership-applications/' + appId);
            return ref.update({
                submitting: null,
                timestampModified: ts
            });
        }
        // tdang end

        function clearApplicationDataForTesting(appIds) {
            var reqs = [];
            _.forEach(appIds, function (appId) {
                if ($.trim(appId) !== '') {
                    var appRef = items.child(appId);
                    var req = $firebaseObject(appRef).$loaded().then(function (app) {
                        if (app.$value && app.$value === null) {
                            //
                        } else {
                            searchRef.child(app.timestampCreated).remove();
                            var memRef = firebaseDataRef.child('membership/' + app.membershipId);
                            $firebaseObject(memRef).$loaded().then(function (mem) {
                                if (mem.$value && mem.$value === null) {
                                    //
                                } else {
                                    firebaseDataRef.child('membership-snapshot/' + mem.timestampCreated).remove();
                                    mem.$remove();
                                    //handle remove list application on App
                                    var externalIdRef = firebaseDataRef.child("users/" + app.uid + '/externalId');
                                    externalIdRef.once('value').then(function (snapshop) {
                                        var externalId = snapshop.val();
                                        if (externalId !== null) {
                                            firebaseDataRef.child('membership-application-snapshot/employee/' + externalId + '/' + app.timestampCreated).remove();
                                        }
                                        app.$remove();
                                    }).catch(function () {
                                        app.$remove();
                                    });
                                }
                            });

                        }
                    });

                    reqs.push(req);
                }
            });

            return $q.all(reqs).then(function (rs) {
                return { result: true, errorMsg: "" };
            }).catch(function (error) {
                console.log(error);
                return { result: false, errorMsg: error.message };
            });
        }

        function testGetApplicationsByEvent(eventId) {
            return items.orderByChild('timestampCreated').startAt(1538870400000).endAt(1539043200000).once('value').then(function (snap) {
                var m = moment('10/08/2018');
                var result = _.filter(snap && snap.val(), function (app) {
                    var mo = moment(app.timestampCreated);
                    return mo.isAfter(angular.copy(m).startOf('day')) && mo.isBefore(angular.copy(m).endOf('day'));
                });
                //console.log(result.length);
                _.forEach(result, function (res) {
                    //console.log(moment(res.timestampCreated).format('MM/DD/YYYY'));
                });
                var groups = _.groupBy(result, 'eventId');
                //console.log(groups);
                _.forEach(groups, function (group) {
                    //console.log(group[0].eventName + ': ' + group.length + ' application(s)');
                });
                return snap && snap.val();
            });
        }

        //======================================================================================================================================================
        //private function Search Application
        // function map(obj, cb) {
        //   var out = [];
        //   each(obj, function (v, k) {
        //     out.push(cb(v, k));
        //   });
        //   return out;
        // }

        // function each(obj, cb) {
        //   if (obj) {
        //     for (var k in obj) {
        //       if (obj.hasOwnProperty(k)) {
        //         var res = cb(obj[k], k);
        //         if (res === true) {
        //           break;
        //         }
        //       }
        //     }
        //   }
        // }

        // function searchApplication(author, timestampStart, timestampEnd, status, keyword) {
        //   var result = {
        //     items: [],
        //     totalRecords: 0
        //   };

        //   var ref;
        //   if (!author || author === 'All') {
        //     ref = searchRef.once("value");
        //   } else {
        //     ref = searchRef.orderByKey().equalTo(author + '').once("value");
        //   }

        //   return ref.then(function (res) {
        //     var data = res.val();
        //     var records = [];
        //     if (data !== null) {
        //       var items = map(data, function (val, key) {
        //         return val;
        //       });
        //       _.forEach(items, function (value, key) {
        //         var timeKeys = Object.keys(value);
        //         //Filter with createTime Range
        //         _.forEach(timeKeys, function (time, key) {
        //           if (parseInt(time) >= parseInt(timestampStart) && parseInt(time) <= parseInt(timestampEnd)) {
        //             var sttItems = value[time];
        //             var sttKeys = Object.keys(sttItems);
        //             var stt = sttKeys[0].split('_')[1];
        //             var appItems, appkeys, keywordItems, keyWordKeys;
        //             if (status === '-1') {
        //               keywordItems = sttItems[sttKeys[0]];
        //               keyWordKeys = Object.keys(keywordItems);
        //               if ($.trim(keyword) === '') {
        //                 appItems = keywordItems[keyWordKeys[0]];
        //                 appkeys = Object.keys(appItems);
        //                 records.push({
        //                   appId: appkeys[0],
        //                   timestampCreated: time,
        //                   priority: appItems[appkeys[0]].priority,
        //                   status: stt
        //                 });
        //               } else {
        //                 if (keyWordKeys[0].includes(keyword) === true) {
        //                   appItems = keywordItems[keyWordKeys[0]];
        //                   appkeys = Object.keys(appItems);
        //                   records.push({
        //                     appId: appkeys[0],
        //                     timestampCreated: time,
        //                     priority: appItems[appkeys[0]].priority,
        //                     status: stt
        //                   });
        //                 }
        //               }
        //             } else {
        //               if (parseInt(status) === parseInt(stt)) {
        //                 keywordItems = sttItems[sttKeys[0]];
        //                 keyWordKeys = Object.keys(keywordItems);
        //                 if ($.trim(keyword) === '') {
        //                   appItems = keywordItems[keyWordKeys[0]];
        //                   appkeys = Object.keys(appItems);
        //                   records.push({
        //                     appId: appkeys[0],
        //                     timestampCreated: time,
        //                     priority: appItems[appkeys[0]].priority,
        //                     status: stt
        //                   });
        //                 } else {
        //                   if (keyWordKeys[0].includes(keyword) === true) {
        //                     appItems = keywordItems[keyWordKeys[0]];
        //                     appkeys = Object.keys(appItems);
        //                     records.push({
        //                       appId: appkey[0],
        //                       timestampCreated: time,
        //                       priority: appItems[appkey[0]].priority,
        //                       status: stt
        //                     });
        //                   }
        //                 }
        //               }
        //             }

        //           }
        //         });
        //       });

        //       result.items = records;
        //       result.totalRecords = records.length;
        //     }

        //     return result;
        //   });
        // }

        // function searchApplication2(authors, timestampStart, timestampEnd, status, keyword) {
        //   var result = {
        //     items: [],
        //     totalRecords: 0
        //   };
        //   var ref = searchRef.orderByKey().startAt(timestampStart + '').endAt(timestampEnd + '').once("value");
        //   return ref.then(function (res) {
        //     var data = res.val();
        //     var records = [];
        //     if (data !== null) {
        //       var items = map(data, function (val, key) {
        //         return val;
        //       });
        //       var rs = [];
        //       _.forEach(items, function (item, key) {
        //         //filter authors
        //         var clientFlag = false;
        //         if (!authors || authors === '' || authors === 'All') {
        //           clientFlag = true;
        //         } else if (item.author === authors) {
        //           clientFlag = true;
        //         }

        //         //filter status
        //         var statusFlag = false;
        //         if (status && (status != '-1' || status != -1)) {
        //           statusFlag = parseInt(item.status) === parseInt(status);
        //           if (parseInt(status) === 3) {
        //             statusFlag = parseInt(item.status) === 3 || parseInt(item.status) === 5 || parseInt(item.status) === 6 || parseInt(item.status) === 7;
        //           }
        //         } else {
        //           statusFlag = true;
        //           if (parseInt(item.status) === 4) {
        //             statusFlag = false;
        //           }
        //         }

        //         //filter keyword
        //         var keywordFlag = false;
        //         if ($.trim(keyword) === '') {
        //           keywordFlag = true;
        //         } else {
        //           keywordFlag = item.keyword && item.keyword !== '' ? item.keyword.toLowerCase().includes(keyword.toLowerCase()) : '';
        //         }
        //         if ((clientFlag === true) && (statusFlag === true) && (keywordFlag === true)) {
        //           if (!item.primaryMember) {
        //             item.primaryMember = ' ';
        //           }
        //           if (!item.secondaryMember) {
        //             item.secondaryMember = 'Unknown';
        //           }
        //           var obj = {
        //             $id: item.appId,
        //             priority: item.priority,
        //             timestampCreated: item.timestampCreated,
        //             membershipId: item.membershipId,
        //             status: item.status,
        //             method: item.method,
        //             primaryMember: item.primaryMember,
        //             secondaryMember: item.secondaryMember
        //           };
        //           // if($.trim(obj.primaryMember) ===''){
        //           //     var member = firebaseDataRef.child('membership/' + item.membershipId);
        //           //     $firebaseObject(member).$loaded().then(function(memberData){
        //           //         if(memberData){
        //           //           var fName,lName;
        //           //           if(memberData.priMember){
        //           //                 fName = memberData.priMember.firstName ? memberData.priMember.firstName : '';
        //           //                 lName = memberData.priMember.lastName ? memberData.priMember.lastName : '';
        //           //                 obj.primaryMember = fName + ' ' + lName;
        //           //           }else{
        //           //                 obj.primaryMember = 'Unknown';
        //           //           }
        //           //           if(memberData.secMember){
        //           //                 fName = memberData.secMember.firstName ? memberData.secMember.firstName : '';
        //           //                 lName = memberData.secMember.lastName ? memberData.secMember.lastName : '';
        //           //                 obj.secondaryMember = fName + ' ' + lName;
        //           //           }else{
        //           //                 obj.secondaryMember = 'Unknown';
        //           //           }
        //           //         }
        //           //     });  
        //           // }
        //           rs.push(obj);
        //         }
        //       });

        //       result.items = rs.sort(function (a, b) {
        //         if (b.priority !== a.priority) {
        //           return b.priority - a.priority;
        //         }
        //         if (a.status !== b.status) {
        //           return a.status - b.status;
        //         }
        //         return b.timestampCreated - a.timestampCreated;
        //       });
        //       result.totalRecords = rs.length;
        //     }
        //     return result;
        //   });
        // }

        // function filterItems(items, timestampStart, timestampEnd, clients, status) {
        //   var dateNow = new Date();
        //   var currentDate = $filter('date')(dateNow, 'MM/dd/yyyy');
        //   var currentTimestamp = Date.parse(currentDate);
        //   var rs = [];
        //   _.forEach(items, function (value, key) {
        //     var itemTimestamp = value.timestampCreated;

        //     var clientFlag = false;
        //     if (!clients || clients.length === 0 || $.inArray('All', clients) !== -1) {
        //       clientFlag = true;
        //     } else {
        //       _.forEach(clients, function (email, key) {
        //         if (value.authorName === email) {
        //           clientFlag = true;
        //           return;
        //         }
        //       });
        //     }

        //     var statusFlag = false;
        //     if (status && (status != '-1' || status != -1)) {
        //       statusFlag = parseInt(value.status) === parseInt(status);
        //     } else {
        //       statusFlag = true;
        //     }

        //     var timeFlag = parseInt(itemTimestamp) >= parseInt(timestampStart) && parseInt(itemTimestamp) <= parseInt(timestampEnd);
        //     if ((timeFlag === true) && (statusFlag === true) && (clientFlag === true)) {
        //       rs.push(value);
        //     }

        //   });
        //   return rs;
        // }

        // function filterItems2(timestampStart, timestampEnd) {
        //   var rs = [];
        //   var ref = filterRef.orderByChild('timestampCreated').startAt(timestampStart).endAt(timestampEnd).once("value");
        //   return ref.then(function (res) {
        //     var data = res.val();
        //     if (data !== null) {
        //       var items = map(data, function (val, key) {
        //         return val;
        //       });
        //       rs = items;
        //     }
        //     return rs;
        //   });
        // }

        // function revenueFilterReport(items, timestampStart, timestampEnd) {
        //   var rs = [];
        //   var completedStatus = _.find(appUtils.appStatus, function (item) {
        //     return item.value === "Completed" || item.value === "Billing Approved";
        //   });
        //   var completedKey = completedStatus ? parseInt(completedStatus.key) : 4;
        //   _.forEach(items, function (value, key) {
        //     var itemTimestamp = value.timestampCreated;
        //     if (parseInt(itemTimestamp) >= parseInt(timestampStart) && parseInt(itemTimestamp) <= parseInt(timestampEnd) && parseInt(value.status) === completedKey) {
        //       rs.push(value);
        //     }
        //   });
        //   return rs;
        // }

        // function revenueFilterReport2(timestampStart, timestampEnd) {
        //   var rs = [];
        //   var completedStatus = _.find(appUtils.appStatus, function (item) {
        //     return item.value === "Completed" || item.value === "Billing Approved";
        //   });
        //   var completedKey = completedStatus ? parseInt(completedStatus.key) : 4;
        //   var ref = filterRef.orderByChild('timestampVerified').startAt(timestampStart).endAt(timestampEnd).once("value");
        //   return ref.then(function (res) {
        //     var data = res.val();
        //     var records = [];
        //     if (data !== null) {
        //       var items = map(data, function (val, key) {
        //         return val;
        //       });
        //       rs = _.filter(items, { status: completedKey });
        //     }
        //     return rs;
        //   });
        // }

        // function searchQuery(index, type, term, authors, region, timestampStart, timestampEnd, status, pageSize, pageIndex, isDashboard, sort) {
        //     var from = pageSize * pageIndex;
        //     var bool;
        //     // if(from !== 0){
        //     //     from = from - 1 ;
        //     // }

        //     var size = pageSize;
        //     //create query
        //     var query = {
        //         index: index,
        //         type: type,
        //         size: parseInt(size),
        //         from: parseInt(from)
        //     };

        //     query.body = {};
        //     query.body.query = {
        //         bool: {
        //             must: [],
        //             must_not: [],
        //             should: []
        //         }
        //     };

        //     var dateRange = {
        //         range: {
        //             timestampCreated: {
        //                 gte: timestampStart,
        //                 lte: timestampEnd
        //             }
        //         }
        //     };

        //     if (isDashboard) {
        //         dateRange = {
        //             range: {
        //                 timestampSignatured: {
        //                     gte: timestampStart,
        //                     lte: timestampEnd
        //                 }
        //             }
        //         };
        //     }

        //     query.body.query.bool.must.push(dateRange);

        //     if (status !== 'All') {
        //         var statuses = (status + '').split(',');
        //         var statusQuery = {
        //             bool: {
        //                 should: []
        //             }
        //         };
        //         _.each(statuses, function (status) {
        //             status = parseInt(status);
        //             if (status && status === -1) {
        //                 var notStatuses = [4, 8, 6, 7];
        //                 _.each(notStatuses, function (s) {
        //                     var bool = {
        //                         match: {
        //                             status: s
        //                         }
        //                     };
        //                     query.body.query.bool.must_not.push(bool);
        //                 });
        //             } else {
        //                 bool = {
        //                     match: {
        //                         status: status
        //                     }
        //                 };
        //                 statusQuery.bool.should.push(bool);
        //             }
        //         });
        //         query.body.query.bool.must.push(statusQuery);
        //     }

        //     if (authors && $.trim(authors) !== '' && authors.replace(/'/g, "") !== 'All') {
        //         bool = {
        //             match: {
        //                 representativeCode: authors
        //             }
        //         };
        //         query.body.query.bool.must.push(bool);
        //     }

        //     if (region && $.trim(region) !== '' && region !== 'All') {
        //         bool = {
        //             match: {
        //                 region: region
        //             }
        //         };
        //         query.body.query.bool.must.push(bool);
        //     }

        //     if ($.trim(term) !== '') {
        //         bool = {
        //             match_phrase_prefix: {
        //                 _all: term.toLowerCase()
        //             }
        //         };

        //         query.body.query.bool.must.push(bool);
        //     }

        //     query.sort = ['priority:desc'];

        //     if (sort) {
        //         var sortField = '';
        //         if (isDashboard) {
        //             sortField = 'timestampSignatured:' + sort;
        //         } else {
        //             sortField = 'timestampCreated:' + sort;
        //         }
        //         query.sort.push(sortField);
        //     }
        //     return query;
        // }

        // function searchVerifiedQuery(index, type, term, authors, region, timestampStart, timestampEnd, status, pageSize, pageIndex) {
        //     var from = pageSize * pageIndex;
        //     var bool;
        //     // if(from !== 0){
        //     //     from = from - 1 ;
        //     // }

        //     var size = pageSize;
        //     //create query
        //     var query = {
        //         index: index,
        //         type: type,
        //         size: parseInt(size),
        //         from: parseInt(from)
        //     };

        //     query.body = {};
        //     query.body.query = {
        //         bool: {
        //             must: [{
        //                 range: {
        //                     timestampVerified: {
        //                         gte: timestampStart,
        //                         lte: timestampEnd
        //                     }
        //                 }
        //             }],
        //             must_not: [],
        //             should: []
        //         }
        //     };

        //     status = parseInt(status);
        //     if (status && status === -1) {
        //         bool = {
        //             match: {
        //                 status: 4
        //             }
        //         };
        //         query.body.query.bool.must_not.push(bool);

        //         bool = {
        //             match: {
        //                 status: 6
        //             }
        //         };
        //         query.body.query.bool.must_not.push(bool);

        //     } else if (status && status === 3) {
        //         bool = {
        //             match: {
        //                 status: 0
        //             }
        //         };
        //         query.body.query.bool.must_not.push(bool);
        //         //status == 5
        //         bool = {
        //             match: {
        //                 status: 1
        //             }
        //         };
        //         query.body.query.bool.must_not.push(bool);

        //         //status == 6
        //         bool = {
        //             match: {
        //                 status: 2
        //             }
        //         };
        //         query.body.query.bool.must_not.push(bool);

        //         //status == 7
        //         bool = {
        //             match: {
        //                 status: 4
        //             }
        //         };
        //         query.body.query.bool.must_not.push(bool);

        //         bool = {
        //             match: {
        //                 status: 6
        //             }
        //         };
        //         query.body.query.bool.must_not.push(bool);

        //     } else {
        //         bool = {
        //             match: {
        //                 status: status
        //             }
        //         };
        //         query.body.query.bool.must.push(bool);
        //     }

        //     if (authors && $.trim(authors) !== '' && authors !== 'All') {
        //         bool = {
        //             match: {
        //                 author: authors
        //             }
        //         };
        //         query.body.query.bool.must.push(bool);
        //     }

        //     if (region && $.trim(region) !== '' && region !== 'All') {
        //         bool = {
        //             match: {
        //                 region: region
        //             }
        //         };
        //         query.body.query.bool.must.push(bool);
        //     }

        //     if ($.trim(term) !== '') {
        //         bool = {
        //             match_phrase_prefix: {
        //                 _all: term.toLowerCase()
        //             }
        //         };

        //         query.body.query.bool.must.push(bool);
        //     }

        //     query.sort = ['priority:desc', 'status:asc', 'timestampCreated:desc'];
        //     return query;
        // }

        // function searchApplicationByAuthor(index, type, timestampStart, timestampEnd, authors) {
        //     //create query
        //     var bool;
        //     var query = {
        //         index: index,
        //         type: type,
        //         size: 10000,
        //         from: 0
        //     };

        //     query.body = {};
        //     query.body.query = {
        //         bool: {
        //             must: [{
        //                 range: {
        //                     timestampSignatured: {
        //                         gte: timestampStart,
        //                         lte: timestampEnd
        //                     }
        //                 }
        //             }],
        //             must_not: [],
        //             should: []
        //         }
        //     };

        //     if (authors && $.trim(authors) !== '' && authors !== 'All') {
        //         bool = {
        //             match: {
        //                 representativeCode: authors
        //             }
        //         };
        //         query.body.query.bool.must.push(bool);
        //     }

        //     query.sort = 'timestampSignatured:desc';
        //     return query;
        // }
    }
})();