(function () {
	'use strict';
	angular.module('app.dialog')
		.factory('dialogService', dialogService);
	/** @ngInject **/
	function dialogService($ngBootbox, DialogButton) {

		const defaultSize = 'large';

		var service = {
			confirm: confirm,
			alert: alert
		};

		function confirm(mess) {
			return $ngBootbox.confirm({
				message: mess,
				buttons: {
					confirm: DialogButton.OK,
					cancel: DialogButton.CANCEL
				}
			});
		}

		function alert(mess) {
			return $ngBootbox.alert({
				message: mess,
				buttons: {
					ok: DialogButton.OK
				}
			});
		}

		return service;
	}
})();