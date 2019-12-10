(function() {
    'use strict';
    angular
        .module('app.saleRegion')
        .config(config)
        .run(appRun);
    /** @ngInject */
    function appRun() {}
    /** @ngInject */
    function config($stateProvider) {
        var states = {};

        states.saleRegion = {
            parent: 'root',
            url: '/saleRegion',
            templateUrl: './app/saleRegion/saleRegion-layout.tpl.html',
            resolve: {
                "currentAuth": ["authService", function(authService) {
                    return authService.requireSignIn();
                }],
                deps: ['$ocLazyLoad', function($ocLazyLoad) {
                    return $ocLazyLoad.load({
                        cache: true,
                        name: 'app.saleRegion',
                        files: [
                            './app/saleRegion/saleRegion.service.js',
                            './app/membership/membership-territories.service.js',
                            './app/membership/membership-regions.service.js',
                            './app/membership/membership-states.service.js',
                        ]
                    });
                }]
            }
        };

        states['saleRegion.list'] = {
            url: '/list',
            templateUrl: './app/saleRegion/list/saleRegion-list.tpl.html',
            controller: 'saleRegionListCtrl as sRegionVm',
            data: {
                pageTitle: 'Sale Regions Management',
                module: 'saleRegion',
                icon: 'fa fa-calendar-check-o',
                permission: 'SaleRegion'
            },
            resolve: {
                deps: ['$ocLazyLoad', function($ocLazyLoad) {
                    return $ocLazyLoad.load({
                        cache: true,
                        name: 'app.saleRegion.list',
                        files: [
                            './app/saleRegion/list/saleRegion-list.js',
                            './app/saleRegion/add_edit/_add-edit-sale-regions.js',
                            './app/saleRegion/add_edit/_add-edit-state.js'
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