(function(){
    'use strict';
  
    angular.module("app.employee").factory("employeeQueueService", employeeQueueService);
    
    /** @ngInject **/
    function employeeQueueService(firebaseDataRef, DataUtils){
      var items = firebaseDataRef.child('employee-process-queue');
      
      var services = {
          create: create,
          checkIsProcess: checkIsProcess
      };
  
      return services;
  
      function create(uid, data, isUpdate){
        var key = 'update';
        if(!isUpdate){
            key = items.push().key;
        }
        var path = uid + '/' + key;
        data = DataUtils.stripDollarPrefixedKeys(data);
        return items.child(path).set(data).then(function(rs) {
            return {result: true};
        }).catch(function(error) {
            console.log(error);
            return {result: false , errorMsg: error.message};
        });
      }

      function checkIsProcess(uid){
        var ref = items.child(uid + '/update/isProcess');
        return DataUtils.getDataFirebaseLoadOnce(ref).then(function(checked){
            return checked || false;
        });
      }
    } 
  })();
  