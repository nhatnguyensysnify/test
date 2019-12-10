(function() {
    'use strict';

    angular.module('app.employee').controller('replaceManagerCtrl', replaceManagerCtrl);
    /** @ngInject */
    function replaceManagerCtrl($rootScope, $scope, $uibModalInstance, $timeout, appUtils, authService, employeeService, toaster, employeeLogService, user, roles, managerService, employeeQueueService) {
        var appSettings = $rootScope.storage.appSettings,
            specifyRoles = appSettings && appSettings.specifyPermissionsRoles || null;

        var currentUser = authService.getCurrentUser();
        var adminId = specifyRoles && specifyRoles.admin || '-KTlccaZaxPCGDaFPSc5';
        var rVm = this; // jshint ignore:line
        rVm.replaceUser = angular.copy(user);
        rVm.roles = angular.copy(roles);
        rVm.selectedUid = null;
        rVm.selectedUser = null;
        rVm.cri = {
            keyword: '',
            role: '',
            ignoreEmployee: rVm.replaceUser.$id,
            isAuthorized: true,
            from: 0,
            size: 11
        };
        rVm.users = [];
        rVm.paging = {
            pageSize: 11,
            currentPage: 0,
            totalPage: 0,
            totalRecord: 0
        };

        rVm.changePage = changePage;
        rVm.close = close;
        rVm.search = search;
        rVm.getRoleText = $scope.$parent.getRoleText;
        rVm.selectedReplace = selectedReplace;
        rVm.save = save;
        initPage();
        //=============================================
        function initPage() {
            //console.log(rVm.replaceUser);
            if (rVm.replaceUser.acl && rVm.replaceUser.acl.roles) {
                var roleIds = Object.keys(rVm.replaceUser.acl.roles);
                if (roleIds && roleIds.length > 0) {
                    var assigned = [];
                    _.forEach(roleIds, function(roleId) {
                        if (rVm.roles[roleId]) {
                            rVm.roles[roleId].id = roleId;
                            assigned.push(rVm.roles[roleId]);
                        }
                    });
                    var highestRole = _.minBy(assigned, 'number');
                    if (highestRole && highestRole.id !== adminId) {
                        rVm.cri.role = highestRole.id;
                        if (highestRole.managerRole) {
                            rVm.cri.role += ',' + highestRole.managerRole;
                        }
                        //console.log(rVm.cri);
                        search();
                    }
                }
            }

        }

        function search() {
            var req = employeeService.search(rVm.cri);
            return req.then(function(result) {
                rVm.users = result && result.items || [];
                _.forEach(rVm.users, function(r) {
                    if (r.$id === rVm.selectedUid) {
                        r.selected = true;
                    }
                });
                return $scope.$parent._getManagerText(rVm.users).then(function() {
                    angular.extend(rVm.paging, {
                        totalRecord: result.totalRecords,
                        totalPage: result.pages
                    });
                    $timeout(angular.noop, 200);
                });
            });
        }

        function changePage() {
            rVm.cri.from = rVm.paging.currentPage * rVm.cri.size;
            search();
        }

        function selectedReplace(item) {
            _.forEach(rVm.users, function(r) {
                r.selected = false;
            });
            item.selected = true;
            rVm.selectedUid = item.$id;
            rVm.selectedUser = item;
        }

        function save() {
            appUtils.showLoading();
            //Change Alias between 2 User employee
            var employeeLog = {
                action: appUtils.logEmployeeAction.updateProfile.value,
                message: "Replace employee's manager information",
                updateBy: currentUser.email || '',
                diffValue: [{
                    from: { uid: rVm.replaceUser.$id, alias: rVm.replaceUser.alias, managers: rVm.selectedUser.managers },
                    to: { uid: rVm.selectedUser.$id, alias: rVm.selectedUser.alias, managers: rVm.selectedUser.managers }
                }]
            };

            // managerService.moveAllData({ alias: rVm.replaceUser.alias }, { alias: rVm.selectedUser.alias, managers: rVm.selectedUser.managers }).then(function () {
            //     appUtils.hideLoading();
            //     employeeLog.status = 'Success';
            //     employeeLogService.create(rVm.replaceUser.$id, employeeLog);
            //     employeeLogService.create(rVm.selectedUser.$id, employeeLog);
            //     toaster.success("Success", "Update success.");
            //     $uibModalInstance.close('success');
            // });
            employeeQueueService.checkIsProcess(rVm.selectedUser.$id).then(function(rs) {
                appUtils.hideLoading();
                if (!rs) {
                    employeeQueueService.create(rVm.selectedUser.$id, { from: { alias: rVm.replaceUser.alias }, to: { alias: rVm.selectedUser.alias, managers: rVm.selectedUser.managers } }, true);
                    employeeLog.status = 'Success';
                    employeeLogService.create(rVm.replaceUser.$id, employeeLog);
                    employeeLogService.create(rVm.selectedUser.$id, employeeLog);
                    toaster.success("Success", "Update success.");
                    $uibModalInstance.close('success');
                } else {
                    toaster.warning("Warning", "Replace manager is processing.");
                }
            });

            //rVm.selectedUser.alias = newAlias;
            //rVm.selectedUser.managers = angular.copy(newManagers);

            //rVm.replaceUser.alias = oldAlias;
            //rVm.replaceUser.managers = angular.copy(oldManagers);

            //oldManagers.unshift(oldAlias);
            //var reqs = [];
            // employeeService.updateAlias(rVm.selectedUser).then(function (rs) {
            //     if (!rs.result) {
            //         toaster.error("Error", "Update has error, please try again later!");
            //         return;
            //     }
            //remove old department
            //departmentSevice.remove(oldAlias);

            //create new department
            //departmentSevice.create(rVm.selectedUser);

            //replace managers
            // reqs.push(managerService.replaceManager(oldAlias, oldManagers, 'users'));
            //reqs.push(managerService.replaceManager(newAlias, oldManagers, 'users'));

            // reqs.push(managerService.replaceManager(oldAlias, oldManagers, 'applications'));
            //reqs.push(managerService.replaceManager(newAlias, oldManagers, 'applications'));

            //reqs.push(managerService.replaceManagersEvent(0, oldAlias));


            //employeeService.updateAlias(rVm.replaceUser);

            //create new department
            //departmentSevice.create(rVm.replaceUser);
            // Promise.all(reqs).then(function(){
            //     appUtils.hideLoading();
            //     toaster.success("Success", "Update success.");
            //     $uibModalInstance.close('success');
            // });
            // });
        }

        function close() {
            $uibModalInstance.dismiss('cancel');
        }
    }
})();