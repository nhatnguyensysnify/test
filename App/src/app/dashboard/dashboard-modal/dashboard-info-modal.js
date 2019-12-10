(function () {
    'use strict';

    angular.module('app.membership')
        .controller('dashboardInfoModalCtrl', dashboardInfoModalCtrl);

    /** @ngInject */
    function dashboardInfoModalCtrl($rootScope, $scope, $state, $uibModalInstance, $timeout, pointData, infoType, memAppService, memberShipFacilitiesService, appUtils) {
        var dashVm = this; // jshint ignore:line
        var dashboardCtrl = $scope.dashboardVm;
        var startDate, endDate, timestampStart, timestampEnd;
        dashVm.sort = {
            field: 'primaryMember',
            desc: true
        };
        dashVm.infoType = infoType;
        dashVm.pointData = pointData; // data from point in chart onlick
        dashVm.items = [];
        dashVm.revenueChart = true;
        dashVm.reportBy = '';
        dashVm.toggleSort = toggleSort;
        initPage();
        function initPage() {
            appUtils.showLoading();
            var filter = {
                field: '',
                value: ''
            }, date, startOfHour, endOfHour;
            //get timestamp start & end of data
            if (dashVm.infoType && dashVm.infoType === 'revenueLineChart') {
                //set totalAmount UI
                dashVm.total = parseFloat(pointData.y) || 0;
                var time = dashVm.pointData.category || '';
                if (time.split(':').length === 2) {
                    var reportDate = $('#revenuerange').data('daterangepicker').startDate;
                    date = moment(reportDate).format("MM/DD/YYYY") + ' ' + time;
                    startOfHour = moment(date).startOf('hour');
                    endOfHour = moment(date).endOf('hour');
                    timestampStart = Date.parse(new Date(startOfHour));
                    timestampEnd = Date.parse(new Date(endOfHour));
                    //set header Title UI
                    dashVm.title = 'From <strong style=\'color: blue\'>' + startOfHour.format('MM/DD/YYYY HH:mm:ss') + '</strong> To <strong style=\'color: blue\'>' + endOfHour.format('MM/DD/YYYY HH:mm:ss') + '</strong>';
                } else {
                    date = moment(time).format("MM/DD/YYYY");
                    startOfHour = moment(date).startOf('day');
                    endOfHour = moment(date).endOf('day');
                    timestampStart = Date.parse(new Date(startOfHour));
                    timestampEnd = Date.parse(new Date(endOfHour));
                    //set header Title UI
                    dashVm.title = 'From <strong style=\'color: blue\'>' + startOfHour.format('MM/DD/YYYY HH:mm:ss') + '</strong> To <strong style=\'color: blue\'>' + endOfHour.format('MM/DD/YYYY HH:mm:ss') + '</strong>';
                }
                filter.field = 'revenueLineChart';
                filter.value = pointData.status;
            } else if (dashVm.infoType && dashVm.infoType === 'revenueFacilityChart') {
                //set totalAmount UI
                dashVm.total = parseFloat(pointData.number) || 0;
                //set header Title UI   
                dashVm.title = pointData.name;
                startDate = $('#faccoderange').data('daterangepicker').startDate;
                endDate = $('#faccoderange').data('daterangepicker').endDate;
                timestampStart = Date.parse(new Date(startDate));
                timestampEnd = Date.parse(new Date(endDate));
                filter.field = 'revenueFacilityChart';
                filter.value = pointData.facilityId;
            } else if (dashVm.infoType && dashVm.infoType === 'revenueStateChart') {
                //set totalAmount UI
                dashVm.total = parseFloat(pointData.number) || 0;
                //set header Title UI  
                dashVm.title = pointData.name;
                startDate = $('#stateRange').data('daterangepicker').startDate;
                endDate = $('#stateRange').data('daterangepicker').endDate;
                timestampStart = Date.parse(new Date(startDate));
                timestampEnd = Date.parse(new Date(endDate));
                filter.field = 'revenueStateChart';
                filter.value = pointData.stateIso;
            } else if (dashVm.infoType && dashVm.infoType === 'applicationStatusChart') {
                //set totalAmount UI
                dashVm.total = parseFloat(pointData.totalAmount) || 0;
                //set header Title UI 
                dashVm.title = pointData.name;
                dashVm.revenueChart = false;
                startDate = $('#applicationrange').data('daterangepicker').startDate;
                endDate = $('#applicationrange').data('daterangepicker').endDate;
                timestampStart = Date.parse(new Date(startDate));
                timestampEnd = Date.parse(new Date(endDate));
                filter.field = 'applicationStatusChart';
                filter.value = pointData.statusCode;

            } 
            // else if (dashVm.infoType && dashVm.infoType === 'revenueRepCodeChart') {
            //     //set totalAmount UI
            //     dashVm.total = parseFloat(pointData.number) || 0;
            //     //set header Title UI
            //     $scope.isByRepCode = true;
            //     dashVm.title = pointData.name;
            //     startDate = $('#repCodeRange').data('daterangepicker').startDate;
            //     endDate = $('#repCodeRange').data('daterangepicker').endDate;
            //     timestampStart = Date.parse(new Date(startDate));
            //     timestampEnd = Date.parse(new Date(endDate));
            //     filter.field = 'revenueRepCodeChart';
            //     filter.value = pointData.representativeCode;
            // }
            else if (dashVm.infoType && dashVm.infoType === 'revenuePlanTypeChart') {
                //set totalAmount UI
                dashVm.total = parseFloat(pointData.number) || 0;
                //set header Title UI
                $scope.isByPlanType = true;
                dashVm.title = pointData.name;
                startDate = $('#PlanTypeRange').data('daterangepicker').startDate;
                endDate = $('#PlanTypeRange').data('daterangepicker').endDate;
                timestampStart = Date.parse(new Date(startDate));
                timestampEnd = Date.parse(new Date(endDate));
                filter.field = 'revenuePlanTypeChart';
                filter.value = pointData.planType;
            }

            loadData(timestampStart, timestampEnd, filter);
        }

        // function loadData(start, end, filter){
        //     var reqs = [];
        //     query = memAppService.searchQuery(search.index,search.type,'','All','All',start,end,'All',10000,0);
        //     queryVerify = memAppService.searchVerifiedQuery(search.index,search.type,'','All','All',start,end,4,10000,0);
        //     if(filter.field === 'applicationStatusChart'){
        //         //get data from startDate & endDate in Database not revenue
        //         reqs.push(searchService.search(query,'membership-application-snapshot'));
        //         reqs.push(searchService.search(queryVerify,'membership-application-snapshot'));
        //         $q.all(reqs).then(function (data) {
        //              //filter match status with this points chart onclick
        //             data[0].items = _.filter(data[0].items, function(item){
        // 			    return item.status && item.status !== '' && parseInt(item.status) !== 4 ;
        // 		    });
        // 		    data[0].items = data[0].items.concat(data[1].items);

        //             data[0].items = _.filter(data[0].items, function(item){
        //                 return parseInt(item.status) === parseInt(filter.value);
        //             });
        //             dashVm.items = getDataMember(data[0].items);
        //             dashVm.members = data[0].items.length;
        //         });
        //     }else{
        //         //get data from startDate & endDate in Database revenue
        //         if(filter && filter.field === 'revenueLineChart'){
        //             if(filter.value === 'processed'){
        //                  reqs.push(searchService.search(queryVerify,'membership-application-snapshot'));
        //             }else if(filter.value === 'unprocessed'){
        //                  reqs.push(searchService.search(query,'membership-application-snapshot'));
        //             }else{
        //                  reqs.push(searchService.search(query,'membership-application-snapshot'));
        //                  reqs.push(searchService.search(queryVerify,'membership-application-snapshot'));
        //             }
        //         }else{
        //             reqs.push(searchService.search(queryVerify,'membership-application-snapshot'));
        //         }

        //         $q.all(reqs).then(function (data) {
        //             if(filter && filter.field === 'revenueFacilityChart'){
        //                 //filter data of revenue by facility with facilityCode & state match facilityCode & state from point you onclick
        //                 data[0].items = _.filter(data[0].items, function(item){
        //                     if(dashboardCtrl.stateFacCode === null){
        //                         return item.facilityCode === filter.value;
        //                     }else{
        //                         return item.facilityCode === filter.value && item.state === dashboardCtrl.stateFacCode;
        //                     }
        //                 });
        //             }else if(filter && filter.field === 'revenueStateChart'){
        //                 //filter data of revenue by state with state match state from point you onclick
        //                 data[0].items = _.filter(data[0].items, function(item){
        //                     return item.state === filter.value;
        //                 });
        //             }else if(filter && filter.field === 'revenueRepCodeChart'){
        //                 //filter data of revenue by representativeCode with representativeCode match representativeCode from point you onclick
        //                 data[0].items = _.filter(data[0].items, function(item){
        //                     return item.representativeCode === filter.value;
        //                 });
        //             }else if(filter && filter.field === 'revenueLineChart'){
        //                 //filter data of revenue  with timestampVerified match startDate & endDate;
        //                  if(filter.value === 'processed'){
        //                     data[0].items = _.filter(data[0].items, function (itemR) {
        //                         return parseInt(itemR.timestampVerified) >= parseInt(start) && parseInt(itemR.timestampVerified) <= parseInt(end);
        //                     });
        //                  }else if(filter.value === 'unprocessed'){
        //                     data[0].items = _.filter(data[0].items, function (item) {
        //                         return parseInt(item.timestampCreated) >= parseInt(start) && parseInt(item.timestampCreated) <= parseInt(end) && parseInt(item.status) !== 4 && parseInt(item.status) !== 6 ;
        //                     });
        //                  }else{
        //                     data[0].items = _.filter(data[0].items, function (item) {
        //                         return parseInt(item.timestampCreated) >= parseInt(start) && parseInt(item.timestampCreated) <= parseInt(end) && parseInt(item.status) !== 4 && parseInt(item.status) !== 6 ;
        //                     });
        //                     data[1].items = _.filter(data[1].items, function (itemR) {
        //                         return parseInt(itemR.timestampVerified) >= parseInt(start) && parseInt(itemR.timestampVerified) <= parseInt(end);
        //                     });

        //                     data[0].items = data[0].items.concat(data[1].items);
        //                  }
        //             }
        //             dashVm.items = getDataMember(data[0].items);
        //             dashVm.members = data[0].items.length;
        //         });
        //     }
        // }

        function loadData(start, end, filter) {
            //get data from startDate & endDate in Database revenue
            return memAppService.search({
				size: 10000,
				from: 0,
				timestampStart: start,
				timestampEnd: end,
				isDashboard: true,
				status: 'All',
                keyword: '',
                sort: true
			}).then(function (data) {
                if (filter && filter.field === 'revenueFacilityChart') {
                    dashVm.reportBy = dashboardCtrl.criReport.facility;
                    //filter data of revenue by facility with facilityCode & state match facilityCode & state from point you onclick
                    //filter data of revenue by state with state match state from point you onclick
                    data.items = _.filter(data.items, function (item) {
                        if (dashboardCtrl.criReport.facility === 'cash')
                            return parseInt(item.status) === 4;
                        else
                            return parseInt(item.status) !== 4 && parseInt(item.status) !== 6;
                    });
                    //
                    data.items = _.filter(data.items, function (item) {
                        if (dashboardCtrl.stateFacCode === null) {
                            return item.facilityId === filter.value;
                        } else {
                            return item.facilityId === filter.value && item.state === dashboardCtrl.stateFacCode;
                        }
                    });
                } else if (filter && filter.field === 'revenueStateChart') {
                    dashVm.reportBy = dashboardCtrl.criReport.state;
                    //filter data of revenue by state with state match state from point you onclick
                    data.items = _.filter(data.items, function (item) {
                        if (dashboardCtrl.criReport.state === 'cash')
                            return item.state === filter.value  && parseInt(item.status) === 4;
                        else
                            return item.state === filter.value  && parseInt(item.status) !== 4 && parseInt(item.status) !== 6;
                    });
                } 
                // else if (filter && filter.field === 'revenueRepCodeChart') {
                //     //filter data of revenue by representativeCode with representativeCode match representativeCode from point you onclick
                //     dashVm.reportBy = dashboardCtrl.criReport.repCode;
                //     data.items = _.filter(data.items, function (item) {
                //         if (dashboardCtrl.criReport.repCode === 'cash') {
                //             return item.representativeCode === filter.value && parseInt(item.status) === 4;
                //         } else {
                //             return item.representativeCode === filter.value && parseInt(item.status) !== 4 && parseInt(item.status) !== 6;
                //         }
                //     });
                // } 
                else if (filter && filter.field === 'revenuePlanTypeChart') {
                    //filter data of revenue by representativeCode with representativeCode match representativeCode from point you onclick
                    dashVm.reportBy = dashboardCtrl.criReport.planType;
                    data.items = _.filter(data.items, function (item) {
                        if (dashboardCtrl.criReport.planType === 'cash') {
                            return item.region === filter.value && parseInt(item.status) === 4;
                        } else {
                            return item.region === filter.value && parseInt(item.status) !== 4 && parseInt(item.status) !== 6;
                        }
                    });
                }else if (filter && filter.field === 'revenueLineChart') {
                    dashVm.reportBy = filter.value;
                    //filter data of revenue  with timestampVerified match startDate & endDate;
                    if (filter.value === 'cash') {
                        data.items = _.filter(data.items, function (item) {
                            return parseInt(item.timestampSignatured) >= parseInt(start) && parseInt(item.timestampSignatured) <= parseInt(end) && parseInt(item.status) === 4;
                        });
                    } else if (filter.value === 'accrual') {
                        data.items = _.filter(data.items, function (item) {
                            return parseInt(item.timestampSignatured) >= parseInt(start) && parseInt(item.timestampSignatured) <= parseInt(end) && parseInt(item.status) !== 4 && parseInt(item.status) !== 6;
                        });
                    }
                } else if (filter && filter.field === 'applicationStatusChart') {
                    data.items = _.filter(data.items, function (item) {
                        return parseInt(item.status) === parseInt(filter.value);
                    });
                }
                return getDataMember(data.items).then(function (rs) {
                    appUtils.hideLoading();
                    dashVm.items = rs;
                    dashVm.members = data.items.length;
                    toggleSort('primaryMember');
                });
            });
            // }

        }

        dashVm.close = function () {
            $uibModalInstance.dismiss(infoType);
        };

        function getDataMember(lstApps) {
            var reqs = [];
            _.forEach(lstApps, function (app) {
                app.totalAmount = app.total ? parseFloat(app.total) : 0;
                var state = _.find(dashboardCtrl.statesLst, { iso: app.state});
                var planType = _.find(dashboardCtrl.regionGroups[app.state], {id: app.region});
                app.state = state ? state.name : ' ';
                app.planType = planType ? planType.guid : ' ';
                app.addons = app.selectedAddons ? app.selectedAddons.join("<br>") : '';
                var employee = _.find(dashboardCtrl.employees, function (em) {
                    return em.repCode && em.repCode === app.representativeCode;
                });
                app.employeeName = employee !== undefined ? employee.firstName + ' ' + employee.lastName : '';
                app.primaryMember = _.trim(app.primaryMember) ||  _.trim(app.seccondMember) || 'Unknown';
                // memberShipService.getWithLoad(app.membershipId).then(function (mem) {
                //     app.firstName = !mem || !mem.priMember || !mem.priMember.firstName ? ' ' : mem.priMember.firstName;
                //     app.lastName = !mem || !mem.priMember || !mem.priMember.lastName ? ' ' : mem.priMember.lastName;
                var req = memberShipFacilitiesService.get(app.facilityId).then(function (facility) {
                    app.facilityName = facility ? facility.name : '';
                    $timeout(angular.noop, 200);
                });
                reqs.push(req);
                // });
            });

            return Promise.all(reqs).then(function () {
                return lstApps;
            });
        }

        $scope.goTo = function (item) {
            var status = parseInt(item.status);
            var tab = status === 0 ? -1 : status;
            $uibModalInstance.close();
            $state.go('membership.editApplication', { id: item.$id, 'tab': tab, 'keyword': '', 'page': 0 });
        };

        $scope.getFullName = appUtils.getFullNameApplication;
        
        function toggleSort(field){
            if (field == dashVm.sort.field) {
                dashVm.sort.desc = !dashVm.sort.desc;
            }
            else {
                Object.assign(dashVm.sort, {
                    field: field,
                    desc: true
                });
            }
            var orders = [], 
                searchField = dashVm.sort.field;

            var fieldVal = function (field) {
                return function (item) {
                    if (item[field] == undefined) {
                        return dashVm.sort.desc ? -1 : Number.MAX_SAFE_INTEGER;
                    }
                    return item[field];
                };
            };
            if (searchField == 'primaryMember' || searchField == 'facilityCode' || searchField == 'representativeCode' || searchField == 'planName' || searchField == 'state') {
                fieldVal = function (field) {
                    return function(item){
                        return item[field] && item[field].toLowerCase();
                    };
                };
            }

            if (searchField === 'planType') {
                orders.push(fieldVal('state'));
                orders.push(fieldVal('region'));
            } else {
                orders.push(fieldVal(dashVm.sort.field));
            }

            dashVm.items = _.orderBy(dashVm.items, orders, [dashVm.sort.desc && 'desc' || 'asc']);
            $timeout(angular.noop, 200);
        }
    }

})();
