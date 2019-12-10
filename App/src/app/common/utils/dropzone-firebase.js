(function () {
	Dropzone.autoDiscover = false;
	dropzoneFirebaseStoreage();
	angular.module('app.utils')
		.run(dropzoneFirebaseStoreage);
	/** @ngInject **/
	function dropzoneFirebaseStoreage(FileUploadService, $q, appUtils) {
		if (window.isOverrideDropzone || !FileUploadService) {
			return;
		}
		window.isOverrideDropzone = true;
		// var $injector = angular.injector(['ng', 'app.utils', 'app.config','app.core', 'ui.bootstrap']);
		// var FileUploadService = $injector.get('FileUploadService');

		Dropzone.prototype.oriUploadFiles = Dropzone.prototype.uploadFiles;
		Dropzone.prototype.uploadFiles = function (files) {
			appUtils.showLoading();
			if (!this.options.firebaseStorage) {
				return this.oriUploadFiles(files);
			}

			// override up to firebasee
			// override up to firebasee
			function thenGenThumbAndLowRes(res) {
				if (!res.lowRes || !res.thumb) {
					return {};
				}
				var metadata = {
					contentType: res.thumb.type
				};
				var uTasks = {};
				uTasks.thumb = FileUploadService.upload(this.options.url, res.thumb, metadata);
				uTasks.lowres = FileUploadService.upload(this.options.url, res.lowRes, metadata);
				return uTasks;
			}

			function uploadFile(file) {
				var metadata = {
					contentType: file.type
				};
				var genThumbAndLowRes = this.options.genThumbAndLowRes;
				var _this = this;

				var uploadTasks = {}, results = {};
				var uploadTask = FileUploadService.upload(this.options.url, file, metadata);
				var thumblowPromise;
				if (genThumbAndLowRes !== false) {
					thumblowPromise = FileUploadService.genThumbAndLowRes(file)
						.then(thenGenThumbAndLowRes.bind(this));
				}
				else {
					thumblowPromise = $q.when({});
				}
				thumblowPromise.then(function (res) {
					uploadTasks = res;
					uploadTasks.ori = uploadTask;

					_.each(uploadTasks, function (uTask, key) {
						results[key] = {
							progress: 0,
							total: 0,
							bytesSent: 0,
							done: false,
							url: ''
						};
					});

					// handle upload process
					_.each(uploadTasks, function (uTask, $index) {
						uTask.on(firebase.storage.TaskEvent.STATE_CHANGED, function (snapshop) {
							var total = snapshop.totalBytes, loaded = snapshop.bytesTransferred;
							var progress = (loaded / total) * 100;
							angular.extend(results[$index], {
								progress: progress,
								total: total,
								bytesSent: loaded
							});
							var sProgress, sTotal = 0, sBytesSend = 0;
							_.each(results, function (r) {
								sTotal += r.total;
								sBytesSend += r.bytesSent;
							});
							sProgress = (sBytesSend / sTotal) * 100;

							file.upload = {
								progress: sProgress,
								total: sTotal,
								bytesSent: sBytesSend
							};
							_this.emit("uploadprogress", file, sProgress, sBytesSend);
						}, function (error) {
							_this._errorProcessing([file], error.code);
						}, function () {
							// Handle successful uploads on complete
							//var downloadURL = uTask.snapshot.downloadURL;
							// console.log(uTask.snapshot);
							// results[$index].info = uTask.snapshot;
							results[$index].done = true;
							var found = _.find(results, { done: false });
							if (!found) {
								_this._finished([file], uploadTasks);
							}
						});
					});
				});
			}

			_.each(files, uploadFile.bind(this));
		};
	}
})();