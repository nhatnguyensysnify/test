(function () {
    'use strict';

    angular.module('app.media')
	.controller('MediaEditImageCtrl', MediaEditImageCtrl);

    /** @ngInject */
    function MediaEditImageCtrl($rootScope, $scope, $state, mediaService) {
        console.log('run new list ctrl');
    }

})();
