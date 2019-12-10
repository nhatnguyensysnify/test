(function() {
	'use strict';
	angular.module('app.membership').factory('memberShipAddOnsService', memberShipAddOnsService);
	/** @ngInject **/
	function memberShipAddOnsService(firebaseDataRef, DataUtils) {
		var addOnRef = firebaseDataRef.child('membership-addons');

		var service = {
			itemsLoadOnce: getAddonLoadOnce,
			getAll: getAll
		};

		return service;
		/* deprecated */
		function getAddonLoadOnce() {
			return DataUtils.getListDataFirebaseLoadOnce(addOnRef);
		}

		function getAll() {
			return DataUtils.getDataFirebaseLoadOnce(addOnRef).then(function(rs) {
				delete rs.$id;
				delete rs.timestampModified;
				return rs;
			});
		}
	}
})();