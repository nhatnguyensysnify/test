(function() {
    'use strict';
    angular.module('app.employee').controller('eSchedulerCancelShiftModalCtrl', eSchedulerCancelShiftModalCtrl);
    /** @ngInject */
    function eSchedulerCancelShiftModalCtrl(cancelDate, shift, cUser, $scope, $uibModalInstance, eventService, shiftsService,
        appUtils, employeeLogService) {
        //shiftsModal.dismiss();
        var cancelShiftVm = this; // jshint ignore:line

        $scope.reason = "";
        $scope.title = "Cancel request on " + cancelDate;

        $scope.submit = function() {
            appUtils.showLoading();
            
            eventService.searchByShift(shift)
                .then(result => {
                    const events = result.items;
                    return events;
                }).then(events => {
                    shiftsService.cancelShift(shift, $scope.reason, events).then(res => {
                        //add log to track activity
                        var employeeLog = {
                            action: appUtils.logEmployeeAction.cancelAvailability.value,
                            message: `Cancelled availability at : ${shift.dateString}. Description: ${$scope.reason}`,
                            updateBy: cUser.email || '',
                            status: 'Cancelled',
                            shiftId: shift.shiftId
                        };
                        employeeLogService.create(cUser.uid, employeeLog);

                        // console.log("Cancel shift id " + shift.shiftId);
                        // if (res) console.log(res);
                        // else console.log(" with reason : " + $scope.reason);
                        $uibModalInstance.close({ shiftId: shift.shiftId, reason: $scope.reason });
                    });
                });
        };

        $scope.back = function() {
            $uibModalInstance.dismiss();
        };
    }
})();