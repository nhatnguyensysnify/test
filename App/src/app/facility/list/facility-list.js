(function() {
    'use strict';

    angular.module('app.facility')
        .controller('FacListCtrl', FacListCtrl);

    /** @ngInject */
    function FacListCtrl($rootScope, $stateParams, $scope, $state, $timeout, $ngBootbox, $q, appUtils, toaster, authService, eventService, employeeService, memTerritoryService, memberShipFacilitiesService, memStateService) {
        $scope.userPermission = $rootScope.storage.statePermission;
        $rootScope.settings.layout.pageSidebarClosed = true;
        var currentUser = authService.getCurrentUser(), //$rootScope.storage.currentUser,
            appSettings = $rootScope.storage.appSettings;

        $scope.userPermission.isAdmin = appUtils.checkSpecifyRole(currentUser, 'admin');
        $scope.userPermission.isRep = appUtils.checkSpecifyRole(currentUser, 'rep');

        var eventVm = this; //
        var timestampStart = moment().utc().startOf('month'),
            timestampEnd = moment().utc().endOf('month');

    }
})();