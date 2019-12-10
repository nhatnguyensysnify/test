(function () {
    'use strict';

    angular.module('app.membership')
        .controller('DashBoardEmployeeModalCtrl', DashBoardEmployeeModalCtrl);

    /** @ngInject */
    function DashBoardEmployeeModalCtrl($scope, $state, $uibModalInstance, appUtils, reportType, reportData) {
        $scope.reportType = reportType;
        $scope.reportData = [];
        $scope.getStatus = appUtils.getStatus;
        $scope.getMethod = appUtils.getMethod;
        $scope.getPriMemberName = appUtils.getFullNameApplication;
        $scope.getRegion = $scope.dashboardVm.getRegion;

        initModal();
        function initModal() {
            $scope.reportData = _.filter(reportData, function (item) {
                if (reportType === 'Form Capture') {
                    return parseInt(item.method) === 2 || parseInt(item.method) === 1;
                } else if (reportType === 'New Application') {
                    return parseInt(item.method) === 0 || parseInt(item.method) === 3;
                } else if (reportType === 'Submit Online') {
                    return !item.isOffline;
                } else if (reportType === 'Offline') {
                    return item.isOffline;
                } else if (reportType === 'New') {
                    return parseInt(item.status) === 0;
                } else if (reportType === 'Processing') {
                    return parseInt(item.status) === 1;
                } else if (reportType === 'Verified') {
                    return parseInt(item.status) === 2;
                } else if (reportType === 'Billing Approved') {
                    return parseInt(item.status) === 4;
                } else if (reportType === 'Billing Pending') {
                    return parseInt(item.status) === 3;
                } else if (reportType === 'Billing Denied') {
                    return parseInt(item.status) === 5;
                } else if (reportType === 'Error') {
                    return parseInt(item.status) === 7;
                } else if (reportType === 'Cancelled') {
                    return parseInt(item.status) === 6;
                } else if (reportType === 'Billing Required') {
                    return parseInt(item.status) === 8;
                }
            });
            $scope.reportData = $scope.reportData.sort(function(a, b) {
                return b.timestampSignatured - a.timestampSignatured;
            });
        }

        $scope.goTo = function (item) {
            var status = parseInt(item.status);
            var tab = status === 0 ? -1 : status;
            $uibModalInstance.close();
            $state.go('membership.editApplication', { id: item.$id, 'tab': tab, 'keyword': '', 'page': 0 });
        };

        //Functions
        $scope.close = function () {
            $uibModalInstance.close();
        };
    }
})();
