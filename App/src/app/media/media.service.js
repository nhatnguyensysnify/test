(function() {
	'use strict';
	angular.module('app.media').factory('mediaService', ['$q','authService','storageRef','$firebaseObject','$firebaseArray','firebaseDataRef','appUtils', '$filter',
  function($q,authService,storageRef,$firebaseObject,$firebaseArray,firebaseDataRef,appUtils, $filter){
      var media = firebaseDataRef.child('media');

  		var service = {
        media: getAll,
  			uploadFile : uploadFile,
        uploadStream: uploadStream,
        deleteFile : deleteFile,
        deleteFileInStorage : deleteFileInStorage,
        dowloadFile : dowloadFile,
        addFile : addFile,
        editFile : editFile,
        searchFile : searchFile,
        filterItems : filterItems,
        get : get
  		};

  		return service;
      function getAll(){
        return $firebaseArray(media);
      }

  		function uploadFile(folderPath, file, metadata){
        //folderPath: 'images/'
        var fileName = appUtils.formatImgFileName(file.name, '');
   			return storageRef.child(folderPath + fileName).put(file, metadata);
  		}

      function uploadStream(folderPath, file, metadata){
        return storageRef.child(folderPath).put(file, metadata);
      }

      function dowloadFile(folderPath, file){
        //folderPath: 'images/'
        var fileRef = storageRef.child(folderPath + file.FileName);
        fileRef.getDownloadURL().then(function(url) {
           return {imgUrl: url , errorMsg: ""};
        }).catch(function(error) {
          switch (error.code) {
            case 'storage/object_not_found':
              // File doesn't exist
              break;

            case 'storage/unauthorized':
              // User doesn't have permission to access the object
              break;

            case 'storage/canceled':
              // User canceled the upload
              break;
              
            case 'storage/unknown':
              // Unknown error occurred, inspect the server response
              break;
          }
        });
      }

      function get(id){
        var ref = firebaseDataRef.child('media/' + id);
        return $firebaseObject(ref);
      }

      function deleteFileInStorage(folderPath){
         //folderPath: 'images/'
        var fileRef = storageRef.child(folderPath);
        return fileRef.delete().then(function() {
           return {result: true , errorMsg: ""};
        }).catch(function(error) {
           return {result: false , errorMsg: error};
        });
      }

      function addFile(fileToAdd){
          var key = media.push().key;
          return media.child(key).update(fileToAdd).then(function(result) {
                return {result: true , fileKey: key};
              }).catch(function(error) {
                return {result: false , errorMsg: error};
            });
      }

      function editFile(fileToEdit){
          return fileToEdit.$save().then(function(){
            return {result: true , errorMsg: ""};
          }).catch(function(error) {
            return {result: false , errorMsg: error};
          });
      }

      function deleteFile(id){
          return media.child(id).remove().then(function(){
            return {result: true , errorMsg: ""};
          }).catch(function(error) {
            return {result: false , errorMsg: error};
          });
      }

      function filterItems(items, timestamp, type){
        var rs = [];
        _.forEach(items, function(value, key) {
          var imgType;
          if(type === 'file'){
            imgType = value.type.split("/")[0] === 'text' || value.type.split("/")[0] === 'application'; 
          }else{
            imgType = value.type.split("/")[0] === type; 
          }
          if((timestamp === 'All' || parseInt(value.timestampCreated) >= parseInt(timestamp)) && (type === 'All' || imgType)) {
            rs.push(value);
          }
        });
        return rs;
      }

      function searchFile(keyword){
        return $firebaseArray(media).$loaded().then(function(data){
          return $filter('filter')(data, function (item) {
              for(var attr in item) {
                if (searchMatch(item[attr] + '', keyword))
                  return true;
              }
              return false;
            });
        });
      }

      function searchMatch(haystack, needle) {
          if (!needle) {
            return true;
          }
          return haystack.toLowerCase().indexOf(needle.toLowerCase()) !== -1;
        }

  	  }      
	]);
})();
