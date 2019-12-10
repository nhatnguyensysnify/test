(function () {
  'use strict';

  angular.module('app.media')
    .controller('ImagesGalleryCtrl', ImagesGalleryCtrl);

  /** @ngInject */
  function ImagesGalleryCtrl($uibModalInstance, $http, authService, mediaService, isFeatured, appUtils, toaster) {
    var galleryVm = this,
      currentUser = authService.getCurrentUser(), //$rootScope.storage.currentUser,
      formDropzone;

    galleryVm.showInvalid = false;
    galleryVm.urlUpload = '';
    galleryVm.urlUploadRegx = RegExp("^(http|https|ftp)\://([a-zA-Z0-9\.\-]+(\:[a-zA-Z0-9\.&amp;%\$\-]+)*@)*((25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9])\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9]|0)\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[1-9]|0)\.(25[0-5]|2[0-4][0-9]|[0-1]{1}[0-9]{2}|[1-9]{1}[0-9]{1}|[0-9])|([a-zA-Z0-9\-]+\.)*[a-zA-Z0-9\-]+\.(com|edu|gov|int|mil|net|org|biz|arpa|info|name|pro|aero|coop|museum|[a-zA-Z]{2}))(\:[0-9]+)*(/($|[a-zA-Z0-9\.\,\?\'\\\+&amp;%\$#\=~_\-]+))*$");
    galleryVm.AllMedia = mediaService.media();
    galleryVm.Files = [];
    galleryVm.Images = [];
    galleryVm.isFeatured = isFeatured;

    galleryVm.keyword = '';
    galleryVm.modelItems = [];
    galleryVm.selectedFiles = [];


    //Load Data
    function loadData() {
      galleryVm.AllMedia.$loaded(function () {
        if (galleryVm.AllMedia.length > 0) {
          _.forEach(galleryVm.AllMedia, function (value, key) {
            var type = value.type.split('/')[0];
            if (type === 'image') {
              galleryVm.Images.push(value);
            }
            if (type === 'text' || type === 'application') {
              galleryVm.Files.push(value);
            }
          });
          galleryVm.modelItems = galleryVm.AllMedia;
          if (isFeatured) {
            galleryVm.modelItems = galleryVm.Images;
          }
        }
      });
    }


    loadData();

    //Functions
    galleryVm.close = function () {
      galleryVm.selectedFiles = [];
      $uibModalInstance.dismiss('cancel');
    };

    galleryVm.getAllItems = function () {
      galleryVm.uploadTab = false;
      galleryVm.modelItems = galleryVm.AllMedia;
      galleryVm.selectedFiles = [];
    };

    galleryVm.getFiles = function () {
      galleryVm.uploadTab = false;
      galleryVm.modelItems = galleryVm.Files;
      galleryVm.selectedFiles = [];
    };

    galleryVm.getImages = function () {
      galleryVm.uploadTab = false;
      galleryVm.modelItems = galleryVm.Images;
      galleryVm.selectedFiles = [];
    };

    galleryVm.uploadFileTab = function () {
      galleryVm.uploadTab = true;
      formDropzone = $("#form-dropzone");
      formDropzone.dropzone({
        parallelUploads: 10
      });
    };

    galleryVm.searchAllMedia = function (keyword) {
      searchMedia(keyword, galleryVm.AllMedia).then(function (result) {
        galleryVm.modelItems = result;
      });
    };

    galleryVm.searchImages = function (keyword) {
      searchMedia(keyword, galleryVm.Images).then(function (result) {
        galleryVm.modelItems = result;
      });
    };

    galleryVm.searchFiles = function (keyword) {
      searchMedia(keyword, galleryVm.Files).then(function (result) {
        galleryVm.modelItems = result;
      });
    };

    galleryVm.checkIsImg = function (itemType) {
      var type = itemType.split('/')[0];
      return type === 'image';
    };

    galleryVm.isSelected = function (item) {
      var inselected = $.inArray(item, galleryVm.selectedFiles);
      return inselected !== -1;
    };

    galleryVm.selectFile = function (control, item) {
      var isSelected = $.inArray(item, galleryVm.selectedFiles);
      if (isSelected === -1) {
        if (isFeatured) {
          galleryVm.selectedFiles = [];
        }
        galleryVm.selectedFiles.push(item);
      } else {
        galleryVm.selectedFiles.splice(isSelected, 1);
      }
    };

    galleryVm.insert = function () {
      $uibModalInstance.close(galleryVm.selectedFiles);
    };

    function searchMedia(keyword, lstObj) {
      return $filter('filter')(lstObj, function (item) {
        for (var attr in item) {
          if (searchMatch(item[attr] + '', keyword))
            return true;
        }

        return false;
      });
    }

    function searchMatch(haystack, needle) {
      if (!needle) {
        return true;
      }
      return haystack.toLowerCase().indexOf(needle.toLowerCase()) !== -1;
    }

    //Upload File

    //Overite submitRequest method of dropzone.js file
    Dropzone.prototype.submitRequest = function (xhr, formData, files) {
      formDropzone.find('.dz-progress:visible').find('.dz-upload').css('background', 'green');
      var file = files[0];
      // Create the file metadata
      var metadata = {
        contentType: file.type
      };

      var uploadTask = mediaService.uploadFile('files/', file, metadata);

      uploadTask.on(firebase.storage.TaskEvent.STATE_CHANGED,
        function (snapshot) {
          var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          var dzProgress = formDropzone.find('.dz-progress:visible');
          dzProgress.find('.dz-upload').css('width', progress + '%');

          if (progress == 100) {
            setTimeout(function () {
              dzProgress.hide();
            }, 1000);
          }

          switch (snapshot.state) {
            case firebase.storage.TaskState.PAUSED: // or 'paused'
              console.log('Upload is paused');
              break;
            case firebase.storage.TaskState.RUNNING: // or 'running'
              console.log('Upload is running');
              break;
          }
        }, function (error) {
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
        },
        function () {
          // Upload completed successfully, now we can get the download URL
          var downloadURL = uploadTask.snapshot.downloadURL;
          var imgFile = {
            fileName: uploadTask.snapshot.metadata.name,
            fileSize: uploadTask.snapshot.metadata.size,
            type: uploadTask.snapshot.metadata.contentType,
            timestampCreated: appUtils.getTimestamp(),
            timestampModified: appUtils.getTimestamp(),
            storageLocation: 'gs://' + uploadTask.snapshot.metadata.bucket + '/' + uploadTask.snapshot.metadata.fullPath,
            downloadUrl: uploadTask.snapshot.downloadURL,
            author: currentUser.email,
            bucket: uploadTask.snapshot.metadata.bucket,
            fullPath: uploadTask.snapshot.metadata.fullPath,
            displayName: file.name.split('.')[0],
            fileType: file.name.split('.')[1],
            description: '',
            alternativeText: '',
            caption: ''
          };

          //Add File Info To Database
          mediaService.addFile(imgFile).then(function (res) {
            if (res.result) {
              galleryVm.modelItems = [];
              galleryVm.Files = [];
              galleryVm.Images = [];
              loadData();
              toaster.options = {
                "positionClass": "toaster-bottom-right"
              };
              toaster.success("Add file successfully!");
              return;
            }

            toaster.error(res.errorMsg);
          });

        });
    };

    galleryVm.uploadViaUrl = function (form) {
      galleryVm.showInvalid = true;
      if (form.$invalid) {
        return;
      }

      //Get file from Url
      $http.get(galleryVm.urlUpload, { responseType: "blob" }).success(function (data) {
        var filename = galleryVm.urlUpload.substring(galleryVm.urlUpload.lastIndexOf('/') + 1);
        var file = new File([data], filename);
        var metadata = {
          contentType: data.type
        };

        // Upload file
        var progressBar = $('#upload-progess');
        progressBar.show();

        var uploadTask = mediaService.uploadFile('files/', file, metadata);

        uploadTask.on(firebase.storage.TaskEvent.STATE_CHANGED,
          function (snapshot) {
            var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            progressBar.find('.progress-bar').css('width', progress + '%');
            if (progress == 100) {
              setTimeout(function () {
                progressBar.hide();
              }, 1000);
            }

            switch (snapshot.state) {
              case firebase.storage.TaskState.PAUSED: // or 'paused'
                console.log('Upload is paused');
                break;
              case firebase.storage.TaskState.RUNNING: // or 'running'
                console.log('Upload is running');
                break;
            }
          }, function (error) {
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
          }, function () {
            // Upload completed successfully
            var downloadURL = uploadTask.snapshot.downloadURL;
            var imgFile = {
              fileName: uploadTask.snapshot.metadata.name,
              fileSize: uploadTask.snapshot.metadata.size,
              type: uploadTask.snapshot.metadata.contentType,
              timestampCreated: appUtils.getTimestamp(),
              timestampModified: appUtils.getTimestamp(),
              storageLocation: 'gs://' + uploadTask.snapshot.metadata.bucket + '/' + uploadTask.snapshot.metadata.fullPath,
              downloadUrl: uploadTask.snapshot.downloadURL,
              author: currentUser.email,
              bucket: uploadTask.snapshot.metadata.bucket,
              fullPath: uploadTask.snapshot.metadata.fullPath,
              displayName: file.name.split('.')[0],
              fileType: file.name.split('.')[1],
              description: '',
              alternativeText: '',
              caption: ''
            };

            //Add File Info To Database
            mediaService.addFile(imgFile).then(function (res) {
              if (res.result) {
                galleryVm.modelItems = [];
                galleryVm.Files = [];
                galleryVm.Images = [];
                loadData();
                return;
              }
              toaster.error(res.errorMsg);

            });
          });
      }).error(function (error, status) {
        console.log(error);
        console.log(status);
      });
    };
  }

})();