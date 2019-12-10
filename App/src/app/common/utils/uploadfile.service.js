(function () {
	'use strict';
	angular.module('app.utils')
		.factory('FileUploadService', FileUploadService);

	/** @ngInject **/
	function FileUploadService(storageRef, appUtils, $q, $rootScope) {
		var service = {
			upload: upload,
			genThumbAndLowRes: genThumbAndLowRes
		};
		return service;

		function upload(folderPath, file, metadata) {
			var filename = appUtils.formatImgFileName(file.name, !file.width ? 'ori' : file.width + 'x' + file.height);
			return storageRef.child(folderPath + '/' + filename).put(file.data || file, metadata);
		}

		function genThumbAndLowRes(file) {
			var _URL = window.URL || window.webkitURL,
				img = new Image(),
				initGen = false;

			img.src = _URL.createObjectURL(file);
			var deferred = $q.defer();
			img.onload = function () {
				if (initGen) {
					return;
				}
				//get setting parse all lowRes and thumbnail to jpeg image.
				var isJpegType = $rootScope.storage.appSettings && !$rootScope.storage.appSettings.lowResImgJPEG ? false : true;

				var thumb = appUtils.imageHandler(img, true, file.type, isJpegType);
				thumb.name = isJpegType ? file.name.replace('.png', '.jpg').replace('.jpeg', '.jpg').replace('.tiff', '.jpg') : file.name;
				thumb.type = isJpegType ? 'image/jpeg' : file.type;

				var lowRes = appUtils.imageHandler(img, false, file.type, isJpegType);
				lowRes.name = isJpegType ? file.name.replace('.png', '.jpg').replace('.jpeg', '.jpg').replace('.tiff', '.jpg') : file.name;
				lowRes.type = isJpegType ? 'image/jpeg' : file.type;
				initGen = true;
				deferred.resolve({
					thumb: thumb,
					lowRes: lowRes
				});
			};
			img.onerror = function (res) {
				deferred.resolve({
					thumb: null,
					lowRes: null
				});
			};
			return deferred.promise;
		}
	}
})();