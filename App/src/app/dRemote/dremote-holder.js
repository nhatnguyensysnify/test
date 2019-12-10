(function () {
	'use strict';

	angular.module('app.dRemote')
		.controller('dRemoteHolderCtrl', dRemoteHolderCtrl);

	/** @ngInject */
	function dRemoteHolderCtrl($state, $location, appUtils, $stateParams, loadDyamicModules) {
		var link = $stateParams.link;
		var loaded = appUtils.DRemoteLoaded;
		appUtils.DRemoteLoaded = true;
		// console.log(link);
		if (!link || loaded) {
			$state.go('index');
			return;
		}
		$location.url(link);
	}
})();
