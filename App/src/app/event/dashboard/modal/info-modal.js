(function () {
    'use strict';
    angular.module('app.event').controller('eventDashboardInformationModalCtrl', eventDashboardInformationModalCtrl);
    /** @ngInject */
    function eventDashboardInformationModalCtrl($scope, $uibModalInstance, $timeout, eventService, pointData, infoType, appUtils) {
        var dashboardCrl = $scope.eventVm,
            eventModalVm = this; // jshint ignore:line

        eventModalVm.events = [];
        eventModalVm.cri = angular.copy(dashboardCrl.cri);
        eventModalVm.infoType = angular.copy(infoType) || '';
        eventModalVm.pointData = angular.copy(pointData);
        eventModalVm.type = 1;
        eventModalVm.title = '';
        eventModalVm.result = [];
        eventModalVm.sort = {
            field: 'type',
            desc: true
        };
        eventModalVm.cri.sort = 'type:desc';
        //
        eventModalVm.paging = {
            pageSize: 12,
            currentPage: 0,
            totalPage: 0,
            totalRecord: 0
        };
        //
        // console.log('pointData',pointData);
        eventModalVm.getType = dashboardCrl.getType;
        eventModalVm.getState = dashboardCrl.getState;
        eventModalVm.getFacility = dashboardCrl.getFacility;
        eventModalVm.getTerritory = dashboardCrl.getTerritory;
        eventModalVm.getDateTime = dashboardCrl.getDateTime;
        eventModalVm.parseToNumber = dashboardCrl.parseToNumber;
        eventModalVm.changePage = changePage;
        eventModalVm.toggleSort = toggleSort;
        eventModalVm.close = close;

        initPage();
        //===============================================================
        function initPage() {
            //
            appUtils.showLoading();
            //get timestamp start & end of data

            if (eventModalVm.infoType === 'revenueEventChart') {
                eventModalVm.title = '<span class="caption-subject font-blue-steel bold uppercase">Event Revenue > ' + pointData.category.replace('<br>', '') + '</span>';
                eventModalVm.type = 'event_revenue';
                console.log(pointData);
                var date = angular.copy(pointData.key);
                eventModalVm.cri.type = angular.copy(pointData.type);
                var interval = eventModalVm.cri.interval || 'day',
                    start = moment(angular.copy(date)).utc(),
                    end = moment(angular.copy(date)).utc();

                if (interval === 'day') {
                    start = start.startOf('day');
                    end = end.endOf('day');
                } else if (interval === 'week') {
                    start = start.startOf('day');
                    end = end.endOf('week').add('day', 1);
                } else if (interval === 'month') {
                    start = start.startOf('day');
                    end = end.endOf('month');
                }
                var startTs = start.valueOf(),
                    endTs = end.valueOf();

                if (startTs > eventModalVm.cri.timestampStart) {
                    eventModalVm.cri.timestampStart = startTs;
                }
                if (endTs < eventModalVm.cri.timestampEnd) {
                    eventModalVm.cri.timestampEnd = endTs;
                }
            } else if (eventModalVm.infoType === 'eventChart') {
                eventModalVm.title = '<span class="caption-subject font-blue-steel bold uppercase">Event By Type > ' + pointData.name + '</span>';
                eventModalVm.type = 'event_by_type';
                eventModalVm.cri.type = angular.copy(pointData.type);
            } else if (eventModalVm.infoType === 'eventPlanTypeChart') {
                eventModalVm.title = '<span class="caption-subject font-blue-steel bold uppercase">Event By Plan Type > ' + pointData.name + '</span>';
                eventModalVm.type = 'event_by_plan_type';
                eventModalVm.cri.plantypes = angular.copy(pointData.type);
            } else if (eventModalVm.infoType === 'saleByRegionChart') {
                eventModalVm.cri = angular.copy(dashboardCrl.criRegion);
                eventModalVm.cri.size = 12;
                eventModalVm.cri.sort = "startDate:desc";
                eventModalVm.sort.field = "startDate";
                eventModalVm.title = '<span class="caption-subject font-blue-steel bold uppercase">Sale By States > ' + pointData.category + '</span>';
                eventModalVm.type = 'sale_by_region';
                eventModalVm.cri.state = angular.copy(pointData.stateIso);
            } else if (eventModalVm.infoType === 'top10RegionRevenueChart') {
                eventModalVm.title = '<span class="caption-subject font-blue-steel bold uppercase">Top 10 States By Revenue > ' + pointData.category + '</span>';
                eventModalVm.type = 'top10_region_revenue';
                eventModalVm.cri.state = angular.copy(pointData.stateIso);
            } else if (eventModalVm.infoType === 'top10TerritoryRevenueChart') {
                eventModalVm.title = '<span class="caption-subject font-blue-steel bold uppercase">Top 10 Territories By Revenue > ' + pointData.category + '</span>';
                eventModalVm.type = 'top10_territory_revenue';
                eventModalVm.cri.territory = angular.copy(pointData.territoryId || 'Empty');
            }

            eventModalVm.dateRangeTitle = moment(angular.copy(eventModalVm.cri.timestampStart)).utc().format('MM/DD/YYYY') + ' - ' + moment(angular.copy(eventModalVm.cri.timestampEnd)).utc().format('MM/DD/YYYY');
            return search();

        }

        function changePage() {
            appUtils.showLoading();
            eventModalVm.cri.from = eventModalVm.paging.currentPage * eventModalVm.cri.size;
            _search();
        }

        function search() {
            appUtils.showLoading();
            eventModalVm.cri.from = eventModalVm.paging.currentPage = 0;
            _search();
        }

        function _search() {
            return eventService.search(eventModalVm.cri).then(function (result) {
                appUtils.hideLoading();
                eventModalVm.events = result.items;
                angular.extend(eventModalVm.paging, {
                    totalRecord: result.totalRecords,
                    totalPage: result.pages
                });
                $timeout(angular.noop);
            });
        }

        function close() {
            $uibModalInstance.dismiss(infoType);
        }

        function toggleSort(field) {
            if (field == eventModalVm.sort.field) {
                eventModalVm.sort.desc = !eventModalVm.sort.desc;
            } else {
                Object.assign(eventModalVm.sort, {
                    field: field,
                    desc: true
                });
            }
            eventModalVm.cri.sort = field + ":" + (eventModalVm.sort.desc && 'desc' || 'asc');
            search();
        }

    }
})();