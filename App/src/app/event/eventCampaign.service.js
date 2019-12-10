(function () {
    'use strict';
    angular.module('app.event').factory('eventCampaignService', eventCampaignService);
    /** @ngInject **/
    function eventCampaignService($rootScope, firebaseDataRef, appUtils, DataUtils, authService, $q, searchService, employeeService, eventTrackingService, eventQueueService, memAppService, memAppTimeLineService, memAppVerifyService, notificationService) {
        var rootPath = 'events',
            eventTypePath = 'event-types',
            eventRef = firebaseDataRef.child(rootPath),
            eventCampaignRef = firebaseDataRef.child('event-campaign'),
            uniqueUrlRef = firebaseDataRef.child('event-unique-url'),
            eventTypesRef = firebaseDataRef.child(eventTypePath);

        var service = {
            get: get,
            create: create,
            update: update,
            updateVerifyStatus: updateVerifyStatus,
            addEventRun: addEventRun,
            search: search
        };

        function get(id) {
            var ref = eventRef.child(id);
            return DataUtils.getDataFirebaseLoadOnce(ref, true);
        }


        function create(add) {
            // var ts = appUtils.getTimestamp(),
            //     key = eventRef.push().key;

            // add.timestampCreated = add.timestampModified = ts;
            // add = DataUtils.stripDollarPrefixedKeys(add);
            // return eventRef.child(key).update(add).then(function (rs) {
            //     var trackingObj = {
            //         action: 'createEvent',
            //         fields: []
            //     };
            //     eventTrackingService.create(key, trackingObj);
            //     return { result: true, key: key };
            // }).catch(function (error) {
            //     console.log(error);
            //     return { result: false, errorMsg: error.message };
            // });
        }

        function update(data) {
            
        }
        
        function search(cri) {
            let ref = eventCampaignRef.orderByKey().startAt(cri.timestampStart + '').endAt(cri.timestampEnd + '').once("value");
            return ref.then(function (res) {
                var data = res.val();
                // console.log('data', data);
                return data;
            });
        }


        function addEventRun(uid, eventDetail, channel, currentUser) {
            // console.log('addEventRun', uid, eventDetail, channel);

            let currentDate = moment().format('MM/DD/YYYY');
            let currentDateUtc = moment.utc(currentDate, 'MM/DD/YYYY').startOf('day').valueOf();
            let expireDate = moment().add(1, 'days').format('MM/DD/YYYY');
            let expireDateUtc = moment.utc(expireDate, 'MM/DD/YYYY').startOf('day').valueOf();
            let uniqueToken = firebaseDataRef.child("event-unique-url").push();
            let eventsSnapshot = {};
            eventsSnapshot[eventDetail.$id] = {
                eventId: eventDetail.$id,
                status: eventDetail.status,
                name: eventDetail.name
            };
            return employeeService.getUser(uid).then(userDetail => {
                let runData = {
                    uid: uid,
                    dateString: currentDate,
                    date: currentDateUtc,
                    status: 0,
                    expireDate: expireDateUtc,
                    eventsInstance: eventsSnapshot,
                    timestampCreated: Date.now(),
                    timestampModified: Date.now(),
                    source: 'SmartAdmin',
                    transaction: {}
                };
                if (channel.indexOf('email') > -1) {
                    let transactionEmail = firebaseDataRef.child(`event-campaign/${currentDateUtc}`).push();
                    runData.transaction[transactionEmail.key] = {
                        date: currentDateUtc,
                        dateString: currentDate,
                        status: 0,
                        recipient: userDetail.notificationEmail || userDetail.email,
                        token: uniqueToken.key,
                        channel: 'email',
                        url: $rootScope.storage.appSettings.webURL + '/#/events/confirmation?token=' + uniqueToken.key
                    };
                }
                if (channel.indexOf('sms') > -1) {
                    let transactionSMS = firebaseDataRef.child(`event-campaign/${currentDateUtc}`).push();
                    runData.transaction[transactionSMS.key] = {
                        date: currentDateUtc,
                        dateString: currentDate,
                        status: 0,
                        recipient: userDetail.primaryPhone,
                        token: uniqueToken.key,
                        channel: 'sms',
                        url: $rootScope.storage.appSettings.webURL + '/#/events/confirmation?token=' + uniqueToken.key
                    };
                }

                let runItemRef = firebaseDataRef.child(`event-campaign/${currentDateUtc}`).push();
                return runItemRef.set(runData).then(() => {
                    //send notify
                    _.forEach(runData.transaction, (transaction, transactionId) => {
                        transaction.id = transactionId;
                        notificationService.sendNotifyEventConfirmation(transaction, runItemRef.key, currentDateUtc, userDetail);
                    });
                    // update status event to 'pending'
                    let _event = {
                        modifiedBy: currentUser.email || '',
                        $id: eventDetail.$id,
                        timestampModified: Date.now(),
                        verifyStatus: 0
                    };
                    _update(_event);
                    
                    return uniqueToken.set({
                        campaignId: currentDateUtc,
                        runId: runItemRef.key
                    });
                });
            });
        }
        function updateVerifyStatus(events, runData, currentUser) {
            if (!runData.campaignId || !runData.$id) {
                return Promise.reject("Some thing have error!");
            }
            let srcs = [];
            _.forEach(events, event => {
                // console.log('event', event);
                get(event.$id).then(eventDetail => {
                    // console.log('eventDetail', eventDetail);
                    if (eventDetail.verifyStatus == appUtils.eventVerifyStatusEnum.CANCELED || eventDetail.verifyStatus == appUtils.eventVerifyStatusEnum.CONFIRMED) {
                        //continue
                    } else {
                        console.log('else');

                        let _event = {
                            modifiedBy: currentUser.email || '',
                            $id: event.$id,
                            timestampModified: Date.now()
                        };
                        _event.verifyStatus = event.submitVerifyStatus;
                        _event._verifyStatus = event.submitVerifyStatus;
                        srcs.push(_update(_event, currentUser));
                        if (event.submitVerifyStatus == appUtils.eventVerifyStatusEnum.CANCELED) {
                            srcs.push(notificationService.notifyCancelEvent(event.$id, runData.campaignId, runData.$id, currentUser));
                        }
                    }
                });
            });
            return Promise.all(srcs).then(srcResults => {
                let eventsSnapshot = {};
                _.forEach(events, event => {
                    eventsSnapshot[event.$id] = {
                        eventId: event.$id,
                        status: event.status,
                        verifyStatus: event.submitVerifyStatus,
                        name: event.name
                    };
                });
                
                // console.log('eventsSnapshot', eventsSnapshot, events);
                let _run = {
                    modifiedBy: currentUser.email || '',
                    timestampModified: Date.now(),
                    status: 1
                };
                if (eventsSnapshot) {
                    _run.events = eventsSnapshot;
                }
                return eventCampaignRef.child(`${runData.campaignId}/${runData.$id}`).update(_run).then(() => {
                    //send mail
                    return true;
                });
            });
        }
        
        return service;
    }
})();