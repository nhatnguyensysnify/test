(function () {
    'use strict';
    angular.module('app.options').factory('appSettingService', appSettingService);
    /** @ngInject **/
    function appSettingService($rootScope, $q, firebaseDataRef, appUtils, DataUtils) {
        var items = firebaseDataRef.child('app-options');

        var service = {
            checkNewSettings: checkNewSettings,
            getSettings: getSettings,
            loadSettings: loadSettings,
            refreshCacheSetting: refreshCacheSetting,
            getIndexAlias: getIndexAlias,
            updateIndexAlias: updateIndexAlias
        };

        return service;

        function refreshCacheSetting() {
            var ts = appUtils.getTimestamp();
            var reqs = [];
            reqs.push(firebaseDataRef.child('app-options/timestampModified').set(ts));
            reqs.push(firebaseDataRef.child('app-options/TLSCacheTimestamp').set(ts));
            return $q.all(reqs);
        }

        function checkNewSettings() {
            var appOptions = 'app-options';
            var timestampModified = 'timestampModified';
            var cacheTimestamp = firebaseDataRef.child(appOptions + '/' + timestampModified);
            return DataUtils.firebaseLoadOnce(cacheTimestamp, false).then(function (cacheTimestampRs) {
                var oldCacheTimestamp = $rootScope.storage.appSettings ? $rootScope.storage.appSettings[timestampModified] : 0;
                var rs = cacheTimestampRs === oldCacheTimestamp;
                if (!rs) {
                    console.log('app-options update timestampModified');
                    var appOptionsRef = firebaseDataRef.child(appOptions);
                    return DataUtils.firebaseLoadOnce(appOptionsRef).then(function (optionRs) {
                        $rootScope.storage.appSettings = optionRs;
                        return true;
                    });
                }
                return false;
            });
        }

        function getSettings() {
            return DataUtils.getDataFirebaseLoadOnce(items);
        }
        
        function loadSettings() {
            if($rootScope.storage.appSettings){
                return Promise.resolve(true);
            }
            return getSettings().then(optionRs => {
                $rootScope.storage.appSettings = optionRs;
                return true;
            });
        }

        function getIndexAlias() {
            var ref = items.child('aliasIndex');
            return DataUtils.getDataFirebaseLoadOnce(ref, true).then(function (index) {
                return index || 0;
            });
        }

        function updateIndexAlias(index) {
            return items.update({
                aliasIndex: index
            }).then(function () {
                refreshCacheSetting();
            });
        }
    }
})();
