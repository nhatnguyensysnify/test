(function() {
	'use strict';

	angular
		.module('app.dRemote')
		.config(config);

	/** @ngInject */
	function config($stateProvider) {
		var states = {};
		states.dRemote ={
			parent: 'root',
			url: '/dremote/dremoteholder?link',
			templateUrl: './app/dRemote/dRemoteHolder.tpl.html',
			controller: 'dRemoteHolderCtrl'
		};

		for(var state in states){
			$stateProvider.state(state, states[state]);
		}
	}
})();
