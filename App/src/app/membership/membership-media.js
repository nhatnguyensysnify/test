(function() {
	'use strict';
	angular.module('app.membership').factory('membershipMediaService', membershipMediaService);
   /** @ngInject **/
  function membershipMediaService($q,authService,storageRef,$firebaseArray,firebaseDataRef,appUtils, $filter, DataUtils){
      var media = firebaseDataRef.child('membership-media');

  		var service = {
            items: getAll,
            get:get,
            uploadFile : uploadFile,
            deleteFileInStorage : deleteFileInStorage,
            dowloadFile : dowloadFile,
            addFile : addFile,
            searchFile : searchFile,
            filterItems : filterItems,
            getWithLoaded: getWithLoaded,
            updateApplicationId: updateApplicationId
  		};

  		return service;
      function getAll(){
          return $firebaseArray(media);
      }

      function get(mediaId){
        var ref = media.child(mediaId);
        return DataUtils.getDataFirebaseLoadOnce(ref, true);
      }

  		function uploadFile(folderPath, file, metadata){
            //folderPath: 'images/'
            var fileName = appUtils.formatImgFileName(file.name, '');
   			return storageRef.child(folderPath + fileName).put(file, metadata);
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

      function getWithLoaded(id){
        return $firebaseArray(media).$loaded().then(function(data){
            media.onDisconnect();
            return data.$getRecord(id);
        });
      }

      function deleteFileInStorage(folderPath){
         //folderPath: 'images/'
        var fileRef = storageRef.child(folderPath);
        return fileRef.delete().then(function() {
           return {result: true , errorMsg: ""};
        }).catch(function(error) {
           console.log(error);
           return {result: false , errorMsg: error.message};
        });
      }

      function addFile(fileToAdd){
          var key  = media.push().key;
          delete fileToAdd.$id;
          return media.child(key).update(fileToAdd).then(function(result) {
              return {result: true , fileKey: key};
              }).catch(function(error) {
                console.log(error);
                return {result: false , errorMsg: error.message};
          });   
      }

      function updateApplicationId(mediaId, applicationId){
        return media.child(mediaId).update({
          appId: applicationId
        }).then(function(result) {
          return {result: true , fileKey: mediaId};
        }).catch(function(error) {
          console.log(error);
          return {result: false , errorMsg: error.message};
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
          media.onDisconnect();
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
})();
