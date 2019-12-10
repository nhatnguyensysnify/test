(function () {
	'use strict';

	angular.module('app.media')
		.controller('MediaEditCtrl', MediaEditCtrl);

	/** @ngInject */
	function MediaEditCtrl($rootScope, $sce, $state, $q, $stateParams, toaster, $ngBootbox, authService, mediaService, appUtils) {
		var mediaVm = this;
		$rootScope.settings.layout.showSmartphone = false;

		var currentUser = authService.getCurrentUser(); //$rootScope.storage.currentUser;
		mediaVm.model = {};
		mediaVm.model.$id = $stateParams.id;

		//Load Data
		function loadDataFile() {
			return mediaService.media().$loaded(function (data) {
				mediaService.get(mediaVm.model.$id).$loaded().then(function (item) {
					if (item) {
						return { media: item };
					}
					return { media: null };
				});

			});
		}

		function loadData() {
			var reqs;
			var media = loadDataFile();
			reqs = [media];
			return $q.all(reqs).then(function (res_array) {
				mediaVm.model = res_array[0].media;
				mediaVm.fileSize = appUtils.formatBytesSize(mediaVm.model.fileSize);
				mediaVm.type = mediaVm.model.type.split('/')[0];
				if (mediaVm.type == "video") {
					mediaVm.videoLink = $sce.trustAsResourceUrl(mediaVm.model.downloadUrl);
				}
				return res_array;
			});
		}

		loadData();

		//Functions
		mediaVm.update = function (form) {
			if (form.$invalid) {
				return;
			}
			mediaVm.model.modifiedBy = currentUser.email;
			mediaVm.model.timestampModified = appUtils.getTimestamp();
			mediaService.editFile(mediaVm.model).then(function (rs) {
				if (rs.result) {
					toaster.success("Save success!");
					$state.go('library');
				} else {
					toaster.error(rs.errorMsg);
				}
			});
		};

		mediaVm.delete = function (item) {
			$ngBootbox.confirm('Are you sure want to delete ' + mediaVm.model.fileName + '?').then(function () {
				mediaService.deleteFile(item.$id).then(function (res) {
					if (res.result) {
						mediaService.deleteFileInStorage(item.fullPath);
						toaster.pop('success', 'Success', "Delete Successful!");
						$state.go('library');
					} else {
						toaster.pop('error', 'Error', "Delete  Error! " + res.errorMsg);
					}
				});
			}, function () {
			});

		};

		mediaVm.cancel = function () {
			$state.go('library');
		};
	}

})();
