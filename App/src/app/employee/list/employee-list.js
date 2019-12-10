(function () {
    'use strict';

    angular.module('app.employee')
        .controller('EmployeeListCtrl', EmployeeListCtrl);

    /** @ngInject */
    function EmployeeListCtrl($rootScope, $scope, $state, $stateParams, $timeout, $ngBootbox, $uibModal, $q, appUtils,
        DataUtils, toaster, authService, employeeService, roleService, employeeLogService, departmentSevice,
        employeeExportService, memStateService, memTerritoryService) {
        var currentUser = authService.getCurrentUser();
        $scope.userPermission = $rootScope.storage.statePermission;
        $scope.userPermission.isAdmin = appUtils.checkSpecifyRole(currentUser, 'admin');

        console.log($scope.userPermission.isAdmin);

        var timestampStart = moment().utc().startOf('month'),
            timestampEnd = moment().utc().endOf('month');

        var employeeVm = this;

        $scope.cri = {
            keyword: $stateParams.keyword ? $stateParams.keyword : '',
            role: $stateParams.role ? $stateParams.role : '',
            from: 0,
            size: 25,
            sort: 'timestampCreated',
            alias: '',
            licenseType: ($stateParams.licenseType !== undefined && $stateParams.licenseType != 'All') ? parseInt($stateParams.licenseType, 10) : 'All',
            hireType: $stateParams.hireType ? $stateParams.hireType : 'All',
            isAuthorized: $stateParams.isAuthorized === undefined ? true : $stateParams.isAuthorized === 'true',
            licenseExp: $stateParams.licenseExp === undefined ? false : $stateParams.licenseExp === 'true'
        };

        //get query start date
        var start = $stateParams.start && !isNaN(parseInt($stateParams.start)) ? moment(parseInt($stateParams.start)).utc() : timestampStart;
        $scope.timestampStart = start.valueOf();
        $scope.cri.timestampStart = angular.copy(start).utc().startOf('day').valueOf();

        //get query end date
        var end = $stateParams.end && !isNaN(parseInt($stateParams.end)) ? moment(parseInt($stateParams.end)).utc() : timestampEnd;
        $scope.timestampEnd = end.valueOf();
        $scope.cri.timestampEnd = angular.copy(end).utc().endOf('day').valueOf();

        // Make sure DOM is loaded before get elems
        angular.element(document).ready(function () {
            _initOnChangeDateRange();
        });

        // $scope.$watch('cri.licenseExp', function(val) {
        //     if (val) {
        //         _initOnChangeDateRange();
        //     }
        // });

        function _initOnChangeDateRange() {
            $timeout(function () {
                $('#EmployeeRange').on('apply.daterangepicker', function (ev, picker) {
                    if ($scope.cri.licenseExp) {
                        var startControl = angular.copy(picker.startDate._d),
                            endControl = angular.copy(picker.endDate._d);

                        var startStr = moment(startControl).format('MM/DD/YYYY'),
                            endStr = moment(endControl).format('MM/DD/YYYY');

                        $scope.cri.timestampStart = $scope.timestampStart = moment.utc(startStr).startOf("day").valueOf();
                        $scope.cri.timestampEnd = $scope.timestampEnd = moment.utc(endStr).endOf("day").valueOf();
                        $scope.cri.requester = $('#filterRequester').val();
                        _search();
                    } else {
                        console.log('licenseExp unchecked');
                    }

                });
            }, 800);
        }

        $scope.allowAddUser = false;
        $scope.chooseStates = null;
        $scope.requester = null;
        $scope.users = [];
        $scope.paging = {
            pageSize: 25,
            currentPage: $stateParams.page ? parseInt($stateParams.page) : 0,
            totalPage: 0,
            totalRecord: 0
        };

        $scope.allStates = [];
        $scope.allTerritories = [];
        $scope.licenseTypes = appUtils.licenseTypeEnum;
        $scope.hireTypes = appUtils.hireTypes;

        //Functions
        $scope.changePage = changePage;
        $scope.searchUser = search;
        $scope.getUserByRole = getUserByRole;
        $scope.selectAllUser = selectAllUser;
        $scope.dataLetterPic = dataLetterPic;
        $scope.editEmployee = editEmployee;
        $scope.changeUserRole = changeUserRole;
        $scope.applyAction = applyAction;
        $scope.addNew = addNew;
        $scope.getRoleText = getRoleText;
        $scope.getManagerInfo = getManagerInfo;
        $scope.showManagerInfo = showManagerInfo;
        $scope._getManagerText = _getManagerText;
        $scope.showModalReplace = showModalReplace;
        $scope.resetFiler = resetFiler;
        $scope.exportCSV = exportCSV;

        $scope.select2Options = {
            AllowClear: true,
            //minimumInputLength: 3,
            ajax: {
                dataType: 'json',
                delay: 250,
                transport: function (params, success, failure) {
                    var $request = employeeService.search(params.data);
                    $request.then(success, failure);
                    return $request;
                },
                data: function (params) {
                    var alias = null;
                    if (!$scope.userPermission.isAdmin) {
                        alias = currentUser.alias;
                    }
                    var cri = {
                        keyword: params.term,
                        size: 25,
                        from: 0,
                        alias: alias,
                        isAuthorized: true
                    };
                    return cri;
                },
                processResults: function (data) {
                    var result = _.map(data.items, function (item) {
                        return _composeSelectBoxText(item);
                    });
                    return {
                        results: result
                    };
                }
            }
        };

        //Load Data
        initPage();
        // $timeout(function () {
        //     $('#filter-users').trigger('click');
        // }, 1000);
        //initPage();
        //====================================================
        function initPage() {
            console.log('inti page');
            if ($stateParams.states) {
                $scope.chooseStates = $stateParams.states.split(',') || [];
            } else {
                $timeout(function () {
                    $scope.chooseStates = [];
                    $('#chooseStates').trigger('change');
                }, 200);
            }

            if ($stateParams.territories) {
                $scope.chooseTerritories = $stateParams.territories.split(',') || [];
            } else {
                $timeout(function () {
                    $scope.chooseTerritories = [];
                    $('#chooseTerritories').trigger('change');
                }, 200);
            }

            if ($stateParams.issuingstates) {
                $scope.chooseIssuingStates = $stateParams.issuingstates.split(',') || [];
            } else {
                $timeout(function () {
                    $scope.chooseIssuingStates = [];
                    $('#chooseIssuingStates').trigger('change');
                }, 200);
            }
            $scope.cri.alias = $stateParams.alias || ($scope.userPermission.isAdmin ? null : currentUser.alias);
            var all = [_loadStates(), _loadTerritories()];
            var filterUser = null;
            return $q.all(all).then(function () {
                return roleService.itemsObj().then(function (data) {
                    $scope.roles = data;
                    var clone = angular.copy(data);
                    $scope.rolesList = _.sortBy(_.map(clone, function (value, key) { value.$id = key; return value; }), 'number');
                    $scope.allowAddUser = !currentUser.externalAcc || $scope.userPermission.isAdmin;
                    $scope.cri.requester = $stateParams.requester || ($scope.userPermission.isAdmin ? 'All' : currentUser.alias);
                    if ($scope.cri.requester !== 'All' && $scope.cri.requester !== currentUser.alias) {
                        var arr = angular.copy($scope.cri.requester).split(','),
                            managerAliasId = arr && arr[0] || null;
                        if (managerAliasId) {
                            return employeeService.getUserByAlias(managerAliasId).then(function (user) {
                                filterUser = user || null;
                                return composeSelectBoxManager(filterUser);
                            });
                            // all.push(req1);
                        }
                    }
                    filterUser = currentUser;
                    return composeSelectBoxManager(filterUser);
                    // var reqs = [];
                    // get all user
                    // $scope.cri.from = 0;
                    // $scope.cri.keyword = '';
                    // $scope.cri.role = '';
                    // return true;
                });
            }).then(function () {
                console.log('loaded data');
                // $timeout(function () {
                    search();
                // }, 800);
            });
        }
        function composeSelectBoxManager(filterUser) {
            return new Promise(function (resolve, reject) {
                var option, selectOpt;
                if ($scope.cri.requester === 'All') {
                    option = new Option('All Managers', 'All', true, true);
                    $('#filterRequester').append(option).trigger('change');
                } else {
                    console.log('filterUser', filterUser);
                    if (filterUser) {
                        selectOpt = _composeSelectBoxText(filterUser);
                        option = new Option(selectOpt.text, selectOpt.id, true, true);
                        $('#filterRequester').append(option).trigger('change');
                    }
                }
                resolve(true);
            });
        }
        function search(isFilter) {
            $scope.cri.from = 0;
            if (isFilter) {
                $scope.cri.requester = $('#filterRequester').val();
                //console.log('$scope.cri.requeste', $scope.cri.requester);

            }

            _search();
            var reqs = [];
            var req;

            let globalCri = angular.copy($scope.cri);
            globalCri.size = 0;
            globalCri.from = 0;
            globalCri.role = '';
            req = employeeService.search(globalCri).then(function (rs) {
                $scope.allUsers = rs.totalRecords;
            });
            reqs.push(req);
            _.forEach($scope.rolesList, function (role) {
                let roleCri = angular.copy(globalCri);
                roleCri.role = role.$id;
                roleCri.size = 0;
                roleCri.from = 0;
                req = employeeService.search(roleCri).then(function (rs) {
                    role.totalUsers = rs.totalRecords;
                });
                reqs.push(req);
            });
            $q.all(reqs).then(() => {
                console.log('trigger load data');
            });
        }

        function _search() {
            appUtils.showLoading();
            $scope.cri.states = $scope.chooseStates && $scope.chooseStates.length > 0 ? $scope.chooseStates.join(',') : '';
            $scope.cri.territories = $scope.chooseTerritories && $scope.chooseTerritories.length > 0 ? $scope.chooseTerritories.join(',') : '';
            $scope.cri.issuingStates = $scope.chooseIssuingStates && $scope.chooseIssuingStates.length > 0 ? $scope.chooseIssuingStates.join(',') : '';
            //console.log('$scope.cri', $scope.cri);
            var req = employeeService.search($scope.cri);
            return req.then(function (result) {
                $scope.users = result && result.items || [];
                return _getManagerText($scope.users).then(function () {
                    appUtils.hideLoading();
                    angular.extend($scope.paging, {
                        totalRecord: result.totalRecords,
                        totalPage: result.pages
                    });
                    $timeout(function () {
                        $state.go('employee.list', { 'keyword': $scope.cri.keyword, 'start': $scope.timestampStart, 'end': $scope.timestampEnd, 'page': $scope.paging.currentPage, 'requester': $scope.cri.requester, 'alias': $scope.cri.alias, 'role': $scope.cri.role, 'licenseType': $scope.cri.licenseType, 'hireType': $scope.cri.hireType, 'isAuthorized': $scope.cri.isAuthorized, 'licenseExp': $scope.cri.licenseExp, 'states': $scope.cri.states, 'territories': $scope.cri.territories, 'issuingstates': $scope.cri.issuingStates }, { notify: false });
                    }, 100);
                });
            });
        }

        function changePage() {
            $scope.cri.from = $scope.paging.currentPage * $scope.cri.size;
            _search();
        }

        function getUserByRole(role) {
            _.extend($scope.cri, {
                keyword: '',
                role: role || '',
                from: 0,
                licenseExp: false,
                timestampStart: null,
                timestampEnd: null,
                states: '',
                territories: '',
                issuingStates: '',
                requester: 'All',
                licenseType: 'All',
                hireType: 'All'
            });
            $timeout(function () {
                $scope.chooseStates = [];
                $('#chooseStates').trigger('change');
                $scope.chooseTerritories = [];
                $('#chooseTerritories').trigger('change');
                $scope.chooseIssuingStates = [];
                $('#chooseIssuingStates').trigger('change');
                var option = new Option('All Managers', 'All', true, true);
                $('#filterRequester').append(option).trigger('change');
            }, 200);
            $scope.paging.currentPage = 0;
            search();
        }

        function selectAllUser(controlId, name) {
            appUtils.checkAllCheckBox(controlId, name);
        }

        function dataLetterPic(item) {
            if (item.firstName && item.firstName !== '' && item.lastName && item.lastName !== '') {
                return item.firstName.charAt(0).toUpperCase() + item.lastName.charAt(0).toUpperCase();
            } else {
                return item.email && item.email.charAt(0).toUpperCase() || 'UN';
            }
        }

        function editEmployee(userKey) {
            $state.go('employee.edit', { id: userKey });
        }

        function changeUserRole(chkName, roleControl) {
            var lstUserIds = [];
            var roleName = $('#' + roleControl).val();
            $('input[name=' + chkName + ']').each(function () {
                if (this.checked === true) {
                    lstUserIds.push($(this).val() + '');
                }
            });

            if (parseInt(roleName) === 0) {
                toaster.warning("Please choose role to execute!");
                return;
            }

            if (lstUserIds.length === 0) {
                toaster.warning("Please choose some users to execute action!");
                return;
            }

            employeeService.addUserToRole(lstUserIds, roleName).then(function (rs) {
                if (rs.tracking) {
                    _.forEach(rs.tracking, function (tracking) {
                        employeeLogService.create(tracking.id, tracking.data);
                    });
                }
            });

            if (lstUserIds.indexOf(currentUser.$id) !== -1) {
                delete $rootScope.storage.sidebarMenus;
                $timeout(function () {
                    employeeService.getUser(currentUser.$id).then(function (re) {
                        if (re !== null) {
                            $rootScope.storage.currentUser.acl = re.acl;
                            toaster.pop('success', 'Success', "Assign Role Successful!");
                            $timeout(function () {
                                initPage();
                            }, 1000);
                        }
                    });
                }, 1500);
            } else {
                toaster.pop('success', 'Success', "Assign Role Successful!");
                $timeout(function () {
                    initPage();
                }, 1000);
            }
        }

        function applyAction(chkName, actionControl) {
            var lstUserIds = [];
            $('input[name=' + chkName + ']').each(function () {
                if (this.checked === true) {
                    lstUserIds.push($(this).val() + '');
                }
            });

            var action = $('#' + actionControl).val();
            var actionTxt = $('#' + actionControl + ' option:selected').text();

            if (parseInt(action) === 0) {
                toaster.warning("Please choose action to execute!");
                return;
            }
            if (lstUserIds.length === 0) {
                toaster.warning("Please choose some users to execute action!");
                return;
            }

            $ngBootbox.confirm('Are you sure want to apply ' + actionTxt + ' action as selected?').then(function () {
                appUtils.showLoading();
                var employeeLog = null;
                if (action === 'delete') {
                    _.forEach(lstUserIds, function (obj, key) {
                        //Employee Log 
                        employeeLog = {
                            action: appUtils.logEmployeeAction.updateProfile.value,
                            message: 'Deleted employee',
                            updateBy: currentUser.email || ''
                        };
                        employeeService.deleteUser(obj).then(function (res) {
                            appUtils.hideLoading();
                            if (res.result) {
                                //Delete Employees List storage
                                employeeLog.status = "Success";
                                employeeLog.diffValue = res.diffValue || {};
                                toaster.pop('success', 'Success', "Delete successful!");
                                $timeout(function () {
                                    initPage();
                                }, 800);
                            } else {
                                employeeLog.status = "Failed";
                                employeeLog.message = "Delete employee has error.";
                                employeeLog.diffValue = res.diffValue || {};
                                toaster.pop('error', 'Error', "Delete has error! " + res.errorMsg);
                            }
                        }).catch(function (err) {
                            employeeLog.status = "Failed";
                            employeeLog.message = err && err.message || "Delete employee has error.";
                        }).then(function () {
                            employeeLogService.create(obj, employeeLog);
                        });
                    });

                } else
                    if (action === 'disable') {
                        //Employee Log 
                        employeeLog = {
                            action: appUtils.logEmployeeAction.updateProfile.value,
                            message: 'Disabled employee',
                            updateBy: currentUser.email || ''
                        };
                        _.forEach(lstUserIds, function (obj, key) {
                            employeeService.unAuthorizedUser(obj).then(function (res) {
                                appUtils.hideLoading();
                                if (res.result) {
                                    //Delete Employees List storage
                                    employeeLog.status = "Success";
                                    employeeLog.diffValue = res.diffValue || {};
                                    toaster.pop('success', 'Success', "Disable successful!");
                                    $timeout(function () {
                                        initPage();
                                    }, 800);
                                } else {
                                    employeeLog.status = "Failed";
                                    employeeLog.message = "Disable employee has error.";
                                    employeeLog.diffValue = res.diffValue || {};
                                    toaster.pop('error', 'Error', "Disable has error! " + res.errorMsg);
                                }
                            }).catch(function (err) {
                                employeeLog.status = "Failed";
                                employeeLog.message = err && err.message || "Disable employee has error.";
                            }).then(function () {
                                employeeLogService.create(obj, employeeLog);
                            });
                        });
                    } else
                        if (action === 'enable') {
                            //Employee Log 
                            employeeLog = {
                                action: appUtils.logEmployeeAction.updateProfile.value,
                                message: 'Enabled employee',
                                updateBy: currentUser.email || ''
                            };
                            _.forEach(lstUserIds, function (obj, key) {
                                employeeService.authorizedUser(obj).then(function (res) {
                                    appUtils.hideLoading();
                                    if (res.result) {
                                        //Delete Employees List storage
                                        employeeLog.status = "Success";
                                        employeeLog.diffValue = res.diffValue || {};
                                        toaster.pop('success', 'Success', "Enable successful!");
                                        $timeout(function () {
                                            initPage();
                                        }, 800);
                                    } else {
                                        employeeLog.status = "Failed";
                                        employeeLog.diffValue = res.diffValue || {};
                                        employeeLog.message = err && err.message || "Enable employee has error.";
                                        toaster.pop('error', 'Error', "Enable has error! " + res.errorMsg);
                                    }
                                }).catch(function (err) {
                                    employeeLog.status = "Failed";
                                    employeeLog.message = err && err.message || "Enable employee has error.";
                                }).then(function () {
                                    employeeLogService.create(obj, employeeLog);
                                });
                            });

                        } else {
                            appUtils.hideLoading();
                        }
            });
        }

        function addNew() {
            $rootScope.reProcessSideBar = true;
            $state.go('employee.add');
        }

        function getRoleText(user) {
            var roleText = "";
            if (user.acl && user.acl.roles) {
                var roleIds = Object.keys(user.acl.roles);
                if (roleIds && roleIds.length > 0) {
                    var assigned = [];
                    _.forEach(roleIds, function (roleId) {
                        if ($scope.roles[roleId]) {
                            assigned.push($scope.roles[roleId]);
                        }
                    });
                    var highestRole = _.minBy(assigned, 'number');
                    roleText = highestRole && highestRole.name || "";
                }
            }

            return roleText;
        }

        function getManagerInfo(item) {
            var aliases = item && item.managers || [];
            var reqs = [];
            _.forEach(aliases, function (alias) {
                var req = departmentSevice.get(alias).then(function (data) {
                    //console.log(data);
                    var manager = data && data.manager || {},
                        text = [];
                    if (manager.alias) {
                        var arr = manager.alias.split("_");
                        if (arr && arr.length > 0) {
                            text.push('<strong>' + arr[0] + '</strong>');
                        }
                    }
                    if (manager.name) {
                        text.push(manager.name);
                    }
                    return text.length > 0 && text.join(': ') || null;
                });

                reqs.push(req);
            });

            return $q.all(reqs).then(function (rs) {
                rs = _.filter(rs, function (i) {
                    return i !== null;
                });
                var text = '<small style="float:right;"><strong>A</strong>: Area Manager;<strong> D</strong>: District Manager; <strong>R</strong>: Regional Manager; <strong>ADMIN</strong>: Administrator</small></br></br></small>';
                return text + ((rs.length > 0 && rs.join(' -> ')) || '<i>Do not have manager(s).</i>');
            });
        }

        function showManagerInfo(item) {
            return getManagerInfo(item).then(function (managerText) {
                var dialog = bootbox.dialog({
                    title: '<i class="fa fa-info-circle margin-right-10"></i>' + item.firstName + ' ' +
                        item.lastName + ' Manager Information',
                    message: managerText,
                    buttons: {
                        ok: {
                            label: "Close",
                            className: 'btn-info',
                            callback: function () { }
                        }
                    }
                });
            });
        }

        function showModalReplace(item) {
            var data = $scope.roles;
            var modalInstance = $uibModal.open({
                templateUrl: 'app/employee/modal/replace-manager-modal.tpl.html',
                controller: 'replaceManagerCtrl as rVm',
                size: 'lg',
                scope: $scope,
                backdrop: 'static',
                resolve: {
                    user: function () {
                        return angular.copy(item);
                    },
                    roles: function () {
                        return angular.copy($scope.roles);
                    }
                }
            });

            modalInstance.result.then(function (rs) {
                if (currentUser.$id === rs.$id) {
                    $rootScope.storage.currentUser = currentUser = $scope.user = rs;
                } else {
                    $scope.user = rs;
                }
                initPage();
            }).catch(function (res) { });

        }

        //Private
        function _getManagerText(items, isExport) {
            var reqs = [];
            _.forEach(items, function (item) {
                item.rep = appUtils.checkSpecifyRole(item, 'rep');
                if (item.managers && item.managers.length > 0) {
                    var alias = item.managers[0];
                    var req = departmentSevice.get(alias).then(function (data) {
                        var manager = data && data.manager || {},
                            text = [];
                        if (manager.alias) {
                            var arr = manager.alias.split("_");
                            if (arr && arr.length > 0) {
                                if (!isExport) {
                                    text.push('<strong>' + arr[0] + '</strong>');
                                } else {
                                    text.push(arr[0]);
                                }
                            }
                        }
                        if (manager.name) {
                            text.push(manager.name);
                        }
                        item.manager = text.length > 0 && text.join(': ') || '';
                    });
                    reqs.push(req);
                }
            });
            return $q.all(reqs);
        }

        function resetFiler() {
            $timeout(function () {
                $state.go('employee.list', { 'keyword': '', 'start': null, 'end': null, 'page': 0, 'requester': (!$scope.userPermission.isRep ? 'All' : currentUser.$id), 'alias': $scope.cri.alias, 'role': '', 'licenseType': 'All', 'hireType': 'All', 'licenseExp': false, 'isAuthorized': true, 'states': null, 'territories': null, 'issuingstates': null }, { reload: true });
            }, 100);
        }

        function _loadStates() {
            return memStateService.getAll().then(function (data) {
                $scope.allStates = data || [];
                $timeout(angular.noop, 200);
            });
        }

        function _loadTerritories() {
            return memTerritoryService.getAllTerritoryLoadOnce().then(function (data) {
                $scope.allTerritories = data || [];
                $timeout(angular.noop, 200);
            });
        }

        function _composeSelectBoxText(data, roles) {
            var text = [],
                fName = _.trim(data.firstName),
                lName = _.trim(data.lastName),
                repCode = _.trim(data.repCode || data.username || ''),
                roleId = '';

            if (data.acl && data.acl.roles) {
                var keys = Object.keys(data.acl.roles);
                roleId = keys && keys[0];
            }


            if (roleId) {
                var myRole = roles && roles[roleId];
                if (myRole) {
                    text.push(myRole.prefix + ':');
                }
            }

            if (fName) {
                text.push(fName);
            }

            if (lName) {
                text.push(lName);
            }

            var displayName = angular.copy(text);

            if (repCode) {
                text.push('(' + repCode + ')');
            }

            return {
                id: data.alias,
                text: text.join(' '),
                email: data.email,
                repCode: repCode,
                displayName: displayName.join(' '),
            };
        }

        function exportCSV() {
            appUtils.showLoading();
            var cri = angular.copy($scope.cri);
            cri.from = 0;
            cri.size = 10000;
            var currentDateTxt = moment().utc().format('MM/DD/YYYY').replace('/', '_');
            var req = employeeExportService.exportEmployee(cri, {
                states: DataUtils.array2ObjectIndex($scope.allStates, 'iso'),
                territories: DataUtils.array2ObjectIndex($scope.allTerritories, '$id'),
                roles: $scope.roles,
                fileName: 'Employee_Export_' + currentDateTxt
            });
            return req.then(function (result) {
                appUtils.hideLoading();
            });
        }
    }
})();