(function () {
	'use strict';
	angular
		.module('app.tlsApiDataCache')
		.config(config)
		.run(appRun);
	/** @ngInject */
	function appRun() {
	}
	/** @ngInject */
	function config($stateProvider) {
		$stateProvider.state(
			'managementTLSApiData', {
				parent: 'root',
				url: '/management-tls-api-data',
				templateUrl: 'app/tlsAPIdatacache/management-api-data-cache/management-api-data-cache.tpl.html',
				controller: 'tlsDataCacheCtrl',
				controllerAs: 'vm',
				data: {
					pageTitle: 'Management TLS Data',
					module: 'tlsApiDataCache',
					icon: 'fa fa-database',
					permission: 'TLSData'
				},
				resolve: {
					"currentAuth": ["authService", function (authService) {
						return authService.requireSignIn();
					}],
					deps: ['$ocLazyLoad', function($ocLazyLoad) {
						return $ocLazyLoad.load({
							cache: true,
							name: 'app.tlsApiDataCache',
							files: [
								'./app/employee/employee.service.js',
								'./app/employee/department.service.js',
								'./app/employee/manager.service.js',
							]
						});
					}]
				}
			}
		);
	}
})();
