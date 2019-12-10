(function(){
	'use strict';
	angular
		.module('app.media')
		.config(config)
		.run(appRun);
	/** @ngInject */
	function appRun(){}
	/** @ngInject */
	function config($stateProvider){
		$stateProvider.state(
			'library', {
			    url: '/media',
			    templateUrl: 'app/media/library/library.tpl.html',
			    controller: 'LibraryCtrl',
			    controllerAs: 'mediaVm',
				data: {
					pageTitle: 'Media',
					module: 'media',
					icon: 'icon-picture',
					index: 2
				},
				resolve:{
					"currentAuth": ["authService", function(authService) {
				        return authService.requireSignIn();
				     }]
				}
			}
		).state(
			'allLibrary', {
			    url: '/media/library',
			    templateUrl: 'app/media/library/library.tpl.html',
			    controller: 'LibraryCtrl',
			    controllerAs: 'mediaVm',
				data: {
					pageTitle: 'Library',
					module: 'media',
				    parent: 'library',
					subs: ['editMedia', 'editImage']
				},
				resolve:{
					"currentAuth": ["authService", function(authService) {
				        return authService.requireSignIn();
				     }]
				}
			}
		).state(
			'addMedia', {
			    url: '/media/add',
			    templateUrl: 'app/media/add_edit/add.tpl.html',
			    controller: 'MediaAddCtrl',
				controllerAs: 'mediaVm',
				data: {
				    pageTitle: 'Upload New Media',
					module: 'media',
				    parent: 'library'
				},
				resolve:{
					"currentAuth": ["authService", function(authService) {
				        return authService.requireSignIn();
				     }]
				}
			}
		).state(
			'editMedia', {
			    url: '/media/edit/:id',
			    templateUrl: 'app/media/add_edit/edit.tpl.html',
			    controller: 'MediaEditCtrl',
			    controllerAs: 'mediaVm',
			    data: {
			        pageTitle: 'Edit Media',
					module: 'media'
			    },
			    resolve:{
					"currentAuth": ["authService", function(authService) {
				        return authService.requireSignIn();
				     }]
				}
			}
		).state(
			'editImage', {
				url: '/media/editImage',
				templateUrl: 'app/media/files/edit-image.tpl.html',
				controller: 'MediaEditImageCtrl',
				controllerAs: 'mediaVm',
				data: {
					pageTitle: 'Edit Image',
					module: 'media'
				},
				resolve:{
					"currentAuth": ["authService", function(authService) {
				        return authService.requireSignIn();
				     }]
				}
			}
		).state(

			'uploadFiles', {
			    url: '/media/uploadfiles',
			    templateUrl: 'app/media/files/upload.tpl.html',
			    controller: 'MediaUploadFileCtrl',
			    controllerAs: 'mediaVm',
			    data: {
			        pageTitle: 'Media',
					module: 'media',
					hide: true
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
