(function () {
    'use strict';

    angular.module('app.membership')
        .controller('TrackingActivitiesCtrl', TrackingActivitiesCtrl);

    /** @ngInject */
    function TrackingActivitiesCtrl($scope, $uibModalInstance, $timeout, appUtils, appId, status, memAppTimeLineService, membershipMediaService, employeeService) {
        $scope.appId = appId;
        $scope.allowDownloadImg = parseInt(status) !== 4 && parseInt(status) !== 6 && parseInt(status) !== 8;
        $scope.dataModel = [];
        $scope.keyword = '';

        $scope.search = function () {
            memAppTimeLineService.get($scope.appId).then(function (res) {
                $scope.dataModel = res;
                $timeout(angular.noop, 300);
            });
        };

        $scope.search();

        //Functions
        $scope.close = function () {
            $uibModalInstance.close();
        };

        $scope.getStatusApp = function (key) {
            var rs = _.find(appUtils.appStatus, { 'key': parseInt(key) });
            return rs && rs.value || key;
        };

        $scope.getAction = function (eventType) {
            return appUtils.logEventText[eventType && eventType.toLowerCase() || ''] || '';
        };

        $scope.isErrorMesage = function (item) {
            var regex = /(error|failed|Error|Failed|not|Not)/;
            return item.message && item.message.match(regex);
        };

        $scope.isSubmitEvent = function (item) {
            var eventType = item.eventType && item.eventType.toLowerCase() || '';
            return eventType === 'submitapp';
        };

        $scope.goToEmployee = function (email) {
            employeeService.getUserByEmail(email).then(function (employee) {
                if (employee) {
                    $uibModalInstance.close();
                    // $state.go('employee.edit', { id: employee.$id});
                    window.open('#/employees/edit/' + employee.$id + '/');
                }
            });
        };

        $scope.formatTrackingTime = function (timestamp) {
            timestamp = parseInt(timestamp);
            if (_.isNaN(timestamp)) {
                timestamp = null;
            }
            var time = timestamp ? moment(timestamp) : moment();
            return appUtils.formatDateTimeString(time);
        };

        $scope.getSubTitle = function (item) {
            var logEventSteps = appUtils.logEventStep,
                eventType = item.eventType && item.eventType.toLowerCase() || '',
                eventSource = item.from;
            var regexOCR = /(orc|OCR)/;
            if (eventType === 'uploadimage' || eventType === 'uploadpdf') {
                return logEventSteps[1];
            } else if (eventType === 'processpdf') {
                return logEventSteps[2];
            } else if (eventType === 'createapp') {
                return logEventSteps[3];
            } else if (eventType === 'pushtoocrqueue' || eventSource.match(regexOCR)) {
                return logEventSteps[4];
            }

            return logEventSteps[5];
        };
        /* jshint ignore:start */
        $scope.initMedia = function (item) {
            return membershipMediaService.get(item.mediaId).then(function (media) {
                if (media) {
                    item.fileName = media.fileName || '',
                        item.downloadUrl = media.downloadUrl;
                    $timeout(angular.noop, 400);
                }
            });
        };
        /* jshint ignore:end */
    }

})();
