(function () {
    'use strict';

    angular.module('app.event')
        .controller('eventDetailChartPopupCtrl', eventDetailChartPopupCtrl);

    /** @ngInject */
    function eventDetailChartPopupCtrl($scope, $state, $uibModalInstance, $q, $timeout, pointData, appUtils, eventId, memAppService, memberShipService, employeeService) {
        var eventDetailsCtrl = $scope.eventVm;
        var eventChartVm = this; // jshint ignore:line
        eventChartVm.pointData = angular.copy(pointData);
        eventChartVm.title = 'Applications Of Event';
        eventChartVm.items = [];
        eventChartVm.events = [];
        eventChartVm.result = [];
        eventChartVm.sort = {
            field: 'firstName',
            desc: true
        };

        eventChartVm.changePage = changePage;
        eventChartVm.appStatus = appUtils.appStatus;
        //eventChartVm.changeSelectEvent = changeSelectEvent;
        eventChartVm.getAppStatus = getAppStatus;
        eventChartVm.toggleSort = toggleSort;
        function getAppStatus(key) {
            var rs = _.find(eventChartVm.appStatus, { 'key': key });
            return rs !== undefined && rs.value ? rs.value : '';
        }
        eventChartVm.cri = {
            keyword: '',
            event: '',
            status: '4,8',
            size: 10,
            from: 0
        };

        eventChartVm.paging = {
            pageSize: 10,
            currentPage: 0,
            totalPage: 0,
            totalRecord: 0
        };

        initPage();
        function initPage() {
            appUtils.showLoading();
            // var filter = {
            //    chart: '',
            //    value: '' 
            // };
            // //get timestamp start & end of data
            // if(eventChartVm.infoType === 'SalePipelineChart'){
            //     eventChartVm.total = pointData.totalEvent || 0; 
            //     eventChartVm.totalCount = pointData.y;
            //     eventChartVm.countLabel = pointData.name;
            //     eventChartVm.title = pointData.name;
            //     filter.chart = 'SalePipelineChart';
            //     filter.value = pointData.y;
            // } else if(eventChartVm.infoType === 'revenueEventChart'){
            //     eventChartVm.total = pointData.totalEvent || 0; 
            //     eventChartVm.totalCount = parseFloat(pointData.y) || 0;
            //     eventChartVm.revenue = true;
            //     eventChartVm.cri.status = '4';
            //     eventChartVm.countLabel = pointData.label;
            //     eventChartVm.title = pointData.category;
            //     filter.chart = 'revenueEventChart';
            //     filter.value = pointData.type;
            // }else if(eventChartVm.infoType === 'eventChart'){
            //      //set totalAmount UI
            //   eventChartVm.total = parseFloat(pointData.y) || 0; 
            //   //set header Title UI 
            //   eventChartVm.title = pointData.name;

            //   filter.chart = 'eventChart';
            //   filter.value = pointData.type;
            // }else if(eventChartVm.infoType === 'eventFacilityChart'){
            //   //set totalAmount UI
            //   eventChartVm.total = parseFloat(pointData.y) || 0; 
            //   //set header Title UI 
            //   eventChartVm.title = pointData.name;

            //   filter.chart = 'eventFacilityChart';
            //   filter.value = pointData.facilityId;
            //   eventChartVm.facilityRegion = angular.copy($scope.eventChartVm.facilityPieChartState);
            // }

            loadData();
        }

        function loadData() {
            // var report = filter.chart || '';
            // switch(report){
            //     case 'eventFacilityChart': 
            //         eventChartVm.events = _.filter(eventsData, function(event){
            //             return event.facilityId === filter.value;
            //         });
            //         eventChartVm.eventIds = _.map(eventChartVm.events, function(item){
            //             return item.$id;
            //         });
            //         break;
            //     case 'eventChart': 
            //         eventChartVm.events = _.filter(eventsData, function(event){
            //             return event.type === filter.value;
            //         });
            //         eventChartVm.eventIds = _.map(eventChartVm.events, function(item){
            //             return item.$id;
            //         });
            //         break;
            //     case 'revenueEventChart': 
            //         eventChartVm.events = _.filter(eventsData, function(event){
            //             return parseInt(event.startDate) >= parseInt(pointData.startTime) && parseInt(event.startDate) <= parseInt(pointData.endTime);
            //         });
            //         eventChartVm.eventIds = _.map(eventChartVm.events, function(item){
            //             return item.$id;
            //         });
            //         break;
            //     default: 
            //         eventChartVm.eventIds = _.map(eventsData, function(item){
            //             return item.$id;
            //         });
            //         break;


            // }

            eventChartVm.cri.event = angular.copy(eventId);
            return _search();
        }

        function changePage() {
            eventChartVm.cri.from = eventChartVm.paging.currentPage * eventChartVm.cri.size;
            _search();
        }

        // function changeSelectEvent(){
        //     eventChartVm.cri.event = angular.copy(eventChartVm.eventIds).join(',');
        //     $timeout(search(),500);
        // }

        function search() {
            appUtils.showLoading();
            eventChartVm.cri.from = 0;
            eventChartVm.cri.currentPage = 0;
            _search();
        }

        function _search() {
            return memAppService.searchByEvents(eventChartVm.cri).then(function (result) {
                angular.extend(eventChartVm.paging, {
                    totalRecord: result.totalRecords,
                    totalPage: result.pages
                });
                return _getDataMember(result.items).then(function (data) {
                    appUtils.hideLoading();
                    eventChartVm.items = data;
                });
            });
        }

        function _getDataMember(applications) {
            var reqs = [];
            _.forEach(applications, function (app) {
                var state = _.find(eventDetailsCtrl.allStates, { iso: app.state }),
                    planType = _.find(eventDetailsCtrl.regionGroups[app.state], { id: app.region }),
                    facility = _.find(eventDetailsCtrl.allFacilities, { $id: app.facilityId });

                app.totalAmount = app.total ? parseFloat(app.total) : 0;
                app.state = state && state.name || '';
                app.planType = planType && planType.guid || '';
                app.facilityName = facility && facility.name || '';
                app.addons = app.selectedAddons ? app.selectedAddons.join("<br>") : '';

                var req = memberShipService.getWithLoad(app.membershipId).then(function (mem) {
                    app.firstName = !mem || !mem.priMember || !mem.priMember.firstName ? ' ' : mem.priMember.firstName;
                    app.lastName = !mem || !mem.priMember || !mem.priMember.lastName ? ' ' : mem.priMember.lastName;
                });

                reqs.push(req);

                var eReq = employeeService.getUserByRepCode(app.representativeCode).then(function (employee) {
                    app.employeeName = employee ? employee.firstName + ' ' + employee.lastName : '';
                    $timeout(angular.noop, 200);
                });

                reqs.push(eReq);
            });

            return $q.all(reqs).then(function () {
                return applications;
            });
        }

        $scope.goTo = function (item) {
            var status = parseInt(item.status);
            var tab = status === 0 ? -1 : status;
            $uibModalInstance.close();
            $state.go('membership.editApplication', { id: item.$id, 'tab': tab, 'keyword': '', 'page': 0 });
        };

        $scope.getFullName = appUtils.getFullNameApplication;

        eventChartVm.close = function () {
            $uibModalInstance.dismiss();
        };

        function toggleSort(field){
            if (field == eventChartVm.sort.field) {
                eventChartVm.sort.desc = !eventChartVm.sort.desc;
            }
            else {
                Object.assign(eventChartVm.sort, {
                    field: field,
                    desc: true
                });
            }
            var orders = [],
                searchField = eventChartVm.sort.field;

            var fieldVal = function (field) {
                return function (item) {
                    if (item[field] == undefined) {
                        return eventChartVm.sort.desc ? -1 : Number.MAX_SAFE_INTEGER;
                    }
                    return item[field];
                };
            };
            if (searchField == 'firstName' || searchField == 'facilityCode' || searchField == 'representativeCode' || searchField == 'planName' || searchField == 'state' || searchField == 'planType') {
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
                orders.push(fieldVal(eventChartVm.sort.field));
            }
            eventChartVm.items = _.orderBy(eventChartVm.items, orders, [eventChartVm.sort.desc && 'desc' || 'asc']);
            $timeout(angular.noop, 200);
        }
    }

})();
