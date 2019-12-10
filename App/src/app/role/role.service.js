(function () {
  'use strict';

  angular.module("app.role").factory("roleService", roleService);
  /** @ngInject **/
  function roleService($q, $filter, $firebaseObject, $firebaseArray, firebaseDataRef, appUtils, DataUtils) {
    var rootPath = 'roles', items = firebaseDataRef.child(rootPath);
    var roleService = {
      get: get,
      getOnce: getOnce,
      items: getAll,
      itemsObj: getItemsObj,
      create: create,
      update: update,
      remove: remove,
      search: search
    };

    return roleService;

    function getAll() {
      return DataUtils.getListDataFirebaseLoadOnce(items, true);
    }

    function getItemsObj() {
      return DataUtils.getDataFirebaseLoadOnce(rootPath, true).then(function (data) {
        if (data.timestampModified !== undefined) {
          delete data.timestampModified;
        }
        return DataUtils.stripDollarPrefixedKeys(data);
      });
    }

    function getOnce(id) {
      var ref = items.child(id);
      return DataUtils.getDataFirebaseLoadOnce(ref);
    }

    function get(id) {
      var ref = items.child(id);
      return DataUtils.getDataFirebaseLoadOnce(ref);
    }

    function create(add) {
      var ts = appUtils.getTimestamp(), 
          key = items.push().key;
      add.timestampCreated =  add.timestampModified = ts;
      return items.child(key).update(add).then(function (result) {
        return { result: true, errorMsg: "", key: key };
      }).catch(function (error) {
        return { result: false, errorMsg: error };
      });
    }

    function update(update) {
      var ts = appUtils.getTimestamp(),
          key = angular.copy(update.$id);
      return items.child(key).update({
        name: update.name,
        description: update.description, 
        timestampModified: ts
      }).then(function () {
        return { result: true, errorMsg: "" };
      }).catch(function (error) {
        return { result: false, errorMsg: error };
      });
    }

    function remove(id) {
      return items.child(id).remove().then(function () {
        return { result: true, errorMsg: "" };
      }).catch(function (error) {
        return { result: false, errorMsg: error };
      });
    }

    function search(keyword) {
      return $firebaseArray(items).$loaded().then(function (data) {
        return $filter('filter')(data, function (item) {
          for (var attr in item) {
            if (searchMatch(item[attr] + '', keyword)) {
              return true;
            }
          }
          return false;
        });
      });
    }

    function searchMatch(haystack, needle) {
      if (!needle) {
        return true;
      }
      return haystack.toLowerCase().indexOf(needle.toLowerCase()) !== -1;
    }
  }
})();
