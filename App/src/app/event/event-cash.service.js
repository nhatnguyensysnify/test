(function () {
    'use strict';
    angular.module('app.event').factory('eventCashService', eventCashService);
    /** @ngInject **/
    function eventCashService($rootScope, firebaseDataRef, appUtils, DataUtils, searchService, eventTrackingService, eventQueueService, employeeService) {
        var rootPath = 'event-cash',
            eventRef = firebaseDataRef.child('events'),
            cashRef = firebaseDataRef.child(rootPath);
        var service = {
            genId: genId,
            update: update,
            remove: remove,
            getEventCash: getEventCash,
            updateEventCashTotal: updateEventCashTotal,
            updateEventMoneyOrder: updateEventMoneyOrder,
            updateCashInfoEvent: updateCashInfoEvent
        };        

        function genId(eventId){
            return cashRef.child(eventId).push().key;
        }

        function update(cash, eventId, event){
            var now  = +new Date();
            cash.timestampModified = now;
            if(!cash.timestampCreated){
                cash.timestampCreated = now;
            }
            var data = _.clone(cash);
            delete data.$id;
            delete data.editing;
            data = DataUtils.stripDollarPrefixedKeys(data);
            // return cashRef.child(eventId).child(cash.$id).update(data);
        
            return eventRef.child(eventId).child('cashCollected').child(cash.$id).update(data).then(function(res){
                var trackingObj = {
                    action: 'updateEventCash',
                    fields: []
                };
                // console.log('tracking Event');
                eventTrackingService.create(eventId, trackingObj);
                return res;
            });

        }
        // function _updateIndex(cash,eventId, event){
        //     var snapshop = _.clone(cash);
        //     delete snapshop.timestampCreated;
        //     delete snapshop.timestampModified;
        //     var id = cash.$id;
        //     snapshop = DataUtils.stripDollarPrefixedKeys(snapshop);
        //     Object.assign(snapshop,{
        //         eId: eventId,
        //         sDate: event.startDate,
        //         eName: event.name
        //     });


        //     var searchSetting = $rootScope.storage.appSettings.elasticSearch.eventCash || {index: 'qc-tls-event-cash', type: 'event-cash'};

        //      var params = {
        //         index: searchSetting.index,
        //         type: searchSetting.type,
        //         id: id
        //     };
        //     params.body = snapshop;
        // }

        function remove(cash, eventId, index){
            // return cashRef.child(eventId).child(cash.$id).remove();
            return eventRef.child(eventId).child('cashCollected').child(cash.$id).remove();
        }

        function getEventCash(eventId){
            // var ref = cashRef.child(eventId);
            var ref =firebaseDataRef.child('events').child(eventId).child('cashCollected');
            return DataUtils.getListDataFirebaseLoadOnce(ref, true);
        }

        function updateEventCashTotal(eventId, cashTotal){
            var ref = firebaseDataRef.child('events').child(eventId);
            return ref.update({cashTotal: cashTotal});
        }

        function updateEventMoneyOrder(eventId, moneyOrder){
            var ref = firebaseDataRef.child('events').child(eventId);
            return ref.update({moneyOrder: moneyOrder}).then(function(){
                return  searchService.index(eventId, $rootScope.storage.appSettings.elasticSearch.events, null);
            });
        }

        function updateCashInfoEvent(eventId, updateData){
            var ref = firebaseDataRef.child('events').child(eventId);
            return ref.update(updateData).then(function(){
                return  searchService.index(eventId, $rootScope.storage.appSettings.elasticSearch.events, null);
            });
        }

        return service;
    }
})();