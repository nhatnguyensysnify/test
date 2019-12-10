(function () {
	'use strict';
	angular
		.module('app.role')
		.config(config)
		.run(appRun);
	/** @ngInject */
	function appRun() { }
	/** @ngInject */
	function config($stateProvider) {
		$stateProvider.state(
			'roles', {
				parent: 'root',
				url: '/role/list',
				templateUrl: 'app/role/list/role-list.tpl.html',
				controller: 'RoleListCtrl',
				controllerAs: 'roleVm',
				data: {
					pageTitle: 'Roles',
					module: 'roles',
					icon: 'fa fa-circle-o',
					permission: 'Roles'
				},
				resolve: {
					"currentAuth": ["authService", function (authService) {
						return authService.requireSignIn();
					}]
				}
			}
		).state(
			'editRole', {
				parent: 'root',
				url: '/role/list/:id',
				templateUrl: 'app/role/list/role-list.tpl.html',
				controller: 'RoleListCtrl',
				controllerAs: 'roleVm',
				data: {
					pageTitle: 'Roles',
					module: 'roles',
					parent: 'roles',
					permission: 'Roles'
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