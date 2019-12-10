(function() {
    'use strict';

    angular.module('app.saleRegion')
        .controller('addEditStateCtrl', addEditStateCtrl);

    /** @ngInject */
    function addEditStateCtrl($rootScope, $uibModalInstance, $timeout, toaster, appUtils, authService, memTerritoryService, saleRegionService, data, state) {
        var currentUser = authService.getCurrentUser();
        var vm = this; // jshint ignore:line
        vm.model = angular.copy(data);
        vm.state = angular.copy(state);
        vm.selectedState = null;
        vm.selectedTerritories = [];
        //Functions
        vm.close = close;
        vm.save = save;
        initModal();

        angular.element(document).ready(function() {
            $timeout(function() {
                $('#ChooseTerritorySaleRegion').on('select2:select', function(e) {
                    var selected = e.params.data.id;
                    if (selected === 'string:all') {
                        vm.selectedTerritories = ['all'];
                        $('#ChooseTerritorySaleRegion').val(["string:all"]).trigger('change');
                    } else {
                        if (vm.selectedTerritories && vm.selectedTerritories.length >= 2) {
                            var idx = vm.selectedTerritories.indexOf('all');
                            if (idx !== -1) {
                                vm.selectedTerritories.splice(idx, 1);
                                var selecteds = _.map(vm.selectedTerritories, function(item) {
                                    return "string:" + item;
                                });
                                $('#ChooseTerritorySaleRegion').val(selecteds).trigger('change');
                            }
                        }
                    }
                });
            }, 800);
        });

        //======================================
        function initModal() {
            var states = vm.model && vm.model.states || null;
            vm.selectedState = states && states[vm.state] || null;
            vm.oldTerritories = angular.copy(vm.selectedState && vm.selectedState.territories || {});
            vm.selectedTerritories = Object.keys(vm.oldTerritories) || [];
            return loadTeritories();
        }

        function loadTeritories() {
            return memTerritoryService.getAllTerritoryLoadOnce().then(function(data) {
                vm.territories = data;
                vm.territories.unshift({
                    id: 'all',
                    name: 'All Territories',
                    value: 'All Territories'
                });
                $timeout(angular.noop, 200);
            });
        }

        function save(form) {
            appUtils.showLoading();
            vm.selectedState.territories = {};
            //console.log(vm.selectedTerritories);
            _.forEach(vm.selectedTerritories, function(territory) {
                if (vm.oldTerritories[territory]) {
                    vm.selectedState.territories[territory] = vm.oldTerritories[territory];
                } else {
                    var compose = composeTerritoryData(territory);
                    if (compose) {
                        vm.selectedState.territories[territory] = compose;
                    }
                }
            });

            vm.model.states[vm.state] = vm.selectedState;
            return saleRegionService.update(vm.model).then(function(res) {
                appUtils.hideLoading();
                if (!res.result) {
                    toaster.error(res.errorMsg);
                    return;
                }
                toaster.pop('success', 'Success', "Add territory success.");
                $uibModalInstance.close('updated');
            }, function(res) {
                toaster.error(res.errorMsg);
                appUtils.hideLoading();
                return;
            });
        }

        function composeTerritoryData(territory) {
            var data = _.find(vm.territories, function(item) {
                return item.id === territory;
            });
            if (data) {
                return {
                    name: data.name,
                    id: data.id,
                    value: data.value,
                };
            }
            return null;
        }


        function close() {
            $uibModalInstance.dismiss('cancel');
        }
    }
})();