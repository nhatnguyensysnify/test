(function() {
    'use strict';
    angular.module('app.membership').factory('membershipSnapshotService', membershipSnapshotService);

    /** @ngInject **/
    function membershipSnapshotService($q, firebaseDataRef, DataUtils) {
        var items = firebaseDataRef.child('membership-snapshot');
        var service = {
            create: create,
            update: update,
            remove: remove,
            importSnap: importSnap
        };

        return service;

        function importSnap() {
            var ref = firebaseDataRef.child('membership');
            return DataUtils.getListDataFirebaseLoadOnce(ref, true).then(function(data) {
                var reqs = [];
                _.forEach(data, function(item) {
                    if (item.isActive === true) {
                        reqs.push(create(item.$id));
                    }
                });

                return $q.all(reqs);
            });
        }

        function create(membershipId) {
            var mem = firebaseDataRef.child('membership/' + membershipId);
            DataUtils.getDataFirebaseLoadOnce(mem, true).then(function(result) {
                if (result) {
                    var appId = result.apps && result.apps.length > 0 ? result.apps[0] : 'NonId';
                    if (appId !== 'NonId') {
                        var app = firebaseDataRef.child('membership-applications/' + appId);
                        DataUtils.getDataFirebaseLoadOnce(app, true).then(function(rs) {
                            var snapshot = {
                                membershipId: result.$id,
                                author: result.uid || '',
                                timestampCreated: result.timestampCreated,
                                isActive: result.isActive !== undefined ? result.isActive : false,
                                accountId: result.accountId ? result.accountId : '',
                                name: ' ',
                                apps: result.apps,
                                region: rs && rs.state ? rs.state : '',
                                facilityCode: rs && rs.facilityCode ? rs.facilityCode : '',
                                representativeCode: rs && rs.representativeCode ? rs.representativeCode : '',
                                method: rs.method !== undefined ? rs.method : '',
                                total: rs && rs.total && rs.total.totalAmount ? parseFloat(rs.total.totalAmount) : 0,
                                apptimestampCreated: rs && rs.timestampCreated ? rs.timestampCreated : '',
                                apptimestampVerified: rs && rs.timestampVerified ? rs.timestampVerified : '',
                                apptimestampSignatured: rs && rs.timestampSignatured ? rs.timestampSignatured : '',
                                overwrite: result && result.overwrite || false,
                                eventId: rs && rs.eventId || '',
                                eventName: rs && rs.eventName || ''
                            };
                            var memberAccId = result.accountId ? result.accountId : '';
                            snapshot.accountId = memberAccId;
                            snapshot.keyword = memberAccId;
                            var fName, lName, memId, email;
                            if (result.priMember) {
                                fName = result.priMember.firstName ? result.priMember.firstName : '';
                                lName = result.priMember.lastName ? result.priMember.lastName : '';
                                memId = result.priMember.memberId ? result.priMember.memberId : '';
                                email = result.priMember.email ? result.priMember.email : '';
                                snapshot.keyword = fName + ' ' + lName + ' ' + memId + ' ' + memberAccId + ' ' + email + ' ';
                                snapshot.name = fName + ' ' + lName;
                            }
                            if (result.secMember) {
                                fName = result.secMember.firstName ? result.secMember.firstName : '';
                                lName = result.secMember.lastName ? result.secMember.lastName : '';
                                memId = result.secMember.memberId ? result.secMember.memberId : '';
                                email = result.secMember.email ? result.secMember.email : '';
                                snapshot.keyword += fName + ' ' + lName + ' ' + memId + ' ' + email;
                                //snapshot.name = fName + ' ' + lName;
                            }

                            snapshot.keyword = snapshot.keyword.toLowerCase();
                            /* jshint ignore:start */
                            var reqs = [];
                            if (snapshot.timestampCreated) {
                                snapshot = DataUtils.stripDollarPrefixedKeys(snapshot);
                                var itemSnapshot = items.child(snapshot['timestampCreated']).set(snapshot);
                                reqs.push(itemSnapshot);
                            }
                            return $q.all(reqs).then(function(res) {
                                return { result: true };
                            }).catch(function(error) {
                                console.log(error);
                                return { result: false, errorMsg: error.message };
                            });
                            /* jshint ignore:end */
                        });
                    } else {
                        //console.log('nonId : ' + membershipId);
                    }
                }
            });
        }

        function update(membershipId) {
            if (membershipId && membershipId !== '')
                create(membershipId);
        }

        function remove(membership) {
            var snapshot = firebaseDataRef.child('membership-snapshot/' + membership.timestampCreated);
            if (snapshot) {
                snapshot.remove();
            }
        }

    }
})();