(function() {
    'use strict';

    angular
        .module('app.eTemplate')
        .config(config);
    // .run(cfgmenu);

    /** @ngInject */
    function config($stateProvider) {
        var states = {};

        states.eTemplate = {
            parent: 'root',
            url: '/notification-template',
            templateUrl: './app/eTemplate/eTemplate-layout.tpl.html',
            resolve: {
                "currentAuth": ["authService", function(authService) {
                    return authService.requireSignIn();
                }],
                deps: ['$ocLazyLoad', function($ocLazyLoad) {
                    return $ocLazyLoad.load({
                        cache: true,
                        name: 'app.eTemplate',
                        files: [
                            './app/eTemplate/eTemplate.service.js'
                        ]
                    });
                }]
            }
        };

        states['eTemplate.list'] = {
            url: '/list',
            templateUrl: './app/eTemplate/list/eTemplate-list.tpl.html',
            controller: 'eTemplateListCtrl as tplVm',
            data: {
                pageTitle: 'Notification Templates',
                module: 'eTemplate',
                icon: 'fa fa-file-text',
                permission: 'NotificationTemplate'
            },
            resolve: {
                deps: ['$ocLazyLoad', function($ocLazyLoad) {
                    return $ocLazyLoad.load({
                        cache: true,
                        name: 'app.eTemplate.list',
                        files: [
                            './app/eTemplate/list/eTemplate-list.js'
                        ]
                    });
                }]
            }
        };

        states['eTemplate.details'] = {
            url: '/details?id&channel',
            templateUrl: './app/eTemplate/details/eTemplate-details.tpl.html',
            controller: 'eTemplateDetailsCtrl as tplVm',
            data: {
                pageTitle: 'Notification Template Detail',
                module: 'eTemplate',
                permission: 'NotificationTemplate',
            },
            resolve: {
                deps: ['$ocLazyLoad', function($ocLazyLoad) {
                    return $ocLazyLoad.load({
                        cache: true,
                        name: 'app.eTemplate.details',
                        files: [
                            './app/eTemplate/details/eTemplate-details.js'
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