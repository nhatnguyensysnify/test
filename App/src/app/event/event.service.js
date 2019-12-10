(function () {
    'use strict';
    angular.module('app.event').factory('eventService', eventService);
    /** @ngInject **/
    function eventService($rootScope, firebaseDataRef, appUtils, DataUtils, authService, $q, searchService, employeeService, eventTrackingService, eventQueueService, memAppService, memAppTimeLineService, memAppVerifyService, notificationService) {
        var rootPath = 'events',
            eventTypePath = 'event-types',
            eventRef = firebaseDataRef.child(rootPath),
            eventCampaignRef = firebaseDataRef.child('event-campaign'),
            uniqueUrlRef = firebaseDataRef.child('event-unique-url'),
            eventTypesRef = firebaseDataRef.child(eventTypePath);

        var service = {
            get: get,
            getEventTypes: getEventTypes,
            create: create,
            update: update,
            updateAppUploaded: updateAppUploaded,
            updateAddress: updateAddress,
            search: search,
            archived: archived,
            restore: restore,
            reRenderModelEvent: reRenderModelEvent,
            // convertEventTimeToUTC: convertEventTimeToUTC,
            eventRef: eventRef,
            genSearchQuery: genSearchQuery,
            analytics: analytics,
            report: report,
            reportWithGoal: reportWithGoal,
            reportConfirmation: reportConfirmation,
            searchCalendar: searchCalendar,
            searchByShift: searchByShift,
            reassign: reassign,
            searchEventsByUniqueUrl: searchEventsByUniqueUrl,
            updateVerifyStatus: updateVerifyStatus,
            addEventRun: addEventRun,
            forceRefreshEventData: forceRefreshEventData
        };

        function get(id) {
            var ref = eventRef.child(id);
            return DataUtils.getDataFirebaseLoadOnce(ref, true);
        }

        function reassign(eventDate, rep, currentRep) {
            let source = authService.getCurrentUser().$id;
            let eventId = eventDate.$id;
            // return employeeService.getUser(repId).then(rep => {
            // return get(eventId).then(event => {
            let event = {};
            event.representativeAttended = eventDate.representativeAttended || {};
            delete event.representativeAttended[currentRep.uid];
            event.representativeAttended[rep.uid] = {
                displayName: rep.displayName,
                email: rep.email,
                repCode: rep.repCode
            };
            event.managers = _.filter(eventDate.managers, alias => alias != currentRep.alias);
            event.managers.push(rep.alias);
            event.modifiedBy = source;
            event.timestampModified = appUtils.getTimestamp();
            return eventRef.child(eventId).update(event).then(() => {
                return indexEvent(eventId);
            });
            // });
            // });
        }

        //Async
        function indexEvent(key, data, isCreate) {
            let opts = null;
            if (data && isCreate) {
                opts = { data: data, priority: isCreate };
            }
            searchService.index(key, $rootScope.storage.appSettings.elasticSearch.events, opts);
        }

        function getEventTypes() {
            return DataUtils.getListDataFirebaseLoadOnce(eventTypesRef, true);
        }

        function _update(event, currentUser, _action) {
            var now = appUtils.getTimestamp(),
                // data = _convertDateToUpdate(event), 
                data = DataUtils.stripDollarPrefixedKeys(event),
                key = event.$id,
                action = _action || 'updateEvent';
            if (!key) {
                data.timestampCreated = now;
                key = eventRef.push().key;
                action = 'createEvent';
            }
            data.timestampModified = now;
            // tracking 
            var trackingObj = {
                action: action,
                fields: []
            };
            if (action == 'createEvent') {
                p = $q.when(null);
            }
            else {
                p = eventTrackingService.compareValue(key, data).then(function (diffValue) {
                    trackingObj.fields = diffValue;
                    eventQueueService.create(key);
                });
                data.lockedVerifyStatus = (event._verifyStatus != -1 && event.verifyStatus == -1) ? true : false;
                delete data._verifyStatus;
            }
            p = p.then(function (diffValue) {

                eventTrackingService.create(key, trackingObj, currentUser);
                return { result: true, key: key };
            });
            // end tracking

            // update firebase
            var p = p.then(function () {
                return eventRef.child(key).update(data).then(function () {
                    return { result: true, key: key };
                }).then(function (rs) {
                    var req = $q.when({});
                    let currentAuth = $rootScope.storage.currentUser;
                    if (rs.result && data.status === -1 && currentAuth) {
                        req = _updateApplicationWithEventArchived(key);
                    }
                    return req.then(function () {
                        return rs;
                    });
                });
            }).catch(function (error) {
                console.log(error);
                return { result: false, errorMsg: error.message };
            });
            // end update

            // updateIndexing
            p = p.then(function (res) {
                var opts = null;
                if (action == 'createEvent') {
                    opts = { data: data, priority: true };
                }
                console.log('push Index', event);
                return searchService.index(key, $rootScope.storage.appSettings.elasticSearch.events, opts);
            }).then(function () {
                return { result: true, key: key };
            }).catch(function (error) {
                return { result: false, errorMsg: error.message };
            });
            // end update Indexing;




            return p;
        }

        function create(add) {
            return _update(add);
            // var ts = appUtils.getTimestamp(),
            //     key = eventRef.push().key;

            // add.timestampCreated = add.timestampModified = ts;
            // add = DataUtils.stripDollarPrefixedKeys(add);
            // return eventRef.child(key).update(add).then(function (rs) {
            //     var trackingObj = {
            //         action: 'createEvent',
            //         fields: []
            //     };
            //     eventTrackingService.create(key, trackingObj);
            //     return { result: true, key: key };
            // }).catch(function (error) {
            //     console.log(error);
            //     return { result: false, errorMsg: error.message };
            // });
        }

        function update(data) {
            var updateData = _convertDateToUpdate(data);
            updateData.$id = data.$id;
            return _update(updateData);
            // var ts = appUtils.getTimestamp(),
            //     key = angular.copy(data.$id);

            // data = DataUtils.stripDollarPrefixedKeys(_convertDateToUpdate(data));
            // data.timestampModified = ts;
            // var trackingObj = {
            //     action: 'updateEvent',
            //     fields: []
            // };
            // // console.log(data);
            // return eventTrackingService.compareValue(key, data).then(function (diffValue) {
            //     trackingObj.fields = diffValue;
            //     return eventRef.child(key).update(data).then(function (rs) {
            //         eventQueueService.create(key);
            //         eventTrackingService.create(key, trackingObj);
            //         return { result: true, key: key };
            //     }).catch(function (error) {
            //         console.log(error);
            //         return { result: false, errorMsg: error.message };
            //     });
            // });

        }
        function updateAddress(_event) {
            if (!_event.$id) {
                return Promise.reject('No event id');
            }
            let event = {
                modifiedBy: _event.modifiedBy || '',
                $id: _event.$id
            };
            if (!_event) {
                _event = {
                    mailingAddress: {}
                };
            }
            let _mailingAddress = _event.mailingAddress;
            event.mailingAddress = {
                address: _mailingAddress.address || '',
                address_2: _mailingAddress.address_2 || '',
                state_code: _mailingAddress.state_code || '',
                city_name: _mailingAddress.city_name || '',
                zip_code: _mailingAddress.zip_code || '',
                location: _mailingAddress.location || {},
            };
            return _update(event);
        }
        function updateAppUploaded(data) {
            var updateObj = {
                appCount: data.appCount,
                modifiedBy: data.modifiedBy || '',
                appUploaded: data.appUploaded,
                $id: data.$id
            };
            return _update(updateObj);

            // old code
            /*
            var ts = appUtils.getTimestamp(),
                key = angular.copy(data.$id);

            var updateObj = {
                timestampModified: ts,
                appCount: data.appCount,
                modifiedBy: data.modifiedBy || '',
                appUploaded: data.appUploaded
            };

            var trackingObj = {
                action: 'updateEvent',
                fields: []
            };

            return eventTrackingService.compareValue(key, updateObj).then(function (diffValue) {
                trackingObj.fields = diffValue;
                return eventRef.child(key).update(updateObj).then(function (rs) {
                    eventQueueService.create(key);
                    eventTrackingService.create(key, trackingObj);
                    return { result: true, key: key };
                }).catch(function (error) {
                    console.log(error);
                    return { result: false, errorMsg: error.message };
                });
            });
            */
        }

        function archived(id) {
            var updateData = {
                status: -1,
                $id: id
            };
            return _update(updateData);
            /* old code
            var ref = eventRef.child(id),
                ts = appUtils.getTimestamp(),
                data = {
                    status: -1,
                    timestampModified: ts
                };

            var trackingObj = {
                action: 'updateEvent',
                fields: []
            };
            return eventTrackingService.compareValue(id, data).then(function (diffValue) {
                trackingObj.fields = diffValue;
                return ref.update(data).then(function (result) {
                    eventTrackingService.create(id, trackingObj);
                    return { result: true };
                }).catch(function (error) {
                    return { result: false, errorMsg: error };
                });
            });
            */

        }

        function restore(id, status) {
            var updateData = {
                status: parseInt(status),
                $id: id
            };
            return _update(updateData);
            /* old code
            var ref = eventRef.child(id),
                ts = appUtils.getTimestamp(),
                data = {
                    status: parseInt(status),
                    timestampModified: ts
                };

            var trackingObj = {
                action: 'updateEvent',
                fields: []
            };
            return eventTrackingService.compareValue(id, data).then(function (diffValue) {
                trackingObj.fields = diffValue;
                return ref.update(data).then(function (result) {
                    eventTrackingService.create(id, trackingObj);
                    return { result: true };
                }).catch(function (error) {
                    return { result: false, errorMsg: error };
                });
            });
            */
        }

        function _updateApplicationWithEventArchived(id) {
            return memAppService.getByEvent(id).then(function (res) {
                var applications = (res && res.items) || [],
                    status = 6;
                var all = _.map(applications, function (app) {
                    var appTracking = {
                        eventType: appUtils.logEvent.changeStatus
                    };
                    return memAppService.changeAppStatus(app.$id, status).then(function (result) {
                        appTracking.status = status;
                        var reqs = [];
                        if (!result.result) {
                            //Create tracking application change status                            
                            appTracking.message = result && result.errorMsg || 'The application was changeed status by archived event has error.';
                        } else {
                            //Create tracking application change status  
                            appTracking.message = 'The application was changed status by archived event.';
                            //Remove application-verify 
                            reqs.push(memAppVerifyService.remove(app.$id));
                        }
                        reqs.push(memAppTimeLineService.create(app.$id, appTracking));
                        return $q.all(reqs);
                    });
                });
                return $q.all(all);
            });
        }

        function search(cri) {
            var query = genSearchQuery(cri);
            console.log('query', query);

            return searchService.search(query, 'events');
        }

        function genSearchQuery(cri) {
            // console.log(cri);
            var searchSetting = $rootScope.storage.appSettings.elasticSearch.events;
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
            //filter by startDate in dateRange
            if (cri.timestampStart && cri.timestampEnd) {
                queryBody.must.push({
                    range: {
                        startDate: {
                            gte: parseInt(cri.timestampStart),
                            lte: parseInt(cri.timestampEnd)
                        }
                    }
                });
            }
            // queryBody.should.push({
            // 	range: {
            // 		endDate: {
            // 			gte: parseInt(cri.timestampStart),
            // 			lte:  parseInt(cri.timestampEnd)
            // 		}
            // 	}
            // });

            // queryBody.should.push({
            // 	bool: {
            // 		must: [
            // 			{
            // 				range: {
            // 					startDate: {
            // 						lt: parseInt(cri.timestampStart)
            // 					}
            // 				}
            // 			},
            // 			{
            // 				range: {
            // 					endDate: {
            // 						gt:  parseInt(cri.timestampEnd)
            // 					 }
            // 				}
            // 			}
            // 		]
            // 	} 
            // });


            //Filter By Status
            if (cri.status && cri.status !== 'All') {
                var statuses = (cri.status + '').split(',');
                var statusQuery = {
                    bool: {
                        should: []
                    }
                };
                _.each(statuses, function (status) {
                    bool = {
                        match: {
                            status: status
                        }
                    };
                    statusQuery.bool.should.push(bool);
                });

                queryBody.must.push(statusQuery);
            }
            //Filter By Verify Status
            if (cri.verifyStatus && cri.verifyStatus !== 'All' && cri.verifyStatus !== 'Empty') {
                var verifies = (cri.verifyStatus + '').split(',');
                let verifyStatusQuery = {
                    bool: {
                        should: []
                    }
                };
                _.each(verifies, function (verifyStatus) {
                    if (verifyStatus == 'Empty') {
                        let query = {
                            bool: {
                                must_not: {
                                    exists: {
                                        field: 'verifyStatus'
                                    }
                                }
                            }
                        };
                        verifyStatusQuery.bool.should.push(query);
                    } else {
                        bool = {
                            match: {
                                verifyStatus: verifyStatus
                            }
                        };
                        verifyStatusQuery.bool.should.push(bool);
                    }
                });
                queryBody.must.push(verifyStatusQuery);

            }
            if (cri.verifyStatus && cri.verifyStatus == 'Empty') {
                let verifyStatusQuery = {
                    bool: {
                        should: []
                    }
                };
                let query = {
                    bool: {
                        must_not: {
                            exists: {
                                field: 'verifyStatus'
                            }
                        }
                    }
                };
                verifyStatusQuery.bool.should.push(query);
                queryBody.must.push(verifyStatusQuery);
            }

            //Filter By dataEntered
            if (typeof (cri.dataEntered) == 'boolean') {
                var dataEnteredQ = {
                    match: {
                        dataEntered: cri.dataEntered
                    }
                };

                queryBody.must.push(dataEnteredQ);
            }

            //Filter by event type
            if (cri.type && $.trim(cri.type) !== '' && cri.type.replace(/'/g, "") !== 'All') {
                bool = {
                    multi_match: {
                        query: cri.type,
                        type: "phrase_prefix",
                        fields: ["type"]
                    }
                    // match: {
                    //     type: cri.type
                    // }
                };
                queryBody.must.push(bool);
            }

            //Filter by multiple state(reigon - state iso)
            // if (cri.region && $.trim(cri.region) !== '' && cri.region.replace(/'/g, "") !== 'All') {
            //     var regions = (cri.region + '').split(',');
            //     var regionQuery = {
            //         bool: {
            //             should: []
            //         }
            //     };
            //     _.each(regions, function(region) {
            //         bool = {
            //             match: {
            //                 state: region
            //             }
            //         };
            //         regionQuery.bool.should.push(bool);
            //     });
            //     queryBody.must.push(regionQuery);
            // }

            if (cri.state && $.trim(cri.state) !== '' && cri.state.replace(/'/g, "") !== 'All') {
                var states = (cri.state + '').split(',');
                var stateQuery = {
                    bool: {
                        should: []
                    }
                };
                _.each(states, function (state) {
                    bool = {
                        match: {
                            state: state
                        }
                    };
                    stateQuery.bool.should.push(bool);
                });
                queryBody.must.push(stateQuery);
            }

            //end filter state

            //Filter multiple territory
            if (cri.territory && $.trim(cri.territory) !== '' && cri.territory.replace(/'/g, "") !== 'All') {
                var territories = (cri.territory + '').split(',');
                var territoryQuery = {
                    bool: {
                        should: []
                    }
                };
                _.each(territories, function (territory) {
                    bool = {
                        match: {
                            'territory.raw': territory != 'Empty' ? territory : ""
                        }
                    };
                    territoryQuery.bool.should.push(bool);
                });
                queryBody.must.push(territoryQuery);
            }

            //Filter multiple plantype
            if (cri.plantypes && $.trim(cri.plantypes) !== '' && cri.plantypes.replace(/'/g, "") !== 'All') {
                var plantypes = (cri.plantypes + '').split(',');
                var plantypesQuery = {
                    bool: {
                        should: []
                    }
                };
                _.each(plantypes, function (plantype) {
                    bool = {
                        match: {
                            region: plantype
                        }
                    };
                    plantypesQuery.bool.should.push(bool);
                });
                queryBody.must.push(plantypesQuery);
            }

            if (cri.facilities && $.trim(cri.facilities) !== '' && cri.facilities.replace(/'/g, "") !== 'All') {
                var facilities = (cri.facilities + '').split(',');
                var facilityQuery = {
                    bool: {
                        should: []
                    }
                };
                _.each(facilities, function (facilityId) {
                    bool = {
                        match: {
                            'facilityId.raw': facilityId
                        }
                    };
                    facilityQuery.bool.should.push(bool);
                });
                queryBody.must.push(facilityQuery);
            }

            //filter by alias of employee
            if (cri.alias && cri.alias != 'All') {
                queryBody.must.push({
                    match: {
                        managers: cri.alias
                    }
                });
            }

            //filter by manager, area manager, representative attended
            if (cri.requester && $.trim(cri.requester) !== '' && cri.requester.replace(/'/g, "") !== 'All') {
                var boolJoin = {
                    bool: {
                        should: []
                    }
                };

                boolJoin.bool.should.push({
                    exists: {
                        field: 'representativeAttended.' + cri.requester
                    }
                });

                boolJoin.bool.should.push({
                    exists: {
                        field: 'requester.' + cri.requester
                    }
                });

                boolJoin.bool.should.push({
                    exists: {
                        field: 'areaManager.' + cri.requester
                    }
                });

                queryBody.must.push(boolJoin);
            }

            // if (cri.requester && $.trim(cri.requester) !== '' && cri.requester.replace(/'/g, "") !== 'All') {
            // 	var arr = angular.copy(cri.requester).split(','),
            // 		managerId = arr && arr[0] || '',
            // 		alias = arr && arr[1] || '';

            // 	var boolJoin = {
            // 		bool: {
            // 			should: []
            // 		}
            // 	};
            // 	if(alias){
            // 		boolJoin.bool.should.push({
            // 			match: {
            // 				managers: alias
            // 			}
            // 		});
            // 	}

            // 	boolJoin.bool.should.push({
            // 		exists: {
            // 			field: 'representativeAttended.' + managerId
            // 		}
            // 	});

            // 	boolJoin.bool.should.push({
            // 		exists: {
            // 			field: 'requester.' + managerId
            // 		}
            // 	});

            // 	queryBody.must.push(boolJoin);
            // }
            // Event Id
            if (cri.ids) {
                queryBody.must.push({
                    ids: {
                        values: cri.ids
                    }
                });
            }
            //filter by keyword
            if ($.trim(cri.keyword) !== '') {
                bool = {
                    match_phrase_prefix: {
                        _all: cri.keyword.toLowerCase()
                    }
                };
                queryBody.must.push(bool);
            }

            //filter by exactly facilityId
            if (cri.facilityId && $.trim(cri.facilityId) !== '' && cri.facilityId.replace(/'/g, "") !== 'All') {
                queryBody.must.push({
                    multi_match: {
                        query: cri.facilityId,
                        type: "phrase_prefix",
                        fields: ["facilityId.raw"]
                    }
                });
            }

            //filter by facilityId and move to top of result list.
            if (cri.facility && $.trim(cri.facility) !== '' && cri.facility.replace(/'/g, "") !== 'All') {
                bool = {};
                /* jshint ignore:start */
                bool['_script'] = {
                    type: 'number',
                    script: {
                        lang: 'painless',
                        inline: "doc['facilityId.raw'].value == '" + cri.facility + "' ? 0 : 1;", // source for 6.0
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

            // filter by cash Collected
            if (cri.memKeyword) {
                queryBody.must.push({
                    multi_match: {
                        query: cri.memKeyword,
                        type: "phrase_prefix",
                        fields: ["cashMems", "cashMemIds"]
                    }
                });
            }
            if (cri.moneyOrder) {
                queryBody.must.push({
                    match: {
                        moneyOrder: cri.moneyOrder
                    }
                });
            }

            //sort result list by custom field.
            if (cri.sort) {
                var arr = cri.sort.split(':');
                if (arr && arr.length === 2) {
                    var field = arr[0],
                        order = arr[1];
                    if (field && (field === 'facilityCode' || field === 'name' || field === 'type')) {
                        //sort by script
                        bool = {};
                        /* jshint ignore:start */
                        bool['_script'] = {
                            type: 'string',
                            script: {
                                lang: 'painless',
                                inline: "doc['" + field + ".raw'].value.replace('-',' ').replace('_',' ')", // source for 6.0
                                params: {
                                    factor: 1.1
                                }
                            },
                            order: order
                        };
                        /* jshint ignore:end */
                        query.body.sort = {};
                        query.body.sort = bool;
                    } else {
                        if (field === 'planType') {
                            query.sort = ['state:' + order, 'region:' + order];
                        } else {
                            query.sort = cri.sort;
                        }
                    }
                } else {
                    //default sort
                    query.sort = 'startDate:desc';
                }
            } else {
                //default sort
                query.sort = 'startDate:desc';
            }

            if (!cri.fullSource) {
                query.body._source = {
                    excludes: ["cashCollected"]
                };
            }
            // return searchService.search(query, 'events');
            return query;
        }

        function analytics(cri, aggs) {
            var query = genSearchQuery(cri);
            query.body.aggs = aggs;
            query.size = 0;
            query.from = 0;
            return searchService.search(query, 'events');
        }

        function _convertDateToUpdate(data) {
            let obj = {
                iptBailBond: _parseToNumber(data.iptBailBond),
                iptGITC: _parseToNumber(data.iptGITC),
                iptCareerShield: _parseToNumber(data.iptCareerShield),
                iptHunterShield: _parseToNumber(data.iptHunterShield),
                iptMinorChildren: _parseToNumber(data.iptMinorChildren),
                iptMultiState: _parseToNumber(data.iptMultiState),
                iptTotalMonthlyMember: _parseToNumber(data.iptTotalMonthlyMember),
                iptTotalAnnualMember: _parseToNumber(data.iptTotalAnnualMember),
                iptCloseRate: _parseToNumber(data.iptCloseRate),
                iptTotalRevenue: _parseToNumber(data.iptTotalRevenue),
                iptNewMember: _parseToNumber(data.iptNewMember),
                iptTotalAttendees: _parseToNumber(data.iptTotalAttendees),
                iptTotalAttendeesRegistered: _parseToNumber(data.iptTotalAttendeesRegistered),
                iptAnE: _parseToNumber(data.iptAnE) || 0,
                iptGSW: _parseToNumber(data.iptGSW) || 0,
                estTotalRevenue: _parseToNumber(data.estTotalRevenue),
                estProspectiveMember: _parseToNumber(data.estProspectiveMember),
                estAttendees: _parseToNumber(data.estAttendees),
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
                status: data.status,
                appUploaded: data.appUploaded,
                appCount: data.appCount || null,
                dataEntered: data.dataEntered,
                managers: data.managers || [],
                managerRefs: data.managerRefs || [],
                fees: data.fees,
                moneyOrder: data.moneyOrder,
                mailingAddress: data.mailingAddress || {},
                requesterId: data.requesterId || Object.keys(data.requester)[0] || ''
            };
            if (data.verifyStatus !== undefined) {
                obj.verifyStatus = data.verifyStatus || 0;
            }
            return obj;
        }

        function _parseToNumber(value) {
            var number = parseFloat(value);
            if (isNaN(number)) {
                number = null;
            }
            return number;
        }

        function reRenderModelEvent() {
            return DataUtils.getListDataFirebaseLoadOnce(eventRef, true).then(function (events) {
                var reqs = [];
                _.forEach(events, function (event) {
                    var status = event.isActive === false || event.isActive === undefined ? -1 : 1;
                    var req = eventRef.child(event.$id).update({ status: status });
                    reqs.push(req);
                });
                return Promise.all(reqs);
            });
        }

        // function convertEventTimeToUTC() {
        // return eventRef.once('value').then(function (snap) {
        // 	console.log(snap && snap.val());
        // 	var data = snap && snap.val();
        // 	var reqs = [], ts = appUtils.getTimestamp();
        // 	_.forEach(data, function (item, eventId) {
        // 		var m = moment(item.startDate),
        // 			tzOffset = parseInt(m.clone().utc().format('h')),
        // 			h = 0;

        // 		if (tzOffset !== 12) {
        // 			h = tzOffset * 60 * 60000;
        // 		}

        // 		var _utcStart = m.clone().utc().valueOf() - h,
        // 			_start = moment.utc(_utcStart).valueOf(),
        // 			_end = '';

        // 		if (item.endDate && _.trim(item.endDate) !== '') {
        // 			var m = moment(item.endDate),
        // 				tzOffset = parseInt(m.clone().utc().format('h')),
        // 				h = 0;

        // 			if (tzOffset !== 12) {
        // 				h = tzOffset * 60 * 60000;
        // 			}

        // 			var _utcEnd = m.clone().utc().valueOf() - h;
        // 			_end = moment.utc(_utcEnd).valueOf();
        // 		}

        // 		var req = eventRef.child(eventId).update({
        // 			startDate: _start,
        // 			endDate: _end,
        // 			timestampModified: ts
        // 		});

        // 		reqs.push(req);
        // 	});

        // 	return Promise.all(reqs);
        // });
        // }

        function report(cri) {
            var query = genSearchQuery(cri);
            query.body.aggs = {
                groupByState: {
                    terms: {
                        field: "state",
                        order: {
                            totalRevenue: "desc"
                        },
                        size: 10
                    },
                    aggs: {
                        totalRevenue: {
                            sum: {
                                field: "iptTotalRevenue"
                            }
                        }
                    }
                },
                groupByTerritory: {
                    terms: {
                        field: "territory.raw",
                        order: {
                            totalRevenue: "desc"
                        },
                        size: 10
                    },
                    aggs: {
                        totalRevenue: {
                            sum: {
                                field: "iptTotalRevenue"
                            }
                        }
                    }
                },
                groupByType: {
                    terms: {
                        field: "type.raw",
                        order: {
                            totalRevenue: "desc"
                        },
                        size: 10000
                    },
                    aggs: {
                        totalRevenue: {
                            sum: {
                                field: "iptTotalRevenue"
                            }
                        }
                    }
                },
                groupByPlanType: {
                    terms: {
                        field: "region",
                        order: {
                            totalRevenue: "desc"
                        },
                        size: 10000
                    },
                    aggs: {
                        totalRevenue: {
                            sum: {
                                field: "iptTotalRevenue"
                            }
                        }
                    }
                },
                groupByDay: {
                    date_histogram: {
                        field: "startDate",
                        interval: cri.interval || "day",
                        format: "MM/dd/yyyy"
                    },
                    aggs: {
                        groupByType: {
                            terms: {
                                field: "type.raw",
                                order: {
                                    totalRevenue: "desc"
                                },
                                size: 10000
                            },
                            aggs: {
                                totalRevenue: {
                                    sum: {
                                        field: "iptTotalRevenue"
                                    }
                                }
                            }
                        },
                    }
                },
                totalRevenue: {
                    sum: {
                        field: "iptTotalRevenue"
                    }
                },
                totalAttendees: {
                    sum: {
                        field: "iptTotalAttendeesRegistered"
                    }
                },
                totalAnE: {
                    sum: {
                        field: "iptAnE"
                    }
                },
                totalGSW: {
                    sum: {
                        field: "iptGSW"
                    }
                },
                totalNewMembers: {
                    sum: {
                        field: "iptNewMember"
                    }
                },
                totalMonthly: {
                    sum: {
                        field: "iptTotalMonthlyMember"
                    }
                },
                totalAnnual: {
                    sum: {
                        field: "iptTotalAnnualMember"
                    }
                },
            };
            //start TLS-1314
            // let boolTypeGSW = {
            //     multi_match: {
            //         query: 'gsw',
            //         type: "phrase_prefix",
            //         fields: ["type"]
            //     }
            // };
            // let boolTypeCounterSales = {
            //     multi_match: {
            //         query: 'counter-sales',
            //         type: "phrase_prefix",
            //         fields: ["type"]
            //     }
            // };
            // query.body.query.bool.must_not.push(boolTypeGSW);
            // query.body.query.bool.must_not.push(boolTypeCounterSales);
            //end TLS-1314

            return searchService.search(query, 'events');
        }

        function reportConfirmation(cri) {
            var query = genSearchQuery(cri);
            return searchService.search(query, 'events');
        }

        function reportWithGoal(cri) {
            var query = genSearchQuery(cri);
            query.body.aggs = {
                groupByState: {
                    terms: {
                        field: "state",
                        order: {
                            totalRevenue: "desc"
                        },
                        size: 10000
                    },
                    aggs: {
                        totalRevenue: {
                            sum: {
                                field: "iptTotalRevenue"
                            }
                        },
                        groupByType: {
                            terms: {
                                field: "type.raw",
                                order: {
                                    totalRevenue: "desc"
                                },
                                size: 10000
                            },
                            aggs: {
                                totalRevenue: {
                                    sum: {
                                        field: "iptTotalRevenue"
                                    }
                                }
                            }
                        },
                    }
                }
            };
            return searchService.search(query, 'events');
        }

        function searchCalendar(cri, allStates) {
            var _cri = angular.copy(cri);

            // delete _cri.state;
            _cri.size = 0;
            var query = genSearchQuery(_cri);

            //start TLS-1315
            let boolTypeGSW = {
                multi_match: {
                    query: 'gsw',
                    type: "phrase_prefix",
                    fields: ["type"]
                }
            };
            let boolTypeCounterSales = {
                multi_match: {
                    query: 'counter-sales',
                    type: "phrase_prefix",
                    fields: ["type"]
                }
            };
            query.body.query.bool.must_not.push(boolTypeGSW);
            query.body.query.bool.must_not.push(boolTypeCounterSales);
            //end TLS-1315
            query.body.aggs = {};
            _.forEach(allStates, stateItem => {
                query.body.aggs[stateItem.iso] = {
                    terms: {
                        field: "state",
                        include: stateItem.iso.toLowerCase(),
                        size: 10000
                    },
                    aggs: {
                        groupByDateRange: {
                            date_histogram: {
                                field: "startDate",
                                interval: _cri.interval || "day",
                                format: "MM/dd/yyyy",
                                min_doc_count: 0,
                                extended_bounds: {
                                    min: parseInt(cri.timestampStart),
                                    max: parseInt(cri.timestampEnd)
                                }
                            },
                            aggs: {
                                groupByType: {
                                    terms: {
                                        field: "type.raw",
                                        size: 20000
                                    }
                                },
                                reps_activities: {
                                    top_hits: {
                                        _source: {
                                            includes: ["name", "type", "startDate", "state", "region", "facilityId", "territory", "status", "appUploaded", "dataEntered", "representativeAttended", "requester", "areaManager", "iptTotalRevenue", "iptCloseRate", "iptNewMember"]
                                        },
                                        size: 10000
                                    }
                                }
                            }
                        },
                    }
                };
            });
            // if(!_cri.state){
            query.body.aggs.US = {
                terms: {
                    field: "_type",
                    include: 'event',
                    size: 10000
                },
                aggs: {
                    groupByDateRange: {
                        date_histogram: {
                            field: "startDate",
                            interval: _cri.interval || "day",
                            format: "MM/dd/yyyy",
                            min_doc_count: 0,
                            extended_bounds: {
                                min: parseInt(cri.timestampStart),
                                max: parseInt(cri.timestampEnd)
                            }
                        },
                        aggs: {
                            groupByType: {
                                terms: {
                                    field: "type.raw",
                                    size: 20000
                                }
                            },
                            reps_activities: {
                                top_hits: {
                                    _source: {
                                        includes: ["name", "type", "startDate", "state", "region", "facilityId", "territory", "status", "appUploaded", "dataEntered", "representativeAttended", "requester", "areaManager", "iptTotalRevenue", "iptCloseRate", "iptNewMember"]
                                    },
                                    size: 10000
                                }
                            }
                        }
                    }
                }
            };
            // }

            // query.body.aggs.groupByState = {
            //         terms: {
            //             field: "state",
            //             size: 10000
            //         },
            //         aggs: {
            //             groupByDateRange: {
            //                 date_histogram: {
            //                     field: "startDate",
            //                     interval: _cri.interval || "day",
            //                     format: "MM/dd/yyyy",
            //                     min_doc_count: 0,
            //                     extended_bounds: {
            //                         min: parseInt(cri.timestampStart),
            //                         max: parseInt(cri.timestampEnd)
            //                     }
            //                 },
            //                 aggs: {
            //                     groupByType: {
            //                         terms: {
            //                             field: "type.raw",
            //                             size: 20000
            //                         }
            //                     },
            //                     reps_activities: {
            //                         top_hits: {
            //                             _source: {
            //                                 includes: ["name", "type", "startDate", "state", "region", "facilityId", "territory", "status", "appUploaded", "dataEntered", "representativeAttended", "requester", "areaManager", "iptTotalRevenue", "iptCloseRate", "iptNewMember"]
            //                             },
            //                             size: 10000
            //                         }
            //                     }
            //                 }
            //             },
            //         }
            // };


            // groupByDateRange: {
            //     date_histogram: {
            //         field: "startDate",
            //         interval: _cri.interval || "day",
            //         format: "MM/dd/yyyy",
            //         min_doc_count: 0,
            //         extended_bounds: {
            //             min: parseInt(cri.timestampStart),
            //             max: parseInt(cri.timestampEnd)
            //         }
            //     },
            //     aggs: {
            //         groupByType: {
            //             terms: {
            //                 field: "type.raw",
            //                 size: 20000
            //             }
            //         },
            //         reps_activities: {
            //             top_hits: {
            //                 _source: {
            //                     includes: ["name", "type", "startDate", "state", "region", "facilityId", "territory", "status", "appUploaded", "dataEntered", "representativeAttended", "requester", "areaManager", "iptTotalRevenue", "iptCloseRate", "iptNewMember"]
            //                 },
            //                 size: 10000
            //             }
            //         }
            //     }
            // },
            return searchService.search(query, 'events').then(function (rs) {
                var aggregations = (rs && rs.aggregations) || null;
                var result = [];

                if (aggregations) {
                    result = _.map(aggregations, function (itemState, isoState) {

                        let aggregationsByState = itemState.buckets && itemState.buckets.length > 0 ? itemState.buckets[0] : {};
                        let groupDateRange = (aggregationsByState.groupByDateRange && aggregationsByState.groupByDateRange.buckets) || [];
                        if (groupDateRange) {
                            //get values by date
                            let resultGroupDateRange = _.map(groupDateRange, function (item) {
                                let obj = {
                                    title: item.key_as_string || '',
                                    key: item.key,
                                    totalEvents: item.doc_count || 0
                                };
                                //get values of event types
                                let groupTypes = (item.groupByType && item.groupByType.buckets) || [];
                                let eventType = {};
                                if (groupTypes) {
                                    _.forEach(groupTypes, function (type) {
                                        eventType[type.key] = type.doc_count || 0;
                                        // var objType = {
                                        //     key: type.key,
                                        //     totalEventsOfType: type.doc_count || 0
                                        // };
                                        // return objType;
                                    });
                                }
                                obj.types = eventType;
                                //get values reps activities
                                let events = (item.reps_activities && item.reps_activities.hits && item.reps_activities.hits.hits) || [];
                                obj.events = searchService.convertDataSnapshot(events, '');
                                let reps = {};
                                // console.log('searchCalendar', isoState, events, item );

                                _.forEach(obj.events, function (event) {
                                    if (event.representativeAttended) {
                                        // _.assign(reps, event.areaManager || {});
                                        // _.assign(reps, event.requester || {});
                                        _.assign(reps, event.representativeAttended || {});
                                    }
                                });
                                obj.repsActivities = _.filter(_.map(reps, function (rep, key) {
                                    if (key === rep.repCode) {
                                        return null;
                                    }
                                    rep.employeeId = key;
                                    rep.$id = key;
                                    return rep;
                                }), function (item) {
                                    return item !== null;
                                });
                                obj.totalActivities = obj.events.length;
                                return obj;
                            });
                            let obj = {
                                iso: isoState,
                                groupByDateRange: resultGroupDateRange
                            };
                            return obj;
                        }

                    });


                }
                return result;
            });
        }

        function searchByShift(shiftDetail) {

            let cri = {
                timestampStart: shiftDetail.date,
                timestampEnd: moment(shiftDetail.date).utc().endOf('day').valueOf(),
                status: 1,
                from: 0,
                size: 1000
            };
            var query = genSearchQuery(cri);
            var queryBody = query.body.query.bool;

            var boolJoin = {
                bool: {
                    should: []
                }
            };
            let bool = {
                exists: {
                    field: 'representativeAttended.' + shiftDetail.rep
                }
            };
            boolJoin.bool.should.push(bool);
            queryBody.must.push(boolJoin);

            return searchService.search(query, 'events');

        }
        function searchEventsByUniqueUrl(uniqueUrl) {
            if (!uniqueUrl) {
                return new Promise.reject("No unique url");
            }
            // console.log('uniqueUrl', uniqueUrl);

            let ref = uniqueUrlRef.child(uniqueUrl);
            return DataUtils.getDataFirebaseLoadOnce(ref, true).then(uniqueUrlData => {
                // console.log('uniqueUrlData', uniqueUrlData);
                if (!uniqueUrlData) {
                    return;
                }

                let runRef = eventCampaignRef.child(`${uniqueUrlData.campaignId}/${uniqueUrlData.runId}`);
                return DataUtils.getDataFirebaseLoadOnce(runRef, true).then(runData => {
                    // console.log('runData', runData);
                    if (!runData) {
                        return;
                    }
                    runData.campaignId = uniqueUrlData.campaignId;
                    let srcs = [];
                    srcs.push(employeeService.getUser(runData.uid));
                    let cri = {
                        keyword: '',
                        size: 1000,
                        from: 0,
                        attendeer: null,
                        // status: '1',
                        dataEntered: null,
                        alias: null,
                        moenyOrder: null,
                        memKeyword: null,
                        type: "classes"
                    };
                    if (runData.status == 0 && runData.source == "ServicePhase1") {
                        cri.timestampStart = runData.startDate || runData.date;
                        cri.timestampEnd = runData.endDate;
                        cri.verifyStatus = '0,Empty';
                        cri.requester = runData.uid;
                        cri.status = '1';
                    }
                    else if (runData.status == 0 && (runData.source == "ServicePhase2" || runData.source == "SmartAdmin")) {
                        cri.ids = _.map(runData.eventsInstance, 'eventId');
                    } else {
                        cri.ids = _.map(runData.events, 'eventId');
                    }
                    let pSearchEvents = search(cri).then(result => {
                        if (result && result.items.length > 0) {
                            return result;
                        }
                        let criSec = {
                            keyword: '',
                            // type: 'All',
                            size: 10000,
                            from: 0,
                            attendeer: null,
                            // status: '1',
                            dataEntered: null,
                            alias: null,
                            moenyOrder: null,
                            memKeyword: null,
                            type: "classes"
                        };
                        criSec.ids = _.map(runData.eventsInstance, 'eventId');
                        return search(criSec);

                    });
                    srcs.push(pSearchEvents);
                    return Promise.all(srcs).then(results => {
                        let userDetail = results[0];
                        let eventResult = results[1];
                        let result = {
                            events: eventResult.items || [],
                            runData: runData,
                            userDetail: userDetail
                        };
                        return result;
                    });
                });
            });

        }

        function addEventRun(uid, eventDetail, channel, currentUser) {
            console.log('addEventRun', uid, eventDetail, channel);

            let currentDate = moment().format('MM/DD/YYYY');
            let currentDateUtc = moment.utc(currentDate, 'MM/DD/YYYY').startOf('day').valueOf();
            let expireDate = moment().add(1, 'days').format('MM/DD/YYYY');
            let expireDateUtc = moment.utc(expireDate, 'MM/DD/YYYY').startOf('day').valueOf();
            let uniqueToken = firebaseDataRef.child("event-unique-url").push();
            let eventsSnapshot = {};
            eventsSnapshot[eventDetail.$id] = {
                eventId: eventDetail.$id,
                status: eventDetail.status,
                name: eventDetail.name
            };
            return employeeService.getUser(uid).then(userDetail => {
                let runData = {
                    uid: uid,
                    dateString: currentDate,
                    date: currentDateUtc,
                    status: 0,
                    expireDate: expireDateUtc,
                    eventsInstance: eventsSnapshot,
                    timestampCreated: Date.now(),
                    timestampModified: Date.now(),
                    source: 'SmartAdmin',
                    transaction: {}
                };
                if (channel.indexOf('email') > -1) {
                    let transactionEmail = firebaseDataRef.child(`event-campaign/${currentDateUtc}`).push();
                    runData.transaction[transactionEmail.key] = {
                        date: currentDateUtc,
                        dateString: currentDate,
                        status: 0,
                        recipient: userDetail.notificationEmail || userDetail.email,
                        token: uniqueToken.key,
                        channel: 'email',
                        url: $rootScope.storage.appSettings.webURL + '/#/events/confirmation?token=' + uniqueToken.key
                    };
                }
                if (channel.indexOf('sms') > -1) {
                    let transactionSMS = firebaseDataRef.child(`event-campaign/${currentDateUtc}`).push();
                    runData.transaction[transactionSMS.key] = {
                        date: currentDateUtc,
                        dateString: currentDate,
                        status: 0,
                        recipient: userDetail.primaryPhone,
                        token: uniqueToken.key,
                        channel: 'sms',
                        url: $rootScope.storage.appSettings.webURL + '/#/events/confirmation?token=' + uniqueToken.key
                    };
                }

                let runItemRef = firebaseDataRef.child(`event-campaign/${currentDateUtc}`).push();
                return runItemRef.set(runData).then(() => {
                    //send notify
                    _.forEach(runData.transaction, (transaction, transactionId) => {
                        transaction.id = transactionId;
                        notificationService.sendNotifyEventConfirmation(transaction, runItemRef.key, currentDateUtc, userDetail);
                    });
                    // update status event to 'pending'
                    let _event = {
                        modifiedBy: currentUser.email || '',
                        $id: eventDetail.$id,
                        timestampModified: Date.now(),
                        verifyStatus: 0
                    };
                    _update(_event);

                    return uniqueToken.set({
                        campaignId: currentDateUtc,
                        runId: runItemRef.key
                    });
                });
            });
        }

        function forceRefreshEventData(eventType, eventId, primaryKey, callback) {
            let path = `tls-api-data-cache/event-${eventType}/primaryKeyEvents/${eventId}`;
            let ref = firebaseDataRef.child(path);
            let object = {
                timestampCreated: Date.now(),
                primaryKey: primaryKey
            };
            let showed = false;
            ref.on('value', function (snap) {
                let timeout = setTimeout(() => {
                    if (!showed) {
                        ref.off('value');
                        callback();
                    }
                }, 40000);
                if (!snap.val()) {
                    showed = true;
                    clearTimeout(timeout);
                    ref.off('value');
                    callback();
                }

            });
            return firebaseDataRef.child(path).update(object);
        }
        function updateVerifyStatus(events, runData, currentUser) {
            if (!runData.campaignId || !runData.$id) {
                return Promise.reject("Some thing have error!");
            }
            let srcs = [];
            _.forEach(events, event => {
                console.log('event', event);
                get(event.$id).then(eventDetail => {
                    console.log('eventDetail', eventDetail);
                    if (eventDetail.verifyStatus == appUtils.eventVerifyStatusEnum.CANCELED || eventDetail.verifyStatus == appUtils.eventVerifyStatusEnum.CONFIRMED) {
                        //continue
                    } else {
                        console.log('else');

                        let _event = {
                            modifiedBy: currentUser.email || '',
                            $id: event.$id,
                            timestampModified: Date.now()
                        };
                        _event.verifyStatus = event.submitVerifyStatus;
                        _event._verifyStatus = event.submitVerifyStatus;
                        if (_event.verifyStatus == -1) {
                            _event.status = -1;
                        }
                        srcs.push(_update(_event, currentUser, 'submitEvent'));
                        if (event.submitVerifyStatus == appUtils.eventVerifyStatusEnum.CANCELED) {
                            srcs.push(notificationService.notifyCancelEvent(event.$id, runData.campaignId, runData.$id, currentUser));
                        }
                    }
                });
            });
            return Promise.all(srcs).then(srcResults => {
                let eventsSnapshot = {};
                _.forEach(events, event => {
                    eventsSnapshot[event.$id] = {
                        eventId: event.$id,
                        status: event.status,
                        verifyStatus: event.submitVerifyStatus,
                        name: event.name
                    };
                });
                // let eventsSnapshot = _.groupBy(_.map(events, event => {
                //     return {
                //         eventId: event.$id,
                //         status: event.status,
                //         verifyStatus: event.submitVerifyStatus,
                //         name: event.name
                //     }
                // }), 'eventId');
                console.log('eventsSnapshot', eventsSnapshot, events);
                let _run = {
                    modifiedBy: currentUser.email || '',
                    timestampModified: Date.now(),
                    status: 1
                };
                if (eventsSnapshot) {
                    _run.events = eventsSnapshot;
                }
                return eventCampaignRef.child(`${runData.campaignId}/${runData.$id}`).update(_run).then(() => {
                    //send mail
                    return true;
                });
            });
        }
        // function report(cri){
        //     var query = genSearchQuery(cri);
        //     query.body.aggs = {
        // 		groupByState: {
        // 			terms: {
        // 				field: "state",
        // 				order: {
        // 					totalRevenue: "desc"
        //                 },
        //                 size: 10
        // 			},
        // 			aggs: {
        // 				totalRevenue: {
        // 					sum: {
        // 						field: "iptTotalRevenue"
        // 					}
        //                 }
        // 			}
        //         },
        //         groupByTerritory: {
        // 			terms: {
        // 				field: "territory.raw",
        // 				order: {
        // 					totalRevenue: "desc"
        //         		}, 
        //              size: 10
        // 			},
        // 			aggs: {
        // 				totalRevenue: {
        // 					sum: {
        // 						field: "iptTotalRevenue"
        // 					}
        // 				}
        // 			}
        //         },
        //         groupByType: {
        // 			terms: {
        // 				field: "type.raw",
        // 				order: {
        // 					totalRevenue: "desc"
        //                 },
        // 			},
        // 			aggs: {
        // 				totalRevenue: {
        // 					sum: {
        // 						field: "iptTotalRevenue"
        // 					}
        // 				}
        // 			}
        //         },
        //         groupByPlanType: {
        // 			terms: {
        // 				field: "region",
        // 				order: {
        // 					totalRevenue: "desc"
        // 				}
        // 			},
        // 			aggs: {
        // 				totalRevenue: {
        // 					sum: {
        // 						field: "iptTotalRevenue"
        // 					}
        // 				}
        // 			}
        //         },
        //         groupByDay: {
        //             date_histogram : {
        //                 field : "startDate",
        //                 interval : cri.interval || "day",
        //                 format : "MM/dd/yyyy" 
        //             },
        //             aggs: {
        //                 groupByType: {
        //                     terms: {
        //                         field: "type.raw",
        //                         order: {
        //                             totalRevenue: "desc"
        //                         }
        //                     },
        //                     aggs: {
        //                         totalRevenue: {
        //                             sum: {
        //                                 field: "iptTotalRevenue"
        //                             }
        //                         }
        //                     }
        //                 },
        //             }
        //         }
        // 	};
        //     return searchService.search(query, 'events');
        // }

        // function reportWithGoal(cri){
        //     var query = genSearchQuery(cri);
        //     query.body.aggs = {
        // 		groupByState: {
        // 			terms: {
        // 				field: "state",
        // 				order: {
        // 					totalRevenue: "desc"
        //                 },
        //                 size: 500
        // 			},
        // 			aggs: {
        // 				totalRevenue: {
        // 					sum: {
        // 						field: "iptTotalRevenue"
        // 					}
        //                 },
        //                 groupByType: {
        //                     terms: {
        //                         field: "type.raw",
        //                         order: {
        //                             totalRevenue: "desc"
        //                         }
        //                     },
        //                     aggs: {
        //                         totalRevenue: {
        //                             sum: {
        //                                 field: "iptTotalRevenue"
        //                             }
        //                         }
        //                     }
        //                 },
        // 			}
        //         }
        // 	};
        //     return searchService.search(query, 'events');
        // }

        // function report(cri){
        //     var query = genSearchQuery(cri);
        //     query.body.aggs = {
        // 		groupByState: {
        // 			terms: {
        // 				field: "state",
        // 				order: {
        // 					totalRevenue: "desc"
        //                 },
        //                 size: 10
        // 			},
        // 			aggs: {
        // 				totalRevenue: {
        // 					sum: {
        // 						field: "iptTotalRevenue"
        // 					}
        //                 }
        // 			}
        //         },
        //         groupByTerritory: {
        // 			terms: {
        // 				field: "territory.raw",
        // 				order: {
        // 					totalRevenue: "desc"
        //         		}, 
        //              size: 10
        // 			},
        // 			aggs: {
        // 				totalRevenue: {
        // 					sum: {
        // 						field: "iptTotalRevenue"
        // 					}
        // 				}
        // 			}
        //         },
        //         groupByType: {
        // 			terms: {
        // 				field: "type.raw",
        // 				order: {
        // 					totalRevenue: "desc"
        //                 },
        // 			},
        // 			aggs: {
        // 				totalRevenue: {
        // 					sum: {
        // 						field: "iptTotalRevenue"
        // 					}
        // 				}
        // 			}
        //         },
        //         groupByPlanType: {
        // 			terms: {
        // 				field: "region",
        // 				order: {
        // 					totalRevenue: "desc"
        // 				}
        // 			},
        // 			aggs: {
        // 				totalRevenue: {
        // 					sum: {
        // 						field: "iptTotalRevenue"
        // 					}
        // 				}
        // 			}
        //         },
        //         groupByDay: {
        //             date_histogram : {
        //                 field : "startDate",
        //                 interval : cri.interval || "day",
        //                 format : "MM/dd/yyyy" 
        //             },
        //             aggs: {
        //                 groupByType: {
        //                     terms: {
        //                         field: "type.raw",
        //                         order: {
        //                             totalRevenue: "desc"
        //                         }
        //                     },
        //                     aggs: {
        //                         totalRevenue: {
        //                             sum: {
        //                                 field: "iptTotalRevenue"
        //                             }
        //                         }
        //                     }
        //                 },
        //             }
        //         },
        //         totalRevenue: {
        // 			sum: {
        // 				field: "iptTotalRevenue"
        // 			}
        // 		},
        // 		totalAttendees: {
        // 			sum: {
        // 				field: "iptTotalAttendeesRegistered"
        // 			}
        // 		},
        // 		totalNewMembers: {
        // 			sum: {
        // 				field: "iptNewMember"
        // 			}
        //         },
        //         totalMonthly: {
        // 			sum: {
        // 				field: "iptTotalMonthlyMember"
        // 			}
        // 		},
        // 		totalAnnual: {
        // 			sum: {
        // 				field: "iptTotalAnnualMember"
        // 			}
        // 		},
        // 	};
        //     return searchService.search(query, 'events');
        // }

        // function reportWithGoal(cri){
        //     var query = genSearchQuery(cri);
        //     query.body.aggs = {
        // 		groupByState: {
        // 			terms: {
        // 				field: "state",
        // 				order: {
        // 					totalRevenue: "desc"
        //                 },
        //                 size: 500
        // 			},
        // 			aggs: {
        // 				totalRevenue: {
        // 					sum: {
        // 						field: "iptTotalRevenue"
        // 					}
        //                 },
        //                 groupByType: {
        //                     terms: {
        //                         field: "type.raw",
        //                         order: {
        //                             totalRevenue: "desc"
        //                         }
        //                     },
        //                     aggs: {
        //                         totalRevenue: {
        //                             sum: {
        //                                 field: "iptTotalRevenue"
        //                             }
        //                         }
        //                     }
        //                 },
        // 			}
        //         }
        // 	};
        //     return searchService.search(query, 'events');
        // }

        return service;
    }
})();