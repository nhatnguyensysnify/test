(function () {
    'use strict';
    angular.module('app.employee').factory('departmentSevice', departmentSevice);
    /** @ngInject **/
    function departmentSevice(firebaseDataRef, DataUtils) {
        var items = firebaseDataRef.child('department');

        var service = {
            getMulti: getMulti,
            get: get,
            create: create,
            remove: remove,
            //removeByAlias: removeByAlias,
            updateInfoAlias: updateInfoAlias
        };

        return service;

        function getMulti(aliases) {
            var reqs = [];
            _.forEach(aliases, function (alias) {
                var ref = items.child(alias);
                reqs.push(DataUtils.getDataFirebaseLoadOnce(ref, true));
            });
            return Promise.all(reqs).then(function (data) {
                return _.filter(data, function (depart) {
                    return depart !== null;
                });
            });
        }

        function get(alias) {
            var ref = items.child(alias);
            return DataUtils.getDataFirebaseLoadOnce(ref, true);
        }

        function create(add) {
            var name = [], alias = angular.copy(add.alias),
                fName = _.trim(add.firstName),
                lName = _.trim(add.lastName),
                repCode = _.trim(add.repCode || add.username || '');

            if (fName) {
                name.push(fName);
            }
            if (lName) {
                name.push(lName);
            }
            if (repCode) {
                name.push('(' + repCode + ')');
            }
            var department = {
                id: add.$id,
                name: name.join(' '),
                alias: alias
            };
            return items.child(alias).set({
                manager: department
            }).then(function (res) {
                return { result: true, id: alias };
            }).catch(function (error) {
                console.log(error);
                return { result: false, errorMsg: error };
            });
        }

        function remove(alias) {
            return items.child(alias).remove().then(function (res) {
                return { result: true, id: alias };
            }).catch(function (error) {
                console.log(error);
                return { result: false, errorMsg: error };
            });
        }

        // function removeByAlias(alias) {
        //     var ref = items.orderByChild('manager/alias').equalTo(alias).once("value");
        //     return ref.then(function (snapshot) {
        //         var data = snapshot && snapshot.val();
        //         if (data) {
        //             var ids = Object.keys(data);
        //             items.child(ids && ids[0]).remove();
        //         }
        //     });
        // }

        function updateInfoAlias(alias, manager) {
            var ref = items.orderByChild('manager/alias').equalTo(alias).once("value");
            return ref.then(function (snapshot) {
                var data = snapshot && snapshot.val();
                if (data) {
                    var ids = Object.keys(data);
                    items.child(ids && ids[0]).set({
                        manager: manager
                    });
                }
            });
        }
    }
})();
