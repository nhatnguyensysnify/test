(function() {
    'use strict';

    angular.module('app.employee')
        .controller('userRoleNGroupCtrl', userRoleNGroupCtrl);

    /** @ngInject */
    function userRoleNGroupCtrl($rootScope, $uibModalInstance, appUtils, authService, employeeService, appSettingService, departmentSevice, managerService, employeeQueueService, employeeLogService, user, toaster, data, mode) {
        var appSettings = $rootScope.storage.appSettings,
            searchSetting = appSettings.elasticSearch ? appSettings.elasticSearch.users : {};
        var currentUser = authService.getCurrentUser();
        var uVm = this; // jshint ignore:line
        var userInfo = user;
        uVm.data = angular.copy(data);
        uVm.selectedIds = null; //[];
        uVm.selectedRole = null;
        uVm.groupedItems = [];
        uVm.filteredItems = [];
        uVm.pagedItems = [];
        uVm.paging = {
            pageSize: 10,
            currentPage: 0,
            totalPage: 0,
            totalRecord: 0
        };
        uVm.mode = mode;
        uVm.save = save;
        //
        uVm.changePage = changePage;
        uVm.close = close;
        uVm.addRoleNGroup = addRoleNGroup;
        initPage();
        //=============================================

        function initPage() {
            if (mode === 'role' && userInfo.acl && userInfo.acl.roles) {
                _.forEach(userInfo.acl.roles, function(value, roleId) {
                    if (uVm.data[roleId]) {
                        uVm.data[roleId].selected = true;
                    }
                });
            }

            uVm.data = _.map(uVm.data, function(item, key) {
                item.$id = key;
                return item;
            });

            uVm.filteredItems = _.sortBy(uVm.data, 'number');
            uVm.paging.totalRecord = uVm.data.length;
            uVm.paging.currentPage = 0;

            //group by pages
            groupToPages();
        }

        function groupToPages() {
            uVm.pagedItems = [];
            for (var i = 0; i < uVm.filteredItems.length; i++) {
                if (i % uVm.paging.pageSize === 0) {
                    uVm.pagedItems[Math.floor(i / uVm.paging.pageSize)] = [uVm.filteredItems[i]];
                } else {
                    uVm.pagedItems[Math.floor(i / uVm.paging.pageSize)].push(uVm.filteredItems[i]);
                }
            }
            if (uVm.filteredItems.length % uVm.paging.pageSize === 0) {
                uVm.paging.totalPage = uVm.filteredItems.length / uVm.paging.pageSize;
            } else {
                uVm.paging.totalPage = Math.floor(uVm.filteredItems.length / uVm.paging.pageSize) + 1;
            }

        }

        function changePage() {
            groupToPages();
        }

        function addRoleNGroup(item) {
            _.forEach(uVm.data, function(r) {
                r.selected = false;
            });
            item.selected = true;
            uVm.selectedIds = item.$id;
            uVm.selectedRole = item;
            // if (item.selected) {
            //     uVm.selectedIds.push(item.$id);
            // } else {
            //     var idx = uVm.selectedIds.indexOf(item.$id);
            //     if (idx !== -1) {
            //         uVm.selectedIds.splice(idx, 1);
            //     }
            // }
        }

        function save() {
            //if (uVm.selectedIds.length > 0) {
            //_.forEach(uVm.selectedIds, function (id) {
            if (uVm.selectedIds !== null) {
                //if (mode === 'role') {
                // if (!userInfo.acl) {
                //     userInfo.acl = {
                //         roles: {

                //         }
                //     };
                // }
                userInfo.acl = {
                    roles: {

                    }
                };
                userInfo.acl.roles[uVm.selectedIds] = true;
                //}
                //});
                appSettingService.getIndexAlias().then(function(index) {
                    var oldAlias = angular.copy(userInfo.alias);
                    //
                    userInfo.alias = uVm.selectedRole.prefix + '_' + index;
                    userInfo.managers = [];
                    //Employee Log 
                    var employeeLog = {
                        action: appUtils.logEmployeeAction.updateProfile.value,
                        message: 'Changed employee role information.',
                        updateBy: currentUser.email || ''
                    };
                    employeeService.saveUserRole(userInfo).then(function(rs) {
                        //console.log(rs);
                        if (!rs.result) {
                            employeeLog.status = 'Failed';
                            employeeLog.message = rs.errorMsg || 'Change employee role information has error.';
                            employeeLogService.create(userInfo.$id, employeeLog);
                            toaster.error("Error", "Update has error, please try again later!");
                            return;
                        }
                        employeeLog.diffValue = rs.diffValue || {};
                        employeeLog.status = 'Success';
                        employeeLogService.create(userInfo.$id, employeeLog);

                        //remove old department
                        departmentSevice.remove(oldAlias);

                        //create new department
                        departmentSevice.create(userInfo);

                        //replace managers
                        //managerService.moveAllData({ alias: oldAlias }, { alias: userInfo.alias, managers: userInfo.managers });
                        employeeQueueService.create(userInfo.$id, { from: { alias: oldAlias }, to: { alias: userInfo.alias, managers: userInfo.managers } });

                        //update alias index
                        appSettingService.updateIndexAlias((index + 1));

                        //reset current user
                        if (currentUser.$id === userInfo.$id) {
                            $rootScope.storage.currentUser = currentUser = userInfo;
                        }

                        toaster.success("Success", "Update success.");
                        $uibModalInstance.close(userInfo);
                    });
                });
            }
        }
        //}

        function close() {
            $uibModalInstance.dismiss('cancel');
        }
    }
})();