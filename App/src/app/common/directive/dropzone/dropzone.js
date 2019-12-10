(function(){
	'use strict';
	angular.module('dropzone', []).directive('dropzone',['appUtils', 'authService', '$timeout', function (appUtils, authService, $timeout) {
		return {
			restrict: "E",
			scope: { configs: '=' },
	        template: [
				'<form class="dropzone dropzone-file-area margin-bottom-20" style="width: 100%;">',
					'<h3 class="sbold">Drop files here or click to upload</h3>',
					'<p> This is just a demo dropzone. Selected files are not actually uploaded. </p>',
					'<div ng-show="!configs.clearAfterUploaded">',
						'<button type="button" name="clearFiles" class="btn blue" ng-click="configs.clearUploadedFiles()">Clear Files</button>',
					'</div>',
				'</form>'
				].join(''),
			link: function (scope, element, attrs) {
				var config, dropzone;
				var dzFrm = element[0].querySelector('form');

				config = scope.configs;
				if ( !config.submitRequest ) {
					Dropzone.prototype.submitRequest = function ( xhr, formData, files ) {
						$('.dz-upload:visible').css('background', 'green');
						var file = files[0];

						// Create the file metadata
						var metadata = {
							contentType: file.type
						};
						// Upload file and metadata to the object 'images/mountains.jpg'
						var uploadTask = config.uploadFunc( config.uploadTo + '/', file, metadata );// Listen for state changes, errors, and completion of the upload.
						uploadTask.on(firebase.storage.TaskEvent.STATE_CHANGED, // or 'state_changed'
							function(snapshot) {
								// Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
								var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
								var dzProgress = $('.dz-progress:visible');
								dzProgress.find('.dz-upload').css('width', progress + '%');
								if(progress == 100){
								setTimeout(function(){
									dzProgress.hide();
								}, 1000);
								}

								switch (snapshot.state) {
								case firebase.storage.TaskState.PAUSED: // or 'paused'
									break;
								case firebase.storage.TaskState.RUNNING: // or 'running'
									break;
								}
							}, function(error) {
							switch (error.code) {
								case 'storage/unauthorized':
								// User doesn't have permission to access the object
								break;

								case 'storage/canceled':
								// User canceled the upload
								break;

								case 'storage/unknown':
								// Unknown error occurred, inspect error.serverResponse
								break;
							}
						}, function() {
							// Upload completed successfully, now we can get the download URL
							var downloadURL = uploadTask.snapshot.downloadURL;
							var imgFile = {
								fileName : uploadTask.snapshot.metadata.name,
								fileSize :  uploadTask.snapshot.metadata.size,
								type :  uploadTask.snapshot.metadata.contentType,
								timestampCreated : appUtils.getTimestamp(),
								timestampModified :  appUtils.getTimestamp(),
								storageLocation :  'gs://'+ uploadTask.snapshot.metadata.bucket +'/'+ uploadTask.snapshot.metadata.fullPath,
								downloadUrl :  uploadTask.snapshot.downloadURL,
								author :  authService.getCurrentUser().email,
								bucket:  uploadTask.snapshot.metadata.bucket,
								fullPath: uploadTask.snapshot.metadata.fullPath,
								displayName: file.name.split('.')[0],
								fileType:file.name.split('.')[1],
								description: '',
								alternativeText: '',
								caption: ''
							};

							if ( config.clearAfterUploaded ) Dropzone.forElement(dzFrm).removeAllFiles(true);

							//Callback function
							config.submitCallback(imgFile);
						});
					};
				} else {
					setTimeout(function() {
						Dropzone.prototype.submitRequest = config.submitRequest.bind(dzFrm);
					}, 100);
				}

				Dropzone.autoDiscover = false;
				dropzone = new Dropzone(dzFrm, config.options);
				
				// bind the given event handlers
				angular.forEach(config.eventHandlers, function (handler, event) {
					dropzone.on(event, handler);
				});
			}
		};
	}]);
})();