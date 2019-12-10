(function() {
    'use strict';

    angular.module('app.search').factory('searchService', indirectSearchService);

    /** @ngInject **/
    function indirectSearchService($q, elasticSearch, firebaseDataRef, $timeout) {
        var service = {
            search: search,
            index: index,
            remove: remove,
            convertDataSnapshot: convertDataSnapshot
        };

        function search(query, childRef) {
            var result = {
                items: [],
                totalRecords: 0,
                pages: 0
            };
            try {
                var req = elasticSearch.search(query);
                req = req.then(function(response) {
                    //console.log(response);
                    if (!response) return result;

                    if (response.aggregations) {
                        result.aggregations = response.aggregations;
                    }
                    if (!response.hits || !response.hits.hits || !response.hits.total) {
                        return result;
                    }
                    return {
                        items: convertDataSnapshot(response.hits.hits, childRef),
                        totalRecords: response.hits.total,
                        pages: Math.ceil(response.hits.total / query.size),
                        aggregations: response.aggregations || null
                    };
                });

                return req;
            } catch (e) {
                console.log("Got an error!", e);
                return result;
            }
        }

        function convertDataSnapshot(obj, childRef) {
            var rs = _.map(obj, function(val, key) {
                var data = val._source;
                if (childRef.includes('membership-application-snapshot') === true) {
                    data.$id = data.appId;
                } else if (childRef.includes('membership-snapshot') === true) {
                    data.$id = data.membershipId;
                } else {
                    data.$id = val._id;
                }
                return data;
            });
            return rs;
        }

        //add/update Index Elastic
        function index(id, eSettings, opts) {
            if (!id) {
                return $q.when();
            }
            var path = 'es-index-queue',
                subPath = eSettings.type;
            var indexObj = {
                timestampModified: +new Date(),
                id: id
            };
            if (opts) {
                if (opts.data) {
                    indexObj.data = opts.data;
                }
                if (opts.priority) {
                    subPath = eSettings.priEQueue || 'pri-' + subPath;
                }
            }

            var ref = firebaseDataRef.child(path).child(subPath).child(id);
            var p = ref.update(indexObj);
            p = p.then(function(res) {
                var deferred = $q.defer();
                $timeout(function() {
                    deferred.resolve(res);
                }, 500);
                return deferred.promise;
            });
            p = p.then(function(res) {
                var deferred = $q.defer();
                ref.on('value', function(snapshot) {
                    var val = snapshot.val();
                    var timeo = $timeout(function() {
                        ref.off();
                        deferred.resolve(res);
                    }, 5000);
                    if (val) {
                        return;
                    }
                    // val is null: done index
                    ref.off();
                    $timeout.cancel(timeo);
                    deferred.resolve(res);
                });
                return deferred.promise;
            });

            return p;

        }

        //remove Index Elastic
        function remove(id, eSetting) {
            var params = {
                index: eSetting.index,
                type: eSetting.type,
                id: id
            };
            return elasticSearch.delete(params).then(function(res) {
                return res;
            }, function(e) {
                return e;
            });
        }

        return service;
    }

    /** @ngInject **/
    function searchService($q, firebaseDataRef, $firebaseObject, elasticSearch) {
        var service = {
            search: search,
            index: index,
            convertDataSnapshot: convertDataSnapshot,
            convertDataByIds: convertDataByIds
        };

        return service;

        function search(query, childRef, isIds) {
            var result = {
                items: [],
                totalRecords: 0,
                pages: 0
            };
            var req = elasticSearch.search(query);
            req = req.then(function(response) {
                if (response.aggregations) {
                    result.aggregations = response.aggregations;
                }
                if (!response.hits || !response.hits.hits || !response.hits.total) {
                    return result;
                }
                if (isIds) {
                    return convertDataByIds(response.hits.hits, childRef).then(function(items) {
                        return {
                            items: items,
                            totalRecords: response.hits.total,
                            pages: Math.ceil(response.hits.total / query.size),
                            aggregations: response.aggregations || null
                        };
                    });
                } else {
                    return {
                        items: convertDataSnapshot(response.hits.hits, childRef),
                        totalRecords: response.hits.total,
                        pages: Math.ceil(response.hits.total / query.size),
                        aggregations: response.aggregations || null
                    };
                }
            });

            return req;
        }

        function index(id, data, eSettings) {
            if (id) {
                console.log("Can not index. Missing id");
                return $q.when();
            }
            var params = {
                index: searchSetting.index,
                type: searchSetting.type,
                id: id
            };
            params.body = data;
            return elasticSearch.index(params).then(function(res) {
                return res;
            }, function(e) {
                return e;
            });
        }

        function convertDataSnapshot(obj, childRef) {
            var rs = _.map(obj, function(val, key) {
                var data = val._source;
                if (childRef.includes('membership-application-snapshot') === true) {
                    data.$id = data.appId;
                } else if (childRef.includes('membership-snapshot') === true) {
                    data.$id = data.membershipId;
                } else {
                    data.$id = val._id;
                }
                return data;
            });
            return rs;
        }

        function convertDataByIds(obj, childRef) {
            var rs = _.map(obj, function(val, key) {
                return val._id;
            });

            return getListItems(rs, childRef);
        }

        function getListItems(ids, childRef) {
            var reqs = _.map(ids, id => {
                var ref = firebaseDataRef.child('/' + childRef + '/' + id);
                return $firebaseObject(ref);
            });

            return $q.all(reqs);
        }
    }

})();