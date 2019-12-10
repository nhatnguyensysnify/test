(function() {
    'use strict';

    angular.module('app.employee')
        .controller('eventCalendarReassignModalCtrl', eventCalendarReassignModalCtrl);

    /** @ngInject */
    function eventCalendarReassignModalCtrl($scope, $rootScope, $uibModalInstance, $q, $timeout, employee, employeeService, shiftsService, appUtils, authService, eventService) {

        var reassignModalVm = this; // jshint ignore:line
        $scope.employee = angular.copy(employee);
        $scope.employeeId = angular.copy(employee.uid);
        $scope.repAssigned = employee.repAssigned;
        $scope.events = null;
        var eventCalendarCtrl = $scope.eventVm;
        $scope.currentUser = authService.getCurrentUser();
        $scope.userPermission = $rootScope.storage.statePermission;
        $scope.userPermission.isAdmin = appUtils.checkSpecifyRole($scope.currentUser, 'admin');
        $scope.employees = [];
        $scope.cri = {
            keyword: '',
            from: 0,
            size: 5,
            sort: 'timestampCreated',
            employeeId: '',
            alias: null,
            ids: null,
            isAuthorized: true
        };

        $scope.paging = {
            pageSize: 12,
            currentPage: 0,
            totalPage: 0,
            totalRecord: 0
        };

        $scope.changePage = function() {
            $scope.cri.from = $scope.paging.currentPage * $scope.cri.size;
            _search();
        };


        $scope.search = function() {
            appUtils.showLoading();

            $scope.cri.from = 0;
            $q.all([_search(), getEventsInfo()]).then(() => {
                appUtils.hideLoading();
                $timeout(angular.noop);
            });
        };

        function getEventsInfo() {
            eventService.searchByShift({ date: $scope.employee.date, rep: $scope.employee.$id })
                .then(result => {
                    const events = result.items;
                    $scope.events = events;
                    return events;
                });
        }

        function _search() {
            var startDateUtc = moment.utc($scope.employee.date).startOf('day').valueOf();

            var shiftCriteria = {
                timestampStart: startDateUtc,
                timestampEnd: startDateUtc,
                // alias: $scope.userPermission.isAdmin ? null : $scope.currentUser.alias,
                ids: null
            };
            return shiftsService.searchShiftAvailable(shiftCriteria).then((uids) => {
                $scope.cri.ids = uids.map(i => i.rep);
                $scope.cri.alias = $scope.userPermission.isAdmin ? null : $scope.currentUser.alias;
                return employeeService.search($scope.cri).then(result => {
                    $scope.employees = result.items;
                    angular.extend($scope.paging, {
                        totalRecord: result.totalRecords,
                        totalPage: result.pages
                    });
                });
            });
            // var query = employeeService.search($scope.cri);
            // return query.then(function (result) {
            //     $scope.employees = result.items;
            //     angular.extend($scope.paging, {
            //         totalRecord: result.totalRecords,
            //         totalPage: result.pages
            //     });
            // });
        }

        $scope.checkEmployee = function(item) {
            //$scope.showValid = false;
            $scope.employeeId = item.$id;
            $scope.cri.employeeId = item.$id;
            $scope.employeeSelected = item;
        };

        $scope.selectEmployee = function() {
            $uibModalInstance.close({
                rep: $scope.employeeSelected,
                events: $scope.events
            });
        };

        $scope.removeSelectEmployee = function() {
            $scope.employeeSelected = null;
            $scope.employeeId = '';
            $scope.cri.employeeId = '';
            $scope.search();
        };

        //Functions
        $scope.close = function() {
            $uibModalInstance.dismiss('cancel');
        };

        $scope.search();
    }
})();