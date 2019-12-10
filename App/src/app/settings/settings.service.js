(function () {
    'use strict';
    angular.module('app.settings').factory('settingsService', settingsService);
    /** @ngInject */
    function settingsService(authService, firebaseDataRef, $firebaseObject, appUtils, settingsTrackingService) {
        var appOptionsRef = firebaseDataRef.child('app-options');
        var options;
        if (authService.getCurrentUser()) {
            options = $firebaseObject(appOptionsRef);
        }
        var service = {
            options: options,
            get: get,
            refresh: refresh,
            updateGeneralSetting: updateGeneralSetting,
            refreshTLSCache: refreshTLSCache
        };

        return service;

        function get() {
            return options.$loaded().then(function (data) {
                return data;
            });
        }
        function refresh(){
            // appOptionsRef.onDisconnect();
            // appOptionsRef = null;
            return new Promise(function (res, reject){
                options = null;
                // appOptionsRef = firebaseDataRef.child('app-options');
                options = $firebaseObject(appOptionsRef);
                res(true);
            });
        }
        function refreshTLSCache() {
            var ts = appUtils.getTimestamp();
            options.TLSCacheTimestamp = ts;
            options.timestampModified = ts;
            return options.$save().then(function () {
                return { result: true, errorMsg: "" };
            }).catch(function (error) {
                return { result: false, errorMsg: error };
            });
        }

        function updateGeneralSetting(settingToUpdate) {
            var ts = appUtils.getTimestamp();
            options.adminEmail = settingToUpdate.adminEmail;
            options.adminURL = settingToUpdate.adminURL;
            options.appURL = settingToUpdate.appURL;
            options.webURL = settingToUpdate.webURL;
            options.allowSignUp = settingToUpdate.allowSignUp;
            options.requireLogin = settingToUpdate.requireLogin;
            options.briefMaxChar = settingToUpdate.briefMaxChar;
            options.homePage = settingToUpdate.homePage;
            options.commentsPerPage = settingToUpdate.commentsPerPage;
            options.postsPerPage = settingToUpdate.postsPerPage;
            options.feedImageDirectory = settingToUpdate.feedImageDirectory;
            options.feedPostMaxChar = settingToUpdate.feedPostMaxChar;
            options.membershipApplicationPaymentImageDirectory = settingToUpdate.membershipApplicationPaymentImageDirectory;
            options.membershipApplicationImageDirectory = settingToUpdate.membershipApplicationImageDirectory;
            options.timestampModified = ts;
            options.TLSCacheTimestamp = ts;
            options.forceUpdate = settingToUpdate.forceUpdate;
            // App Setting
            options.appName = settingToUpdate.appName;
            options.appURL = settingToUpdate.appURL;
            options.appLogo = settingToUpdate.appLogo;
            options.androidBuildVersion = settingToUpdate.androidBuildVersion;
            options.androidDownloadURL = settingToUpdate.androidDownloadURL;
            options.iosBuildVersion = settingToUpdate.iosBuildVersion;
            options.iosDownloadURL = settingToUpdate.iosDownloadURL;
            options.appUpdateMessage = settingToUpdate.appUpdateMessage;
            //Nagigation Setting
            options.bottomMenu = settingToUpdate.bottomMenu;
            options.topMenuLocation = settingToUpdate.topMenuLocation;
            options.availableScheduleRange = settingToUpdate.availableScheduleRange;
            var trackingObj = {
                action: 'updateSettings',
                fields: []
            };
            let data = getValue(options);
            return settingsTrackingService.compareValue(data).then(function (diffValue) {
                trackingObj.fields = diffValue;
                return settingsTrackingService.create(trackingObj).then(function () {
                    return options.$save().then(function () {
                        return { result: true, errorMsg: "" };
                    }).catch(function (error) {
                        console.log('error', error);
                        return { result: false, errorMsg: error };
                    });
                });


            });

            //}
            //return $q.when({ result: false, errorMsg: "Information could not be found!" });
        }

        function getValue(data) {
            let result = angular.copy(data);
            _.forEach(result, function (value, key) {
                if (key.indexOf('$') > -1 || key == 'forEach') {
                    delete result[key];
                }
            });
            return result;
        }
        // function updateAnalyticsSetting(settingToUpdate) {
        //     //options.$loaded().then(function (data) {});
        //     options.piwikSiteId = settingToUpdate.piwikSiteId;
        //     options.piwikURL = settingToUpdate.piwikURL;
        //     options.timestampModified = appUtils.getTimestamp();
        //     return options.$save().then(function () {
        //         return { result: true, errorMsg: "" };
        //     }).catch(function (error) {
        //         return { result: false, errorMsg: error };
        //     });
        //     //}
        //     //return $q.when({ result: false, errorMsg: "Information could not be found!" });

        // }

        // function updateMediaSetting(settingToUpdate) {
        //     options.largeSizeH = settingToUpdate.largeSizeH;
        //     options.largeSizeW = settingToUpdate.largeSizeW;
        //     options.mediumSizeH = settingToUpdate.mediumSizeH;
        //     options.mediumSizeW = settingToUpdate.mediumSizeW;
        //     options.thumbSizeH = settingToUpdate.thumbSizeH;
        //     options.thumbSizeW = settingToUpdate.thumbSizeW;
        //     options.timestampModified = appUtils.getTimestamp();
        //     return options.$save().then(function () {
        //         return { result: true, errorMsg: "" };
        //     }).catch(function (error) {
        //         return { result: false, errorMsg: error };
        //     });
        //     //}
        //     //return $q.when({ result: false, errorMsg: "Information could not be found!" });
        // }

        // function updatePaymentSetting(settingToUpdate) {
        //     options.paypalKeyDev = settingToUpdate.paypalKeyDev;
        //     options.paypalKeyProd = settingToUpdate.paypalKeyProd;
        //     options.timestampModified = appUtils.getTimestamp();
        //     return options.$save().then(function () {
        //         return { result: true, errorMsg: "" };
        //     }).catch(function (error) {
        //         return { result: false, errorMsg: error };
        //     });
        //     //}
        //     //return $q.when({ result: false, errorMsg: "Information could not be found!" });
        // }
    }
})();
