(function() {
    'use strict';

    angular.module('app.role')
        .controller('RoleListCtrl', RoleListCtrl);

    /** @ngInject */
    function RoleListCtrl($rootScope, $scope, $state, $q, $timeout, authService, roleService, toaster, $ngBootbox, appUtils, $stateParams) {
        $scope.userPermission = $rootScope.storage.statePermission;
        var currentUser = authService.getCurrentUser(),
            roleId = $stateParams.id;
        //
        var roleVm = this;
        roleVm.nameRegx = /^(a-z|A-Z|0-9)*[^!#$%^&*()'"\/\\;:@=+,?\[\]\/]*$/;
        roleVm.showInvalid = false;
        roleVm.isAdd = true;
        roleVm.formTitle = 'Add';
        roleVm.selectAction = 'Bulk Actions';
        roleVm.model = {
            name: '',
            description: '',
            number: 1,
            uid: currentUser.$id
        };

        roleVm.cri = {
            keyword: ''
        };
        roleVm.groupedItems = [];
        roleVm.filteredItems = [];
        roleVm.pagedItems = [];
        roleVm.paging = {
            pageSize: 25,
            currentPage: 0,
            totalPage: 0,
            totalRecord: 0
        };

        //Functions
        roleVm.groupToPages = groupToPages;
        roleVm.search = search;
        roleVm.delete = deleteRole;
        roleVm.selectAll = selectAll;
        roleVm.apply = apply;
        roleVm.cancel = cancel;
        roleVm.save = save;
        $scope.changePage = changePage;

        //Load Data
        initPage();
        //============================================
        function initPage() {
            var reqs = [];
            if (roleId) {
                roleVm.showInvalid = true;
                roleVm.formTitle = 'Edit';
                roleVm.isAdd = false;
                reqs.push(roleService.get(roleId).then(function(item) {
                    roleVm.model = item;
                    $timeout(angular.noop);
                }));
            }

            $q.all(reqs).then(function() {
                search();
            });
        }

        function groupToPages() {
            roleVm.pagedItems = [];
            for (var i = 0; i < roleVm.filteredItems.length; i++) {
                if (i % roleVm.paging.pageSize === 0) {
                    roleVm.pagedItems[Math.floor(i / roleVm.paging.pageSize)] = [roleVm.filteredItems[i]];
                } else {
                    roleVm.pagedItems[Math.floor(i / roleVm.paging.pageSize)].push(roleVm.filteredItems[i]);
                }
            }
            if (roleVm.filteredItems.length % roleVm.paging.pageSize === 0) {
                roleVm.paging.totalPage = roleVm.filteredItems.length / roleVm.paging.pageSize;
            } else {
                roleVm.paging.totalPage = Math.floor(roleVm.filteredItems.length / roleVm.paging.pageSize) + 1;
            }

        }

        function changePage() {
            groupToPages();
        }

        function search() {
            appUtils.showLoading();
            roleService.search(roleVm.cri.keyword).then(function(result) {
                appUtils.hideLoading();
                roleVm.filteredItems = _.sortBy(result, 'number');
                roleVm.paging.totalRecord = result.length;
                roleVm.paging.currentPage = 0;
                //group by pages
                groupToPages();
            });
        }

        function deleteRole() {
            $ngBootbox.confirm('Are you sure want to delete ' + roleVm.model.name + '?')
                .then(function() {
                    roleService.remove(roleId).then(function(rs) {
                        if (rs.result) {
                            toaster.success("Delete success!");
                        } else {
                            toaster.error(rs.errorMsg);
                        }
                    });
                }, function() {});
        }

        function selectAll(controlId, name) {
            appUtils.checkAllCheckBox(controlId, name);
        }

        function apply(chkName) {
            appUtils.showLoading();
            var lstIds = [];
            $('input[name=' + chkName + ']').each(function() {
                if (this.checked === true) {
                    lstIds.push($(this).val() + '');
                }
            });
            var removeIndex = roleVm.selectAction.indexOf('Delete');
            if (removeIndex === -1) {
                appUtils.hideLoading();
                toaster.warning("Please choose action to execute!");
                return;
            }

            if (lstIds.length <= 0) {
                appUtils.hideLoading();
                toaster.warning("Please choose some items to execute action!");
                return;
            }
            $ngBootbox.confirm('Are you sure want to apply ' + roleVm.selectAction + ' action as selected?')
                .then(function() {
                    var removeRs = [];
                    if (removeIndex > -1) {
                        _.forEach(lstIds, function(id) {
                            removeRs.push(roleService.remove(id));
                        });

                        $q.all(removeRs).then(function(rs) {
                            appUtils.hideLoading();
                            toaster.success("Delete success!");
                            search();
                        });
                    }

                }, function() {
                    appUtils.hideLoading();
                });
        }

        function cancel() {
            $state.go('roles');
        }
        //====================
        function save() {
            appUtils.showLoading();
            //console.log(roleId);
            //console.log(roleVm.model);
            var req = $q.when();
            if (roleId) {
                req = roleService.update(roleVm.model);
            } else {
                req = roleService.create(roleVm.model);
            }
            req.then(function(rs) {
                appUtils.hideLoading();
                if (!rs.result) {
                    toaster.error(rs.errorMsg);
                    return;
                }
                toaster.success("Save success!");
                $state.go("roles", { id: rs.key });
            });
        }
    }
})();