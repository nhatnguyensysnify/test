(function() {
	'use strict';
	angular.module('app.membership').factory('memberShipFacilitiesService', memberShipFacilitiesService);
	  /** @ngInject **/
  	function memberShipFacilitiesService($q, firebaseDataRef, DataUtils){
  		var items = firebaseDataRef.child('membership-facilities');

  		var service = {
			get : get,
			itemsLoadOnce: getFacilitiesLoadOnce,
			search: search
  		};

  		return service;
	
		function getFacilitiesLoadOnce(){
			return DataUtils.getListDataFirebaseLoadOnce(items);
		}

  		function get(id){
			var item = firebaseDataRef.child('membership-facilities/' + id);
			return DataUtils.getDataFirebaseLoadOnce(item, true);
		}
		  
		function search(keyword){
			if(!keyword){
				return $q.when([]);
			}
			return getFacilitiesLoadOnce().then(function(data){
				return _.filter(data, function (item) {
					for(var attr in item) {
						if (searchMatch(item[attr] + '', keyword)){
							return true;
						}
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
