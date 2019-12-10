(function() {
	'use strict';
	angular.module('app.membership').factory('memberShipPlansService', memberShipPlansService);

	/** @ngInject **/
	function memberShipPlansService(firebaseDataRef, DataUtils){
  		var planRef = firebaseDataRef.child('membership-plans');

  		var service = {
			itemsLoadOnce: getPlansLoadOnce,
			getAll: getAll
  		};

  		return service;
		
		function getPlansLoadOnce(){
			return DataUtils.getListDataFirebaseLoadOnce(planRef);
		}

		function getAll(){
			return DataUtils.getDataFirebaseLoadOnce(planRef).then(function(rs){
				delete rs.$id;
        		delete rs.timestampModified;
				return rs;
			});
		}
	}
})();
