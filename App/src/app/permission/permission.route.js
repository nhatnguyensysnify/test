(function () {
	'use strict';
	angular
		.module('app.permission')
		.config(config)
		.run(appRun);
	/** @ngInject */
	function appRun() { }
	/** @ngInject */
	function config($stateProvider) {
		$stateProvider.state(
			'permissions', {
				parent: 'root',
				url: '/permissions',
				templateUrl: 'app/permission/list/permission-list.tpl.html',
				controller: 'PermissionListCtrl',
				controllerAs: 'permissionVm',
				data: {
					pageTitle: 'Permissions',
					module: 'permission',
					icon: 'icon-settings',
					permission: 'Permissions'
				},
				resolve: {
					"currentAuth": ["authService", function (authService) {
						return authService.requireSignIn();
					}]
				}
			}
		).state(
			'PermissionDetails', {
				parent: 'root',
				url: '/permissions/details/:id',
				templateUrl: 'app/permission/add_edit/permission-details.tpl.html',
				controller: 'PermissionDetailsCtrl',
				controllerAs: 'permissionVm',
				data: {
					pageTitle: 'Permission Details',
					module: 'permission',
					parent: 'permissions',
					permission: 'Permissions'
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
