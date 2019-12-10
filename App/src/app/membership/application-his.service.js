(function() {
	'use strict';
	angular.module('app.membership').factory('memAppHisService',memAppHisService);
  /** @ngInject **/
  function memAppHisService(firebaseDataRef, DataUtils){
  		var items = firebaseDataRef.child('application-history');

  		var service = {
  			create: create
  		};

  		return service;

  		function create(add){
        	var key = items.push().key;
			add = DataUtils.stripDollarPrefixedKeys(add);
   			return items.child(key).update(add).then(function(result) {
  		        return {result: true , errorMsg: "", id: key};
  		      }).catch(function(error) {
							console.log(error);
  		        return {result: false , errorMsg: error.message};
  		    });
  		}
  		
	  }
})();
