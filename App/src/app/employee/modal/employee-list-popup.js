(function () {
    'use strict';

    angular.module('app.employee')
        .controller('EmployeeListPopupCtrl', EmployeeListPopupCtrl);

    /** @ngInject */
    function EmployeeListPopupCtrl($rootScope, $scope, $uibModalInstance, appUtils, $timeout, authService, employeeService, employeeId) {
        // var currentUser = authService.getCurrentUser(), //$rootScope.storage.currentUser,
        // appSettings = $rootScope.storage.appSettings,
        // searchSetting = appSettings.elasticSearch ? appSettings.elasticSearch.users : {};
        // var isAdmin = appUtils.checkSpecifyRole(currentUser, 'admin');

        var employeeModalVm = this;
        employeeModalVm.employeeId = angular.copy(employeeId);

        employeeModalVm.search = search;
        employeeModalVm.changePage = changePage;
        employeeModalVm.checkEmployee = checkEmployee;
        employeeModalVm.selectEmployee = selectEmployee;
        employeeModalVm.removeSelectEmployee = removeSelectEmployee;
        employeeModalVm.employees = [];
        employeeModalVm.cri = {
            keyword: '',
            from: 0,
            size: 12,
            sort: 'timestampCreated',
            employeeId: employeeModalVm.employeeId,
            isAuthorized: true
        };

        $('.add-web-app-modal').hide();
        $('.preview-web-app-modal').hide();

        employeeModalVm.paging = {
            pageSize: 12,
            currentPage: 0,
            totalPage: 0,
            totalRecord: 0
        };


        if ($.trim(employeeModalVm.employeeId) !== '') {
            employeeService.getUser(employeeModalVm.employeeId).then(function (employee) {
                employeeModalVm.employeeSelected = employee;
                $timeout(angular.noop, 200);
            });
        }


        search();

        function changePage() {
            employeeModalVm.cri.from = employeeModalVm.paging.currentPage * employeeModalVm.cri.size;
            _search();
        }


        function search() {
            appUtils.showLoading();
            $timeout(function () {
                employeeModalVm.cri.from = 0;
                _search();
            }, 200);
        }

        function _search() {
            var query = employeeService.search(employeeModalVm.cri);
            query.then(function (result) {
                appUtils.hideLoading();
                employeeModalVm.employees = result.items;
                angular.extend(employeeModalVm.paging, {
                    totalRecord: result.totalRecords,
                    totalPage: result.pages
                });
                $timeout(angular.noop, 200);
            });
        }

        function checkEmployee(item) {
            //employeeModalVm.showValid = false;
            employeeModalVm.employeeId = item.$id;
            employeeModalVm.cri.employeeId = item.$id;
            $('input[name=select-employee]').each(function () {
                $(this).prop('checked', false);
            });
            $('input[value=' + item.$id + ']').prop('checked', true);
            employeeModalVm.employeeSelected = item;
        }

        function selectEmployee() {
            $uibModalInstance.close(employeeModalVm.employeeSelected);
        }

        function removeSelectEmployee() {
            employeeModalVm.employeeSelected = null;
            employeeModalVm.employeeId = '';
            employeeModalVm.cri.employeeId = '';
            search();
        }

        //Functions
        employeeModalVm.close = function () {
            $uibModalInstance.dismiss('cancel');
        };
    }
})();
