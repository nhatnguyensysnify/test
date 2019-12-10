(function () {
    'use strict';

    angular.module('app.event')
        .controller('EventNotificationPopupCtrl', EventNotificationPopupCtrl);

    /** @ngInject */
    function EventNotificationPopupCtrl($rootScope, $scope, $uibModalInstance, appUtils, $timeout, authService, eventDetail, eventService, eventTrackingService) {
        var currentUser = authService.getCurrentUser(); //$rootScope.storage.currentUser,
        // var isAdmin = appUtils.checkSpecifyRole(currentUser, 'admin'),
        //     isRep = appUtils.checkSpecifyRole(currentUser, 'rep');

        var eventVm = this;
        eventVm.showInvalid = false;

        //eventVm.showValid = false;

        eventVm.sendNotification = sendNotification;
        eventVm.eventDetail = eventDetail;
        eventVm.emailChecked = true;
        eventVm.smsChecked = true;
        eventVm.currentUser = currentUser;
        $('.add-web-app-modal').hide();
        $('.preview-web-app-modal').hide();



        function getDateTime(value) {
            var time = parseInt(value);
            if (isNaN(time)) {
                return '';
            }
            return moment(time).utc().format('MM/DD/YYYY');
        }

        function sendNotification() {
            // if(eventVm.eventSelected === undefined){
            //     eventVm.showValid = true;
            //     return;
            // }
            // $uibModalInstance.close(eventVm.mailingAddress);
            // console.log('eventVm.smsChecked', eventVm.smsChecked, eventVm.emailChecked);
            // console.log('eventDetail', eventDetail);

            if (!eventVm.smsChecked && !eventVm.emailChecked) {
                return;
            }
            // let eventsSnapshot = {};
            // eventsSnapshot[eventDetail.$id] = {
            //     eventId: eventDetail.$id,
            //     status: eventDetail.status,
            //     verifyStatus: eventDetail.verifyStatus,
            //     name: eventDetail.name
            // };
            let uids = [];
            uids = uids.concat(Object.keys(eventDetail.requester || {}));
            uids = uids.concat(Object.keys(eventDetail.areaManager || {}));
            uids = uids.concat(Object.keys(eventDetail.representativeAttended || {}));
            uids = _.uniq(uids);
            let channels = [];
            if(eventVm.emailChecked){
                channels.push('email');
            }
            if(eventVm.smsChecked){
                channels.push('sms');
            }
            if (uids.length > 0) {
                _.forEach(uids, uid => {
                    // if (eventVm.smsChecked) {
                    eventService.addEventRun(uid, eventDetail, channels, eventVm.currentUser);
                    // }
                    // if (eventVm.emailChecked) {
                    //     eventService.addEventRun(uid, eventDetail, 'email', eventVm.currentUser);
                    // }
                });
            }
            //tracking end
            var trackingObj = {
                action: 'sendNotifyEvent',
                fields: []
            };
            eventTrackingService.create(eventDetail.$id, trackingObj);
            $uibModalInstance.close(true);
        }

        //Functions
        eventVm.close = function () {
            $uibModalInstance.dismiss('cancel');
        };
    }
})();
