(function(){
  'use strict';
    angular.module("app.membership").factory("memProcessQueueService", memProcessQueueService);
    /** @ngInject **/
    function memProcessQueueService(firebaseDataRef, DataUtils){
        var items = firebaseDataRef.child('membership-process-queue');
        
        var memStatesService = {
            getById: getById,
            create: create,
            update: update,
            remove: remove
        };

        return memStatesService;

        function getById(id){
            var item = firebaseDataRef.child('membership-process-queue/' + id);
            return DataUtils.getListDataFirebaseLoadOnce(item, true);
        }

        function create(id, fileIndex){
            var key = moment().format('x');
            return items.child(id + '/' + key).set(fileIndex).then(function(result) {
                return {result: true , errorMsg: ""};
            }).catch(function(error) {
                console.log(error);
                return {result: false , errorMsg: error.message};
            });
        }

        function update(id, index, key){
            var ref = firebaseDataRef.child('membership-process-queue/' + id + '/' + index);
            return items.set(key).then(function(){
                return {result: true , errorMsg: ""};
            }).catch(function(error) {
                console.log(error);
                return {result: false , errorMsg: error.message};
            });
        }

        function remove(id){
            return items.child(id).remove().then(function(){
                return {result: true , errorMsg: ""};
            }).catch(function(error) {
                console.log(error);
                return {result: false , errorMsg: error.message};
            });
        }
    }
})();
