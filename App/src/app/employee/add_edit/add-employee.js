(function() {
    'use strict';

    angular.module("app.employee")
        .controller("AddEmployeeCtrl", AddEmployeeCtrl);
    /** @ngInject **/
    function AddEmployeeCtrl($rootScope, $scope, $state, $timeout, dialogService, employeeService, authService, roleService, memStateService, memTerritoryService, appUtils, toaster, appSettingService, departmentSevice) {
        var appSettings = $rootScope.storage && $rootScope.storage.appSettings || null,
            specifyRoles = appSettings && appSettings.specifyPermissionsRoles || null,
            defaultRole = specifyRoles.rep || '-KTqlt0WbRBekRyP6pYN';

        var currentUser = authService.getCurrentUser();
        var aliasIndex = null;
        var addEmployeeVm = this;
        addEmployeeVm.selectedManager = [];
        $scope.userPermission = $rootScope.storage.statePermission;
        $scope.userPermission.isAdmin = appUtils.checkSpecifyRole(currentUser, 'admin');
        $scope.userPermission.isRep = appUtils.checkSpecifyRole(currentUser, 'rep');

        $scope.showInvalid = false;
        $scope.zipcodeRegx = /(^\d{5}$)|(^\d{5}-\d{4}$)/;
        $scope.emailRegx = /^[^!'"\/ ]+$/;
        $scope.passwordRegx = /^(?=.*[0-9]+.*)(?=.*[a-zA-Z]+.*)[0-9a-zA-Z]{6,12}$/;
        $scope.nameRegx = /^(a-z|A-Z|0-9)*[^!#$%^&*()'"\/\\;:@=+,?\[\]\/]*$/;
        $scope.addressRegx = /^(a-z|A-Z|0-9)*[^!$%^&*()'"\/\\;:@=+,?\[\]]*$/;
        $scope.states = [];
        $scope.welcomeEmail = false;
        $scope.states = appUtils.getAllState();
        $scope.regions = [];
        $scope.territories = [];
        $scope.user = {
            displayName: '',
            firstName: '',
            lastName: '',
            address: '',
            city: '',
            state: '',
            zipCode: '',
            email: '',
            primaryPhone: '',
            password: '',
            userRoles: '',
            photoURL: '',
            repCode: '',
            managers: [],
            alias: '',
            acl: {
                roles: {

                }
            },
            territories: [],
            regional: ''
        };

        $scope.user.acl.roles[defaultRole] = true;
        //$scope.onSelectManager = onSelectManager;

        $scope.select2Cri = {
            keyword: '',
            size: 25,
            from: 0,
            isAuthorized: true,
            role: null
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

        $scope.select2OptionsRegional = {
            AllowClear: true,
        };

        $scope.select2OptionsTerritory = {
            AllowClear: true
        };

        angular.element(document).ready(function() {
            appUtils.clearSelection();
            $timeout(function() {
                $('#ChooseManager').on('select2:select', function(e) {
                    var isNew = e.params.data.id === e.params.data.text;
                    if (isNew) {
                        $timeout(function() {
                            $scope.$apply(function() {
                                addEmployeeVm.selectedManager = [];
                            });
                        }, 200);
                        $('#ChooseManager').find('[data-select2-tag="true"]').remove();
                    }
                });
            }, 400);
            $scope.focusMe = angular.noop;

        });

        loadManager();
        // loadAllRegion();
        // loadAllTerritory();
        //loadAllAdmin();

        function loadManager() {
            return roleService.itemsObj().then(function(roles) {
                $scope.roles = roles;
                var role = roles && roles[defaultRole];
                return appSettingService.getIndexAlias().then(function(index) {
                    aliasIndex = index;
                    $scope.user.alias = role.prefix + '_' + aliasIndex;
                    var managerRole = role && role.managerRole || null;
                    if (managerRole) {
                        $scope.select2Cri.role = managerRole;
                    }
                });
            });
        }

        function loadAllTerritory() {
            return memTerritoryService.getAllTerritoryLoadOnce().then(function(data) {
                $scope.territories = data;
                $timeout(angular.noop, 200);
            });
        }

        function loadAllRegion() {
            return memStateService.statesLoadOnce().then(function(data) {
                $scope.regions = data;
                $timeout(angular.noop, 200);
            });
        }

        // function onSelectManager(selected) {
        // 	if (!selected) {
        // 		return;
        // 	}
        // 	$scope.user.managers = [];
        // 	$scope.user.managers.push(selected);
        // 	return employeeService.getUserByAlias(selected).then(function (manager) {
        // 		if (manager && manager.managers && manager.managers.length > 0) {
        // 			$scope.user.managers = $scope.user.managers.concat(manager.managers);
        // 		}
        // 	});
        // }

        //Functions
        $scope.create = function(form) {
            appUtils.showLoading();
            $scope.showInvalid = true;
            if (form.$invalid) {
                appUtils.hideLoading();
                return;
            }

            // check password
            var pvalid = $scope.passwordRegx.test($scope.user.password);
            if (!pvalid) {
                appUtils.hideLoading();
                dialogService.alert('Password must be 6-12 characters long and include at least one letter and one number. Passwords are case sensitive.');
                return;
            }

            if ($scope.user.displayName === '') {
                $scope.user.displayName = $scope.user.firstName + ' ' + $scope.user.lastName;
            }

            var onSuccess = function(res) {
                if (!res || !res.result) {
                    appUtils.hideLoading();
                    dialogService.alert(res.errorMsg);
                    return;
                }
                $scope.user.managers = [];
                //Add more info of user in firebase
                var selectedManager = $('#ChooseManager').select2('data'),
                    myManager = selectedManager && selectedManager[0];
                return employeeService.getUser(myManager && myManager.id || '').then(function(manager) {
                    if (manager) {
                        if (manager.managers && manager.managers.length > 0) {
                            $scope.user.managers = manager.managers;
                        }
                        if (manager.alias) {
                            $scope.user.managers.unshift(manager.alias);
                        }
                    }

                    //Custom logics when save user
                    //1. Handle default case for working state base on address state
                    let addrState = angular.copy($scope.user.state);
                    if ((!$scope.user.workingStates || angular.equals($scope.user.workingStates, {})) &&
                        (addrState && !angular.equals(addrState, ''))) {
                        //console.log(addrState);
                        $scope.user.workingStates = {};
                        $scope.user.workingStates[addrState] = true;
                    }
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

                    return employeeService.createUser($scope.user, res.uid).then(function(res) {
                        if (!res.result) {
                            dialogService.alert(res.errorMsg);
                            return;
                        }
                        //update alias index
                        if (aliasIndex) {
                            appSettingService.updateIndexAlias((aliasIndex + 1));
                        }

                        // create department
                        var user = angular.copy($scope.user);
                        user.$id = res.userKey;

                        departmentSevice.create(user);

                        toaster.pop('success', 'Success', "Account Created.");
                        appUtils.hideLoading();
                        //create succces go to edit view
                        $rootScope.reProcessSideBar = true;
                        $state.go('employee.edit', { id: res.userKey });
                    }, function(res) {
                        dialogService.alert(res.errorMsg);
                        appUtils.hideLoading();
                        return;
                    });
                });

            }; //on Success

            var onFail = function(res) {
                dialogService.alert(res.errorMsg);
                appUtils.hideLoading();
                return;
            };

            //check phone number exists
            var isPhoneExistReq = employeeService.checkPhoneExist($scope.user.primaryPhone).then(function(res) {
                if (res.data !== null && res.data.length >= 1) {
                    dialogService.alert("Phone number already exists. Please enter another.");
                    appUtils.hideLoading();
                    return true;
                } //Phone exists.
                return false;

            }, onFail);

            //check RepCode exists
            // var isCheckRepCodeExistReq = employeeService.checkUniqueRepcode($scope.user.repCode).then(function(res){
            // 	if(res.data !== null && res.data.length >= 1) {
            // 		dialogService.alert("Representative Code already exists. Please enter another.");
            // 		appUtils.hideLoading();
            // 	   	return true;			
            // 	 }//RepCode Exist.
            // 	 return false;
            // }, onFail);

            employeeService.checkUserIsDeleted($scope.user.email).then(function(res) {
                if (res === null) {
                    //Check Phone Number Exist.
                    isPhoneExistReq.then(function(res) {
                        if (res) {
                            return;
                        }
                        // //Check RepCode Exist
                        // isCheckRepCodeExistReq.then(function(){
                        // 	if(res){	
                        // 		return;
                        // 	}
                        // 	//Create auth user in firebase
                        // 	authService.createUserWithEmail($scope.user).then(onSuccess, onFail);
                        // });

                        //Create auth user in firebase
                        authService.createUserWithEmail($scope.user).then(onSuccess, onFail);
                    });
                } else {
                    appUtils.hideLoading();
                    dialogService.confirm('The user has been archived. Do you want to restore that user now ?').then(function() {
                        employeeService.restoreUser(res.$id).then(function(resRestore) {
                            if (resRestore.result) {
                                $state.go('employee.edit', { id: res.$id });
                            }
                        });
                    });
                }
            });
        };

        $scope.cancel = function(form) {
            $state.go('employee.list');
        };

        $scope.generatePassword = function() {
            $scope.user.password = appUtils.generatePassword();
        };

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

        // function loadAllAdmin() {
        // 	var query = employeeService.searchQuery(searchSetting.index, searchSetting.type, '', 1000, 0, 'timestampCreated', specifyRoles.admin);
        // 	return searchService.search(query, 'users').then(function (rs) {
        // 		$scope.admins = rs && rs.items || [];
        // 		$scope.adminsAlias = _.filter(_.map($scope.admins, function (ad) {
        // 			return ad.alias || null;
        // 		}), function (alias) {
        // 			return alias !== null;
        // 		});
        // 		$timeout(angular.noop, 200);
        // 	});
        // }
    }
})();