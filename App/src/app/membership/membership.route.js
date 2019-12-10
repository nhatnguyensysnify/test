(function () {
    'use strict';
    angular
		.module('app.membership')
		.config(config)
		.run(appRun);
	/** @ngInject */
    function appRun($anchorScroll) { 
		$anchorScroll.yOffset = 50; 
	}
	/** @ngInject */
    function config($stateProvider) {
		var states = {};

		states.membership ={
			parent: 'root',
			url: '/membership',
			templateUrl: './app/membership/membership-layout.tpl.html',
			resolve:{
				"currentAuth": ["authService", function(authService) {
					return authService.requireSignIn();
				}],
				deps: ['$ocLazyLoad', function($ocLazyLoad){
					return $ocLazyLoad.load({
						cache: true,
						name: 'app.membership',
						files: [
							'./app/membership/application-his.service.js',
							'./app/membership/application-snapshot.js',
							'./app/membership/application-timeline.service.js',
							'./app/membership/application-verify.service.js',
							'./app/membership/application.service.js',
							'./app/membership/application-device-info.service.js',
							'./app/membership/membership-addons.service.js',
							'./app/membership/membership-facilities.service.js',
							'./app/membership/membership-territories.service.js',
							'./app/membership/person-title.service.js',
							'./app/membership/membership-media.js',
							'./app/membership/membership-plans.service.js',
							'./app/membership/membership-process-queue.service.js',
							'./app/membership/pdf-process-queue.service.js',
							'./app/membership/membership-regions.service.js',
							'./app/membership/membership-snapshot.js',
							'./app/membership/membership.service.js',
							'./app/membership/membership-states.service.js',
							'./app/membership/application-device-info.service.js',
							'./app/membership/application-indecator.service.js',
							'./app/employee/employee.service.js',
							'./app/employee/manager.service.js',
							'./app/employee/employee-queue.service.js',
							'./app/employee/department.service.js',
							'./app/event/event.service.js',
							'./app/event/event-tracking.service.js',
							'./app/event/event-queue.service.js',
                            './app/event/event-upload-logs.service.js',
							'./app/employee/baseEmployeeLogClass.js'
						]
					});
				}]
			}
		};

		states['membership.list'] = {
			url: '/list',
			templateUrl: 'app/membership/application/application.tpl.html',
			controller: 'ApplicationCtrl as applicationVm',
			data: {
				pageTitle: 'Applications',
				module: 'membership',
				icon: 'fa fa-universal-access',
				permission: 'Applications'
			},
			resolve: {
				deps: ['$ocLazyLoad', function($ocLazyLoad){
					return $ocLazyLoad.load({
						cache: true,
						name: 'app.membership.list',
						files: [
							'./app/membership/application/application.js',
							'./app/membership/application/add_edit/edit.js',
							'./app/membership/modal/add-web-app.js',
							'./app/membership/modal/change-status-app.js',
							'./app/membership/modal/popup-original-image.js',
							'./app/membership/modal/preview-app.js',
							'./app/membership/modal/facility-list-popup.js',
							'./app/membership/modal/tracking-activities.js',
							'./app/event/modal/event-list-popup.js',
							'./app/employee/modal/employee-list-popup.js'
						]
					});
				}]
			}
		};

		// states['membership.application'] = {
		// 	url: '/application/:id?tab&keyword&start&end&page&author',
		// 	templateUrl: 'app/membership/application/application.tpl.html',
		// 	controller: 'ApplicationCtrl as applicationVm',
		// 	data: {
		// 		pageTitle: 'Applications',
		// 		module: 'membership',
		// 		parent: 'membership'
		// 	},
		// 	resolve: {
		// 		deps: ['$ocLazyLoad', function($ocLazyLoad){
		// 			return $ocLazyLoad.load({
		// 				cache: true,
		// 				name: 'app.membership.application',
		// 				files: [
		// 					'./app/membership/application/application.js',
		// 					'./app/membership/application/add_edit/edit.js',
		// 					'./app/membership/modal/add-web-app.js',
		// 					'./app/membership/modal/change-status-app.js',
		// 					'./app/membership/modal/popup-original-image.js',
		// 					'./app/membership/modal/preview-app.js',
		// 					'./app/membership/modal/facility-list-popup.js',
		// 					'./app/membership/modal/tracking-activities.js'
		// 				]
		// 			});
		// 		}]
		// 	}
		// };

		states['membership.addOCR'] = {
			url: '/add-ocr',
			templateUrl: 'app/membership/application/add_edit/upload-file-app.tpl.html',
			controller: 'AddAppOCRCtrl as applicationVm',
			data: {
				pageTitle: 'Forms Upload',
				module: 'membership',
				permission: 'Applications'
			},
			resolve: {
				deps: ['$ocLazyLoad', function($ocLazyLoad){
					return $ocLazyLoad.load({
						cache: true,
						name: 'app.membership.addOCR',
						files: [
							'./app/membership/application/add_edit/upload-file-app.js',
							'./app/membership/application/add_edit/upload-file-app-history-tracking.js',
							'./app/membership/modal/facility-list-popup.js',
							'./app/event/modal/event-list-popup.js',
							'./app/employee/modal/employee-list-popup.js'

						]
					});
				}]
			}
		};

		states['membership.editApplication'] = {
			url: '/application/:id?tab&status&keyword&start&end&page&author&alias&state&plantype&reportBy&sortBy',
			templateUrl: 'app/membership/application/application.tpl.html',
			controller: 'ApplicationCtrl as applicationVm',
			data: {
				pageTitle: 'Applications',
				module: 'membership',
				permission: 'Applications'
			},
			resolve: {
				deps: ['$ocLazyLoad', function($ocLazyLoad){
					return $ocLazyLoad.load({
						cache: true,
						name: 'app.membership.editApplication',
						files: [
							'./app/membership/application/application.js',
							'./app/membership/application/add_edit/edit.js',
							'./app/membership/modal/add-web-app.js',
							'./app/membership/modal/change-status-app.js',
							'./app/membership/modal/popup-original-image.js',
							'./app/membership/modal/preview-app.js',
							'./app/membership/modal/facility-list-popup.js',
							'./app/membership/modal/tracking-activities.js',
							'./app/event/modal/event-list-popup.js',
							'./app/employee/modal/employee-list-popup.js'
						]
					});
				}]
			}
		};

		states['membership.members'] = {
			url: '/members?keyword&start&end&page&author&alias&status&state&plantype&sortBy',
			templateUrl: 'app/membership/members/members.tpl.html',
			controller: 'MembersCtrl as membershipVm',
			data: {
				pageTitle: 'Members',
				module: 'membership',
				permission: 'Applications'
			},
			resolve: {
				deps: ['$ocLazyLoad', function($ocLazyLoad){
					return $ocLazyLoad.load({
						cache: true,
						name: 'app.membership.members',
						files: [
							'./app/membership/members/members.js'
						]
					});
				}]
			}
		};

		states['membership.memberdetails'] = {
			url: '/members/details/:id',
			templateUrl: 'app/membership/members/member-details.tpl.html',
			controller: 'MemberDetailsCtrl as membershipVm',
			data: {
				pageTitle: 'Member Details',
				module: 'membership',
				permission: 'Applications'
			},
			resolve: {
				deps: ['$ocLazyLoad', function($ocLazyLoad){
					return $ocLazyLoad.load({
						cache: true,
						name: 'app.membership.memberdetails',
						files: [
							'./app/membership/members/member-details.js'
						]
					});
				}]
			}
		};

		for(var state in states){
			$stateProvider.state(state, states[state]);
		}
        // $stateProvider.state(
		// // 	'membershipDashboard', {
		// // 	    url: '/membership/dashboard',
		// // 	    templateUrl: 'app/membership/membership.tpl.html',
		// // 	    controller: 'MembershipCtrl',
		// // 	    controllerAs: 'membershipVm',
		// // 	    data: {
		// // 	        pageTitle: 'Dashboard',
		// // 			module: 'membership',
		// // 			icon: 'icon-speedometer',
		// // 			permission: 'Dashboard'
					
		// // 	    },
		// // 	    resolve: {
		// // 	        "currentAuth": ["authService", function (authService) {
		// // 	            return authService.requireSignIn();
		// // 	        }]
		// // 	    }
		// // 	}
		// // )
        // // .state(
		// 	'membership', {
		// 	    url: '/membership',
		// 	    templateUrl: 'app/membership/application/application.tpl.html',
		// 	    controller: 'ApplicationCtrl',
		// 	    controllerAs: 'applicationVm',
		// 	    data: {
		// 	        pageTitle: 'Membership',
		// 			module: 'membership',
		// 			icon: 'fa fa-universal-access',
		// 			permission: 'Membership'
					
		// 	    },
		// 	    resolve: {
		// 	        "currentAuth": ["authService", function (authService) {
		// 	            return authService.requireSignIn();
		// 	        }]
		// 	    }
		// 	}
		// )
        // // .state(
		// // 	'application', {
		// // 	    url: '/membership/application/:id?tab&keyword&start&end&page&author',
		// // 	    templateUrl: 'app/membership/application/application.tpl.html',
		// // 	    controller: 'ApplicationCtrl',
		// // 	    controllerAs: 'applicationVm',
		// // 	    data: {
		// // 	        pageTitle: 'Applications',
		// // 			module: 'membership',
		// // 	        parent: 'membership',
		// // 			subs: ['application','editApplication']
					
		// // 	    },
		// // 	    resolve: {
		// // 	        "currentAuth": ["authService", function (authService) {
		// // 	            return authService.requireSignIn();
		// // 	        }]
		// // 	    }
		// // 	}
		// // )
        // .state(
		// 	'editApplication', {
		// 	    // url: '/applications/edit/:id?tab&keyword&start&end&page&author',
		// 	    url: '/membership/application/:id?tab&keyword&start&end&page&author&region',
		// 	    templateUrl: 'app/membership/application/application.tpl.html',
		// 	    controller: 'ApplicationCtrl',
		// 	    controllerAs: 'applicationVm',
		// 	    data: {
		// 	        pageTitle: 'Applications',
		// 			module: 'membership',
		// 	        parent: 'membership',
		// 			// hide: true
		// 	    },
		// 	    resolve: {
		// 	        "currentAuth": ["authService", function (authService) {
		// 	            return authService.requireSignIn();
		// 	        }]
		// 	    }
		// 	}
		// )
        // .state(
		// 	'members', {
		// 	    url: '/members',
		// 	    templateUrl: 'app/membership/members/members.tpl.html',
		// 	    controller: 'MembersCtrl',
		// 	    controllerAs: 'membershipVm',
		// 	    data: {
		// 	        pageTitle: 'Members',
		// 			module: 'membership',
		// 	        parent: 'membership',
		// 			linkToParent: 'membership'
		// 	    },
		// 	    resolve: {
		// 	        "currentAuth": ["authService", function (authService) {
		// 	            return authService.requireSignIn();
		// 	        }]
		// 	    }
		// 	}
		// ).state(
		// 	'members2', {
		// 	    url: '/members2',
		// 	    templateUrl: 'app/membership/members/members2.tpl.html',
		// 	    controller: 'Members2Ctrl',
		// 	    controllerAs: 'membershipVm',
		// 	    data: {
		// 	        pageTitle: 'Members2',
		// 			module: 'membership2'
		// 	    },
		// 	    resolve: {
		// 	        "currentAuth": ["authService", function (authService) {
		// 	            return authService.requireSignIn();
		// 	        }]
		// 	    }
		// 	}
		// )
        // .state(
		// 	'memberdetails', {
		// 	    // url: '/member/details/:id',
		// 	    url: '/members/details/:id',
		// 	    templateUrl: 'app/membership/members/member-details.tpl.html',
		// 	    controller: 'MemberDetailsCtrl',
		// 	    controllerAs: 'membershipVm',
		// 	    data: {
		// 	        pageTitle: 'Member Details',
		// 			module: 'membership',
		// 	        parent: 'members',
		// 			hide: true
		// 	    },
		// 	    resolve: {
		// 	        "currentAuth": ["authService", function (authService) {
		// 	            return authService.requireSignIn();
		// 	        }]
		// 	    }
		// 	}
		// )
        // ;

    }
})();
