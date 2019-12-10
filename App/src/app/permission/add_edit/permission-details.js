(function () {
    'use strict';
  
    angular.module('app.permission')
      .controller('PermissionDetailsCtrl', PermissionDetailsCtrl);
  
    /** @ngInject */
    function PermissionDetailsCtrl($rootScope, $scope, $state, $timeout, $uibModal, $q, $ngBootbox, permissionService, $location, toaster, authService, roleService, appUtils, permissionId) {
        $rootScope.settings.layout.showSmartphone = false;
        $rootScope.settings.layout.showBreadcrumb = true;
        $rootScope.breadcrumb = {
            name: 'Permissions',
            link: '#/permissions'
        };
        var currentUser = authService.getCurrentUser();
        var permissionVm = this;
        permissionVm.nameRegx = /^(a-z|A-Z|0-9)*[^!#$%^&*()'"\/\\;:@=+,?\[\]\/]*$/;
        permissionVm.numberRegx = /^[0-9]*$/;
        permissionVm.showInvalid = false;
        var id = permissionId;
        permissionVm.model = {
            name: '',
            index: 1,
            uid: currentUser.$id,
            acl: {}
        };

        initModal();
        permissionVm.save = save;
        //==============================================================
        function initModal(){
            if(_.trim(id) !== ''){
                permissionService.get(id).then(function(data){
                    permissionVm.model = data;
                    permissionVm.showInvalid = true;
                    $timeout(angular.noop);
                });
            }
        }

        function save(form){
            appUtils.showLoading();
            permissionVm.showInvalid = true;
            if(form.$invalid){
                appUtils.hideLoading();
                return;
            }

			if(_.trim(id) !== ''){
				update();
			}
			else {
				create();
			}
		}

		function create(p){
			permissionService.create(permissionVm.model).then(function(res){
				appUtils.hideLoading();
				if(!res.result){
                    toaster.error("Error", "Can't create now! Please try again later.");   
                    return; 
                }
                toaster.pop('success','Create Success');
                $rootScope.modalInstance.close();
			});
        }
        
		function update(){
			permissionService.update(permissionVm.model).then(function(res){
                appUtils.hideLoading();
				if(!res.result){
                    toaster.error("Error", "Can't update now! Please try again later.");   
                    return; 
                }
                toaster.pop('success','Update Success');
                $rootScope.modalInstance.close();
			});
        }
        
        $scope.dismiss = function () {
            $rootScope.modalInstance.close();
        };
    }
  })();
  