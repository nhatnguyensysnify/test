(function() {
	'use strict';

	angular
		.module('app.home')
		.config(config)
		.run(appRun);
	/** @ngInject */	
	function appRun() {}

	/** @ngInject */
	function config($stateProvider) {
		$stateProvider.state(
			'index', {
				parent: 'root',
				url: '/home',
				templateUrl: 'app/home/home.tpl.html',
				controller: 'HomeCtrl',
				controllerAs: 'vm',
				data: {
					//requireLogin: true,
					pageTitle: 'Home',
					module: 'home',
					icon: 'fa fa-home',
					permission: 'Home'
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