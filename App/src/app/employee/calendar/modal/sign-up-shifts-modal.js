(function() {
    'use strict';
    angular.module('app.employee').controller('eSchedulerSignUpShiftModalCtrl', eSchedulerSignUpShiftModalCtrl);
    /** @ngInject */
    function eSchedulerSignUpShiftModalCtrl($scope, $uibModalInstance, $timeout, eventService, appUtils, currentDay,
        $ngBootbox, shiftsService, shiftsAdded, employeeService, employeeLogService, shiftUtils) {
        var employeeSignUpShiftModalCtrl = $scope.eCalendarVm,
            shiftModalVm = this; // jshint ignore:line

        var appSettings = employeeSignUpShiftModalCtrl.appSettings;

        shiftModalVm.type = 1;
        shiftModalVm.title = `<span class="caption-subject font-blue-steel bold ">Add Availability</span>`;
        shiftModalVm.result = [];
        shiftModalVm.sort = {
            field: 'type',
            desc: true
        };
        shiftModalVm.slides = [1, 2, 3];

        shiftModalVm.events = [];
        shiftModalVm.calendarView = 'month';
        shiftModalVm.viewDate = moment().startOf('month').toDate();
        shiftModalVm.viewDateSec = null;
        shiftModalVm.cellModifier = function(cell) {
            let cTimestampDate = cell.timestampUtc; //moment(cell.date).utc().startOf('day').valueOf();
            if (shiftModalVm.dateRangeCanAddShift &&
                shiftModalVm.dateRangeCanAddShift[cTimestampDate] &&
                shiftModalVm.dateRangeCanAddShift[cTimestampDate].isAvailable &&
                shiftModalVm.dateRangeCanAddShift[cTimestampDate].count == 0) {
                cell.cssClass = 'shift-available';
            } else if (shiftModalVm.dateRangeCanAddShift &&
                shiftModalVm.dateRangeCanAddShift[cTimestampDate] &&
                shiftModalVm.dateRangeCanAddShift[cTimestampDate] &&
                shiftModalVm.dateRangeCanAddShift[cTimestampDate].count == 0) {
                cell.cssClass = 'shift-unavailable';
            }
            if (!cell.functionClick) {
                cell.functionClick = shiftModalVm.dateClicked;
            }
            // cell.cssClass = 'add-shift-cell' ;
        };
        shiftModalVm.dateRangeCanAddShift = {

        };
        shiftModalVm.isConfirmed = false;
        shiftModalVm.isSubmited = false;
        shiftModalVm.shiftsAdded = shiftsAdded;

        shiftModalVm.close = close;
        shiftModalVm.dateClicked = dateClicked;
        shiftModalVm.createDateRange = employeeSignUpShiftModalCtrl.createDateRange;
        shiftModalVm.showConfirmShiftModal = showConfirmShiftModal;
        shiftModalVm.submit = submit;

        initPage();
        //===============================================================
        function initPage() {
            createDateRangeAvailable();
            //
            if (shiftModalVm.events && shiftModalVm.events.length > 0) {
                // not search
                shiftModalVm.title = `<span class="caption-subject font-blue-steel bold ">Events - ${moment(currentDay).format('LL')}</span>`;

            } else {

            }


        }

        function dateClicked(cell) {
            shiftModalVm.isConfirmed = false;
            let cTimestampDate = cell.timestampUtc; //moment(cell.date).utc().startOf('day').valueOf();
            if (cell.inMonth && shiftModalVm.dateRangeCanAddShift && shiftModalVm.dateRangeCanAddShift[cTimestampDate] && shiftModalVm.dateRangeCanAddShift[cTimestampDate].count == 0) {
                shiftModalVm.dateRangeCanAddShift[cTimestampDate].isAvailable = !shiftModalVm.dateRangeCanAddShift[cTimestampDate].isAvailable;
            }
            if (cell.inMonth && shiftModalVm.dateRangeCanAddShift && shiftModalVm.dateRangeCanAddShift[cTimestampDate] && shiftModalVm.dateRangeCanAddShift[cTimestampDate].isAvailable && shiftModalVm.dateRangeCanAddShift[cTimestampDate].count == 0) {
                cell.cssClass = 'shift-available';
            } else if (cell.inMonth && shiftModalVm.dateRangeCanAddShift && shiftModalVm.dateRangeCanAddShift[cTimestampDate] && shiftModalVm.dateRangeCanAddShift[cTimestampDate].isAvailable == false && shiftModalVm.dateRangeCanAddShift[cTimestampDate].count == 0) {
                cell.cssClass = 'shift-unavailable';
            }

        }

        function createDateRangeAvailable() {
            // let strToday = moment().format('MM/DD/YYYY');
            let availableScheduleRange = appSettings.availableScheduleRange || 14;
            //console.log('appSettings.availableScheduleRange', appSettings.availableScheduleRange);

            let today = moment().startOf('day');
            availableScheduleRange = today.day() == 0 ? availableScheduleRange : availableScheduleRange + 2;
            shiftModalVm.timestampStart = moment.utc(today.format('MM/DD/YYYY')).startOf('day').valueOf();
            shiftModalVm.timestampEnd = moment.utc(today.format('MM/DD/YYYY')).add(availableScheduleRange, 'days').day(0).startOf('day').valueOf();
            // console.log('endutc', endutc);

            let isInMonth = moment.utc(shiftModalVm.timestampStart).month() === moment.utc(shiftModalVm.timestampEnd).month();

            shiftModalVm.viewDate = today.toDate();

            if (!isInMonth) {
                shiftModalVm.viewDateSec = moment.utc(shiftModalVm.timestampEnd).toDate();
            }

            // var mockupDateRange = shiftModalVm.createDateRange(shiftModalVm.timestampStart, shiftModalVm.timestampEnd);
            shiftModalVm.dateRangeCanAddShift = shiftModalVm.shiftsAdded; //_.keyBy(mockupDateRange, 'key');
            let startDayAvailable = _.find(shiftModalVm.dateRangeCanAddShift, item => item.count == 0);
            shiftModalVm.timestampStart = startDayAvailable ? startDayAvailable.key : shiftModalVm.timestampStart;

        }

        function showConfirmShiftModal() {
            if (shiftModalVm.isSubmited) {
                return false;
            }
            shiftModalVm.isSubmited = true;
            $ngBootbox.confirm('Do you want to save this schedule?').then(function() {
                submit();
            }, function() {
                //clicked cancel
                shiftModalVm.isSubmited = false;
            });
        }

        function submit() {
            shiftModalVm.isSubmited = true;
            appUtils.showLoading();

            let cUser = employeeSignUpShiftModalCtrl.currentUser;
            let dateRangeCanAddShift = _.filter(shiftModalVm.dateRangeCanAddShift, shiftItem => {
                return !shiftItem.count;
            });
            let shiftsAdd = _.map(dateRangeCanAddShift, shiftItem => {
                let shiftAdd = {
                    availability: shiftItem.isAvailable || false,
                    date: shiftItem.key,
                    startTime: shiftModalVm.timestampStart,
                    endTime: shiftModalVm.timestampEnd,
                    startDate: shiftItem.key,
                    endDate: moment(shiftItem.key).utc().endOf('day').valueOf(),
                    title: `${cUser.displayName} - ${moment(shiftItem.key).utc().format('dddd - LL')}`,
                    managers: cUser.managers || [],
                    alias: cUser.alias,
                    rep: cUser.uid,
                    description: '',
                    status: shiftUtils.StatusEnum.CONFIRMED,

                    //addition
                    dateString: moment(shiftItem.key).utc().format("MM/DD/YYYY"),

                    //readonly
                    timestampCreated: appUtils.getTimestamp(),
                    timestampModified: appUtils.getTimestamp(),
                    createdBy: cUser.uid,
                    modifiedBy: cUser.uid,

                    //hardcode
                    // managerRefs: [
                    //     ["R_514", "ADMIN_52"],
                    //     ["A_522", "R_514", "ADMIN_52"],
                    //     ["REP_858", "A_522", "R_514", "ADMIN_52"],
                    // ],
                };
                return shiftAdd;
            });
            //console.log('shiftsAdd', shiftsAdd);

            shiftsService.addShifts(shiftsAdd, cUser).then((res) => {}).finally(() => {
                setTimeout(() => {
                    appUtils.hideLoading();
                    close(true);
                }, 1000);
                /* $timeout(angular.noop, 0); */
            });
        }

        function close(res) {
            $uibModalInstance.dismiss(res);
        }


    }
})();