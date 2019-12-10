(function () {
    'use strict';

    angular
        .module('app.auth')
        .controller("LoginCtrl", LoginCtrl)
        .controller("ForgotPasswordCtrl", ForgotPasswordCtrl);

    /** @ngInject */
    function LoginCtrl($rootScope, $scope, $state, $q, $timeout, $sce, dialogService, firebaseDataRef, authService, appUtils, APP_CONFIG, md5, $http, DataUtils, appSettingService, employeeLogService) {
        $rootScope.settings.layout.showSmartphone = false;
        $rootScope.settings.layout.showPageHead = false;
        $rootScope.settings.layout.showSideBar = false;
        $rootScope.settings.layout.showHeader = false;
        $rootScope.settings.layout.showSmartphone = false;
        $rootScope.settings.layout.showFooter = false;

        var loginVm = this;
        if (!loginVm.currentAuth) {
            $state.go('login');
        }

        $scope.buildVersion = APP_CONFIG.buildVersion;
        $scope.sidebarMenus = [];
        $scope.errMessage = '';
        $scope.loading = false;
        //
        loginVm.emailRegx = /^[^!'"\/ ]+$/;
        loginVm.showInvalid = false;
        loginVm.userName = '';
        loginVm.password = '';

        //Functions
        loginVm.login = login;
        loginVm.openResetPassPopup = openResetPassPopup;

        //Load Data
        getForgotPasswordUrl();
        //==============================================

        function login(form) {
            $scope.showError = false;
            loginVm.showInvalid = true;
            if (form.$invalid) {
                return;
            }
            //Delete cache of current user
            delete $rootScope.storage.currentUser;
            $scope.loading = true;
            if (!APP_CONFIG.externalLogin) {
                firebaseAuth(loginVm);
            } else {
                appUtils.showLoading();
                authService.externalLogin(loginVm).then(function (resLogin) {
                    console.log('sucess login---');
                    //console.log(resLogin);
                    // //write log call TLS API
                    // var eventLog = {
                    //     request: {
                    //         userName: loginVm.userName,
                    //         passWord: '***********'
                    //     },
                    //     response: {
                    //         success: resLogin.data && resLogin.data.success ? resLogin.data.success : '',
                    //         code: resLogin.data && resLogin.data.code ? resLogin.data.code : '',
                    //         message: resLogin.data && resLogin.data.message ? resLogin.data.message : '',
                    //         empolyeeToken: resLogin.data && resLogin.data.employee_login_token ? resLogin.data.employee_login_token : ''
                    //     }
                    // };
                    // var logName = loginVm.userName.replace(/[^a-zA-Z0-9]/g,'_');

                    // var userN = loginVm.userName.split('@');
                    // if(userN.length >= 2){
                    //     logName = userN[0].replace(/[&\/\\#,+()$~%.'":*?<>{}_]/g,'-');
                    // }
                    // appEventLogService.create(eventLog, 'Web_ExternalLogin', logName);
                    //end write log
                    if (resLogin.data.success) {
                        authService.getExternalUserProfile(loginVm.userName, loginVm.password, resLogin.data.employee_login_token).then(function (profile) {
                            //console.log(profile);
                            //write log call TLS API
                            // eventLog = {
                            //     request: {
                            //         userName: loginVm.userName,
                            //         passWord: '***********',
                            //         employee: resLogin.data && resLogin.data.employee_login_token ? resLogin.data.employee_login_token : ''
                            //     },
                            //     response: {
                            //         success: profile.data && profile.data.success ? profile.data.success : '',
                            //         code: profile.data && profile.data.code ? profile.data.code : '',
                            //         message: profile.data && profile.data.message ? profile.data.message : '',
                            //         email: profile.data && profile.data.email ? profile.data.email : '',
                            //         externalId: profile.data && profile.data.employeeId ? profile.data.employeeId : '',
                            //     }
                            // };
                            // appEventLogService.create(eventLog, 'Web_GetExternalUserProfile', logName);

                            //end write log
                            if (profile.data.success) {
                                //Check external user existed in firebase
                                authService.checkUserIsExisted(profile.data.employeeId, profile.data.email).then(function (res) {
                                    var user = {};
                                    user.email = profile.data.email;
                                    user.password = md5.createHash(profile.data.employeeId || '');
                                    if (!profile.data.username) {
                                        $scope.loading = false;
                                        appUtils.hideLoading();
                                        $scope.errMessage = 'Your UserName is empty. Please contact admin.';
                                        $scope.showError = true;
                                        return;
                                    }
                                    if (!res) {
                                        // external user not exists in firebase.
                                        authService.createUserWithEmail(user).then(function (auth) {
                                            if (auth.result) {
                                                profile.data.photoURL = appUtils.getBlankImgProfile();
                                                authService.createFBUser(auth.uid, profile.data, user).then(function () {
                                                    //authService.indexUser(auth.uid, $rootScope.storage.appSettings.elasticSearch.users);
                                                });
                                                authService.createMemShipEmployee(profile.data.employeeId, user.email);
                                                firebaseAuth({ userName: user.email, password: user.password }, profile.data, profile.data.username /*loginVm.userName*/)
                                                    // update firebase aliase
                                                    .then(function (res) {
                                                        if (!res) {
                                                            return;
                                                        }
                                                        return appSettingService.getIndexAlias().then(function (index) {
                                                            return firebaseDataRef.child('users/' + auth.uid).update({ alias: 'REP_' + index }).then(function () {
                                                                appSettingService.updateIndexAlias((index + 1));
                                                            });
                                                        });
                                                    });
                                            } else {
                                                firebaseAuth({ userName: user.email, password: user.password }, profile.data, profile.data.username /*loginVm.userName*/, true);
                                            }
                                        }, function () {
                                            $scope.loading = false;
                                            appUtils.hideLoading();
                                            //$scope.errMessage = 'User ' + user.email + ' has been existed. Please contact with MCM Admin';
                                            $scope.errMessage = "Unable to log in user, please contact your administrator";
                                            $scope.showError = true;
                                        });
                                    } else {
                                        // external user exists in firebase.
                                        firebaseAuth({ userName: user.email, password: user.password }, profile.data, profile.data.username /*loginVm.userName*/);
                                    }
                                });
                            } else {
                                //Get External Profile False
                                $scope.loading = false;
                                appUtils.hideLoading();
                                $scope.errMessage = profile.data.message;
                                $scope.showError = true;
                            }
                        }, function () {
                            $scope.loading = false;
                            appUtils.hideLoading();
                            $scope.errMessage = 'Can\'t get user profile!';
                            $scope.showError = true;
                        });
                    } else {
                        //Login External False
                        $scope.loading = false;
                        appUtils.hideLoading();
                        $scope.errMessage = resLogin.data.message;
                        $scope.showError = true;
                    }
                });
            }
        }

        function openResetPassPopup() {
            window.open($scope.forgoPassUrl, '_blank');
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
                // url: $sce.trustAsResourceUrl(apiUrl),
                url: apiUrl,
                data: $.param(apiAuthData),
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                logParams: {
                    name: 'Web_GetToken',
                    user: apiUserName
                }
            }).then(function (result) {
                $rootScope.storage.currentUser.tlsApiToken = result.data.token;
            }).catch(function (err) {
                $rootScope.storage.currentUser.tlsApiToken = '';
            });
        }

        function firebaseAuth(loginVm, userProfile, userNam, reEmpId) {
            //Employee Log 
            var employeeLog = {
                action: appUtils.logEmployeeAction.login.value
            };
            var logUid = null;
            return authService.login(loginVm).then(function (result) {
                appUtils.hideLoading();
                if (result) {
                    logUid = result.uid;
                    if (reEmpId) {
                        authService.createMemShipEmployee(userProfile.employeeId, userProfile.email);
                    }
                    //Employee Log for update profile
                    var employeeLogUpdateProfile = {
                        action: appUtils.logEmployeeAction.updateProfile.value,
                        updateBy: result.email
                    };

                    authService.updateProfile(result.uid, userProfile).then(function (uRs) {
                        employeeLogUpdateProfile.diffValue = uRs.diffValue || {};
                        employeeLogUpdateProfile.status = uRs && uRs.result ? 'Success' : 'Failed';
                        employeeLogUpdateProfile.message = uRs && uRs.message;
                        authService.getUserInfo(result.uid).then(function (user) {
                            //update department alias
                            updateDepartmentAlias(user, result.uid);
                            var loginSucces = false,
                                loginReq = [];
                            if (user && user.isDeleted === true) {
                                $timeout(function () {
                                    $scope.$apply(function () {
                                        $scope.loading = false;
                                        $scope.showError = true;
                                        $scope.errMessage = employeeLog.message = "The user may have been deleted.";
                                    });
                                }, 100);
                                employeeLog.status = 'Failed';
                                loginReq.push(authService.deleteAuthUser(result.uid, user.externalId));
                            } else if (user && (user.isAuthorized && user.isAuthorized === true)) {
                                if (!user.acl) {
                                    $timeout(function () {
                                        $scope.$apply(function () {
                                            $scope.showError = true;
                                            $scope.loading = false;
                                            $scope.errMessage = employeeLog.message = "There are no permissions to access!";
                                        });
                                    }, 100);
                                    employeeLog.status = 'Failed';
                                    loginReq.push(authService.logout());
                                } else {
                                    user.$id = result.uid;
                                    user.externalAcc = true;
                                    //user.username = userName || loginVm.userName.split('@')[0].replace(/[&\/\\#,+()$~%.'":*?<>{}_]/g,'-');
                                    //
                                    delete $rootScope.storage.currentUser;
                                    $rootScope.storage.currentUser = user;
                                    //
                                    loginSucces = true;
                                    employeeLog.status = 'Success';
                                }
                            } else if (user && !user.isAuthorized) {
                                $timeout(function () {
                                    $scope.$apply(function () {
                                        $scope.loading = false;
                                        $scope.showError = true;
                                        $scope.errMessage = employeeLog.message = "The user may have been unactive.";
                                    });
                                }, 100);
                                employeeLog.status = 'Failed';
                                loginReq.push(authService.logout());
                            } else if (!user) {
                                var reCreate = authService.createFBUser(result.uid, userProfile, { email: loginVm.userName });
                                reCreate = reCreate.then(function (res) {
                                    //authService.indexUser(result.uid, $rootScope.storage.appSettings.elasticSearch.users);
                                    return res;
                                });
                                var reCreateReq = reCreate.then(function () {
                                    return authService.getUserInfo(result.uid).then(function (newUser) {
                                        appUtils.hideLoading();
                                        if (newUser) {
                                            newUser.$id = logUid = result.uid;
                                            newUser.externalAcc = true;
                                            //newUser.username = loginVm.userName;
                                            delete $rootScope.storage.currentUser;
                                            $rootScope.storage.currentUser = newUser;
                                            //
                                            loginSucces = true;
                                            employeeLog.status = 'Success';
                                        } else {
                                            $timeout(function () {
                                                $scope.$apply(function () {
                                                    $scope.showError = true;
                                                    $scope.loading = false;
                                                    $scope.errMessage = employeeLog.message = "Invalid user name/password";
                                                });
                                            }, 100);
                                            employeeLog.status = 'Failed';
                                            loginReq.push(authService.logout());
                                        }
                                    });
                                });

                                loginReq.push(reCreateReq);
                            }

                            return $q.all(loginReq).then(function () {
                                //call create employee log
                                employeeLogService.create(logUid, employeeLog).then(function () {
                                    employeeLog = null;
                                    employeeLogService.create(logUid, employeeLogUpdateProfile);
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
                                        //call index for create/update
                                        authService.indexUser(result.uid, $rootScope.storage.appSettings.elasticSearch.users);
                                        var userInfo = $rootScope.storage.currentUser,
                                            isAdmin = appUtils.checkSpecifyRole(userInfo, 'admin'),
                                            myDashboard = $rootScope.can('access', 'MyDashboard');
                                        //console.log(userInfo);
                                        //Check direct manager of current user
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
                                        //console.log(userInfo.workingStates);
                                        var hasWorkingState = userInfo.workingStates && Object.keys(userInfo.workingStates).length > 0;

                                        //prompt to user update their profile
                                        if ((!hasManager || !hasWorkingState) && !isAdmin) {
                                            let type = !hasManager && !hasWorkingState ? 'Manager, Working States' : (!hasManager && hasWorkingState ? 'Manager' : (hasManager && !hasWorkingState ? 'Working State' : '')),
                                                msg = `Your ${type} is empty, please update your profile!`;
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
                                            dialogService.alert('Your address information is empty, please update your profile!').then(function () {
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
                return result;
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

        function updateDepartmentAlias(add, uid) {
            var name = [],
                alias = angular.copy(add.alias),
                fName = _.trim(add.firstName),
                lName = _.trim(add.lastName),
                repCode = _.trim(add.repCode || add.username || '');

            if (fName) {
                name.push(fName);
            }
            if (lName) {
                name.push(lName);
            }
            if (repCode) {
                name.push('(' + repCode + ')');
            }

            var department = {
                id: uid,
                name: name.join(' '),
                alias: alias
            };

            return firebaseDataRef.child('department').child(alias).set({
                manager: department
            }).then(function (res) {
                return { result: true, id: alias };
            }).catch(function (error) {
                console.log(error);
                return { result: false, errorMsg: error };
            });
        }

        function getForgotPasswordUrl() {
            authService.getForgotPassUrl().then(function (url) {
                $scope.forgoPassUrl = url;
                $timeout(angular.noop, 200);
            });
        }
    }

    /** @ngInject */
    function ForgotPasswordCtrl($scope, $uibModalInstance, authService, toaster) {
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
            authService.resetPasswordAuth($scope.email).then(function () {
                $uibModalInstance.dismiss('cancel');
                toaster.success("Reset Password Successfully!");
            }, function (error) {
                $scope.showError = true;
                $scope.errMessage = error.message;
            });
        };
    }
})();