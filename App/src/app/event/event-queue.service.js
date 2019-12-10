(function(){
    'use strict';
  
    angular.module("app.event").factory("eventQueueService", eventQueueService);
    
    /** @ngInject **/
    function eventQueueService(firebaseDataRef){
      var items = firebaseDataRef.child('event-process-queue');
      
      var services = {
          create: create
      };
  
      return services;
  
      function create(eventId){
        return items.child(eventId).set(true).then(function(rs) {
            return {result: true , id: eventId};
        }).catch(function(error) {
            console.log(error);
            return {result: false , errorMsg: error.message};
        });
      }
    } 
  })();
  