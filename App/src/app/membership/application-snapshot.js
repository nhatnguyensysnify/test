(function() {
    'use strict';
    angular.module('app.membership').factory('memAppSnapshotService', memAppSnapshotService);
    /** @ngInject **/
    function memAppSnapshotService($q, firebaseDataRef, DataUtils, $rootScope, searchService) {

        var items = firebaseDataRef.child('membership-application-snapshot');
        var employee = firebaseDataRef.child('membership-application-snapshot/employee');
        var memberSnapshotRef = firebaseDataRef.child('membership-snapshot');
        var service = {
            create: create,
            update: update,
            remove: remove,
            importSnap: importSnap,
            //importMemberSnap: importMemberSnap
        };

        return service;

        function importSnap() {
            var ref = firebaseDataRef.child('membership-applications');
            return DataUtils.getListDataFirebaseLoadOnce(ref, true).then(function(data) {
                var reqs = [];
                _.forEach(data, function(item) {
                    var memberRef = firebaseDataRef.child("/membership/" + item.membershipId);
                    var req = memberRef.update({
                        timestampCreated: item.timestampCreated
                    });
                    reqs.push(req);
                });
                return $q.all(reqs);
            });
        }

        function create(appId, opts) {
            var app = firebaseDataRef.child('membership-applications/' + appId);
            return DataUtils.getDataFirebaseLoadOnce(app, true).then(function(rs) {
                if (!rs) {
                    return $q.when();
                }

                var timestampVerified = rs.timestampVerified || '',
                    uid = rs.uid || '',
                    addons = [],
                    planName = '',
                    n;
                if (rs.selectedAddOns) {
                    addons = _.map(rs.selectedAddOns, function(item) {
                        n = parseFloat(item.recurring_price);
                        return item.rate_name + ' $' + (Math.round(n * 1000) / 1000).toFixed(2);
                    });
                }
                if (rs.selectedPlans && rs.selectedPlans.name) {
                    n = parseFloat(rs.selectedPlans.recurring_price);
                    planName = rs.selectedPlans.name + ' $' + (Math.round(n * 1000) / 1000).toFixed(2);
                }
                var snapshot = {
                    appId: rs.$id,
                    author: uid,
                    membershipId: rs.membershipId ? rs.membershipId : '',
                    priority: rs.priority || false,
                    status: rs.status,
                    timestampCreated: rs.timestampCreated || '',
                    timestampSignatured: rs.timestampSignatured || '',
                    signatureDate: rs.signatureDate || '',
                    method: rs.method,
                    // region: rs.state || '',
                    state: rs.state,
                    region: rs.region,
                    regionCode: rs.regionCode,
                    facilityCode: rs.facilityCode || '',
                    facilityId: rs.facilityId || '',
                    representativeCode: rs.representativeCode || '',
                    total: rs.total && rs.total.totalAmount ? parseFloat(rs.total.totalAmount) : 0,
                    timestampVerified: timestampVerified,
                    planName: planName,
                    planId: rs.selectedPlans && rs.selectedPlans.plan_id ? rs.selectedPlans.plan_id : '',
                    selectedAddons: addons,
                    setupFee: rs.total && rs.total.setupFee ? parseFloat(rs.total.setupFee) : 0,
                    isOffline: rs.isOffline !== undefined ? rs.isOffline : false,
                    overwrite: rs && rs.overwrite || false,
                    eventId: rs && rs.eventId || '',
                    eventName: rs && rs.eventName || '',
                    saleRep: rs.saleRep || '',
                    managers: rs.managers || [],
                    processPayment: rs.processPayment === undefined ? true : rs.processPayment
                };
                //Get Keyword Field (FirstName - LastName) Membership
                var mem = firebaseDataRef.child('membership/' + rs.membershipId);
                return DataUtils.getDataFirebaseLoadOnce(mem, true).then(function(result) {
                    if (result) {
                        var memberAccId = result.accountId || '';
                        snapshot.keyword = '';
                        var fName, lName, memId, email;
                        if (result.priMember) {
                            fName = result.priMember.firstName ? result.priMember.firstName : '';
                            lName = result.priMember.lastName ? result.priMember.lastName : '';
                            memId = result.priMember.memberId ? result.priMember.memberId : '';
                            email = result.priMember.email ? result.priMember.email : '';
                            snapshot.keyword = fName + ' ' + lName + ' ' + memId + ' ' + memberAccId + ' ' + email + ' ';
                            snapshot.primaryMember = fName + ' ' + lName;
                        }

                        if (result.secMember) {
                            fName = result.secMember.firstName ? result.secMember.firstName : '';
                            lName = result.secMember.lastName ? result.secMember.lastName : '';
                            memId = result.secMember.memberId ? result.secMember.memberId : '';
                            email = result.secMember.email ? result.secMember.email : '';
                            snapshot.secondaryMember = fName + ' ' + lName;
                            snapshot.keyword += fName + ' ' + lName + ' ' + memId + ' ' + email;
                        }

                        snapshot.keyword = snapshot.keyword.toLowerCase();
                    } else {
                        snapshot.keyword = '';
                        snapshot.primaryMember = ' ';
                        snapshot.secondaryMember = ' ';
                    }
                    /* jshint ignore:start */
                    var reqs = [];

                    snapshot.timestampVerified = timestampVerified;
                    snapshot = DataUtils.stripDollarPrefixedKeys(snapshot);
                    //console.log(snapshot);
                    reqs.push(items.child(snapshot.timestampCreated).set(snapshot));
                    // reqs.push(updateElastic(snapshot));
                    reqs.push(index(snapshot, opts));
                    var em = firebaseDataRef.child('users/' + uid);
                    return DataUtils.getDataFirebaseLoadOnce(em, true).then(function(res) {
                        if (res) {
                            var externalId = res.externalId;
                            if (externalId) {
                                reqs.push(employee.child(externalId).child(snapshot['timestampCreated']).set(snapshot));
                            }
                        }

                        return $q.all(reqs).then(function(res) {
                            return { result: true };
                        }).catch(function(error) {
                            console.log(error);
                            return { result: false, errorMsg: error.message };
                        });
                    });
                    /* jshint ignore:end */
                });

            });

        }

        function update(appId) {
            if (appId && appId !== '') {
                return create(appId);
            }
            return $q.when();
        }

        function remove(app) {
            var uid = app.uid;
            var em = firebaseDataRef.child('users/' + uid);
            return DataUtils.getDataFirebaseLoadOnce(em, true).then(function(res) {
                if (res) {
                    var externalId = res.externalId;
                    firebaseDataRef.child('membership-application-snapshot/employee/' + externalId + '/' + app.timestampCreated).remove();
                }
                firebaseDataRef.child('membership-application-snapshot/' + app.timestampCreated).remove();
                return true;
            });
        }
        /*
        function updateElastic(app) {
            var searchSetting = $rootScope.storage.appSettings.elasticSearch.application;
            var params = {
                index: searchSetting.index,
                type: searchSetting.type,
                id: app.timestampCreated
            };
            params.body = app;
            console.log('index App');
            return elasticSearch.index(params).then(function(res) {
                return res;
            }, function(e) {
                return e;
            });
        }
        */
        function index(app, opts){
            var settings = $rootScope.storage.appSettings.elasticSearch.application;
            if(opts && opts.priority){
                opts.data = app;
            }
            return searchService.index(app.timestampCreated, settings, opts);
        }


        // function importMemberSnap() {
        //     var ref = firebaseDataRef.child('membership-applications');
        //     return $firebaseArray(ref).$loaded().then(function (data) {
        //         _.forEach(data, function (item) {
        //             var membershipId = item.membershipId;
        //             var memberShip = firebaseDataRef.child('membership/' + membershipId);
        //             $firebaseObject(memberShip).$loaded().then(function (memberShipRs) {
        //                 var name = memberShipRs.priMember ? memberShipRs.priMember.firstName + ' ' + memberShipRs.priMember.lastName + ' ' : '';
        //                 var keyword = name;
        //                 keyword += memberShipRs.priMember && memberShipRs.priMember.memberId ? ' ' + memberShipRs.priMember.memberId : '';
        //                 keyword += memberShipRs.accountId ? ' ' + memberShipRs.accountId : '';

        //                 if (item.timestampVerified) {
        //                     var memSnap = {
        //                         apps: [item.$id],
        //                         apptimestampCreated: item.timestampCreated,
        //                         apptimestampVerified: item.timestampVerified,
        //                         author: item.uid,
        //                         facilityCode: item.facilityCode,
        //                         isActive: true,
        //                         keyword: keyword,
        //                         membershipId: membershipId,
        //                         method: item.method,
        //                         name: name,
        //                         region: item.state,
        //                         representativeCode: item.representativeCode,
        //                         timestampCreated: memberShipRs.timestampCreated,
        //                         total: item.total ? item.total.totalAmount : 0,
        //                     };
        //                     var addedRs = memberSnapshotRef.child(memSnap.timestampCreated).set(memSnap);
        //                 }
        //             });
        //         });
        //     });
        // }

    }
})();