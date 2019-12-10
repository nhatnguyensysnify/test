(function () {
    'use strict';

    angular.module('app.settings')
        .controller('settingsTrackingLogCtrl', settingsTrackingLogCtrl);
    /** @ngInject */
    function settingsTrackingLogCtrl($scope, $uibModalInstance, $timeout, appUtils, settingsTrackingService) {
        var settingsCtrl = $scope.settingsVm;
        var sTrackingVm = this; // jshint ignore:line
        sTrackingVm.dataModel = [];
        sTrackingVm.titleText = {
            createEvent: 'Create Event',
            updateEvent: 'Update Event',
            updateSystemData: 'Update System Data',
            updateEventCash: 'Update Event Cash Collected',
            sendNotifyEvent: 'Sent Notify Event'
        };
        sTrackingVm.fieldText = {
            adminEmail: 'Admin Email',
            adminURL: 'Admin Web URL',
            activeRetiredLEO: 'Active Retired LEO',
            gapTimes: 'Lead time alert License Expiration (days)',
            TLSCacheTimestamp: 'TLS Cache Timestamp',
            appName: 'App Name',
            appURL: 'App URL',
            forceUpdate: 'Force Update',
            androidBuildVersion: 'Android Build Version',
            androidDownloadURL: 'Android Download URL',
            iosBuildVersion: 'iOS Build Version',
            iosDownloadURL: 'iOS Download URL',
            appUpdateMessage: 'App Update Message',
            TLSAPIDefaultToken: 'API Token',
            TLSAPIUrl: 'Endpoint',
            TLSAPITestMode: 'Test Mode',
            TLSAPISource: 'API Source',
            TLSAPISourceForWeb: 'API Source For Web',
            bottomMenu: 'Show Bottom Menu',
            topMenuLocation: 'Top Menu Location',
            availableScheduleRange: 'Available Schedule Range',
        };

        sTrackingVm.close = function () {
            $uibModalInstance.close();
        };


        initPage();

        //Functions
        function initPage() {
            return settingsTrackingService.get().then(function (res) {
                sTrackingVm.dataModel = res;
                $timeout(angular.noop, 300);
            });
        }



        $scope.goToEmployee = function (uid) {
            if (uid) {
                $uibModalInstance.close();
                window.open('#/employees/edit/' + uid + '/');
            }
        };

        $scope.formatTrackingTime = function (timestamp) {
            timestamp = parseInt(timestamp);
            if (_.isNaN(timestamp)) {
                timestamp = null;
            }
            var time = timestamp ? moment(timestamp) : moment();
            return appUtils.formatDateTimeString(time);
        };


    }

})();
