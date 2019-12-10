(function () {
    'use strict';
    angular.module('app.membership').factory('memAppDeviceInfoService', memAppDeviceInfoService);
    /** @ngInject **/
    function memAppDeviceInfoService(firebaseDataRef, DataUtils, appUtils) {
        var items = firebaseDataRef.child('membership-applications-device-info');
  
        var service = {
          create: create
        };

        return service;
        
        function create(appId, add){
            var ts = appUtils.getTimestamp();
            var fn = function(ref, applicationId, key, data){
                return ref.child(applicationId + "/" + key).set(data).then(function(res){
                    return {result: true};
                }).catch(function(error) {
                    console.log(error);
                    return {result: false , errorMsg: error.message};
                });
            };
            if(!add){
                return appUtils.getDeviceInfo().then(function(rs){
                    var deviceInfo = {
                        os: rs.os || '',
                        appVersion: rs.appVersion || '',
                        buildVersion: rs.buildVersion || '',
                        geoCode: rs.geoCode || '',
                        osVersion: rs.browser_version || '',
                        deviceName: rs.browser
                    };
                    return fn(items, appId, ts, deviceInfo);
                }).catch(function(error){
                    console.log(error);
                    return {result: false , errorMsg: error.message};
                });
            }

            add = DataUtils.stripDollarPrefixedKeys(add);
            return fn(items, appId, ts, add);
        }
      }
  })();
  