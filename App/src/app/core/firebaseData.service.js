(function(){
	'use strict';
	angular
	.module('app.core')
	.factory('firebaseDataRef', function(){
		return firebase.database().ref();
	});
})();
