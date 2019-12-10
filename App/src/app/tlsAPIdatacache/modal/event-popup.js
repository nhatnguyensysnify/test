(function () {
    'use strict';

    angular.module('app.tlsApiDataCache')
        .controller('EventSyncDataPopupCtrl', EventSyncDataPopupCtrl);

    /** @ngInject */
    function EventSyncDataPopupCtrl($rootScope, $scope, $uibModalInstance, appUtils, $timeout, authService, eventTypeName) {
        var currentUser = authService.getCurrentUser(); //$rootScope.storage.currentUser,
        // var isAdmin = appUtils.checkSpecifyRole(currentUser, 'admin'),
        //     isRep = appUtils.checkSpecifyRole(currentUser, 'rep');

        var vm = this;
        vm.showInvalid = false;

        vm.syncChecked = true;
        vm.forceRefreshChecked = false;
        vm.valueSelected = 0;
        vm.eventTypeName = eventTypeName;
        $('.add-web-app-modal').hide();
        $('.preview-web-app-modal').hide();




        vm.submit = function () {
            $uibModalInstance.close({ valueSelected: vm.valueSelected});

        };
        //Functions
        vm.close = function () {
            $uibModalInstance.dismiss('cancel');
        };
    }
})();
