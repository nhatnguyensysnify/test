(function() {
    'use strict';
    angular.module('app.saleRegion').factory('saleRegionService', saleRegionService);
    /** @ngInject **/
    function saleRegionService(firebaseDataRef, appUtils, DataUtils) {
        var rootPath = 'sale-regions',
            ref = firebaseDataRef.child(rootPath);

        var service = {
            getAll: getAll,
            get: get,
            create: create,
            update: update,
            remove: remove
        };

        return service;

        function getAll() {
            return DataUtils.getListDataFirebaseLoadOnce(ref, true);
        }

        function get(id) {
            var ref = ref.child(id);
            return DataUtils.getDataFirebaseLoadOnce(ref, true);
        }

        function create(add) {
            var ts = appUtils.getTimestamp(),
                key = ref.push().key;

            add.timestampCreated = add.timestampModified = ts;
            add = DataUtils.stripDollarPrefixedKeys(add);
            return ref.child(key).update(add).then(function(rs) {
                return { result: true, key: key };
            }).catch(function(error) {
                console.log(error);
                return { result: false, errorMsg: error.message };
            });
        }

        function update(data) {
            var ts = appUtils.getTimestamp(),
                key = angular.copy(data.$id);

            data.timestampModified = ts;
            delete data.isSelected;
            if (data.states) {
                _.forEach(data.states, function(value, key) {
                    delete value.isSelected;
                });
            }
            data = DataUtils.stripDollarPrefixedKeys(data);
            //console.log(data);
            return ref.child(key).update(data).then(function(rs) {
                return { result: true, key: key };
            }).catch(function(error) {
                console.log(error);
                return { result: false, errorMsg: error.message };
            });
        }

        function remove(id, state, territory) {
            var paths = [id];
            if (state) {
                paths.push('states/' + state);
            }
            if (territory) {
                paths.push('territories/' + territory);
            }
            var refPath = paths.join('/');
            return ref.child(refPath).remove().then(function(rs) {
                return { result: true };
            }).catch(function(error) {
                console.log(error);
                return { result: false, errorMsg: error.message };
            });
        }
    }
})();