(function () {
    'use strict';

    angular.module('app.saleRegion')
        .controller('addEditSaleRegionCtrl', addEditSaleRegionCtrl);

    /** @ngInject */
    function addEditSaleRegionCtrl($rootScope, $uibModalInstance, $timeout, toaster, appUtils, authService, memStateService, saleRegionService, data) {
        var currentUser = authService.getCurrentUser();
        var vm = this; // jshint ignore:line
        vm.model = angular.copy(data);
        vm.isEdit =  data && data !== null;
		vm.nameRegx = /^(a-z|A-Z|0-9)*[^!#$%^&*()'"\/\\;:@=+,?\[\]\/]*$/;
        vm.selectedStates = [];
        vm.select2Options = {
			AllowClear: true,
		};
        //Functions
        vm.close = close;
        vm.save = save;

        initModal();
        //======================================
        function initModal(){
            vm.showInvalid = true;
            vm.oldStates = angular.copy(data && data.states || {});
            vm.selectedStates = Object.keys(vm.oldStates) ||[];
            if(!vm.isEdit){
                vm.showInvalid = false;
                vm.model = {
                    name: '',
                    createdBy: currentUser.email,
                    states: {}
                };
            }
            return loadStates();
        }

        function loadStates(){
			return memStateService.statesLoadOnce().then(function (data) {
				vm.states =  data;
                $timeout(angular.noop, 200);
            });
        }

        function save(form){
            appUtils.showLoading();
            vm.showInvalid = true;
            if (form.$invalid) {
                appUtils.hideLoading();
                return;
            }

            vm.model.states = {};
            _.forEach(vm.selectedStates, function(state){
                if(vm.oldStates[state]){
                    vm.model.states[state] = vm.oldStates[state];
                }else{
                    var compose = composeStateData(state);
                    if(compose){
                        vm.model.states[state] = compose;
                    }
                }
            });
            
            if(!vm.isEdit){
                _create();
            }else{
                _update();
            }
        }

        function _create(){
            return saleRegionService.create(vm.model).then(function (res) {
                appUtils.hideLoading();
                if (!res.result) {
                    toaster.error(res.errorMsg);
                    return;
                }
                toaster.pop('success', 'Success', "Sale region created.");
                $uibModalInstance.close('created');
            }, function (res) {
                toaster.error(res.errorMsg);
                appUtils.hideLoading();
                return;
            });
        }

        function _update(){
            return saleRegionService.update(vm.model).then(function (res) {
                appUtils.hideLoading();
                if (!res.result) {
                    toaster.error(res.errorMsg);
                    return;
                }
                toaster.pop('success', 'Success', "Add state success.");
                $uibModalInstance.close('updated');
            }, function (res) {
                toaster.error(res.errorMsg);
                appUtils.hideLoading();
                return;
            });
        }

        function composeStateData(state) {
            var data = _.find(vm.states, function (item) {
                return item.iso === state;
            });
            if(data){
                return {
                    name: data.name,
                    id: data.id,
                    iso: data.iso,
                    territories: {
                        all: {
                            id: 'all',
                            name: 'All Territories',
                            value: 'All Territories'
                        }
                    }
                };
            }
            return null;
		}

        
        function close() {
            $uibModalInstance.dismiss('cancel');
        }
    }
})();
