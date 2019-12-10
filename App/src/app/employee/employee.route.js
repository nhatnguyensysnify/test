(function() {
    'use strict';
    angular
        .module('app.employee')
        .config(config)
        .run(appRun);
    /** @ngInject */
    function appRun() {}
    /** @ngInject */
    function config($stateProvider) {
        var states = {};

        states.employee = {
            parent: 'root',
            url: '/employees',
            templateUrl: './app/employee/employee-layout.tpl.html',
            resolve: {
                "currentAuth": ["authService", function(authService) {
                    return authService.requireSignIn();
                }],
                deps: ['$ocLazyLoad', function($ocLazyLoad) {
                    return $ocLazyLoad.load({
                        cache: true,
                        name: 'app.employee',
                        files: [
                            './app/employee/employee.service.js',
                            './app/employee/employee-export.service.js',
                            './app/employee/employee-license.service.js',
                            './app/employee/manager.service.js',
                            './app/employee/employee-queue.service.js',
                            './app/employee/department.service.js',
                            './app/employee/baseEmployeeLogClass.js',
                            './app/membership/application-snapshot.js',
                            './app/membership/membership-snapshot.js',
                            './app/membership/application.service.js',
                            './app/membership/application-device-info.service.js',
                            './app/membership/membership.service.js',
                            './app/membership/membership-media.js',
                            './app/membership/membership-states.service.js',
                            './app/membership/membership-regions.service.js',
                            './app/membership/membership-territories.service.js',
                            './app/membership/membership-facilities.service.js',
                            './app/event/event-queue.service.js',
                            './app/event/event.service.js',
                            './app/event/event-tracking.service.js',
                        ]
                    });
                }]
            }
        };

        states['employee.list'] = {
            url: '/list?keyword&start&end&role&requester&licenseType&hireType&licenseExp&isAuthorized&territories&alias&states&issuingstates&page',
            templateUrl: './app/employee/list/employee-list.tpl.html',
            controller: 'EmployeeListCtrl as employeeListVm',
            data: {
                pageTitle: 'Employees',
                module: 'employee',
                icon: 'fa fa-suitcase',
                permission: 'Employees'
            },
            resolve: {
                deps: ['$ocLazyLoad', function($ocLazyLoad) {
                    return $ocLazyLoad.load({
                        cache: true,
                        name: 'app.employee.list',
                        files: [
                            './app/employee/list/employee-list.js',
                            './app/employee/modal/replace-manager-modal.js'
                        ]
                    });
                }]
            }
        };

        states['employee.add'] = {
            url: '/add',
            templateUrl: './app/employee/add_edit/add-employee.tpl.html',
            controller: 'AddEmployeeCtrl as addEmployeeVm',
            data: {
                pageTitle: 'Add New Employee',
                module: 'employee',
                permission: 'Employees'
            },
            resolve: {
                deps: ['$ocLazyLoad', function($ocLazyLoad) {
                    return $ocLazyLoad.load({
                        cache: true,
                        name: 'app.employee.add',
                        files: [
                            './app/employee/add_edit/add-employee.js'
                        ]
                    });
                }]
            }
        };

        states['employee.edit'] = {
            url: '/edit/:id/:editprofile',
            templateUrl: './app/employee/add_edit/edit-employee.tpl.html',
            controller: 'EditEmployeeCtrl as editEmployeeVm',
            data: {
                pageTitle: 'Edit Employee',
                module: 'employee',
                permission: 'Employees'
            },
            resolve: {
                deps: ['$ocLazyLoad', function($ocLazyLoad) {
                    return $ocLazyLoad.load({
                        cache: true,
                        name: 'app.employee.edit',
                        files: [
                            './app/employee/add_edit/edit-employee.js',
                            './app/employee/employee_role/add-employee-role.js',
                            './app/employee/modal/user_role_n_group.js',
                            './app/employee/add_edit/_employee-dashboard-modal.js',
                            './app/employee/add_edit/_employee-log-history.js',
                            './app/employee/add_edit/_employee-license.js',
                            './app/event/event-export.service.js',
                            './app/event/event-export-calendar.service.js',
                            './app/event/event-export-full.service.js',
                            './app/employee/calendar/e-scheduler-calendar.js',
                            './app/event/eventGoal.service.js',
                            './app/event/shifts.service.js',
                            './app/employee/calendar/modal/events-modal.js',
                            './app/employee/calendar/modal/cancel-shift-modal.js',
                            './app/employee/calendar/modal/sign-up-shifts-modal.js',
                            './app/event/event.service.js',
                            './app/event/event-queue.service.js',
                            './app/event/event-tracking.service.js',
                            './app/event/event-upload-logs.service.js',
                            './app/membership/membership-addons.service.js',
                            './app/membership/application-verify.service.js',
                            './app/membership/application-timeline.service.js'
                        ]
                    });
                }]
            }
        };

        states['employee.calendar'] = {
            url: '/calendar?keyword&start&end&type&requester&facilityId&territory&alias&state&plantype&status&page',
            templateUrl: './app/employee/calendar/e-scheduler-calendar.tpl.html',
            controller: 'ESchedulerCalendarCtrl as eCalendarVm',
            data: {
                pageTitle: '',
                module: 'event',
                icon: 'fa fa-calendar-check-o',
                permission: 'Employees'
            },
            resolve: {
                deps: ['$ocLazyLoad', function($ocLazyLoad) {
                    return $ocLazyLoad.load({
                        cache: true,
                        name: 'app.employee.calendar',
                        files: [
                            './app/event/event-export.service.js',
                            './app/event/event-export-calendar.service.js',
                            './app/event/event-export-full.service.js',
                            './app/employee/calendar/e-scheduler-calendar.js',
                            './app/event/eventGoal.service.js',
                            './app/event/shifts.service.js',
                            './app/employee/calendar/modal/events-modal.js',
                            './app/employee/calendar/modal/employees-modal.js',
                            './app/employee/calendar/modal/cancel-shift-modal.js',
                            './app/employee/calendar/modal/sign-up-shifts-modal.js',
                            './app/employee/calendar/modal/reassign-modal.js',
                            './app/event/event.service.js',
                            './app/event/event-queue.service.js',
                            './app/event/event-tracking.service.js',
                            './app/event/event-upload-logs.service.js',
                            './app/membership/membership-addons.service.js',
                            './app/membership/application-verify.service.js',
                            './app/membership/application-timeline.service.js',
                        ]
                    });
                }]
            }
        };

        for (var state in states) {
            $stateProvider.state(state, states[state]);
        }
        // $stateProvider.state(
        // 	'employees', {
        // 		url: '/employees',
        // 		templateUrl: 'app/employee/list/employee-list.tpl.html',
        // 		controller: 'EmployeeListCtrl',
        // 		controllerAs: 'employeeListVm',
        // 		data: {
        // 			pageTitle: 'Employees',
        // 			module: 'employee',
        // 			icon: 'fa fa-suitcase',
        // 			permission: 'Employees'

        // 		},
        // 		resolve:{
        // 			"currentAuth": ["authService", function(authService) {
        // 		        return authService.requireSignIn();
        // 		     }]
        // 		}
        // 	}
        // ).state(
        // 	'allEmployees', {
        // 		url: '/all/employees',
        // 		templateUrl: 'app/employee/list/employee-list.tpl.html',
        // 		controller: 'EmployeeListCtrl',
        // 		controllerAs: 'employeeListVm',
        // 		data: {
        // 			pageTitle: 'All Employees',
        // 			module: 'employee',
        // 	        parent: 'employees'

        // 		},
        // 		resolve:{
        // 			"currentAuth": ["authService", function(authService) {
        // 		        return authService.requireSignIn();
        // 		     }]
        // 		}
        // 	}
        // ).state(
        // 	'addEmployee', {
        // 		url: '/employee/add',
        // 		templateUrl: 'app/employee/add_edit/add-employee.tpl.html',
        // 		controller: 'AddEmployeeCtrl',
        // 		controllerAs: 'addEmployeeVm',
        // 		data: {
        // 		    pageTitle: 'Add New Employee',
        // 			module: 'employee',
        // 	        parent: 'employees',
        // 			hide: true
        // 		},
        // 		resolve:{
        // 			"currentAuth": ["authService", function(authService) {
        // 		        return authService.requireSignIn();
        // 		     }]
        // 		}
        // 	}
        // ).state(
        // 	'editEmployee', {
        // 		url: '/employee/edit/:id',
        // 		templateUrl: 'app/employee/add_edit/edit-employee.tpl.html',
        // 		controller: 'EditEmployeeCtrl',
        // 		controllerAs: 'editEmployeeVm',
        // 		data: {
        // 			pageTitle: 'Employee Profile',
        // 			module: 'employee',
        // 	        parent: 'employees',
        // 			hide: true
        // 		},
        // 		resolve:{
        // 			"currentAuth": ["authService", function(authService) {
        // 		        return authService.requireSignIn();
        // 		     }]
        // 		}
        // 	}
        // );
    }
})();