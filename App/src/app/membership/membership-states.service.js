(function() {
    'use strict';

    angular.module("app.membership").factory("memStateService", memStateService);

    /** @ngInject **/
    function memStateService(firebaseDataRef, DataUtils) {
        var stateRef = firebaseDataRef.child('membership-states');

        var memStatesService = {
            statesLoadOnce: getAllStateLoadOnce,
            getAll: getAllStateLoadOnce
        };

        return memStatesService;

        function getAllStateLoadOnce() {
            return DataUtils.getListDataFirebaseLoadOnce(stateRef);
        }
    }
})();