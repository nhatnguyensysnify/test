(function () {
    'use strict';
    angular.module('app.event').factory('eventUploadLogsService', eventUploadLogsService);
    /** @ngInject **/
    function eventUploadLogsService(firebaseDataRef, DataUtils, $q) {
        var items = firebaseDataRef.child('event-upload-logs');

        var service = {
            create: create,
            getLog: getLog,
            getFullLog: getFullLog
        };

        return service;

        function create(eventId, pathLog) {
            var time = moment();
            var key = time.format('x'),
                fullKey = eventId + '/' + key;

            var eventUploadLogRef = items.child(fullKey);
            return eventUploadLogRef.set(pathLog).then(function (result) {
                return { result: true, id: fullKey };
            }).catch(function (error) {
                console.log(error);
                return { result: false, errorMsg: error.message };
            });
        }

        function getLog(eventId) {
            var eventUploadLogRef = items.child(eventId);
            return DataUtils.getListDataFirebaseLoadOnce(eventUploadLogRef, true).then(function (data) {
                return data || [];
            });
        }

        function getFullLog(eventId){
            var employeeLogRef = firebaseDataRef.child('employee-logs'),
                userRef = firebaseDataRef.child('users');
            var userIndex = {},
                mainP; // main Promises

            mainP = getLog(eventId);
            // get userInfo
            mainP = mainP.then(function(dataRefs){
                var userIds = [];
                _.each(dataRefs, function(dataRef){
                    userIds.push(dataRef.substring(0, dataRef.indexOf('/')));
                });
                var userPromises = _.map(userIds, function(uid){
                    return DataUtils.getDataFirebaseLoadOnce(userRef.child(uid+'/email')).then(function(userEmail){
                        userIndex[uid] = userEmail;
                    });
                });
                return $q.all(userPromises).then(function(){
                    return dataRefs;
                });
            });
            // get EmployeeLog
            mainP = mainP.then(function(dataRefs){
                var empLogPromises = _.map(dataRefs, function(dataRef){
                    // console.log(dataRef);
                    // console.log(userIndex);
                    var logRef = firebaseDataRef.child('employee-logs').child(dataRef);
                    return DataUtils.getDataFirebaseLoadOnce(logRef, true).then(function(empLog){
                        if(!empLog){
                            return empLog;
                        }
                        empLog.timestampCreated = empLog.$id || '';
                        var uid = dataRef.substring(0, dataRef.indexOf('/'));
                        empLog.updateBy = userIndex[uid] || 'Unknown';
                        return empLog;
                    });
                });
                return $q.all(empLogPromises).then(function(rs){
                    var result = {
                        items: [],
                        totalRecords: 0
                    };
                    result.items =  _.compact(rs).sort(function(a, b) {
                        return b.timestampCreated - a.timestampCreated;
                    });
                    result.totalRecords = result.items.length;
                    return result;
                });
            });

            return mainP;
        }
    }
})();
