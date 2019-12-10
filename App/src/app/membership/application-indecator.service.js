(function() {
    'use strict';
    angular.module('app.membership').factory('memAppIndicatorService', memAppIndicatorService);
    /** @ngInject **/
    function memAppIndicatorService($q, firebaseDataRef, DataUtils, appUtils, $firebaseObject) {
        var items = firebaseDataRef.child('membership-applications-indicator');

        var service = {
            get: get,
            getOnValue: getOnValue,
            offOnValue: offOnValue,
            create: create,
            update: update,
            remove: remove,
            _excuteCheckIndicator: _excuteCheckIndicator
        };

        return service;

        function getOnValue(item, expired) {
            var deferred = $q.defer();
            var ref = items.child(item.$id);
            ref.on('value', function(snap) {
                console.log('%c -------------snap------------- ;' + item.$id, 'color: green;');
                //console.log(snap.val());
                if (snap && snap.val()) {
                    item = angular.extend(item, _excuteCheckIndicator(snap.val(), item.$id, expired));
                    deferred.resolve(item);
                } else {
                    item = angular.extend(item, {
                        isEdited: false,
                        editingBy: ''
                    });
                    deferred.resolve(item);
                }
            });

            return deferred.promise;
        }

        function _excuteCheckIndicator(data, appId, expiredTime) {
            var result = {
                isEdited: false,
                editingBy: ''
            };

            var currentTime = moment().valueOf();
            if (data && data.editingBy) {
                var keys = Object.keys(data.editingBy);
                var currentLength = angular.copy(keys.length || 0);
                result.isEdited = true;
                var expired = [];
                _.forEach(data.editingBy, function(editing, uid) {
                    var gapTime = currentTime - editing.timestampEdited;
                    if (gapTime > 0 && (gapTime / 60000) >= expiredTime) {
                        expired.push(uid);
                    }
                });
                _.forEach(expired, function(uid) {
                    delete data.editingBy[uid];
                });
                keys = Object.keys(data.editingBy);
                if (keys.length === 0) {
                    remove(appId);
                    result.isEdited = false;
                    result.editingBy = '';
                } else if (currentLength !== keys.length) {
                    update(appId, data);
                }

                if(keys.length){
                    result.editingBy = _.map(data.editingBy, function(edit) {
                        return edit.fullName || edit.email || edit.userName;
                    }).join(', ');
                }
            } else {
                result.isEdited = false;
                result.editingBy = '';
            }

            return result;
        }

        function offOnValue(appId) {
            var ref = items.child(appId);
            return ref.off('value');
        }

        function get(appId) {
            var ref = items.child(appId);
            return DataUtils.getDataFirebaseLoadOnce(ref, true).then(function(data) {
                return data || null;
            });
        }

        function create(appId, add) {
            add.isEdited = true;
            add = DataUtils.stripDollarPrefixedKeys(add);
            return items.child(appId).set(add).then(function(result) {
                return { result: true, id: appId };
            }).catch(function(error) {
                console.log(error);
                return { result: false, errorMsg: error.message };
            });
        }

        function update(appId, update) {
            update = DataUtils.stripDollarPrefixedKeys(update);
            return items.child(appId).update(update).then(function(result) {
                return { result: true, id: appId };
            }).catch(function(error) {
                console.log(error);
                return { result: false, errorMsg: error.message };
            });
        }

        function remove(appId) {
            return items.child(appId).remove().then(function(result) {
                return { result: true };
            }).catch(function(error) {
                console.log(error);
                return { result: false, errorMsg: error.message };
            });
        }
    }
})();