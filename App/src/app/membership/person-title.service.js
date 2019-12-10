(function() {
	'use strict';
	angular.module('app.membership').factory('personTitleService', personTitleService);
	  /** @ngInject **/
  	function personTitleService(firebaseDataRef, DataUtils){
  		var items = firebaseDataRef.child('membership-facilities');

  		var service = {
			getPrefixs : getPrefixs,
			getSuffixs: getSuffixs
  		};

  		return service;
	
		function getPrefixs(){
			var ref = firebaseDataRef.child('membership-prefix');
			return DataUtils.getListDataFirebaseLoadOnce(ref);
		}

  		function getSuffixs(id){
   			var ref = firebaseDataRef.child('membership-suffix');
			return DataUtils.getListDataFirebaseLoadOnce(ref);
  		}
	  }
})();
