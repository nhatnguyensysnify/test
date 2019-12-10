(function() {
    'use strict';

    angular.module('app.saleRegion')
        .controller('saleRegionListCtrl', saleRegionListCtrl);
    /** @ngInject */
    function saleRegionListCtrl($rootScope, $scope, $uibModal, $stateParams, $state, $timeout, $ngBootbox, $q, toaster, appUtils, authService, saleRegionService, memStateService, memRegionService, memTerritoryService) {
        var currentUser = authService.getCurrentUser();
        $rootScope.settings.layout.pageSidebarClosed = true;
        $scope.userPermission = $rootScope.storage.statePermission;
        $scope.userPermission.isAdmin = appUtils.checkSpecifyRole(currentUser, 'admin');
        $scope.userPermission.isRep = appUtils.checkSpecifyRole(currentUser, 'rep');

        var sRegionVm = this; // jshint ignore:line
        sRegionVm.data = [];

        sRegionVm.openModalAddSaleRegion = openModalAddSaleRegion;
        sRegionVm.openModalAddTerritory = openModalAddTerritory;
        sRegionVm.remove = remove;

        initPage();
        //=======================================================

        function initPage() {
            appUtils.showLoading();
            saleRegionService.getAll().then(function(data) {
                appUtils.hideLoading();
                sRegionVm.data = data;
                $timeout(angular.noop);
                //console.log(sRegionVm.data);
            });
        }

        function openModalAddSaleRegion(item) {
            var modalInstance = $uibModal.open({
                templateUrl: 'app/saleRegion/add_edit/_add-edit-sale-regions.tpl.html',
                controller: 'addEditSaleRegionCtrl as vm',
                size: 'lg',
                scope: $scope,
                backdrop: 'static',
                resolve: {
                    data: function() {
                        return item || null;
                    }
                }
            });

            modalInstance.result.then(function(rs) {
                initPage();
            }).catch(function(res) {});
        }

        function openModalAddTerritory(item, state) {
            var modalInstance = $uibModal.open({
                templateUrl: 'app/saleRegion/add_edit/_add-edit-state.tpl.html',
                controller: 'addEditStateCtrl as vm',
                size: 'lg',
                scope: $scope,
                backdrop: 'static',
                resolve: {
                    data: function() {
                        return item || null;
                    },
                    state: function() {
                        return state || null;
                    }
                }
            });

            modalInstance.result.then(function(rs) {
                initPage();
            }).catch(function(res) {});
        }

        function remove(item, id, state, territory) {
            $ngBootbox.confirm('Are you sure want to delete ' + item.name + '?').then(function() {
                saleRegionService.remove(id, state, territory).then(function(rs) {
                    if (rs.result) {
                        toaster.success("Delete success!");
                        initPage();
                    } else {
                        toaster.error(rs.errorMsg);
                    }
                });
            }, function() {});
        }

    }
})();