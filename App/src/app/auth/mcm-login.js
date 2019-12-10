(function () {
    'use strict';

    angular
        .module('app.auth')
        .controller("MCMLoginCtrl", MCMLoginCtrl)
        .controller("MCMForgotPasswordCtrl", MCMForgotPasswordCtrl);

    /** @ngInject */
    function MCMLoginCtrl($rootScope, $scope, $state, $timeout, $uibModal, dialogService, firebaseDataRef, authService, appUtils, APP_CONFIG, $http, $q, DataUtils, employeeLogService) {
        $rootScope.settings.layout.showSmartphone = false;
        $rootScope.settings.layout.showPageHead = false;
        $rootScope.settings.layout.showSideBar = false;
        $rootScope.settings.layout.showHeader = false;
        $rootScope.settings.layout.showSmartphone = false;
        $rootScope.settings.layout.showFooter = false;

        var loginVm = this;
        if (!loginVm.currentAuth) {
            $state.go('mcmlogin');
        }

        $scope.sidebarMenus = [];
        $scope.errMessage = '';
        //
        loginVm.emailRegx = /^[^!'"\/ ]+$/;
        loginVm.showInvalid = false;
        loginVm.userName = '';
        loginVm.password = '';

        //Functions
        loginVm.login = login;
        loginVm.openResetPassPopup = openResetPassPopup;

        //======================================================
        function login(form) {
            $scope.showError = false;
            loginVm.showInvalid = true;
            if (form.$invalid) {
                return;
            }
            appUtils.showLoading();
            //Employee Log 
            var employeeLog = {
                action: appUtils.logEmployeeAction.login.value
            };
            var logUid = null;
            authService.login(loginVm).then(function (result) {
                appUtils.hideLoading();
                if (result) {
                    logUid = result.uid;
                    //update last login Date
                    authService.updateLastLoginDate(result.uid);
                    authService.getUserInfo(result.uid).then(function (user) {
                        var appOptions = firebaseDataRef.child('app-options'),
                            loginSucces = false,
                            loginReq = [];
                        if (user && user.isDeleted) {
                            $timeout(function () {
                                $scope.$apply(function () {
                                    $scope.showError = true;
                                    $scope.errMessage = employeeLog.message = "The user may have been deleted.";
                                });
                            }, 100);
                            employeeLog.status = 'Failed';
                            loginReq.push(authService.deleteAuthUser(result.uid, user.externalId));
                        } else if (user && (user.isAuthorized && user.isAuthorized === true)) {
                            if (!user.acl || user.acl.length <= 0) {
                                $timeout(function () {
                                    $scope.$apply(function () {
                                        appUtils.hideLoading();
                                        $scope.showError = true;
                                        $scope.errMessage = employeeLog.message = "There are no permissions to access!";
                                    });
                                }, 100);
                                employeeLog.status = 'Failed';
                                loginReq.push(authService.logout());
                            } else {
                                user.$id = result.uid;
                                user.externalAcc = false;
                                if (!user.username || $.trim(user.username) === '') {
                                    user.username = user.email.replace(/[^a-zA-Z0-9]/g, '_');
                                }
                                //
                                delete $rootScope.storage.currentUser;
                                $rootScope.storage.currentUser = user;
                                //
                                loginSucces = true;
                                employeeLog.status = 'Success';
                            }
                        } else {
                            $timeout(function () {
                                $scope.$apply(function () {
                                    $scope.showError = true;
                                    $scope.errMessage = employeeLog.message = "Invalid user name/password";
                                });
                            }, 100);
                            employeeLog.status = 'Failed';
                            loginReq.push(authService.logout());
                        }

                        return $q.all(loginReq).then(function () {
                            //call create employee log
                            employeeLogService.create(logUid, employeeLog).then(function () {
                                employeeLog = null;
                            });

                            if (loginSucces) {
                                var appOptions = firebaseDataRef.child('app-options');
                                var sideBarData = firebaseDataRef.child('side-bar-menu-admin');
                                var permissions = firebaseDataRef.child('permissions');
                                var roles = firebaseDataRef.child('roles'),
                                    rolesData = null;
                                var reqOptions = DataUtils.getDataFirebaseLoadOnce(appOptions, true).then(function (settingsData) {
                                    settingsData = DataUtils.stripDollarPrefixedKeys(settingsData);
                                    $rootScope.storage.appSettings = settingsData;
                                    $rootScope.storage.buildVersion = APP_CONFIG.buildVersion;
                                    setTLSApiToken();
                                });

                                var reqSideBar = DataUtils.getDataFirebaseLoadOnce(sideBarData, true).then(function (sideBarData) {
                                    sideBarData = DataUtils.stripDollarPrefixedKeys(sideBarData);
                                    $rootScope.storage.sideBarData = sideBarData;
                                });

                                var reqPermission = DataUtils.getDataFirebaseLoadOnce(permissions, true).then(function (permissions) {
                                    permissions = DataUtils.stripDollarPrefixedKeys(permissions);
                                    $rootScope.storage.permissions = permissions;
                                });
                                var reqRole = roles.once('value').then(function (snap) {
                                    rolesData = snap && snap.val();
                                });
                                //
                                $rootScope.settings.layout.showPageHead = true;
                                $rootScope.settings.layout.showSideBar = true;
                                $rootScope.settings.layout.showHeader = true;
                                $rootScope.settings.layout.showSmartphone = true;
                                //
                                $q.all([reqOptions, reqSideBar, reqPermission, reqRole]).then(function () {
                                    authService.indexUser(result.uid, $rootScope.storage.appSettings.elasticSearch.users);
                                    var userInfo = $rootScope.storage.currentUser,
                                        isAdmin = appUtils.checkSpecifyRole(userInfo, 'admin'),
                                        myDashboard = $rootScope.can('access', 'MyDashboard');
                                    var hasManager = false;
                                    if (userInfo.acl && userInfo.acl.roles) {
                                        var roleIds = Object.keys(userInfo.acl.roles);
                                        if (roleIds && roleIds.length > 0) {
                                            var assigned = [];
                                            _.forEach(roleIds, function (roleId) {
                                                if (rolesData[roleId]) {
                                                    assigned.push(rolesData[roleId]);
                                                }
                                            });
                                            var highestRole = _.minBy(assigned, 'number');
                                            if (highestRole) {
                                                var managerRole = highestRole && highestRole.managerRole || null;
                                                if ((managerRole && userInfo.managers && userInfo.managers.length > 0) || !managerRole) {
                                                    hasManager = true;
                                                }
                                            }
                                        }
                                    }

                                    //Check Working States, Territories
                                    var hasWorkingState = userInfo.workingStates && Object.keys(userInfo.workingStates).length > 0;

                                    if ((!hasManager || !hasWorkingState) && !isAdmin) {
                                        let type = !hasManager && !hasWorkingState ? 'Manager, Working States' : (!hasManager && hasWorkingState ? 'Manager' : (hasManager && !hasWorkingState ? 'Working State' : '')),
                                            msg = `Your ${type} is empty, please update your profile!`;
                                        console.log(msg);
                                        $rootScope.settings.layout.showSideBar = false;
                                        dialogService.alert(msg).then(function () {
                                            $state.go('employee.edit', { id: userInfo.$id, editprofile: true });
                                        }, function () {
                                            if (isAdmin) {
                                                $state.go('dashboard.index');
                                            } else if (myDashboard) {
                                                $state.go('dashboard.employee');
                                            } else {
                                                $state.go('index');
                                            }
                                        });

                                    } else if (userInfo && _.isEmpty(_.trim(userInfo.repCode))) {
                                        $rootScope.settings.layout.showSideBar = false;
                                        dialogService.alert('Your RepCode is empty, please contact with Administrator!').then(function () {
                                            if (isAdmin) {
                                                $state.go('dashboard.index');
                                            } else if (myDashboard) {
                                                $state.go('dashboard.employee');
                                            } else {
                                                $state.go('index');
                                            }
                                        });

                                    } else if (userInfo && (_.isEmpty(_.trim(userInfo.address)) || _.isEmpty(_.trim(userInfo.city)) ||
                                        _.isEmpty(_.trim(userInfo.state)) || _.isEmpty(_.trim(userInfo.zipCode))) && !isAdmin) {
                                        $rootScope.settings.layout.showSideBar = false;
                                        dialogService.alert("Your address information is empty, please update your profile!").then(function () {
                                            $state.go('employee.edit', { id: userInfo.$id, editprofile: true });
                                        }, function () {
                                            if (isAdmin) {
                                                $state.go('dashboard.index');
                                            } else if (myDashboard) {
                                                $state.go('dashboard.employee');
                                            } else {
                                                $state.go('index');
                                            }
                                        });

                                    } else if (userInfo && _.isEmpty(_.trim(userInfo.primaryPhone)) && !isAdmin) {
                                        $rootScope.settings.layout.showSideBar = false;
                                        dialogService.alert("Your primary phone is empty, please update your profile!").then(function () {
                                            $state.go('employee.edit', { id: userInfo.$id, editprofile: true });
                                        }, function () {
                                            if (isAdmin) {
                                                $state.go('dashboard.index');
                                            } else if (myDashboard) {
                                                $state.go('dashboard.employee');
                                            } else {
                                                $state.go('index');
                                            }
                                        });

                                    } else if (userInfo && _.isEmpty(_.trim(userInfo.notificationEmail)) && !isAdmin) {
                                        $rootScope.settings.layout.showSideBar = false;
                                        dialogService.alert("Your notification email is empty, please update your profile!").then(function () {
                                            $state.go('employee.edit', { id: userInfo.$id, editprofile: true });
                                        }, function () {
                                            if (isAdmin) {
                                                $state.go('dashboard.index');
                                            } else if (myDashboard) {
                                                $state.go('dashboard.employee');
                                            } else {
                                                $state.go('index');
                                            }
                                        });

                                    } else {
                                        if (isAdmin) {
                                            $state.go('dashboard.index');
                                        } else if (myDashboard) {
                                            $state.go('dashboard.employee');
                                        } else {
                                            $state.go('index');
                                        }
                                    }
                                });
                            }
                        });
                    });
                } else {
                    $timeout(function () {
                        $scope.$apply(function () {
                            $scope.showError = true;
                            $scope.loading = false;
                            $scope.errMessage = employeeLog.message = "Invalid user name/password";
                        });
                    }, 100);

                    //call create employee log
                    employeeLog.status = 'Failed';
                    employeeLogService.createWithEmail(loginVm.userName, employeeLog).then(function () {
                        employeeLog = null;
                    });
                }
            }).catch(function (error) {
                appUtils.hideLoading();
                $scope.showError = true;
                $scope.loading = false;
                $scope.errMessage = error.message;
                //call create employee log
                employeeLog.status = 'Failed';
                employeeLog.message = error && error.message || "Invalid user name/password";
                employeeLogService.createWithEmail(loginVm.userName, employeeLog).then(function () {
                    employeeLog = null;
                });
            });
        }

        function setTLSApiToken() {
            /* jshint ignore:start */
            var arr = $rootScope.storage.appSettings;
            var apiUserName = arr['TLSAPIUserName'];
            var apiPassword = arr['TLSAPIPassword'];
            var apiKey = arr['TLSAPIKey'];
            var apiSource = arr['TLSAPISource'];
            var apiUrl = arr['TLSAPIUrl'];

            var apiAuthData = {
                "request": "TLS_API_AUTH",
                "data_to_submit[Username]": apiUserName,
                "data_to_submit[Password]": apiPassword,
                "data_to_submit[ApiKey]": apiKey,
                "data_to_submit[source]": apiSource,
                "action": "tlsauth"
            };
            /* jshint ignore:end */
            $http({
                method: 'POST',
                url: apiUrl,
                data: $.param(apiAuthData),
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            }).then(function (result) {
                $rootScope.storage.currentUser.tlsApiToken = result.data.token;
            }).catch(function (err) {
                $rootScope.storage.currentUser.tlsApiToken = '';
            });
        }

        function openResetPassPopup() {
            var modalInstance = $uibModal.open({
                templateUrl: 'app/auth/forgotpasword.tpl.html',
                controller: 'MCMForgotPasswordCtrl',
                size: 'md',
                windowClass: 'model-z-index',
                resolve: {
                    "currentAuth": ["authService", function (authService) {
                        return authService.waitForSignIn();
                    }]
                }
            });
        }
    }
    /** @ngInject */
    function MCMForgotPasswordCtrl($scope, $uibModalInstance, authService, toaster, appUtils, employeeLogService) {
        $scope.email = '';
        $scope.showInvalid = false;
        $scope.errMessage = '';
        $scope.emailRegx = /^[^!'"\/ ]+$/;

        $scope.close = function () {
            $uibModalInstance.dismiss('cancel');
        };

        $scope.resetPassword = function (form) {
            $scope.showInvalid = true;
            $scope.showError = false;
            if (form.$invalid) {
                return;
            }
            //Employee Log 
            var employeeLog = {
                action: appUtils.logEmployeeAction.forgotPassword.value,
                updateBy: $scope.email || ''
            };

            authService.resetPasswordAuth($scope.email).then(function () {
                employeeLog.status = 'Success';
                $uibModalInstance.dismiss('cancel');
                toaster.success("Reset Password Successfully!");
            }, function (error) {
                $scope.showError = true;
                $scope.errMessage = employeeLog.message = error.message;
                employeeLog.status = 'Failed';
            }).then(function () {
                employeeLogService.createWithEmail($scope.email, employeeLog).then(function () {
                    employeeLog = null;
                });
            });
        };
    }

})();