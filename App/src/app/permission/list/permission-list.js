(function() {
    'use strict';

    angular.module('app.permission')
        .controller('PermissionListCtrl', PermissionListCtrl);

    /** @ngInject */
    function PermissionListCtrl($rootScope, $scope, $q, $timeout, $uibModal, permissionService, roleService, toaster, appUtils) {
        $rootScope.settings.layout.showSmartphone = false;
        $rootScope.settings.layout.showBreadcrumb = false;
        $scope.userPermission = $rootScope.storage.statePermission;

        var permissionVm = this;
        permissionVm.tabIdx = -1;
        permissionVm.permissions = [];
        permissionVm.roles = [];
        permissionVm.employees = [];

        $scope.userPermissionValid = false;
        $scope.rolePermissionValid = false;
        $scope.permissions = {
            all: {
                access: false,
                modify: false,
            },
            roles: {},
            users: {}
        };
        initModel();
        initPage();

        permissionVm.addUserPermission = addUserPermission;
        permissionVm.addRolePermission = addRolePermission;
        permissionVm.removeUserPermission = removeUserPermission;
        permissionVm.removeRolePermission = removeRolePermission;
        permissionVm.loadPermissionData = loadPermissionData;
        permissionVm.save = save;
        //=============================================================================
        function addUserPermission(form) {
            $scope.userPermissionValid = true;
            if (form.$invalid) {
                return;
            }

            var user = _.find(permissionVm.employees, function(u) {
                return u.$id === $scope.objectDatas.userId;
            });

            if (user) {
                var isExists = _.some($scope.objectDatas.permissions.users, { text: user.$id });
                if (!isExists) {
                    $scope.objectDatas.permissions.users.push({
                        text: user.$id,
                        name: user.email,
                        access: false,
                        modify: false,
                    });
                    $scope.objectDatas.userId = '';
                    $scope.userPermissionValid = false;
                    $timeout(function() {
                        $("#user-permission").select2({
                            placeholder: "Choose User"
                        });
                    }, 200);
                }
            }
        }

        function removeUserPermission(index) {
            $scope.objectDatas.permissions.users.splice(index, 1);
        }

        function addRolePermission(form) {
            $scope.rolePermissionValid = true;
            if (form.$invalid) {
                return;
            }

            var role = _.find(permissionVm.roles, function(u) {
                return u.$id === $scope.objectDatas.roleId;
            });

            if (role) {
                var isExists = _.some($scope.objectDatas.permissions.roles, { text: role.$id });
                if (!isExists) {
                    $scope.objectDatas.permissions.roles.push({
                        text: role.$id,
                        name: role.name,
                        access: false,
                        modify: false,
                    });
                    $scope.objectDatas.roleId = '';
                    $scope.rolePermissionValid = false;
                    $timeout(function() {
                        $("#role-permission").select2({
                            placeholder: "Choose Role"
                        });
                    }, 200);
                }
            }
        }

        function removeRolePermission(index) {
            $scope.objectDatas.permissions.roles.splice(index, 1);
        }

        function initPage() {
            var pReq = permissionService.items().then(function(permissions) {
                permissionVm.permissions = _.sortBy(permissions, function(p) {
                    return p.index;
                });
            });

            var rReq = roleService.items().then(function(roles) {
                permissionVm.roles = roles;
            });

            // var uReq = permissionService.getAllEmloyees().then(function (user) {
            //     permissionVm.employees = user;
            // });

            $q.all([pReq, rReq]);
        }

        function initModel(permissionId) {
            $scope.objectDatas = {
                permissions: {
                    roles: [],
                    users: [],
                    all: {
                        access: false,
                        modify: false,
                    },
                },
                userId: '',
                roleId: '',
                permissionId: permissionId || ''
            };
        }

        function loadPermissionData(id) {
            $scope.objectDatas.permissionId = id;
            permissionService.get(id).then(function(data) {
                if (data.acl) {
                    if (data.acl.all) {
                        $scope.objectDatas.permissions.all = data.acl.all;
                    }
                    if (data.acl.roles) {
                        $scope.objectDatas.permissions.roles = objToArrayPermissions(data.acl.roles);
                    }
                    if (data.acl.users) {
                        $scope.objectDatas.permissions.users = objToArrayPermissions(data.acl.users);
                    }
                } else {
                    initModel(id);
                }
                //console.log($scope.objectDatas);
                $timeout(angular.noop);
            });
        }

        function objToArrayPermissions(obj) {
            return _.map(obj, function(val, key) {
                return {
                    text: key,
                    name: val.name ? val.name : '',
                    access: val.access ? val.access : false,
                    modify: val.modify ? val.modify : false,
                };
            });
        }

        function arrayToObjAcl(arr) {
            return _.fromPairs(_.map(arr, function(i) {
                return [i.text, { access: i.access, modify: i.modify, name: i.name }];
            }));
        }

        function save() {
            appUtils.showLoading();
            $scope.permissions.all = $scope.objectDatas.permissions.all;
            $scope.permissions.roles = arrayToObjAcl($scope.objectDatas.permissions.roles, true, true);
            $scope.permissions.users = arrayToObjAcl($scope.objectDatas.permissions.users, true, true);
            permissionService.updatePermissionAcl($scope.permissions, $scope.objectDatas.permissionId).then(function(rs) {
                appUtils.hideLoading();
                if (!rs.result) {
                    toaster.error("Error", "Can't update now! Please try again later.");
                    return;
                }
                $rootScope.storage.permissions = null;
                $rootScope.$emit("reloadSibarMenus");
                toaster.success("Success", "Update Success");
            });
        }

        $scope.openPermissionDetails = function(permissionId) {
            $rootScope.modalInstance = $uibModal.open({
                templateUrl: 'app/permission/add_edit/permission-details.tpl.html',
                controller: 'PermissionDetailsCtrl as permissionVm',
                scope: $scope,
                size: 'md',
                resolve: {
                    permissionId: function() {
                        return permissionId || '';
                    }
                },
                backdrop: 'static'
            });

            $rootScope.modalInstance.result.then(function() {
                initPage();
            }, function() {});
        };
    }

})();