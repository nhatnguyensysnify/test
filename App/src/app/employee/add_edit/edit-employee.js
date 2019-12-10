(function() {
    'use strict';

    angular.module("app.employee")
        .controller("EditEmployeeCtrl", EditEmployeeCtrl);
    /** @ngInject */
    function EditEmployeeCtrl($q, $rootScope, $timeout, $scope, $state, $stateParams, dialogService, $uibModal, appUtils, DataUtils,
        appSettingService, employeeService, roleService, authService, mediaService, toaster, memAppService,
        memRegionService, employeeQueueService, employeeLogService, memTerritoryService, memStateService, notificationService) {
        // toggle menu side bar
        $rootScope.settings.layout.pageSidebarClosed = true;
        var currentUser = authService.getCurrentUser(); //$rootScope.storage.currentUser;
        var appSettings = $rootScope.storage.appSettings;
        var search = appSettings.elasticSearch ? appSettings.elasticSearch.application : {};
        //
        $scope.userPermission = $rootScope.storage.statePermission;
        $scope.userPermission.isAdmin = appUtils.checkSpecifyRole(currentUser, 'admin');
        $scope.userPermission.isRep = appUtils.checkSpecifyRole(currentUser, 'rep');

        var userId = $stateParams.id,
            userPhone = '',
            oldManagers = '';
        var editEmployeeVm = this;
        var currentAddrState = null;

        editEmployeeVm.getRegion = getRegion;
        editEmployeeVm.regionGroups = {};

        $scope.isEditProfile = $stateParams.editprofile || currentUser.$id === $stateParams.id || null;
        $scope.user = {};
        $scope.user.$id = userId;
        $scope.states = [];
        $scope.zipcodeRegx = /(^\d{5}$)|(^\d{5}-\d{4}$)/;
        $scope.emailRegx = /^[a-z]+[a-z0-9._]+@[a-z]+\.[a-z.]{2,5}$/;
        $scope.nameRegx = /^(a-z|A-Z|0-9)*[^!#$%^&*()'"\/\\;:@=+,?\[\]\/]*$/;
        $scope.addressRegx = /^(a-z|A-Z|0-9)*[^!$%^&*()'"\/\\;:@=+,?\[\]]*$/;
        $scope.showInvalid = true;
        $scope.e_msges = {};
        $scope.userRoles = [];
        $scope.roles = [];
        $scope.managers = [];
        $scope.hasManager = true; // flag show/hide manager field
        $scope.states = appUtils.getAllState();
        $scope.tabIdx = 1;

        //Functions
        //$scope.removeOutRoles = removeOutRoles;
        $scope.openModalAddRole = openModalAddRole;
        $scope.saveEdit = saveEdit;
        $scope.changeAvatar = changeAvatar;
        $scope.initData = initData;
        $scope.resetPassword = resetPassword;
        $scope.cancel = cancel;
        $scope.EnalblePhoneForm = EnalblePhoneForm;
        $scope.updateUser = updateUser;
        // $scope.onSelectManager = onSelectManager;
        //===================================================

        //Load Data
        $scope.select2Cri = {
            keyword: '',
            size: 25,
            from: 0,
            isAuthorized: true,
            role: null
        };

        $scope.select2OptionsRegional = {
            AllowClear: true,
        };

        $scope.select2OptionsTerritory = {
            AllowClear: true
        };

        $scope.select2Options = {
            AllowClear: true,
            //minimumInputLength: 3,
            tags: true,
            maximumSelectionLength: 1,
            ajax: {
                dataType: 'json',
                delay: 250,
                transport: function(params, success, failure) {
                    var $request = employeeService.search(params.data);
                    $request.then(success, failure);
                    return $request;
                },
                data: function(params) {
                    $scope.select2Cri.keyword = params.term;
                    return $scope.select2Cri;
                },
                processResults: function(data) {
                    var result = _.map(data.items, function(item) {
                        return _composeSelectBoxText(item, $scope.roles);
                    });
                    //
                    return {
                        results: result
                    };
                }
            }
        };

        angular.element(document).ready(function() {
            appUtils.clearSelection();
            $timeout(function() {
                $('#ChooseManager').on('select2:select', function(e) {
                    var isNew = e.params.data.id === e.params.data.text;
                    if (isNew) {
                        $timeout(function() {
                            $scope.$apply(function() {
                                editEmployeeVm.selectedManager = [];
                            });
                        }, 200);
                        $('#ChooseManager').find('[data-select2-tag="true"]').remove();
                    }
                });
            }, 400);
        });

        initPage();

        function initPage() {
            appUtils.showLoading();
            var req = employeeService.getUser(userId).then(function(result) {
                appUtils.hideLoading();
                if (result !== undefined && result !== null) {
                    setUser(result);
                } else {
                    toaster.error('Get user information has error.');
                    $state.go('employee.list');
                }
            });
            Promise.all([loadAllTerritory(), loadAllRegion(), req]).then(function() {
                $timeout(angular.noop, 500);
            });
        }

        function setUser(result) {
            $scope.user = result;
            $scope.isManager = _checkIsManager(result);
            currentAddrState = angular.copy(result.state);
            //
            if ($scope.user.firstName && $scope.user.firstName !== '' && $scope.user.lastName && $scope.user.lastName !== '')
                $scope.dataLetterPic = $scope.user.firstName.charAt(0).toUpperCase() + $scope.user.lastName.charAt(0).toUpperCase(); //$scope.user.email.charAt(0).toUpperCase();// Handle avatar    
            else
                $scope.dataLetterPic = $scope.user.email.charAt(0).toUpperCase();

            //
            if (!$scope.user.repCode) {
                $scope.user.repCode = result.username || '';
            }

            if (!$scope.user.managers) {
                $scope.user.managers = [];
            }

            oldManagers = angular.copy($scope.user.managers);

            editEmployeeVm.Phone = userPhone = angular.copy(result.primaryPhone);
            //get profile images
            $scope.profileImage = '';
            if (result.photoURL) {
                appUtils.getImageFBUrl(result.photoURL).then(function(data) {
                    $scope.profileImage = data.imgUrl;
                });
            }

            if (!result.acl) {
                $scope.user.acl = {
                    roles: {}
                };
            }
            $timeout(angular.noop, 200);
            //Get UserRole Info
            loadRoles().then(function() {
                loadManager($scope.user, $scope.roles);
            });

            //console.log(result);
        }

        function loadManager(user, allRoles) {
            editEmployeeVm.selectedManager = [];
            $scope.tabIdx = 1;
            var myManager = "";
            if (user.managers && user.managers.length > 0) {
                myManager = user.managers[0];
                editEmployeeVm.selectedManager.push(myManager);
            }
            employeeService.getUserByAlias(myManager).then(function(selected) {
                //var reqs = [];
                if (user.acl && user.acl.roles) {
                    var roleIds = Object.keys(user.acl.roles);
                    if (roleIds && roleIds.length > 0) {
                        var assigned = [];
                        _.forEach(roleIds, function(roleId) {
                            if (allRoles[roleId]) {
                                assigned.push(allRoles[roleId]);
                            }
                        });
                        var highestRole = _.minBy(assigned, 'number');
                        if (highestRole) {
                            var managerRole = highestRole && highestRole.managerRole || null;
                            if (managerRole) {
                                $scope.select2Cri.role = managerRole;
                            } else {
                                $scope.hasManager = false;
                                $scope.user.managers = [];
                                editEmployeeVm.selectedManager = [];
                            }
                        }
                    }
                } else {
                    $scope.hasManager = false;
                    $scope.user.managers = [];
                }
                //
                var $select = $('#ChooseManager');
                // save current config. options
                var options = $select.data('select2').options.options;
                // build new items
                var items = [];
                if (selected) {
                    var optionSelected = _composeSelectBoxText(selected, $scope.roles);
                    var option = new Option(optionSelected.text, optionSelected.id, true, true);
                    items.push(optionSelected);
                    $select.append(option);
                } else {
                    editEmployeeVm.selectedManager = [];
                }
                options.data = items;
                $select.select2(options);
                $scope.$apply();
                $timeout(angular.noop);
            });
        }

        function loadRoles() {
            $scope.userRoles = [];
            return roleService.itemsObj().then(function(roles) {
                $scope.roles = roles;
                if (roles !== null && $scope.user.acl && $scope.user.acl.roles) {
                    var userRoles = angular.copy($scope.user.acl.roles);
                    _.forEach(userRoles, function(value, roleId) {
                        if (roles[roleId]) {
                            roles[roleId].id = roleId;
                            $scope.userRoles.push(roles[roleId]);
                        }
                    });
                }
                $timeout(angular.noop);
            });
        }

        function loadAllTerritory() {
            return memTerritoryService.getAllTerritoryLoadOnce().then(function(data) {
                $scope.territories = data;
                $timeout(angular.noop, 100);
            });
        }

        function loadAllRegion() {
            return memStateService.statesLoadOnce().then(function(data) {
                $scope.regions = data;
                $timeout(angular.noop, 200);
            });
        }

        function openModalAddRole() {
            var data = $scope.roles;
            var modalInstance = $uibModal.open({
                templateUrl: 'app/employee/modal/user_role_n_group.tpl.html',
                controller: 'userRoleNGroupCtrl as uVm',
                size: 'lg',
                scope: $scope,
                backdrop: 'static',
                resolve: {
                    user: function() {
                        return $scope.user;
                    },
                    mode: function() {
                        return 'role';
                    },
                    data: function() {
                        return data;
                    }
                }
            });

            modalInstance.result.then(function(rs) {
                $scope.user = rs;
                if (currentUser.$id === rs.$id) {
                    $rootScope.storage.currentUser = currentUser = rs;
                }
                $state.go('employee.edit', { id: userId }, { reload: true });
            }).catch(function(res) {});

        }

        function updateUser(extra) {
            appUtils.showLoading();
            //Employee Log 
            var employeeLog = {
                action: appUtils.logEmployeeAction.updateProfile.value,
                message: 'Updated employee information.',
                updateBy: currentUser.email || ''
            };
            var changeManager = _checkIsChangeManager(oldManagers, $scope.user.managers);
            if (changeManager) {
                employeeLog.message = "Changed employee's manager information.";
            }
            if (extra) {
                employeeLog.action = appUtils.logEmployeeAction.updateCareer.value;
                employeeLog.message = "Changed employee's career information.";
            }

            //Custom logics when save user
            //1. Handle default case for working state base on address state: forced change
            console.log(currentAddrState, $scope.user.state);
            if(!extra && (currentAddrState !== $scope.user.state)){
                let addrState = angular.copy($scope.user.state);
                $scope.user.workingStates = {};
                $scope.user.workingStates[addrState] = true;
                currentAddrState = angular.copy($scope.user.state);
            }
            
            // if ((!$scope.user.workingStates || angular.equals($scope.user.workingStates, {})) &&
            //     (addrState && !angular.equals(addrState, ''))) {
            //     //console.log(addrState);
                
            // }
            //2. Handle defaul case for type of hire base on role
            if (!$scope.user.typeOfHire || angular.equals($scope.user.typeOfHire, '')) {
                let aliasUC = $scope.user.alias.toUpperCase();
                let roleDectected = aliasUC.split('_');
                switch (roleDectected[0]) {
                    case 'REP':
                        {
                            $scope.user.typeOfHire = appUtils.hireTypes[0].value; //Contractor
                        }
                        break;
                    case 'A':
                        {}
                        break;
                    case 'D':
                        {
                            $scope.user.typeOfHire = appUtils.hireTypes[1].value; //Employee
                        }
                        break;
                    case 'R':
                        {
                            $scope.user.typeOfHire = appUtils.hireTypes[1].value; //Employee
                        }
                        break;
                    case 'ADMIN':
                        {
                            $scope.user.typeOfHire = appUtils.hireTypes[1].value; //Employee
                        }
                        break;
                    default:
                        {}
                        break;
                }
            }

            employeeService.updateUser($scope.user)
                .then(function (res) {
                    return res;
                }).then(function (res) {
                    notificationService.notiUpdateProfile($scope.user.uid).then(function () {
                        appUtils.hideLoading();
                        if (!res.result) {
                            employeeLog.status = 'Failed';
                            if (res.errorMsg) {
                                employeeLog.message = res.errorMsg;
                            } else {
                                employeeLog.message = 'Update employee information has error.';
                                if (changeManager) {
                                    employeeLog.message = "Changed employee's manager information has error.";
                                }
                                if (extra) {
                                    employeeLog.message = "Changed employee's career information has error.";
                                }
                            }
                            employeeLog.diffValue = res.diffValue || {};
                            employeeLogService.create(userId, employeeLog);
                            appUtils.hideLoading();
                            dialogService.alert(res.errorMsg);
                            return;
                        }

                        //replace managers
                        if (changeManager) {
                            //managerService.moveAllData({ alias: $scope.user.alias }, { alias: $scope.user.alias, managers: $scope.user.managers });
                            employeeQueueService.create($scope.user.$id, { from: { alias: $scope.user.alias }, to: { alias: $scope.user.alias, managers: $scope.user.managers } }, true);
                        }
                        oldManagers = angular.copy($scope.user.managers);
                        employeeLog.status = 'Success';
                        employeeLog.diffValue = res.diffValue || {};
                        employeeLogService.create(userId, employeeLog);
                        toaster.pop('success', 'Success', "Account Updated.");
                        $rootScope.settings.layout.showSideBar = true;
                        userPhone = $scope.user.primaryPhone;
                        //userRepCode = angular.copy($scope.user.repCode || '');

                        //reset current user
                        if (currentUser.$id == userId) {
                            $rootScope.storage.currentUser = currentUser = angular.copy($scope.user);
                        }
                    });
                })
                .catch(function(err) {
                    employeeLog.status = 'Failed';
                    if (err && err.message) {
                        employeeLog.message = err && err.message;
                    } else {
                        employeeLog.message = 'Update employee information has error.';
                        if (changeManager) {
                            employeeLog.message = "Changed employee's manager information has error.";
                        }
                        if (extra) {
                            employeeLog.message = "Changed employee's availability & licenses information has error.";
                        }
                    }
                    employeeLogService.create(userId, employeeLog);
                });
        }

        function saveEdit(form) {
            
            
            if (form.$invalid && $scope.userPermission.isRep) {
                $scope.showInvalid = true;
                return;
            }

            appUtils.showLoading();

            if (!$scope.user.displayName) {
                $scope.user.displayName = $scope.user.firstName + ' ' + $scope.user.lastName;
            }

            $scope.user.primaryPhone = $.trim(editEmployeeVm.Phone) === '' ? '' : editEmployeeVm.Phone;
            $scope.user.managers = [];
            var selectedManager = $('#ChooseManager').select2('data'),
                newManager = selectedManager && selectedManager[0];
            return employeeService.getUser(newManager && newManager.id || '').then(function(manager) {
                if (manager) {
                    if (manager.managers && manager.managers.length > 0) {
                        $scope.user.managers = manager.managers;
                    }
                    if (manager.alias) {
                        $scope.user.managers.unshift(manager.alias);
                    }
                }
                updateUser();
            });

            // checkPhoneExists(form).then(function (checkPhoneExistsRs) {
            // 	if (!checkPhoneExistsRs.result) {
            // 		$scope.user.primaryPhone = $.trim(editEmployeeVm.Phone) === '' ? ' ' : editEmployeeVm.Phone;
            // 		updateUser();
            // 	}
            // });
        }

        function changeAvatar(form) {
            appUtils.showLoading();
            var file = $('#file')[0].files[0];
            // Create the file metadata
            var metadata = {
                contentType: 'image/jpeg'
            };
            if (!file) {
                appUtils.hideLoading();
                toaster.error('Please select new thumbnail image.');
                return;
            }
            // Upload file and metadata to the object 'images/mountains.jpg'
            var uploadTask = mediaService.uploadFile('images/user_profile/', file, metadata); // Listen for state changes, errors, and completion of the upload.
            uploadTask.on(firebase.storage.TaskEvent.STATE_CHANGED, // or 'state_changed'
                function(snapshot) {
                    // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
                    var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    console.log('Upload is ' + progress + '% done');
                },
                function(error) {
                    switch (error.code) {
                        case 'storage/unauthorized':
                            // User doesn't have permission to access the object
                            appUtils.hideLoading();
                            dialogService.alert(error.error);
                            break;

                        case 'storage/canceled':
                            // User canceled the upload
                            appUtils.hideLoading();
                            dialogService.alert(error.error);
                            break;

                        case 'storage/unknown':
                            // Unknown error occurred, inspect error.serverResponse
                            appUtils.hideLoading();
                            dialogService.alert(error.error);
                            break;
                    }
                },
                function() {
                    // Upload completed successfully, now we can get the download URL
                    var downloadUrl = uploadTask.snapshot.downloadURL;
                    //Update User Details
                    $scope.user.photoURL = downloadUrl;
                    if (currentUser.$id == userId) {
                        $('#header-img-profile img').attr('src', downloadUrl + '');
                    }
                    return employeeService.updateAvatar(userId, downloadUrl).then(function() {
                        appUtils.hideLoading();
                        $state.go('employee.edit', { id: userId }, { reload: true });
                        $('a.fileinput-exists').click();
                    });
                });
        }

        function initData() {
            initPage();
        }

        function resetPassword() {
            appUtils.showLoading();
            authService.resetPasswordAuth($scope.user.email).then(function() {
                toaster.pop('success', 'Success', "Reset Password Successfully!");
                appUtils.hideLoading();
            }).catch(function(error) {
                toaster.pop('error', 'Error', error);
                appUtils.hideLoading();
            });
        }

        function cancel() {
            if ($scope.isEditProfile) {
                $state.go('dashboard.employee');
            } else {
                $state.go('employee.list');
            }
        }

        function EnalblePhoneForm(form) {
            /* jshint ignore:start */
            form.primaryphone.$setValidity('server', true);
            $scope.e_msges['primaryphone'] = "";
            /* jshint ignore:end */
        }

        function checkPhoneExists(form) {
            /* jshint ignore:start */
            var deferred = $q.defer();
            var req = employeeService.checkPhoneExist(editEmployeeVm.Phone);
            req.then(function(res) {
                appUtils.hideLoading();
                if (res.data !== null && res.data.length >= 1) {
                    if (userPhone != editEmployeeVm.Phone) {
                        form.primaryphone.$setValidity('server', false);
                        $scope.e_msges['primaryphone'] = "Phone number already exists. Please enter another.";
                        deferred.resolve({ result: true });
                        return deferred.promise;
                    }
                } //Phone exists.
                deferred.resolve({ result: false });
                return deferred.promise;
            }, function(res) {
                // show not found error
                form.primaryphone.$setValidity('server', false);
                $scope.e_msges['primaryphone'] = "Phone number already exists. Please enter another.";
                deferred.resolve({ result: true });
            });
            /* jshint ignore:end */
            return deferred.promise;
        }

        function _checkIsChangeManager(oldManagers, newManagers) {
            var compare = _.omitBy(newManagers, function(value, key) {
                return _.isEqual(value, oldManagers[key]);
            });
            var keys = Object.keys(compare);
            return keys && keys.length > 0;
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
                id: data.$id,
                text: text.join(' '),
                email: data.email,
                repCode: repCode,
                displayName: displayName.join(' '),
            };
        }

        function _checkIsManager(user) {
            return !appUtils.checkSpecifyRole(user, 'rep');
        }


        //==================================================================================================================================================================
        //Functions of employee dashboard.
        $scope.timestampDStart = moment().startOf('day').valueOf();
        $scope.timestampDEnd = moment().endOf('day').valueOf();

        $scope.dashBoardData = [];
        $scope.loadEmployeeHistory = loadEmployeeHistory;
        $scope.initDashboardTab = initDashboardTab;
        $scope.loadEmployeeLicense = loadEmployeeLicense;
        $scope.showEmployeeDashboardModal = showEmployeeDashboardModal;

        // Make sure DOM is loaded before get elems
        angular.element(document).ready(function() {
            $timeout(function() {
                $('#dashboardRange').on('apply.daterangepicker', function(ev, picker) {
                    //reload UI
                    initDashboardTab();
                });
            }, 800);
        });

        function showEmployeeDashboardModal(type) {
            var modalInstance = $uibModal.open({
                templateUrl: 'app/employee/add_edit/_employee-dashboard-modal.tpl.html',
                controller: 'EmployeeDashBoardModalCtrl',
                size: 'lg',
                scope: $scope,
                backdrop: 'static',
                resolve: {
                    reportType: function() {
                        return type;
                    },
                    reportData: function() {
                        return $scope.dashBoardData;
                    }
                }
            });
        }

        function initDashboardTab() {
            $rootScope.settings.layout.pageSidebarClosed = true;
            initDashboardModel();
            appUtils.showLoading();
            //get time range
            var _start = $('#dashboardRange').data('daterangepicker').startDate._d;
            var _end = $('#dashboardRange').data('daterangepicker').endDate._d;

            $scope.timestampDStart = Date.parse(new Date(_start));
            $scope.timestampDEnd = Date.parse(new Date(_end));

            if (search && search.index) {
                getDashboardData();
            } else {
                appSettingService.getSettings().then(function(optionRs) {
                    appSettings = optionRs;
                    search = appSettings.elasticSearch ? appSettings.elasticSearch.application : {};
                    getDashboardData();
                });
            }
        }

        function initDashboardModel() {
            $scope.dashBoardModel = {
                total: 0,
                ocr: {
                    total: 0,
                    amount: 0
                },
                manual: {
                    total: 0,
                    amount: 0
                },
                direct: {
                    total: 0,
                    amount: 0
                },
                offLine: {
                    total: 0,
                    amount: 0
                },
                new: {
                    total: 0,
                    amount: 0
                },
                process: {
                    total: 0,
                    amount: 0
                },
                verified: {
                    total: 0,
                    amount: 0
                },
                approved: {
                    total: 0,
                    amount: 0
                },
                pending: {
                    total: 0,
                    amount: 0
                },
                denied: {
                    total: 0,
                    amount: 0
                },
                error: {
                    total: 0,
                    amount: 0
                },
                cancelled: {
                    total: 0,
                    amount: 0
                },
                required: {
                    total: 0,
                    amount: 0
                }
            };
        }

        function getDashboardData() {
            //Get datetime txt show UI
            var repCode = $scope.user.repCode || $scope.user.username || '';
            memAppService.search({
                size: 10000,
                from: 0,
                timestampStart: $scope.timestampDStart,
                timestampEnd: $scope.timestampDEnd,
                clients: repCode,
                isDashboard: true,
                status: 'All',
                keyword: '',
                sort: true
            }).then(function(res) {
                $scope.dashBoardModel.total = res.totalRecords;
                $scope.dashBoardData = res.items || [];
                detachDashboarData(res.items);
            }).then(function() {
                memRegionService.getAll().then(function(regionGroups) {
                    _.each(regionGroups, function(regionGroup, stateCode) {
                        regionGroups[stateCode] = DataUtils.toAFArray(regionGroup);
                    });
                    editEmployeeVm.regionGroups = regionGroups;
                });
            });
        }

        function detachDashboarData(items) {
            var list = angular.copy(items);
            //group item by method
            var groupItems = _.groupBy(list, 'method');
            //caculate data by status		
            _.forEach(groupItems, function(value, key) {
                if (parseInt(key) === 2 || parseInt(key) === 1) {
                    //OCR method
                    $scope.dashBoardModel.ocr.total += value.length;
                    $scope.dashBoardModel.ocr.amount += _caculateTotalAmountRevenue(value);
                } else if (parseInt(key) === 0 || parseInt(key) === 3) {
                    //Manual method
                    $scope.dashBoardModel.manual.total += value.length;
                    $scope.dashBoardModel.manual.amount += _caculateTotalAmountRevenue(value);
                }

            });

            //group item by offline
            groupItems = _.groupBy(list, 'isOffline');
            //caculate data by status
            _.forEach(groupItems, function(value, key) {
                if (key === true || key === 'true') {
                    $scope.dashBoardModel.offLine = {
                        total: value.length,
                        amount: _caculateTotalAmountRevenue(value)
                    }; //OffLine Application
                } else {
                    //Direct Application
                    $scope.dashBoardModel.direct.total += value.length;
                    $scope.dashBoardModel.direct.amount += _caculateTotalAmountRevenue(value);
                }

            });

            //group item by status
            groupItems = _.groupBy(list, 'status');
            //caculate data by status
            _.forEach(groupItems, function(value, key) {
                if (parseInt(key) === 0) {
                    $scope.dashBoardModel.new = {
                        total: value.length,
                        amount: _caculateTotalAmountRevenue(value)
                    }; //New Application
                } else if (parseInt(key) === 1) {
                    $scope.dashBoardModel.process = {
                        total: value.length,
                        amount: _caculateTotalAmountRevenue(value)
                    }; //Processing Application
                } else if (parseInt(key) === 2) {
                    $scope.dashBoardModel.verified = {
                        total: value.length,
                        amount: _caculateTotalAmountRevenue(value)
                    }; //Verified Application
                } else if (parseInt(key) === 3) {
                    $scope.dashBoardModel.pending = {
                        total: value.length,
                        amount: _caculateTotalAmountRevenue(value)
                    }; //Pending Application
                } else if (parseInt(key) === 4) {
                    $scope.dashBoardModel.approved = {
                        total: value.length,
                        amount: _caculateTotalAmountRevenue(value)
                    }; //Approved Application
                } else if (parseInt(key) === 5) {
                    $scope.dashBoardModel.denied = {
                        total: value.length,
                        amount: _caculateTotalAmountRevenue(value)
                    }; //Denied Application
                } else if (parseInt(key) === 6) {
                    $scope.dashBoardModel.cancelled = {
                        total: value.length,
                        amount: _caculateTotalAmountRevenue(value)
                    }; //Cancelled Application
                } else if (parseInt(key) === 7) {
                    $scope.dashBoardModel.error = {
                        total: value.length,
                        amount: _caculateTotalAmountRevenue(value)
                    }; //Error Application
                } else if (parseInt(key) === 8) {
                    $scope.dashBoardModel.required = {
                        total: value.length,
                        amount: _caculateTotalAmountRevenue(value)
                    }; //Billing Required Application
                }
            });

            appUtils.hideLoading();
        }

        function loadEmployeeHistory() {
            $scope.$broadcast('$loadEmployeeHistory');
        }

        function loadEmployeeLicense() {
            $scope.$broadcast('$loadEmployeeLicense');
        }

        function _caculateTotalAmountRevenue(items) {
            var total = 0;
            _.forEach(items, function(value, key) {
                if (value && value.total) {
                    var itemTotal = parseFloat(value.total);
                    if (!isNaN(itemTotal)) {
                        total = total + itemTotal;
                    }
                }
            });

            var n = parseFloat(total);
            total = Math.round(n * 1000) / 1000;
            return total;
        }

        function getRegion(state, region) {
            var planType = _.find(editEmployeeVm.regionGroups[state], { id: region + '' });
            return planType && planType.guid || '';
        }
        //==================================================================================================================================================================

        //Private Functions
        // function checkRepCodeExists(form) {
        // 	/* jshint ignore:start */
        // 	var deferred = $q.defer();
        // 	var req = employeeService.checkUniqueRepcode($scope.repCode);
        // 	req.then(function (res) {
        // 		appUtils.hideLoading();
        // 		if (res.data !== null && res.data.length >= 1) {
        // 			if (userRepCode != $scope.repCode) {
        // 				form.representativeCode.$setValidity('server', false);
        // 				$scope.e_msges['representativeCode'] = "Representative already exists. Please enter another.";
        // 				deferred.resolve({ result: true });
        // 				return deferred.promise;
        // 			}
        // 		}//Phone exists.
        // 		deferred.resolve({ result: false });
        // 		return deferred.promise;
        // 	}, function (res) {
        // 		// show not found error
        // 		form.representativeCode.$setValidity('server', false);
        // 		$scope.e_msges['representativeCode'] = "Representative already exists. Please enter another.";
        // 		deferred.resolve({ result: true });
        // 	});
        // 	/* jshint ignore:end */
        // 	return deferred.promise;
        // }

        // $scope.EnalbleRepCodeForm = function (form) {
        // 	form.representativeCode.$setValidity('server', true);
        // 	$scope.e_msges['representativeCode'] = "";
        // };

        // function removeOutRoles(index, item) {
        // 	dialogService.confirm('Are you sure you want to remove ' + item.name + ' role from the User ?').then(function () {
        // 		appUtils.showLoading();
        // 		delete $scope.user.acl.roles[item.id];
        // 		$scope.userRoles.splice(index, 1);
        // 		$scope.user.managers = [];
        // 		employeeService.saveUserRole($scope.user).then(function (rs) {
        // 			appUtils.hideLoading();
        // 			if (!rs.result) {
        // 				toaster.error("Error", "Remove has error, please try again later!");
        // 			}
        // 			departmentSevice.remove($scope.user.alias);
        // 			departmentSevice.removeByAlias($scope.user.alias);
        // 			employeeService.removeManager(searchSetting.index, searchSetting.type, $scope.user.alias);
        // 			loadManager($scope.user, $scope.roles);
        // 			if (currentUser.$id === $scope.user.$id) {
        // 				$rootScope.storage.currentUser = currentUser = $scope.user;
        // 			}
        // 			toaster.success("Success", "Remove success.");
        // 		});
        // 	});
        // }

        // function onSelectManager(selected) {
        // 	$scope.user.managers = [];
        // 	if (selected) {
        // 		$scope.user.managers.push(selected);
        // 		return employeeService.getUserByAlias(selected).then(function (manager) {
        // 			if (manager && manager.managers && manager.managers.length > 0) {
        // 				$scope.user.managers = $scope.user.managers.concat(manager.managers);
        // 			}
        // 		});
        // 	}
        // }
    }

})();