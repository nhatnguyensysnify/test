(function() {
    'use strict';

    angular.module('app.settings')
        .controller('GeneralCtrl', GeneralCtrl);

    /** @ngInject */
    function GeneralCtrl($rootScope, $scope, $state, $timeout, settingsService, toaster, $uibModal, $ngBootbox, authService) {
        $scope.userPermission = $rootScope.storage.statePermission;
        $scope.settings = {};
        $scope.nameRegx = /^(a-z|A-Z|0-9)*[^!#$%^&*()'"\/\\;:@=+,?\[\]\/]*$/;
       
        //Functions
        $scope.refreshTLSCache = refreshTLSCache;
        $scope.saveEdit = saveEdit;
        $scope.cancel = cancel;
        $scope.addBlackDays = addBlackDays;
        $scope.removeBlackDays = removeBlackDays;
        $scope.showPopupTrackingActivities = showPopupTrackingActivities;
        var settingsVm = this;
        //Load Data
        loadGeneralSettings();
        var currentUser = authService.getCurrentUser();
        $scope.canEditTLSApi = currentUser.externalId.indexOf('mcm-') > -1 ? true : false;


        //========================================
        function loadGeneralSettings() {
            settingsService.get().then(function(result) {
                if (result) {
                    $scope.settings = result;
                }
            });
        }

        function addBlackDays() {
            if(!$scope.listOfBlackDays){
                $scope.listOfBlackDays = [];
            }
            $timeout(function(){
                $scope.$apply(function(){
                    $scope.listOfBlackDays.push({
                        day: ''
                    });
                });
            },200);
        }

        function removeBlackDays(index) {
            $scope.listOfBlackDays.splice(index, 1);
        }

        function refreshTLSCache() {
            settingsService.refreshTLSCache().then(function(res) {
                if (res.result) {
                    toaster.pop('success', 'Success', "Refresh Success.");
                } else {
                    toaster.pop('error', 'Error', rs.errorMsg);
                }
            });
        }

        function saveEdit(form) {
            $scope.showInvalid = true;
            if(form.$invalid){
                return;
            }
            updateGeneralSetting();
        }

        function updateGeneralSetting() {
            //parse int
            $scope.settings.gapTimes = parseInt($scope.settings.gapTimes);

            var req = settingsService.updateGeneralSetting($scope.settings);
            req.then(function(res) {
                if (!res.result) {
                    $ngBootbox.alert(res.errorMsg || '');
                    return;
                }
                toaster.pop('success', 'Success', "Setting Updated.");
                $timeout(angular.noop);
            });
        }

        function cancel() {
            settingsService.refresh().then(function(res){
                loadGeneralSettings();
            });
            // $state.go('general');
        }

        function showPopupTrackingActivities() {
            var modalInstance = $uibModal.open({
                templateUrl: './app/settings/modal/settings-tracking-log.tpl.html',
                controller: 'settingsTrackingLogCtrl as sTrackingVm',
                size: 'lg',
                scope: $scope,
                windowClass: 'tracking-activities-modal',
                backdrop: 'static',
                resolve: {
                }
            });
        }
    }

})();