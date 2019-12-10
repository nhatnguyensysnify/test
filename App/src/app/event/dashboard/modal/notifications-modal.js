(function () {
    'use strict';
    angular.module('app.event').controller('eventNotificationsModalCtrl', eventNotificationsModalCtrl);
    /** @ngInject */
    function eventNotificationsModalCtrl($scope, $uibModalInstance, $uibModal, notifications, currentDay, appUtils) {
        var eventCalendarCtrl = $scope.eventVm,
            eventModalVm = this; // jshint ignore:line
        if (notifications) {
            eventModalVm.notifications = angular.copy(notifications);
        } else {
            eventModalVm.notifications = [];
        }
        // console.log('eventModalVm.notifications', eventModalVm.notifications, notifications, currentDay);

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
            // isAuthorized: true
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
            if (eventModalVm.notifications && eventModalVm.notifications.length > 0) {
                // not search
                eventModalVm.title = `<span class="caption-subject font-blue-steel bold ">Notifications - ${moment.utc(currentDay).format('LL')}</span>`;
                eventModalVm.notifications = _.map(eventModalVm.notifications, notification => {
                    let txtChannel = _.map(notification.transaction, 'channel').join(', ');
                    notification.txtChannel = txtChannel;
                    let txtTotalEvents = Object.keys(notification.eventsInstance).length;
                    notification.txtTotalEvents = txtTotalEvents;
                    return notification;
                });
                _search();
            } else {

            }

        }



        function close() {
            $uibModalInstance.dismiss();
        }

        function changePage() {
            console.log('changePage');

            eventModalVm.cri.from = eventModalVm.paging.currentPage * eventModalVm.cri.size;
            _search();
        }

        function search() {
            console.log('search');

            eventModalVm.cri.from = eventModalVm.paging.currentPage = 0;
            _search();
        }
        function _search() {
            console.log('_search', eventModalVm);

            appUtils.showLoading();

            const curPage = eventModalVm.paging.currentPage;
            const pageSize = eventModalVm.paging.pageSize;
            const objs = eventModalVm.notifications;

            const emp = _.filter(objs, o => {
                return (o.source && o.source.toLowerCase().includes(eventModalVm.cri.keyword.toLowerCase())) ||
                    (o.userDetail && o.userDetail.displayName && o.userDetail.displayName.toLowerCase().includes(eventModalVm.cri.keyword.toLowerCase())) ||
                    (o.userDetail && o.userDetail.repCode && o.userDetail.repCode.toLowerCase().includes(eventModalVm.cri.keyword.toLowerCase())) ||
                    (o.userDetail && o.userDetail.email && o.userDetail.email.toLowerCase().includes(eventModalVm.cri.keyword.toLowerCase())) ||
                    (o.uid && o.uid.toLowerCase().includes(eventModalVm.cri.keyword.toLowerCase()));
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