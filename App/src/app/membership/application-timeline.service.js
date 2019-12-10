(function () {
    'use strict';
    angular.module('app.membership').factory('memAppTimeLineService', memAppTimeLineService);
    /** @ngInject **/
    function memAppTimeLineService(authService,  firebaseDataRef, DataUtils, appUtils) {
        var items = firebaseDataRef.child('application-timeline');
            // currentUser = authService.getCurrentUser(); //$rootScope.storage.currentUser;

        var service = {
            create: create,
            get : get
        };

        return service;
        
        function create(appId, add, timestampKey){
            var currentUser = authService.getCurrentUser();
            var time = timestampKey ? moment(parseInt(timestampKey)) : moment();
            var key =  time.format('x'),
                fullKey = appId + '/' + key;
            var trackingRef = items.child(fullKey);
            return appUtils.getDeviceInfo().then(function(rs){
                add.from = 'Smart Admin';
                add.authorName = currentUser.email;
                add.timestampString = appUtils.formatDateTimeString(time);
                add.deviceInfo = {
                    os : rs.os || '',
                    appVersion : rs.appVersion || '',
                    buildVersion : rs.buildVersion || '',
                    geoCode : rs.geoCode || '',
                    osVersion : rs.browser_version || '',
                    deviceName : rs.browser
                };
                
                return trackingRef.set(add).then(function(result) {
                    return {result: true, id: fullKey};
                }).catch(function(error) {
                    console.log(error);
                    return {result: false , errorMsg: error.message};
                });
            });
        }

        function get(appId){
            var trackingRef = items.child(appId);
            return DataUtils.getListDataFirebaseLoadOnce(trackingRef, true).then(function(data){
                if(data){
                    return data.sort(function (a, b) {
                        return b.$id - a.$id;
                    });
                }
                return [];
            });
        }
    }
})();
