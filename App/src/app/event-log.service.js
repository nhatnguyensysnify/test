(function () {
    'use strict';
    angular.module('app.eventlogs').factory('appEventLogService', appEventLogService);
    /** @ngInject **/
    function appEventLogService($rootScope, firebaseDataRef) {
        var items = firebaseDataRef.child('app-event-logs');
        var service = {
            create: create,
            update: update
        };

        return service;

        function create(itemToAdd, label, userName, appId) {
            var localDate = moment();
            var mainKey = localDate.format('YYYY/MM/DD');//moment().utc().startOf('day').format('x');
            var ts = localDate.format('x');
            var key = mainKey + '/' + userName.toLowerCase() + '/' + label + '_' + ts;
            if (appId) {
                key = key + '_' + appId;
            }
            itemToAdd = stripDollarPrefixedKeys(itemToAdd);
            return items.child(key).set(itemToAdd).then(function (res) {
                return { result: true, id: key };
            }).catch(function (error) {
                console.log(error);
                return { result: false, errorMsg: error };
            });
        }

        function update(key, updateData) {
            updateData = stripDollarPrefixedKeys(updateData);
            return items.child(key).update(updateData).then(function (res) {
                return { result: true, id: key };
            }).catch(function (error) {
                console.log(error);
                return { result: false, errorMsg: error };
            });
        }
    }

    function stripDollarPrefixedKeys(data) {
        if (!angular.isObject(data) || angular.isDate(data)) { return data; }
        var out = angular.isArray(data) ? [] : {};
        angular.forEach(data, function (v, k) {
            if (typeof k !== 'string' || k.charAt(0) !== '$') {
                out[k] = stripDollarPrefixedKeys(v);
            }
            if (v === undefined) {
                delete out[k];
            }
        });
        return out;
    }
})();
