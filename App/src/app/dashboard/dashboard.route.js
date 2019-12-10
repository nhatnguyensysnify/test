(function() {
	'use strict';

	angular
		.module('app.dashboard')
		.config(config)
		.run(appRun);
	/** @ngInject */
    function appRun($anchorScroll) { 
		$anchorScroll.yOffset = 50; 
	}	
	/** @ngInject */
	function config($stateProvider) {
		var states = {};

		states.dashboard ={
			parent: 'root',
			url: '/dashboard',
			templateUrl: './app/dashboard/dashboard-layout.tpl.html',
			resolve:{
				"currentAuth": ["authService", function(authService) {
					return authService.requireSignIn();
				}],
				deps: ['$ocLazyLoad', function($ocLazyLoad){
					return $ocLazyLoad.load({
						cache: true,
						name: 'app.dashboard',
						files: [
							'./app/membership/application-snapshot.js',
							'./app/membership/membership-snapshot.js',
							'./app/membership/application.service.js',
							'./app/membership/application-device-info.service.js',
							'./app/membership/membership.service.js',
							'./app/membership/membership-facilities.service.js',
							'./app/membership/membership-states.service.js',
							'./app/membership/membership-regions.service.js',
							'./app/employee/employee.service.js',
							'./app/employee/department.service.js',
							'./app/employee/manager.service.js',
							'./app/employee/employee-queue.service.js',
							'./app/event/event-queue.service.js',
							
						]
					});
				}]
			}
		};

		states['dashboard.index'] = {
			url: '/dashboard',
			templateUrl: './app/dashboard/dashboard.tpl.html',
			controller: 'dashboardListCtrl as dashboardVm',
			data: {
				pageTitle: 'Dashboard',
				module: 'dashboard',
				icon: 'icon-speedometer',
				permission: 'Dashboard'
			},
			resolve: {
				deps: ['$ocLazyLoad', function($ocLazyLoad){
					return $ocLazyLoad.load({
						cache: true,
						name: 'app.dashboard',
						files: [
							'./app/dashboard/dashboard.js',
							'./app/dashboard/dashboard-modal/dashboard-info-modal.js'
						]
					});
				}]
			}
		};

		states['dashboard.employee'] = {
			url: '/dashboard-employee',
			templateUrl: './app/dashboard/dashboard-employee.tpl.html',
			controller: 'dashboardEmployeeCtrl as dashboardVm',
			data: {
				pageTitle: 'My Dashboard',
				module: 'edashboard',
				icon: 'fa fa-tachometer',
				permission: 'MyDashboard'
			},
			resolve: {
				deps: ['$ocLazyLoad', function($ocLazyLoad){
					return $ocLazyLoad.load({
						cache: true,
						name: 'app.dashboard',
						files: [
							'./app/dashboard/dashboard-employee.js',
							'./app/dashboard/dashboard-modal/dashboard-employee-info-modal.js'
						]
					});
				}]
			}
		};

		states['dashboard.clearapplication'] = {
			url: '/clear-application',
			templateUrl: './app/dashboard/clear-application-data.tpl.html',
			controller: 'clearApplicationCtrl as vm',
			data: {
				pageTitle: 'Clear Application',
				module: 'dashboard',
				permission: 'Dashboard'
			},
			resolve: {
				deps: ['$ocLazyLoad', function($ocLazyLoad){
					return $ocLazyLoad.load({
						cache: true,
						name: 'app.clearapplication',
						files: [
							'./app/dashboard/clear-application-data.js',
						]
					});
				}]
			}
		};

		for(var state in states){
			$stateProvider.state(state, states[state]);
		}
	}
})();
