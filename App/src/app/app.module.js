(function () {
    'use strict';
    /*-------------- APP CONSTANTS ---------------------- */
    var settings = {
        layout: {
            pageSidebarClosed: false, // sidebar menu state
            pageContentWhite: true, // set page content layout
            pageBodySolid: false, // solid body color state
            pageAutoScrollOnLoad: 1000, // auto scroll to top on page load
            showPageHead: true,
            showSideBar: true,
            showHeader: true,
            showSmartphone: true
        },
        assetsPath: '../assets',
        globalPath: '../assets/global',
        layoutPath: '.'
    };
    /*-------------- END APP CONSTANTS ---------------------- */

    var app = angular
        .module('app', [
            /*
             * Angular modules
             */
            'app.config',
            'ngMaterial',
            'ngAnimate',
            'ngRoute',
            'long2know',
            'ngSanitize',
            'toaster',
            'ngBootbox',
            'ngTagsInput',
            'ngStorage',
            'dropzone',
            'googleAutocomplete',
            'angular-md5',
            'summernote',
            'elasticsearch',
            'ng-currency',
            'angularjs-autocomplete',
            'thatisuday.dropzone',
            /*
             *	3rd modules
             */
            'ui.router',
            'ui.mask',
            'ui.bootstrap',
            'ui.sortable',
            'ui.tree',
            'ui.select2',
            'oc.lazyLoad',
            'highcharts-ng',
            'ng.deviceDetector',
            'creditCardInput',
            'firebase',
            'benharold.haversine',
            'app.dRemote',
            'app.options',
            'app.utils',
            'app.auth',
            'app.core',
            'app.home',
            'app.layout',
            'app.media',
            'app.permission',
            'app.role',
            'app.search',
            'app.eventlogs',
            'app.employeeLog',
            'app.tlsApiDataCache',
            'app.settings',
            'app.notification',
            'app.dialog',
            'app.interceptor',
            'mwl.calendar',
            'ui.bootstrap',
            'ngMap'
        ])
        .config(config)
        .run(run)
        .controller('AppCtrl', AppCtrl);

    $(document).ready(function () {
        // setTimeout(function(){
        bootstrapApplication();
        // },1000);
    });

    /////////////////////////////////////////////////////////////
    /** @ngInject */
    function config($locationProvider, APP_CONFIG, $mdThemingProvider, $urlRouterProvider) {
        // $locationProvider.html5Mode(true);
        $locationProvider.hashPrefix('');
        firebase.initializeApp(APP_CONFIG.fbConnection);
        $mdThemingProvider.theme('default')
            .primaryPalette('deep-orange')
            .accentPalette('brown');
        moment.locale('en_gb', {
            week: {
                dow: 1 // Monday is the first day of the week
            }
        });
        // handle dRemote
        $urlRouterProvider.otherwise(function ($injector, $location) {
            var path = $location.url();
            var appUtils = $injector.get('appUtils'),
                loaded = appUtils.DRemoteLoaded;
            if (!loaded) {
                return '/dremote/dremoteholder?link=' + encodeURIComponent(path);
            }
            return '';
        });
    }

    /** @ngInject */
    function run($rootScope, $state, $localStorage) {
        $rootScope.storage = $localStorage;
        if (!$rootScope.storage.settings) {
            $rootScope.storage.settings = settings;
        }
        $rootScope.settings = $rootScope.storage.settings;

        $rootScope.goTo = function (state) {
            $state.go(state);
        };

        $rootScope.$on("$stateChangeError", function (event, toState, toParams, fromState, fromParams, error) {
            if (error === "AUTH_REQUIRED") {
                $state.go('login');
            }
        });

        // $rootScope.$on('$stateChangeStart', function (event, toState, next, current) {
        //     var toModule = toState.data && toState.data.module || null;
        //     var sidebar = $rootScope.rootMenus;
        //     activeSideBar(sidebar, toModule);
        //     //
        //     $rootScope.$watch('rootMenus', function (val) {
        //         if (val) {
        //             activeSideBar(val, toModule);
        //         }
        //     });

        //     function activeSideBar(sidebar, toModule) {
        //         var children = sidebar && sidebar.children;
        //         var fn = function (childs) {
        //             _.forEach(childs, function (item) {
        //                 item.isSelected = false;
        //                 if (item.name === toState.name) {
        //                     item.isSelected = true;
        //                 }

        //                 if (item.data && item.data.module && toModule && item.data.module === toModule && !item.data.parent) {
        //                     item.isSelected = true;
        //                 }

        //                 if (item.children) {
        //                     fn(item.children);
        //                 }
        //             });
        //         };

        //         fn(children);
        //     }



        //     //if(allStatesAvail && allStatesAvail.length > 0){
        //     //   if(toState.data.module !== 'login'){
        //     //      var availableUrl = _.find(allStatesAvail, function(item){
        //     //        return (item.module !== undefined && item.module === stateModule) || (item.subs && item.subs.length > 0 && _.find(item.subs,function(val){
        //     //            return (val.module !== undefined && val.module === stateModule);
        //     //        }) !== undefined);
        //     //      });
        //     //      if(availableUrl === undefined){
        //     //          event.preventDefault();
        //     //          $state.go('pageNotFound');
        //     //      }
        //     //   }
        //     //}
        // });

    }

    /** @ngInject */
    function bootstrapApplication() {
        angular.bootstrap(document, ['app']);
    }

    /** @ngInject */
    function AppCtrl($rootScope, $state, $scope, $location, $timeout, firebaseDataRef, APP_CONFIG, dialogService, authService, $http, employeeLogService, appUtils) {
        var currentUser = $rootScope.storage.currentUser;
        // if (!$rootScope.storage.currentUser) {
        //     $state.go('login');
        // }

        var appSettingRef = firebaseDataRef.child('app-options');
        appSettingRef.on('value', updateStorageAppSetting);

        $scope.$on('$destroy', function () {
            if (appSettingRef) {
                appSettingRef.off('value', updateStorageAppSetting);
            }
        });

        $rootScope.$on('$stateChangeStart', function (event, toState, next, current) {
            if (toState.data && toState.data.module === 'login') {
                return;
            }
            //
            var permission = toState.data && toState.data.permission ? toState.data.permission : '';

            var access = $rootScope.can('access', permission);

            var statePermission = {
                access: access,
                modify: $rootScope.can('modify', permission),
                isAdmin: appUtils.checkSpecifyRole(currentUser, 'admin'),
                isRep: appUtils.checkSpecifyRole(currentUser, 'rep')
            };

            if (next && next.editprofile && next.editprofile === 'true') {
                statePermission.access = statePermission.modify = true;
                $timeout(angular.noop);
            }

            if (!statePermission.access && toState.name !== 'dRemote') {
                let path = $location.path();
                // changeLocation('/#/home', true);
                $location.url("/home");

                setTimeout(() => {
                    // console.log('path',path );
                    if (path != '/home' && path != '/login') {
                        //     console.log('href', path );
                        //     // window.location.href = '/#/home';
                        //     // var landingUrl = "http://" + window.location.host + "/#/home";
                        //     // window.location.href = landingUrl;
                        //     window.location.reload();
                        $state.go('index', {}, { reload: true });
                    }
                }, 1500);
                return;
            }

            $rootScope.storage.statePermission = statePermission;

        });

        var clipboard = new Clipboard('.btn');
        clipboard.on('success', function (e) {
            console.info('Action:', e.action);
            console.info('Text:', e.text);
            console.info('Trigger:', e.trigger);
            // e.clearSelection();
            // toaster.success("Copy success!");
        });

        clipboard.on('error', function (e) {
            console.error('Action:', e.action);
            console.error('Trigger:', e.trigger);
        });

        $rootScope.downloadImage = function (url) {
            var a = document.createElement('a');
            a.href = url;
            a.download = "output.jpg";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        };

        $rootScope.downloadImageWithCustomName = function (url, fileName) {
            appUtils.showLoading();
            var nameArr = fileName.split('.'),
                fullName = nameArr[0],
                i;
            for (i = 1; i < nameArr.length - 1; i++) {
                fullName += '.' + nameArr[i];
            }
            var type = nameArr[nameArr.length - 1];
            var arr = fullName.split('_');
            // if(arr && arr.length >= 2){

            // }else{
            //     appUtils.hideLoading();
            // }
            var downloadName = arr[0];
            for (i = 1; i < arr.length - 1; i++) {
                downloadName += '_' + arr[i];
            }
            downloadName = downloadName + '.' + type;
            return $http.get(url, { responseType: "blob" }).then(function (res) {
                appUtils.hideLoading();
                var file = new File([res.data], downloadName);
                var a = document.createElement('a');
                a.href = window.URL.createObjectURL(file);
                a.download = downloadName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }, function (error, status) {
                appUtils.hideLoading();
                console.log(error);
                console.log(status);
            });
        };

        $rootScope.historyBack = function () {
            window.history.back();
        };

        $rootScope.can = function (action, permission) {
            var user = $rootScope.storage.currentUser;
            if (permission && angular.isString(permission)) {
                var permissions = $rootScope.storage.permissions || null;
                permission = _.find(permissions, function (p, key) {
                    return key && key.trim().toLowerCase() === permission.trim().toLowerCase();
                });
            }

            if (permission === null || permission === undefined) {
                permission = {
                    acl: null
                };
            }


            return appUtils.checkPermission(user, action, permission.acl);
        };

        function updateStorageAppSetting(snapshot) {
            //appSettingRef.once('value').then(function(snapshot){
            if (snapshot && snapshot.val()) {
                var newSetting = snapshot.val();
                $rootScope.storage.appSettings = newSetting;
                checkOutDate(newSetting);
            }
            //});
        }

        function checkOutDate(settings) {
            var buildVersion = settings && settings.webBuildVersion || 0;
            if (buildVersion > APP_CONFIG.buildVersion) {
                if ($state.current.name == "event.confirmation") {
                    // $state.reload();
                } else {
                    dialogService.alert(settings.webUpdateMsg).then(function () {
                        checkStorageUpdate(settings);
                    });
                }

            } else {
                checkStorageUpdate(settings);
            }
        }

        function checkStorageUpdate(settings) {
            var storageBuildVersion = $rootScope.storage.buildVersion || 0;
            var clearStorageUpdateFlag = settings && settings.webClearStorageUpdate || false;
            console.log(storageBuildVersion);
            console.log(APP_CONFIG.buildVersion);
            console.log(clearStorageUpdateFlag);
            console.log('$state', $state);

            if (storageBuildVersion < APP_CONFIG.buildVersion && clearStorageUpdateFlag && $state.current.name != "event.confirmation" && $state.current.name != "dRemote") {
                dialogService.alert(settings.webClearStorageUpdateMsg).then(function () {
                    delete $rootScope.storage.overviewReport;
                    delete $rootScope.storage.revenueReport;
                    delete $rootScope.storage.applicationReport;
                    delete $rootScope.storage.revenuesFacReport;
                    delete $rootScope.storage.revenuesStateReport;
                    delete $rootScope.storage.revenuesRepCodeReport;
                    delete $rootScope.storage.signUpReport;
                    delete $rootScope.storage.lastedReport;

                    var uid = angular.copy($rootScope.storage.currentUser && $rootScope.storage.currentUser.$id);
                    delete $rootScope.storage.currentUser;
                    delete $rootScope.storage.roles;
                    delete $rootScope.storage.permissions;
                    $rootScope.storage.buildVersion = APP_CONFIG.buildVersion;
                    //Employee Log 
                    var employeeLog = {
                        action: appUtils.logEmployeeAction.logout.value,
                        status: 'Success'
                    };
                    if (uid) {
                        employeeLogService.create(uid, employeeLog);
                    }

                    authService.logout();
                    $state.go('login');
                });
            }
        }

    }

    app.config(['$httpProvider', 'APP_CONFIG',
        function ($httpProvider, APP_CONFIG) {
            // if(APP_CONFIG.isDebug === true){
            $httpProvider.interceptors.push('TLSHttpInterceptor');
            // }
        }
    ]);
})();