(function(){
    'use strict';
  
    angular.module("app.membership").factory("pdfProcessQueueService", pdfProcessQueueService);
    
    /** @ngInject **/
    function pdfProcessQueueService(firebaseDataRef){
      var items = firebaseDataRef.child('pdf-process-queue');
      
      var services = {
          create: create
      };
  
      return services;
  
      function create(add){
          var key = moment().format('x');
          return items.child(key).set(add).then(function(rs) {
              return {result: true , id: key};
          }).catch(function(error) {
              console.log(error);
              return {result: false , errorMsg: error.message};
          });
      }
    } 
  })();
  