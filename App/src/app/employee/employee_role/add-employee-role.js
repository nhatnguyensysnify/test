(function () {
    'use strict';

    angular.module('app.employee')
        .controller('EmployeeRoleCtrl', EmployeeRoleCtrl);

    /** @ngInject */
    function EmployeeRoleCtrl($rootScope, $scope, $state, $ngBootbox, $uibModalInstance, authService, permissionService, employeeService, roleService, user, toaster, employeeLogService, appUtils) {
        var currentUser = authService.getCurrentUser(); //$rootScope.storage.currentUser;
        $scope.user = user;
        $scope.userRoles = user.userRoles;

        //Load Data
        function loadData() {
            appUtils.showLoading();
            roleService.items().$loaded(function (data) {
                appUtils.hideLoading();
                $scope.roles = data;
                _.forEach($scope.roles, function (obj, key) {
                    if ($scope.userRoles !== undefined && $scope.userRoles.length > 0) {
                        var isExisted = $.inArray(obj.$id, $scope.userRoles);
                        if (isExisted === -1) {
                            obj.checked = false;
                        } else {
                            obj.checked = true;
                        }
                    } else {
                        obj.checked = false;
                    }
                    permissionService.getPermissionByRole(obj.$id).then(function (res) {
                        obj.permissions = [];
                        if (res.length > 0) {
                            _.forEach(res, function (val, key) {
                                obj.permissions.push(val.name);
                            });
                            obj.permissionstxt = angular.fromJson(obj.permissions).join(', ');
                        }
                    });
                });
            });
        }

        loadData();

        //Functions

        $scope.close = function () {
            $uibModalInstance.dismiss('cancel');
        };

        $scope.addUserToRole = function () {
            appUtils.showLoading();
            var userRoles = [];
            $('input[name=chk-user-role]').each(function () {
                if (this.checked === true) {
                    userRoles.push(this.value);
                }
            });

            $scope.user.userRoles = userRoles;
            //Employee Log 
            var employeeLog = {
                action: appUtils.logEmployeeAction.updateProfile.value,
                message: 'Changed role',
                updateBy: currentUser.email || ''
            };
            var req = employeeService.updateUser($scope.user);
            req.then(function (res) {
                appUtils.hideLoading();
                if (!res.result) {
                    employeeLog.status = "Failed";
                    employeeLog.message = res.errorMsg || 'Change role has error.';
                    employeeLog.diffValue = res.diffValue || {};
                    employeeLogService.create($scope.user.$id, employeeLog);
                    appUtils.hideLoading();
                    $ngBootbox.alert(res.errorMsg);
                    return;
                }
                employeeLog.diffValue = res.diffValue || {};
                employeeLog.status = "Success";
                employeeLogService.create($scope.user.$id, employeeLog);
                $uibModalInstance.dismiss('cancel');
                //Delete Side Bar Menus List storage
                if (currentUser.$id == $scope.user.$id) {
                    if (!$scope.user.userRoles || $scope.user.userRoles.length <= 0) {
                        authService.logout();
                        delete $rootScope.storage.currentUser;
                        delete $rootScope.storage.roles;
                        delete $rootScope.storage.permissions;
                        $state.go('login');
                    }
                    $rootScope.$emit("reloadSibarMenus");

                    $rootScope.storage.currentUser.userRoles = $scope.user.userRoles;
                    // delete $rootScope.storage.sidebarMenus;
                    // appUtils.transformObject($scope.currentUser, $scope.user);
                }
                toaster.pop('success', 'Success', "Change User Roles Successfully!");
                // $scope.$parent.loadUserDetails();
                // window.location.reload();
                $state.reload();
            }).catch(function (err) {
                employeeLog.status = 'Failed';
                employeeLog.message = err && err.message || 'Change role has error.';
                employeeLogService.create($scope.user.$id, employeeLog);
            });

        };
    }

})();
