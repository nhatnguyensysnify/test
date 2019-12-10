(function () {
	'use strict';
	angular
		.module('app.settings')
		.config(config)
		.run(appRun);
	/** @ngInject */
	function appRun() { }
	/** @ngInject */
	function config($stateProvider) {
		$stateProvider.state(
			'general', {
				parent: 'root',
				url: '/settings/general',
				templateUrl: 'app/settings/general/general.tpl.html',
				controller: 'GeneralCtrl',
				controllerAs: 'settingsVm',
				data: {
					pageTitle: 'General Settings',
					module: 'settings',
					icon: 'fa fa-cogs',
					permission: 'GeneralSettings'
				},
				resolve: {
					"currentAuth": ["authService", function (authService) {
						return authService.requireSignIn();
					}]
				}
			}
		);
		// ).state(
		// 	'payment', {
		// 		parent: 'root',
		// 	    url: '/settings/payment',
		// 	    templateUrl: 'app/settings/payment/payment.tpl.html',
		// 	    controller: 'PaymentCtrl',
		// 	    controllerAs: 'settingsVm',
		// 	    data: {
		// 	        pageTitle: 'Payment Settings',
		// 			module: 'settings'
		// 	    },
		// 	    resolve: {
		// 	        "currentAuth": ["authService", function (authService) {
		// 	            return authService.requireSignIn();
		// 	        }]
		// 	    }
		// 	}
		// );
	}
})();
