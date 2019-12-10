(function () {
	'use strict';

	angular
		.module('app.auth')
		.config(config)
		.run(appRun);
	/** @ngInject */
	function appRun() { }
	/** @ngInject */
	function config($stateProvider) {
		$stateProvider.state(
			'login', {
				parent: 'root',
				url: '/login',
				templateUrl: 'app/auth/login.tpl.html',
				controller: 'LoginCtrl',
				controllerAs: 'loginVm',
				data: {
					pageTitle: 'Login',
					module: 'login'
				},
				resolve: {
					"currentAuth": ["authService", function (authService) {
						return authService.waitForSignIn();
					}]
				}
			}
		).state(
			'mcmlogin', {
				parent: 'root',
				url: '/mcmlogin',
				templateUrl: 'app/auth/mcm-login.tpl.html',
				controller: 'MCMLoginCtrl',
				controllerAs: 'loginVm',
				data: {
					pageTitle: 'Login',
					module: 'login'
				},
				resolve: {
					"currentAuth": ["authService", function (authService) {
						return authService.waitForSignIn();
					}]
				}
			}
		).state(
			'pageNotFound', {
				url: '/page-not-found',
				templateUrl: 'app/auth/page_not_found.tpl.html',
				data: {
					pageTitle: 'Page Not Found',
					module: 'login'
				},
				resolve: {
					"currentAuth": ["authService", function (authService) {
						return authService.requireSignIn();
					}]
				}
			}
		);
	}

})();
