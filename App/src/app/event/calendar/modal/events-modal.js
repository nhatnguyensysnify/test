(function () {
    'use strict';
    angular.module('app.event').controller('eventCalendarEventsModalCtrl', eventCalendarEventsModalCtrl);
    /** @ngInject */
    function eventCalendarEventsModalCtrl($scope, $uibModalInstance, $uibModal, eventsData, currentDay, appUtils) {
        var eventCalendarCtrl = $scope.eventVm,
            eventModalVm = this; // jshint ignore:line
        if (eventsData) {
            eventModalVm.events = angular.copy(eventsData);
        } else {
            eventModalVm.events = [];
        }
        // eventModalVm.cri = angular.copy(eventCalendarCtrl.cri);
        
        eventModalVm.type = 1;
        eventModalVm.title = '';
        eventModalVm.result = [];
        eventModalVm.sort = {
            field: 'type',
            desc: true
        };
        // eventModalVm.cri.sort = 'type:desc';
        // //
        eventModalVm.cri = {
            keyword: "",
            from: 0,
            size: 12,
            sort: 'timestampCreated',
            employeeId: '',
            isAuthorized: true
        };
        eventModalVm.paging = {
            pageSize: 12,
            currentPage: 0,
            totalPage: 0,
            totalRecord: 0
        };
        // //
        // console.log('pointData',pointData);
        eventModalVm.getType = eventCalendarCtrl.getType;
        eventModalVm.getState = eventCalendarCtrl.getState;
        eventModalVm.getRegion = eventCalendarCtrl.getRegion;
        eventModalVm.getFacility = eventCalendarCtrl.getFacility;
        eventModalVm.getTerritory = eventCalendarCtrl.getTerritory;
        eventModalVm.getDateTime = eventCalendarCtrl.getDateTime;
        eventModalVm.parseToNumber = eventCalendarCtrl.parseToNumber;
        eventModalVm.changePage = changePage;
        eventModalVm.search = search;
        // eventModalVm.toggleSort = toggleSort;
        eventModalVm.close = close;
        //eventModalVm.cancel = cancel;

        initPage();
        //===============================================================
        function initPage() {
            //
            if (eventModalVm.events && eventModalVm.events.length > 0) {
                // not search
                if(currentDay){
                    eventModalVm.title = `<span class="caption-subject font-blue-steel bold ">Events - ${moment.utc(currentDay).format('LL')}</span>`;
                }else{
                    eventModalVm.title = `<span class="caption-subject font-blue-steel bold ">Classes</span>`;
                }
                _search();
            } else {

            }

        }



        function close() {
            $uibModalInstance.dismiss();
        }

        function changePage() {
            eventModalVm.cri.from = eventModalVm.paging.currentPage * eventModalVm.cri.size;
            _search();
        }

        function search() {
            eventModalVm.cri.from = eventModalVm.paging.currentPage = 0;
            _search();
        }
        function _search() {
            appUtils.showLoading();

            const curPage = eventModalVm.paging.currentPage;
            const pageSize = eventModalVm.paging.pageSize;
            const objs = eventModalVm.events;

            const emp = _.filter(objs, o => {
                return (o.name && o.name.toLowerCase().includes(eventModalVm.cri.keyword.toLowerCase())) ||
                    (o.type && o.type.toLowerCase().includes(eventModalVm.cri.keyword.toLowerCase())) ;
            });

            const totalPage = Math.ceil(emp.length / pageSize);

            angular.extend(eventModalVm.paging, {
                totalPage: totalPage,
                totalRecord: objs.length
            });

            $scope.emp = _.chunk(emp, pageSize)[curPage];

            appUtils.hideLoading();
        }
    }
})();