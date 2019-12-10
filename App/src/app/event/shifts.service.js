(function () {
    'use strict';
    angular.module('app.event').factory('shiftsService', shiftsService);
    /** @ngInject **/
    function shiftsService(appUtils, shiftUtils, authService, firebaseDataRef, employeeService, memberShipFacilitiesService,
        $q, $rootScope, searchService, notificationService, employeeLogService) {
        var services = {
            addShifts: addShifts,
            searchShift: searchShift,
            search: search,
            searchShiftAvailable: searchShiftAvailable,
            cancelShift: cancelShift,
            setStatusAvailableShift: setStatusAvailableShift,
            reassign: reassign
        };

        //prop
        const path = "employee-shifts",
            source = authService.getCurrentUser().$id,
            formatDate = appUtils.formatDateString,
            toTimeStamp = appUtils.toTimeStamp;

        //function userId() { return $stateParams.id; }

        function shiftsRef() {
            return firebaseDataRef.child(path);
        }

        

        

        function addShifts(shifts, employee) {

            var data = {};
            let startShift = _.maxBy(shifts, 'startTime');
            let endShift = _.minBy(shifts, 'endTime');
            let currentUser = authService.getCurrentUser();

            var keys = _.map(shifts, shift => {
                const key = shiftsRef().push().key;
                data[key] = shift;
                return key;
            });

            return shiftsRef().update(data).then(() => {
                _.forEach(keys, key => indexShift(key, data[key], true));

                // return data;
                //Hanlde tracking activities
                let from = moment(startShift.startTime).utc().format('MM/DD/YYYY');
                let to = moment(endShift.endTime).utc().format('MM/DD/YYYY');
                var employeeLog = {
                    action: appUtils.logEmployeeAction.addAvailability.value,
                    message: `Added availability for range: ${from} - ${to}`,
                    updateBy: employee.email || '',
                    status: 'Added'
                };


                if (currentUser.uid != employee.uid) {

                    employeeLog.updateBy = currentUser.email;
                    employeeLog.message = `${currentUser.displayName}(${currentUser.repCode}) added availability for you on ${from}`;

                    //add log for manager
                    var managerLog = angular.copy(employeeLog);
                    managerLog.action = appUtils.logEmployeeAction.setAvailability.value;
                    managerLog.message = `Added availability for ${employee.displayName} (${employee.repCode}) on ${from}`;
                    managerLog.updateBy = currentUser.email;
                    employeeLogService.create(currentUser.uid, managerLog);
                }

                return employeeLogService.create(employee.uid, employeeLog).then(() => {
                    return employeeService.updateLastAddedShift(employee.uid, endShift.endTime).then(() => {
                        let shiftData = shifts && shifts[0];
                        shiftData.shiftId = keys && keys[0];
                        //if manager add shift for rep
                        if (shiftData && shiftData.status === shiftUtils.StatusEnum.APPROVED) {
                            notificationService.notiAvailableForManager(shiftData);
                        }
                        return data;
                    });
                });

            });

            
        }

      



        function setStatusAvailableShift(shift, status) {
            if (!shift) {
                return new Promise((res, rej) => { res(""); });
            }
            let shift2Update = {
                availability: true,
                status: status,
                modifiedBy: source,
                timestampModified: appUtils.getTimestamp()
            };
            return shiftsRef().child(shift.shiftId).update(shift2Update).then(rs => {
                indexShift(shift.shiftId, null, false);

                //add log
                var employeeLog = {
                    action: appUtils.logEmployeeAction.updateAvailability.value,
                    message: `Updated availability on ${shift.dateStr}`,
                    updateBy: shift.repMail || '',
                    status: 'Success'
                };
                //Update Availability
                if (status === shiftUtils.StatusEnum.CONFIRMED) {
                    console.log('===== update ======');
                    employeeLogService.create(shift.rep, employeeLog);

                    return notificationService.notiAvailableForRep(shift).then(() => {
                        return shift;
                    });
                } else { // Set Availability
                    //start log
                    console.log('===== set ======');
                    let manager = authService.getCurrentUser();
                    employeeLog.action = appUtils.logEmployeeAction.setAvailability.value;
                    employeeLog.updateBy = manager.email;
                    employeeLog.message = `${manager.displayName}(${manager.repCode}) already set the availability on ${shift.dateStr}`;
                    employeeLogService.create(shift.rep, employeeLog);

                    let managerLog = angular.copy(employeeLog);
                    managerLog.message = `Already set the availability on ${shift.dateStr} for ${shift.repFullName}(${shift.repCode}).`;
                    employeeLogService.create(manager.$id, managerLog);
                    //end log
                    //start send mail
                    return notificationService.notiAvailableForManager(shift).then(() => {
                        return shift;
                    });
                }
            });
        }

        function cancelShift(shiftData, reason, events) {
            let id = shiftData.shiftId;
            let shift = {};

            shift.availability = false;
            shift.status = shiftUtils.StatusEnum.APPROVED;
            shift.modifiedBy = source;
            shift.timestampModified = appUtils.getTimestamp();
            shift.reason = reason || "";

            let eventsUndo = {};
            for (let i = 0; i < events.length; i++) {
                eventsUndo[events[i].$id] = {
                    eventId: events[i].$id,
                    name: events[i].name
                };
            }
            shift.eventsUndo = eventsUndo;

            return shiftsRef().child(id).update(shift).then(rs => {
                indexShift(id);
                return notificationService.notiCancelShift(shiftData);
            });
        }

        function reassign(shiftId, rep) {
            let shift = {
                repAssigned: {}
            };
            shift.repAssigned[rep.uid] = {
                displayName: rep.displayName,
                email: rep.email,
                repCode: rep.repCode
            };
            shift.modifiedBy = source;
            shift.timestampModified = appUtils.getTimestamp();
            return shiftsRef().child(shiftId).update(shift).then(() => {
                return indexShift(shiftId, null, false);
            });
        }





        //Async
        function indexShift(key, data, isCreate) {
            let opts = null;
            if (data && isCreate) {
                opts = { data: data, priority: isCreate };
            }
            searchService.index(key, $rootScope.storage.appSettings.elasticSearch.shift, opts);
        }

        function searchQuery(cri) {
            var searchSetting = $rootScope.storage.appSettings.elasticSearch.shift;
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

            //filter by startDate in dateRange
            if (cri.timestampStart && cri.timestampEnd) {
                queryBody.must.push({
                    range: {
                        date: {
                            gte: parseInt(cri.timestampStart),
                            lte: parseInt(cri.timestampEnd)
                        }
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
                    multi_match: {
                        query: cri.ids, //['VuV2KhqJnhbkYwfwxu4aVLrHNnW2']
                        type: "phrase_prefix",
                        fields: ["rep"]
                    }
                });
                //  queryBody.filter = {
                //     ids: {
                //         values: ['VuV2KhqJnhbkYwfwxu4aVLrHNnW2']
                //     }
                // };
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

            // if (cri.sort && $.trim(cri.sort) !== '') {
            //     query.sort = cri.sort;
            // } else {
            //     query.sort = [ ];
            // }

            return query;
        }

        function search(cri) {
            let _cri = angular.copy(cri);
            var query = genSearchQuery(_cri);
            return searchService.search(query, 'shift').then(rs => { });
        }

        function searchShift(cri) {
            var _cri = angular.copy(cri);
            var query = searchQuery({
                from: 0,
                size: 0,
                // isAuthorized: true,
                // alias: _cri.alias,
                timestampStart: _cri.timestampStart,
                timestampEnd: _cri.timestampEnd,
                ids: cri.ids
                // states: cri.state
            });


            query.body.aggs = {
                groupByDateRange: {
                    date_histogram: {
                        field: "date",
                        interval: _cri.interval || "day",
                        format: "MM/dd/yyyy",
                        min_doc_count: 0,
                        extended_bounds: {
                            min: parseInt(_cri.timestampStart),
                            max: parseInt(_cri.timestampEnd)
                        }
                    },
                    aggs: {

                        reps_available: {
                            top_hits: {
                                _source: {
                                    includes: ["title", "dateString", "date", "description", "status", "startTime", "endTime", "rep", "availability", "eventsUndo", "repAssigned", "alias"]
                                },
                                size: 10000
                            }
                        }
                    }
                }
            };



            return searchService.search(query, 'shift').then(function (rs) {
                if (!rs) return null;

                var aggregations = (rs && rs.aggregations) || null;
                var result = null;
                if (aggregations) {
                    result = {};
                    let groupDateRange = (aggregations.groupByDateRange && aggregations.groupByDateRange.buckets) || [];

                    if (groupDateRange) {
                        let resultGroupDateRange = _.map(groupDateRange, function (item) {
                            let obj = {
                                title: moment(item.key).format("MM/DD/YYYY"),
                                key: item.key,
                                count: item.doc_count || 0
                            };
                            let repsAvailable = (item.reps_available && item.reps_available.hits && item.reps_available.hits.hits) || [];
                            repsAvailable = _.map(repsAvailable, item => {
                                item._source.$id = item._source.rep;
                                item._source.shiftId = item._id;
                                return item._source;
                            });
                            let repsAvailableValue = _.mapValues(_.groupBy(repsAvailable, 'rep'),
                                clist => clist.map(instance => _.omit(instance, 'rep')));
                            obj.repsAvailable = repsAvailable;
                            obj.repsAvailableGroup = repsAvailableValue;
                            return obj;
                        });
                        //group by day timestamp 
                        // let obj = _.mapValues(_.groupBy(resultGroupDateRange, 'key'),
                        // clist => clist.map(instance => _.omit(instance, 'key')));
                        let obj = _.mapKeys(resultGroupDateRange, 'key');

                        return obj;
                    }

                }

                return result;
            });
        }

        function searchShiftAvailable(cri) {
            var _cri = angular.copy(cri);

            var query = searchQuery({
                from: 0,
                size: 10000,
                alias: _cri.alias,
                timestampStart: _cri.timestampStart,
                timestampEnd: _cri.timestampEnd,
                ids: cri.ids
            });
            //just get userid
            query.body._source = ["rep"];
            //inject filter by status
            // query.body.query.bool.must.push({
            //     "bool": {
            //         "should": [{
            //             "match": {
            //                 "status": shiftUtils.StatusEnum.CONFIRMED //confirmed
            //             }
            //         }]
            //     }
            // });
            query.body.query.bool.must.push({
                "match": {
                    "availability": true //Available
                }
            });

            return searchService.search(query, 'shift').then(function (rs) {
                return (rs && rs.items) ? rs.items : [];
            });
        }

        return services;
    }
})();