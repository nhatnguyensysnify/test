(function() {
    'use strict';
    angular
        .module('app.facility')
        .config(config)
        .run(appRun);
    /** @ngInject */
    function appRun() {}
    /** @ngInject */
    function config($stateProvider) {
        var states = {};

        states.facility = {
            parent: 'root',
            url: '/facilities',
            templateUrl: './app/facility/facility-layout.tpl.html',
            resolve: {
                "currentAuth": ["authService", function(authService) {
                    return authService.requireSignIn();
                }],
                deps: ['$ocLazyLoad', function($ocLazyLoad) {
                    return $ocLazyLoad.load({
                        cache: true,
                        name: 'app.facility',
                        files: [
                            './app/facility/facility.service.js'
                        ]
                    });
                }]
            }
        };

        states['facility.list'] = {
            url: '/list',
            templateUrl: './app/facility/list/facility-list.tpl.html',
            controller: 'FacListCtrl as facVm',
            data: {
                pageTitle: 'Facilities',
                module: 'facility',
                icon: 'fa fa-calendar-check-o',
                permission: 'Events'
            },
            resolve: {
                deps: ['$ocLazyLoad', function($ocLazyLoad) {
                    return $ocLazyLoad.load({
                        cache: true,
                        name: 'app.facility.list',
                        files: [
                            './app/facility/list/facility-list.js'
                        ]
                    });
                }]
            }
        };

        states['facility.details'] = {
            url: '/details?id',
            templateUrl: './app/facility/add_edit/facility-details.tpl.html',
            controller: 'FacDetailsCtrl as facVm',
            data: {
                pageTitle: 'Facility Details',
                module: 'facility',
                permission: 'Events'
            },
            resolve: {
                deps: ['$ocLazyLoad', function($ocLazyLoad) {
                    return $ocLazyLoad.load({
                        cache: true,
                        name: 'app.facility.details',
                        files: [
                            ''
                        ]
                    });
                }]
            }
        };

        states['facility.dashboard'] = {
            url: '/dashboard',
            templateUrl: './app/facility/dashboard/overview/dashboard.tpl.html',
            controller: 'FacDashboardCtrl as facVm',
            data: {
                pageTitle: "Facility Dashboard",
                module: 'facility',
                permission: 'Events'
            },
            resolve: {
                deps: ['$ocLazyLoad', function($ocLazyLoad) {
                    return $ocLazyLoad.load({
                        cache: true,
                        name: 'app.facility.dashboard',
                        files: [
                            ''
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