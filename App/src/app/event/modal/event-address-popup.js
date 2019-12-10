(function () {
    'use strict';

    angular.module('app.event')
        .controller('EventAddressPopupCtrl', EventAddressPopupCtrl);

    /** @ngInject */
    function EventAddressPopupCtrl($rootScope, $scope, $uibModalInstance, appUtils, $timeout, authService, mailingAddress, allStates) {
        // var currentUser = authService.getCurrentUser(); //$rootScope.storage.currentUser,
        // var isAdmin = appUtils.checkSpecifyRole(currentUser, 'admin'),
        //     isRep = appUtils.checkSpecifyRole(currentUser, 'rep');
        
        var eventVm = this;
        eventVm.mailingAddress = angular.copy(mailingAddress);
        eventVm.showInvalid = false;
        
        //eventVm.showValid = false;
     
        eventVm.selectAddress = selectAddress;
        eventVm.allStates = allStates;
        eventVm.zipcodeRegx = /(^\d{5}$)|(^\d{5}-\d{4}$)/;

        $('.add-web-app-modal').hide();
        $('.preview-web-app-modal').hide();



        function getDateTime(value) {
            var time = parseInt(value);
            if (isNaN(time)) {
                return '';
            }
            return moment(time).utc().format('MM/DD/YYYY');
        }

        function selectAddress() {
            // if(eventVm.eventSelected === undefined){
            //     eventVm.showValid = true;
            //     return;
            // }
            $uibModalInstance.close(eventVm.mailingAddress);
        }

        //Functions
        eventVm.close = function () {
            $uibModalInstance.dismiss('cancel');
        };
    }
})();
