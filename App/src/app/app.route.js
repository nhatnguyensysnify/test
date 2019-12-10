(function() {
    'use strict';

    angular
        .module('app')
        .config(config);

    /** @ngInject */
    function config($stateProvider) {
        var states = {};
        states.root = {
            url: '',
            abstract: true,
            template: '<div ui-view class=""></div>',
            resolve: {
                loadDyamicModules: ['$ocLazyLoad', '$rootScope', function($ocLazyLoad, $rootScope) {
                    console.log('loadDyamicModules');
                    var modules = ['dashboard', 'membership', 'employee', 'event', 'eTemplate', 'saleRegion', 'facility'],
                        moduleFiles = [],
                        routeFiles = [];

                    _.each(modules, function(m) {
                        var path = './app/' + m + '/';
                        moduleFiles.push({
                            type: 'js',
                            path: path + m + '.module.js'
                        });
                        routeFiles.push({
                            type: 'js',
                            path: path + m + '.route.js'
                        });
                    });
                    return $ocLazyLoad.load(moduleFiles).then(function() {
                        return $ocLazyLoad.load(routeFiles);
                    }).then(function() {
                        $rootScope.loadedDyamicModules = true;
                        $rootScope.$emit('loadedDyamicModules');
                    });
                }]
            }
        };

        for (var state in states) {
            $stateProvider.state(state, states[state]);
        }
    }
})();