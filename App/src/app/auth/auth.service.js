(function() {
    'use strict';
    angular.module('app.auth').factory("authService", authService);
    /** @ngInject **/
    function authService($firebaseAuth, $q, firebaseDataRef, $http, $state, APP_CONFIG, appUtils, $rootScope) {
        var auth = $firebaseAuth(),
            secondAuth;

        var service = {
            auth: auth,
            login: login,
            logout: logout,
            sendWelcomeEmail: sendWelcomeEmail,
            waitForSignIn: waitForSignIn,
            requireSignIn: requireSignIn,
            createUserWithEmail: createUserWithEmail,
            deleteAuthUser: deleteAuthUser,
            changePasswordAuth: changePasswordAuth,
            resetPasswordAuth: resetPasswordAuth,
            getCurrentUser: getCurrentUser,
            checkUserIsExisted: checkUserIsExisted,
            externalLogin: externalLogin,
            getExternalUserProfile: getExternalUserProfile,
            createFBUser: createFBUser,
            createMemShipEmployee: createMemShipEmployee,
            getUserInfo: getUserInfo,
            updateProfile: updateProfile,
            createEmployeeLog: createEmployeeLog,
            updateLastLoginDate: updateLastLoginDate,
            getForgotPassUrl: getForgotPassUrl,
            indexUser: indexUser
        };

        return service;

        function login(user) {
            return auth.$signInWithEmailAndPassword(user.userName, user.password);
        }

        function logout() {
            return auth.$signOut();
        }

        function getCurrentUser() {
            var currentUser = $rootScope.storage.currentUser,
                currentAuth = auth.$getAuth();

            if (currentUser === undefined || currentUser === null) {
                logout();
                $state.go('login');
            } else {
                if (currentAuth && currentAuth.email && currentUser.email && currentAuth.email.toLowerCase() !== currentUser.email.toLowerCase()) {
                    logout();
                    $state.go('login');
                }
            }

            if (currentUser) {
                currentUser.$id = currentUser.uid;
                if (!currentUser.acl) {
                    currentUser.acl = {
                        roles: {}
                    };
                }
            }

            return currentUser;
        }

        function sendWelcomeEmail(email) {
            auth.emails.push({
                emailAddress: email
            });
        }

        function waitForSignIn() {
            return auth.$waitForSignIn();
        }

        function requireSignIn() {
            return auth.$requireSignIn();
        }

        function createUserWithEmail(user) {
            if (!secondAuth) {
                secondAuth = firebase.initializeApp(APP_CONFIG.fbConnection, "secondary");
            }
            return secondAuth.auth().createUserWithEmailAndPassword(user.email, user.password).then(function(result) {
                return $q.when({ result: true, errorMsg: '', errorCode: '', uid: result.uid });
            }).catch(function(error) {
                var errorCode = error.code;
                var errorMessage = error.message;
                return $q.when({ result: false, errorMsg: errorMessage, errorCode: errorCode, uid: '' });
            });
        }

        function deleteAuthUser(uid, exId) {
            var reqs = [];
            reqs.push(firebaseDataRef.child('membership-employee/' + exId).remove());
            reqs.push(firebaseDataRef.child('users/' + uid).remove());
            return $q.all(reqs).then(function(res) {
                firebase.auth().currentUser.delete();
            });
        }

        function changePasswordAuth(newPass) {
            return auth.$updatePassword(newPass);
        }

        function resetPasswordAuth(email) {
            return auth.$sendPasswordResetEmail(email);
        }

        function updateProfile(uid, data) {
            var ts = appUtils.getTimestamp();
            var ref = firebaseDataRef.child('users/' + uid);
            return ref.once('value').then(function(snap) {
                var updateData = {
                    firstName: data.firstname,
                    lastName: data.lastname,
                    repCode: _.trim(data.repCode) || data.username,
                    username: data.username,
                    //primaryPhone: data.phone,
                    externalId: data.employeeId,
                    lastLoginDate: ts,
                    uid: uid
                };

                var user = snap && snap.val();
                if (!_.trim(user && user.email || '') && _.trim(data.email)) {
                    updateData.email = data.email;
                }
                if (user && !user.timestampCreated) {
                    updateData.timestampCreated = ts;
                }
                if (!snap.primaryPhone || snap.primaryPhone === '') {
                    snap.primaryPhone = data.phone;
                }

                //compare change data
                var diffValue = [];
                if (user) {
                    var compare = _.omitBy(updateData, function(value, key) {
                        if (key === 'acl') {
                            var oldRe = Object.keys(user[key].roles),
                                newRe = Object.keys(value.roles);
                            return _.isEqual(newRe, oldRe);
                        }
                        return _.isEqual(value, user[key]);
                    });

                    if (compare) {
                        _.forEach(compare, function(value, key) {
                            if (key !== 'timestampCreated' && key != 'timestampModified' && key != '$id') {
                                var obj = {
                                    field: key,
                                    old: user[key] !== undefined ? user[key] : '',
                                    new: value
                                };

                                if (obj.old || obj.new) {
                                    diffValue.push(obj);
                                }
                            }
                        });
                    }
                }
                //end compare change data
                return ref.update(updateData).then(function() {
                    return { result: true, message: '', diffValue: diffValue || {} };
                }).catch(function(err) {
                    return { result: false, message: err && err.message || 'The user may have been deleted.', diffValue: diffValue || {} };
                });
            });
        }

        function updateLastLoginDate(uid) {
            var ts = appUtils.getTimestamp();
            var ref = firebaseDataRef.child('users/' + uid);
            return ref.update({
                lastLoginDate: ts
            });
        }

        function externalLogin(loginVm) {

            var jsonStr = {
                "Username": loginVm.userName, // pmartella
                "Password": loginVm.password, // 123456
                "employee_login_token": "emp_login_581bc101414ad",
                "source": "CardFlight"
            };
            var data = {
                "request": "TLS_API",
                "data_to_submit": jsonStr,
                "action": "employeeLogin",
                "token": "T3MPC@rdFl1ght666"
            };

            return $http({
                method: 'POST',
                // url: APP_CONFIG.externalUrl,
                url: $rootScope.storage.appSettings.TLSAPIUrl || APP_CONFIG.externalUrl,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                data: $.param(data),
                logParams: {
                    name: 'Web_ExternalLogin',
                    user: loginVm.userName.replace(/[^a-zA-Z0-9]/g, '_'),
                }
            });
        }

        function getExternalUserProfile(username, password, accessToken) {
            var jsonStr = {
                "Username": username,
                "Password": password,
                "employee_login_token": accessToken,
                "source": "CardFlight"
            };
            var data = {
                "request": "TLS_API",
                "data_to_submit": jsonStr,
                "action": "getEmployeeProfile",
                "token": "T3MPC@rdFl1ght666"
            };
            return $http({
                method: 'POST',
                // url: APP_CONFIG.externalUrl,
                url: $rootScope.storage.appSettings.TLSAPIUrl || APP_CONFIG.externalUrl,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                data: $.param(data),
                logParams: {
                    user: username,
                    name: 'Web_GetExternalUserProfile'
                }
            });
        }

        function checkUserIsExisted(employeeId, email) {
            return firebaseDataRef.child('membership-employee/' + employeeId).once("value").then(function(data) {
                var fbEmail = data.val() !== null && data.val().email ? data.val().email : '';
                return fbEmail !== '' && fbEmail === email;
            });
        }

        function createMemShipEmployee(employeeId, email) {
            var memShipRef = firebaseDataRef.child('membership-employee');
            memShipRef.child(employeeId).child('email').set(email);
        }

        function getUserInfo(uid) {
            return firebaseDataRef.child('users/' + uid).once("value").then(function(res) {
                return res.val();
            });
        }

        function createFBUser(authId, profile, user) {
            var ts = appUtils.getTimestamp();
            var userRef = firebaseDataRef.child('users');
            user = {
                displayName: profile.firstname + ' ' + profile.lastname,
                firstName: profile.firstname,
                lastName: profile.lastname,
                address: '',
                city: '',
                alias: 'REP_auto' + profile.employeeId,
                state: 'TX',
                zipCode: '',
                email: user.email,
                primaryPhone: profile.phone,
                acl: {
                    roles: {
                        '-KTqlt0WbRBekRyP6pYN': true
                    }
                },
                managerId: '',
                photoURL: '',
                isAuthorized: true,
                isActive: true,
                externalId: profile.employeeId,
                repCode: profile.repCode && _.trim(profile.repCode) !== '' ? profile.repCode : profile.username,
                isDeleted: false,
                username: profile.username || '',
                lastLoginDate: ts,
                uid: authId,
                timestampCreated: ts
            };
            var p = userRef.child(authId).set(user);
            // start add index
            // p.then(function(res){
            // 	var setting = $rootScope.storage.appSettings.elasticSearch.users;
            // 	return searchService.index(authId,setting);
            // });

            // end add index
            return p;
        }

        function indexUser(uid, eSettings) {
            if (!uid) {
                return $q.when({ result: false, errorMsg: 'Index user has error. uid is empty.' });
            }
            var path = 'es-index-queue',
                subPath = eSettings.type;

            var indexObj = {
                timestampModified: +new Date(),
                id: uid
            };
            var ref = firebaseDataRef.child(path).child(subPath).child(uid);
            return ref.update(indexObj).then(function(result) {
                return { result: true };
            }).catch(function(error) {
                return { result: false, errorMsg: error };
            });
        }

        function createEmployeeLog(uid, add) {
            var ts = appUtils.getTimestamp(),
                ref = firebaseDataRef.child('employee-logs' + '/' + uid + '/' + ts);

            return appUtils.getDeviceInfo().then(function(rs) {
                add.deviceInfo = {
                    os: rs.os || '',
                    appVersion: rs.appVersion || '',
                    buildVersion: rs.buildVersion || '',
                    geoCode: rs.geoCode || '',
                    osVersion: rs.browser_version || '',
                    deviceName: rs.browser
                };

                return ref.update(add).then(function(result) {
                    return { result: true };
                }).catch(function(error) {
                    return { result: false, errorMsg: error };
                });
            });
        }

        function getForgotPassUrl() {
            var settingRef = firebaseDataRef.child('app-options/forgotPasswordUrl'),
                defaultUrl = 'https://ap.texaslawshield.com/portal_login.php';
            return settingRef.once("value").then(function(snapshot) {
                if (snapshot && snapshot.val()) {
                    return snapshot.val() || defaultUrl;
                }
                return defaultUrl;
            });
        }
    }
})();