(function(){
  'use strict';

  angular.module('app.core')
  .factory('storageRef', function(){
    return firebase.storage().ref();
  });

})();
