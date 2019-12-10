(function () {
    'use strict';

    angular
        .module('app.layout')
        .service('AppData', AppData)
        .run(run)
        .controller('Shell', Shell)
        .controller('HeaderController', HeaderController)
        .controller('SidebarController', SidebarController)
        .controller('PageHeadController', PageHeadController)
        .controller('QuickSidebarController', QuickSidebarController)
        .controller('FooterController', FooterController);


    /////////////////////////////////////////////////////////////////

    /*
     * share data across application
     */
    /** @ngInject */
    function AppData($timeout) {
        var data = this;
        return data;
    }

    /** @ngInject */
    function run(AppData) {

    }

    /** @ngInject */
    function Shell() {
        var vm = this;
    }
    /** @ngInject */
    function HeaderController($rootScope, $scope, $state, authService, $location, $timeout, firebaseDataRef, $firebaseObject, appUtils, DataUtils, employeeLogService) {

        $scope.userInfo = {};

        $scope.toggleMenu = function () {
            $rootScope.settings.layout.pageSidebarClosed = !$rootScope.settings.layout.pageSidebarClosed;
        };

        $scope.logOut = function () {
            if (!$rootScope.storage.currentUser) {
                delete $rootScope.storage.currentUser;
                delete $rootScope.storage.roles;
                delete $rootScope.storage.permissions;
                $state.go('login');
                return;
            }
            var uid = angular.copy($rootScope.storage.currentUser.$id);
            //Employee Log 
            var employeeLog = {
                action: appUtils.logEmployeeAction.logout.value,
                status: 'Success'
            };

            employeeLogService.create(uid, employeeLog).then(function () {
                //
                delete $rootScope.storage.currentUser;
                delete $rootScope.storage.roles;
                delete $rootScope.storage.permissions;
            });
            authService.logout();
            $state.go('login');
        };

        $scope.goToUserProfile = function () {
            var currentUser = $rootScope.storage.currentUser;
            $location.path('/employees/edit/' + currentUser.$id + '/true');
        };

        function getUserInfo() {
            $timeout(function () {
                if ($rootScope.storage.currentUser) {
                    var cU = authService.getCurrentUser();
                    var uid = cU && cU.uid || 'null';
                    var userRef = firebaseDataRef.child('users/' + uid);
                    DataUtils.getDataFirebaseLoadOnce(userRef, true).then(function (user) {
                        $rootScope.storage.currentUser = user || null;
                        setUserInfo(user);
                    });
                } else if ($rootScope.storage.currentUser) {
                    setUserInfo($rootScope.storage.currentUser);
                }
                Layout.initHeader(); // init header
            }, 0);
        }

        function setUserInfo(user) {
            if (user) {
                $scope.userInfo.fullName = user.firstName + ' ' + user.lastName;
                $scope.userInfo.email = user.email;
                $scope.userInfo.urlProfile = user.photoURL;
                $scope.dataLetterPic = user.firstName && user.lastName ? user.firstName.charAt(0).toUpperCase() + user.lastName.charAt(0).toUpperCase() : '';
            }
        }

        function updateLastLogin() {
            if ($rootScope.storage.currentUser) {
                var curUser = authService.getCurrentUser();
                const uid = curUser ? curUser.$id : null;
                const update = {};
                update['/lastLoginDate'] = appUtils.getTimestamp();

                if (curUser != null && uid != null)
                    var curUserRef = firebaseDataRef.child('users/' + uid).update(update);
            }
        }

        $scope.$on('$includeContentLoaded', function () {
            getUserInfo();
            updateLastLogin();
        });

    }
    /** @ngInject */
    function SidebarController($rootScope, $scope, $state, $timeout, firebaseDataRef, $location, DataUtils) {
        // function setChildrenMenus(allState, menu) {
        //     var childrenMenus = _.filter(allState, function (o) {
        //         return o.name !== '' && menu.name !== '' && o.data && o.data.parent === menu.name && !o.data.hide;
        //     });
        //     if (childrenMenus) {
        //         _.forEach(childrenMenus, function (childMenu) {
        //             setChildrenMenus(allState, childMenu);
        //         });
        //         menu.children = childrenMenus;
        //     }
        // }

        // function searchTree(item, name) {
        //     if (item.name == name) {
        //         return item;
        //     } else if (item.children !== null) {
        //         var i;
        //         var result = null;
        //         for (i = 0; result === null && i < item.children.length; i++) {
        //             result = searchTree(item.children[i], name);
        //         }
        //         return result;
        //     }
        //     return null;
        // }

        // function findMenu(stateName) {
        //     var allState = $state.get();
        //     var rs = _.find(allState, { 'name': stateName });
        //     return rs;
        // }

        // function unActiveMenus() {
        //     var allState = $state.get();
        //     _.forEach(allState, function (item, index) {
        //         item.isSelected = false;
        //     });
        // }

        // function activeMenus(stateName) {
        //     var item = findMenu(stateName);
        //     if (!item) return;
        //     if (item.name !== 'root') {
        //         item.isSelected = true;
        //     }
        //     if (item.parent && item.parent !== '') {
        //         activeMenus(item.parent);
        //     }
        // }

        // function activeParentMenus(root, menu) {
        //     if (menu && menu.data && menu.data.parent) {
        //         var parentMenu = searchTree(root, menu.data.parent);
        //         if (parentMenu) {
        //             parentMenu.isSelected = true;
        //             if (parentMenu.data && parentMenu.data.parent) {
        //                 activeParentMenus(root, parentMenu);
        //             }
        //         }
        //     }
        // }

        // $scope.goTo = function (state, parentMenu, subMenu) {
        //     unActiveMenus();
        //     state.isSelected = true;
        //     activeMenus(state.name);
        //     generateMenus(state);
        //     $state.go(state.name);
        // };

        // function setSidebarMenus(allState, userRoles, currentState) {
        //     var backendAccessPermissions = _.filter($rootScope.storage.permissions, function (oPermission) {
        //         var roleRs = _.find(oPermission.roles, function (oRoleId) {
        //             return userRoles && userRoles.indexOf(oRoleId) != -1;
        //         });
        //         return roleRs && roleRs !== null;
        //     });
        //     if (!backendAccessPermissions || backendAccessPermissions.length <= 0) return;
        //     var root = {
        //         name: 'Root',
        //         parent: '',
        //         children: [],
        //         url: ''
        //     };
        //     _.forEach(allState, function (o) {
        //         var menu = {
        //             name: o.name,
        //             parent: o.parent ? o.parent : '',
        //             children: [],
        //             url: o.url ? o.url : '',
        //             data: o.data ? o.data : {},
        //             isSelected: o.isSelected ? o.isSelected : false,
        //             index: 0
        //         };
        //         setChildrenMenus(allState, menu);
        //         if (o.isSelected) {
        //             menu.isSelected = true;
        //             activeParentMenus(root, menu);
        //         }
        //         if (menu.name && menu.name !== '' && menu.name !== 'root' && (!menu.data || !menu.data.parent)) {
        //             if (currentState.name === menu.name) {
        //                 menu.isSelected = true;
        //             }
        //             var rsItem = _.find(backendAccessPermissions, function (p) {
        //                 return menu.data && p.name === menu.data.permission;
        //             });
        //             if (rsItem) {
        //                 menu.index = rsItem.index;
        //                 root.children.push(menu);
        //             }
        //         }
        //     });
        //     var rMenu = root;
        //     // var enableEcom = $rootScope.storage.appSettings && $rootScope.storage.appSettings.enableEcommerce ? $rootScope.storage.appSettings.enableEcommerce : false;
        //     // if(!enableEcom && root && root.children && root.children.length > 0){
        //     //     root.children = _.filter(root.children, function(item){
        //     //         return item.data && item.data.module !== 'eCommerce';
        //     //     }); 
        //     // }
        //     rMenu.children = _.sortBy(root.children, [function (o) { return o.index; }]);
        //     $rootScope.rootMenus = rMenu;
        //     $timeout(angular.noop, 200);
        // }

        // function generateMenus(currentState) {
        //     // console.log('generateMenus');
        //     var storageCurrentUser = authService.getCurrentUser(); //$rootScope.storage.currentUser;
        //     var storageRoles = $rootScope.storage.roles;
        //     var storagePermissions = $rootScope.storage.permissions;

        //     appSettingService.checkNewSettings().then(function (res) {
        //         var allState = $state.get();
        //         if (!res && storageRoles && storageRoles.length > 0 && storagePermissions && storagePermissions.length > 0) {
        //             console.log('not update app-options setting');
        //             setSidebarMenus(allState, storageCurrentUser.userRoles, currentState);
        //         } else {
        //             if (storageCurrentUser) {
        //                 console.log('update app-options setting');
        //                 var roleRef = firebaseDataRef.child('roles');
        //                 var permissionRef = firebaseDataRef.child('permissions');
        //                 $q.all([DataUtils.firebaseLoadOnce(roleRef), DataUtils.firebaseLoadOnce(permissionRef)]).then(function (rs) {
        //                     $rootScope.storage.roles = DataUtils.toAFArray(rs[0]);
        //                     $rootScope.storage.permissions = DataUtils.toAFArray(rs[1]);
        //                     setSidebarMenus(allState, storageCurrentUser.userRoles, currentState);
        //                 });
        //             }
        //         }
        //     });
        // }

        // $scope.$on('$includeContentLoaded', function () {
        //     $scope.loadedContent = true;
        //     unActiveMenus();
        //     if ($rootScope.loadedDyamicModules) {
        //         var currentState = $state.current;
        //         activeMenus(currentState.name);
        //         generateMenus(currentState);
        //     }
        //     // setTimeout(function() {
        //     //     var currentState = $state.current;
        //     //     activeMenus(currentState.name);
        //     //     generateMenus(currentState);
        //     // }, 1000);
        // });

        // $rootScope.$on('reloadSibarMenus', function () {
        //     $scope.loadedContent = true;
        //     unActiveMenus();
        //     if ($rootScope.loadedDyamicModules) {
        //         $timeout(function () {
        //             $scope.$apply(function () {
        //                 var currentState = $state.current;
        //                 activeMenus(currentState.name);
        //                 generateMenus(currentState);
        //             });
        //         }, 200);
        //     }
        // });

        // $rootScope.$on('loadedDyamicModules', function () {
        //     if ($scope.loadedContent) {
        //         var currentState = $state.current;
        //         activeMenus(currentState.name);
        //         generateMenus(currentState);
        //     }
        // });
        $rootScope.isShowSideBar = false;

        $scope.$on('$includeContentLoaded', function () {
            $timeout(function () {
                $scope.loadedContent = true;
                generateSideBarData();
                angular.noop();
            }, 1200);
        });

        $rootScope.$on('reloadSibarMenus', function () {
            $timeout(function () {
                $scope.loadedContent = true;
                generateSideBarData();
                angular.noop();
            }, 1200);
        });

        $rootScope.$on('loadedDyamicModules', function () {
            if ($scope.loadedContent) {
                generateSideBarData();
                angular.noop();
            }
        });

        function generateSideBarData() {
            var currentState = $state.current;
            if (!$rootScope.storage.sideBarData) {
                DataUtils.getDataFirebaseLoadOnce(firebaseDataRef.child('side-bar-menu-admin'), true).then(function (sideBarData) {
                    sideBarData = DataUtils.stripDollarPrefixedKeys(sideBarData);
                    $rootScope.storage.sideBarData = sideBarData;
                    $scope.rootMenus = sideBarData;
                    sortSideBar($scope.rootMenus);
                    unActiveMenus($scope.rootMenus);
                    activeByCurrentState($scope.rootMenus, currentState);
                });
            } else {
                $scope.rootMenus = $rootScope.storage.sideBarData;
                sortSideBar($scope.rootMenus);
                unActiveMenus($scope.rootMenus);
                activeByCurrentState($scope.rootMenus, currentState);

            }

            if (!$rootScope.storage.permissions || $rootScope.storage.permissions === null) {
                DataUtils.getDataFirebaseLoadOnce(firebaseDataRef.child('permissions'), true).then(function (permissions) {
                    permissions = DataUtils.stripDollarPrefixedKeys(permissions);
                    $rootScope.storage.permissions = permissions;
                });
            }
        }

        function sortSideBar(sideBar) {
            sideBar.items = _.sortBy(sideBar.items, [function (o) { return o.order; }]);
            _.forEach(sideBar.items, function (item) {
                if (item.items) {
                    sortSideBar(item);
                }
            });
        }

        function unActiveMenus(menus) {
            _.forEach(menus.items, function (item) {
                if (item.isSelected === undefined)
                    item.isSelected = false;
                else
                    item.isSelected = false;

                if (item.items) {
                    unActiveMenus(item);
                }
            });
        }

        function activeParentMenus(menus, child) {
            _.forEach(menus.items, function (item) {
                if (item.permissions.indexOf(child.permissions[0]) > -1) {
                    if (!menus.id) {
                        menus.isSelected = true;
                    }
                }
                if (item.items) {
                    activeParentMenus(item, child);
                }
            });
        }

        function activeByCurrentState(menus, currentState) {
            _.forEach(menus.items, function (item) {
                if (currentState.data && currentState.data.permission && item.permissions.indexOf(currentState.data.permission) > -1) {
                    item.isSelected = true;
                    if (!menus.id) {
                        menus.isSelected = true;
                    }
                }
                if (item.items) {
                    activeByCurrentState(item, currentState);
                }
            });
        }

        $scope.goTo = function (item) {
            unActiveMenus($scope.rootMenus);
            item.isSelected = true;
            activeParentMenus($scope.rootMenus, item);
            if (item.url) {
                $state.go(item.url);
            }
        };

        $scope.showHideSideBar = function (item) {
            var show = false;
            var permissions = $rootScope.storage.permissions || [];
            if (item.permissions) {
                _.forEach(item.permissions, function (value) {
                    var pData = findPermission(permissions, value);
                    if (pData && pData.acl) {
                        show = $rootScope.can('access', pData);
                        if (show) {
                            $rootScope.isShowSideBar = true;
                            return false;
                        }
                    }
                });
            }

            return show;
        };

        function findPermission(permissions, permisionName) {
            return _.find(permissions, function (p, key) {
                return key && key.toLowerCase() === permisionName.toLowerCase();
            });
        }
    }

    /** @ngInject */
    function PageHeadController($scope, $state) {
        $scope.state = $state;
        $scope.$on('$includeContentLoaded', function () {
            //Demo.init(); // init theme panel
        });
    }

    /** @ngInject */
    function QuickSidebarController($scope) {
        $scope.$on('$includeContentLoaded', function () {
            setTimeout(function () {
                QuickSidebar.init(); // init quick sidebar
            }, 2000);
        });
    }

    /** @ngInject */
    function FooterController($scope, APP_CONFIG) {
        $scope.buildVersion = APP_CONFIG.buildVersion;
        $scope.buildOnDay = APP_CONFIG.buildOnDay;
        $scope.$on('$includeContentLoaded', function () {
            Layout.initFooter(); // init footer
        });
    }

})();