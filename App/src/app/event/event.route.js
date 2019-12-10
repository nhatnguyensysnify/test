(function() {
    'use strict';
    angular
        .module('app.event')
        .config(config)
        .run(appRun);
    /** @ngInject */
    function appRun() {}
    /** @ngInject */
    function config($stateProvider) {
        var states = {};

        states.event = {
            parent: 'root',
            url: '/events',
            templateUrl: './app/event/event-layout.tpl.html',
            resolve: {
                deps: ['$ocLazyLoad', function($ocLazyLoad) {
                    return $ocLazyLoad.load({
                        cache: true,
                        name: 'app.event',
                        files: [
                            './app/event/event.service.js',
                            './app/event/event-queue.service.js',
                            './app/event/event-tracking.service.js',
                            './app/event/event-upload-logs.service.js',
                            './app/membership/membership-facilities.service.js',
                            './app/membership/membership-territories.service.js',
                            './app/membership/membership-addons.service.js',
                            './app/membership/membership-regions.service.js',
                            './app/membership/membership-states.service.js',
                            './app/employee/employee.service.js',
                            './app/employee/manager.service.js',
                            './app/employee/employee-queue.service.js',
                            './app/employee/department.service.js',
                            './app/membership/membership-media.js',
                            './app/membership/application.service.js',
                            './app/membership/application-verify.service.js',
                            './app/membership/application-timeline.service.js',
                            './app/membership/application-device-info.service.js',
                            './app/membership/application-snapshot.js',
                            './app/membership/membership-snapshot.js',
                            './app/membership/membership.service.js',
                            './app/event/calendar/modal/events-modal.js',
                        ]
                    });
                }]
            }
        };

        states['event.list'] = {
            url: '/list?keyword&start&end&type&requester&facilityId&territory&alias&state&plantype&status&page&viewMap',
            templateUrl: './app/event/list/event-list.tpl.html',
            controller: 'EventListCtrl as eventVm',
            data: {
                pageTitle: 'Events',
                module: 'event',
                icon: 'fa fa-calendar-check-o',
                permission: 'Events'
            },
            resolve: {
                "currentAuth": ["authService", function(authService) {
                    return authService.waitForSignIn();
                }],
                deps: ['$ocLazyLoad', function($ocLazyLoad) {
                    return $ocLazyLoad.load({
                        cache: true,
                        name: 'app.event.list',
                        files: [
                            './app/event/event-export.service.js',
                            './app/event/event-export-full.service.js',
                            './app/event/list/event-list.js',
                            './app/event/eventGoal.service.js'
                        ]
                    });
                }]
            }
        };

        states['event.confirmation'] = {
            url: '/confirmation?token',
            templateUrl: './app/event/confirmation/event-confirmation.tpl.html',
            controller: 'EventConfirmationCtrl as eventVm',
            data: {
                pageTitle: 'Events',
                module: 'login',
                icon: 'fa fa-calendar-check-o',
            },
            resolve: {
                "loadSettings": ["appSettingService", function (appSettingService) {
                    return appSettingService.loadSettings();
                }],
                deps: ['$ocLazyLoad', function($ocLazyLoad) {
                    return $ocLazyLoad.load({
                        cache: true,
                        name: 'app.event.confirmation',
                        files: [
                            './app/event/event-export.service.js',
                            './app/event/event-export-full.service.js',
                            './app/event/confirmation/event-confirmation.js',
                            './app/event/eventGoal.service.js',
                            './app/event/calendar/modal/events-modal.js',
                        ]
                    });
                }]
            }
        };

        states['event.calendar'] = {
            url: '/calendar?keyword&start&end&type&requester&facilityId&territory&alias&state&plantype&status&page',
            templateUrl: './app/event/calendar/event-calendar.tpl.html',
            controller: 'EventCalendarCtrl as eventVm',
            data: {
                pageTitle: '',
                module: 'event',
                icon: 'fa fa-calendar-check-o',
                permission: 'EventCalendar'
            },
            resolve: {
                "currentAuth": ["authService", function(authService) {
                    return authService.waitForSignIn();
                }],
                deps: ['$ocLazyLoad', function($ocLazyLoad) {
                    return $ocLazyLoad.load({
                        cache: true,
                        name: 'app.event.calendar',
                        files: [
                            './app/event/event-export.service.js',
                            './app/event/event-export-calendar.service.js',
                            './app/event/event-export-full.service.js',
                            './app/event/calendar/event-calendar.js',
                            './app/event/eventGoal.service.js',
                            './app/event/shifts.service.js',
                            './app/event/calendar/modal/events-modal.js',
                            './app/event/calendar/modal/employees-modal.js',
                            './app/event/calendar/modal/reassign-modal.js',
                            './app/event/shifts.service.js',
                            './app/employee/employee-export.service.js',
                        ]
                    });
                }]
            }
        };

        // states['event.timeline'] = {
        //     url: '/timeline?keyword&start&end&type&requester&facilityId&territory&alias&state&plantype&status&page',
        //     templateUrl: './app/event/list/event-timeline.tpl.html',
        //     controller: 'EventListCtrl as eventVm',
        //     data: {
        //         pageTitle: 'Events',
        //         module: 'event',
        //         icon: 'fa fa-calendar-check-o',
        //         permission: 'Events'
        //     },
        //     resolve: {
        //         deps: ['$ocLazyLoad', function($ocLazyLoad) {
        //             return $ocLazyLoad.load({
        //                 cache: true,
        //                 name: 'app.event.list',
        //                 files: [
        //                     './app/event/event-export.service.js',
        //                     './app/event/event-export-full.service.js',
        //                     './app/event/list/event-list.js',
        //                     './app/event/eventGoal.service.js',
        //                     './app/event/dashboard/modal/info-modal.js',
        //                 ]
        //             });
        //         }]
        //     }
        // };

        states['event.details'] = {
            url: '/details?id',
            templateUrl: './app/event/add_edit/event-details.tpl.html',
            controller: 'EventDetailsCtrl as eventVm',
            data: {
                pageTitle: 'Event Details',
                module: 'event',
                permission: 'Events'
            },
            resolve: {
                "currentAuth": ["authService", function(authService) {
                    return authService.waitForSignIn();
                }],
                deps: ['$ocLazyLoad', function($ocLazyLoad) {
                    return $ocLazyLoad.load({
                        cache: true,
                        name: 'app.event.details',
                        files: [
                            './app/event/add_edit/event-details.js',
                            './app/event/add_edit/event-applications.js',
                            './app/event/add_edit/event-upload-form.js',
                            './app/event/add_edit/event-upload-form-history.js',
                            './app/event/add_edit/event-cash.js',
                            './app/membership/modal/facility-list-popup.js',
                            './app/event/modal/event-detail-chart-popup.js',
                            './app/event/modal/event-tracking-log.js',
                            './app/membership/pdf-process-queue.service.js',
                            './app/event/eventGoal.service.js',
                            './app/event/event-cash.service.js',
                            './app/event/event-export-full.service.js',
                            './app/membership/application-timeline.service.js',
                            './app/membership/membership-process-queue.service.js',
                            './app/employee/modal/employee-list-popup.js',
                            './app/employee/baseEmployeeLogClass.js',
                            './app/event/shifts.service.js',
                            './app/event/modal/event-address-popup.js',
                            './app/event/modal/event-notification-popup.js',
                        ]
                    });
                }]
            }
        };

        states['event.dashboard'] = {
            url: '/dashboard',
            templateUrl: './app/event/dashboard/overview/dashboard.tpl.html',
            controller: 'EventDashboardCtrl as eventVm',
            data: {
                pageTitle: "Event Dashboard",
                module: 'event',
                permission: 'RegionGoal'
            },
            resolve: {
                "currentAuth": ["authService", function(authService) {
                    return authService.waitForSignIn();
                }],
                deps: ['$ocLazyLoad', function($ocLazyLoad) {
                    return $ocLazyLoad.load({
                        cache: true,
                        name: 'app.event.dashboard',
                        files: [
                            './app/event/event-export.service.js',
                            './app/event/event-export-full.service.js',
                            './app/event/dashboard/overview/dashboard.js',
                            './app/event/dashboard/modal/info-modal.js',
                            './app/event/dashboard/modal/event-list-modal.js',
                            './app/event/eventGoal.service.js'
                        ]
                    });
                }]
            }
        };

        states['event.goal'] = {
            url: '/goals',
            templateUrl: './app/event/goal/regional-goal.tpl.html',
            controller: 'RegionalGoalCtrl as egVm',
            data: {
                pageTitle: "Regional Goal",
                module: 'event',
                permission: 'RegionGoal'
            },
            resolve: {
                "currentAuth": ["authService", function(authService) {
                    return authService.waitForSignIn();
                }],
                deps: ['$ocLazyLoad', function($ocLazyLoad) {
                    return $ocLazyLoad.load({
                        cache: true,
                        name: 'app.event.goal',
                        files: [
                            './app/event/eventGoal.service.js',
                            './app/event/goal/regional-goal.js',
                            './app/event/goal-modal/goal-modal.js'
                        ]
                    });
                }]
            }
        };

        states['event.confirmation_dashboard'] = {
            url: '/confirmation-dashboard',
            templateUrl: './app/event/dashboard/confirmation/dashboard.tpl.html',
            controller: 'EventConfirmationDashboardCtrl as eventVm',
            data: {
                pageTitle: "Classes Confirmation Dashboard",
                module: 'event',
                permission: 'RegionGoal'
            },
            resolve: {
                "currentAuth": ["authService", function(authService) {
                    return authService.waitForSignIn();
                }],
                deps: ['$ocLazyLoad', function($ocLazyLoad) {
                    return $ocLazyLoad.load({
                        cache: true,
                        name: 'event.confirmation_dashboard',
                        files: [
                            './app/event/event-export.service.js',
                            './app/event/event-export-full.service.js',
                            './app/event/dashboard/confirmation/dashboard.js',
                            './app/event/dashboard/modal/info-modal.js',
                            './app/event/dashboard/modal/event-list-modal.js',
                            './app/event/eventGoal.service.js',
                            './app/event/dashboard/modal/notifications-modal.js',
                            './app/event/eventCampaign.service.js',
                            './app/event/calendar/modal/employees-modal.js',
                            './app/event/shifts.service.js',
                            './app/employee/employee-export.service.js',
                            './app/event/event-export-confirmation.service.js',
                        ]
                    });
                }]
            }
        };

        for (var state in states) {
            $stateProvider.state(state, states[state]);
        }
    }
})();