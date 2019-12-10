(function () {
    'use strict';
    angular.module('app.membership').factory('memAppVerifyService', memAppVerifyService);
    /** @ngInject **/
        function memAppVerifyService(firebaseDataRef) {
            var items = firebaseDataRef.child('membership-application-verify');
            var service = {
                create: create,
                remove: remove
            };
            
            return service;

            function create(appId) {
                return items.child(appId).set({appId: appId}).then(function(result) {
                    return {result: true , id: appId};
                }).catch(function(error) {
                    console.log(error);
                    return {result: false , errorMsg: error.message};
                });
            }

            function remove(appId) {
                return firebaseDataRef.child('membership-application-verify/' + appId).remove();
            }

        }
})();
