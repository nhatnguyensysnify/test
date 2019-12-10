(function () {
	'use strict';

	angular.module('app.home')
		.controller('HomeCtrl', HomeCtrl);

	/** @ngInject */
	function HomeCtrl($rootScope) {
		$rootScope.settings.layout.showPageHead = false;
        $rootScope.settings.layout.pageSidebarClosed = true;
        $rootScope.settings.layout.showBreadcrumb = false;
		//Redirect to tls dashboard
		// $state.go('dashboard.index');
		// var vm = this;
		// vm.gotowidgets = function () {
		// 	$state.go('widgets');
		// };
	}

})();