(function () {
    'use strict';
    angular.module('app.Directive.DateRangeReport', []).directive('dateRangeReport', ['$parse', '$timeout', function ($parse, $timeout) {
        return {
            restrict: 'AE',
            replace: true,
            template: ['<div class="btn default">',
                '<i class="fa fa-calendar"></i> &nbsp;',
                '<span> </span>',
                '<b class="fa fa-angle-down"></b>',
                '</div>'
            ].join(''),
            link: function (scope, iElement, iAttrs, ngModelCtrl) {
                var dateRangeId = iAttrs.id,
                    subtractDays = iAttrs.subtract ? parseInt(iAttrs.subtract) : 6,
                    isEvent = iAttrs.event && iAttrs.event === 'true' ? true : false,
                    userStatistic = iAttrs.userStatistic ? true : false,
                    position = iAttrs.position ? iAttrs.position : 'right';

                var startDate = iAttrs.start ? moment(parseInt(iAttrs.start)) : moment().subtract('days', subtractDays);
                var endDate = iAttrs.end ? moment(parseInt(iAttrs.end)) : moment();

                var now = moment();
                var _now4Week = now.clone(),
                    _currentWeek = _now4Week.clone().startOf('week'),
                    _currentDate = _now4Week.clone().startOf('day');

                // if (_currentWeek.isSame(_currentDate)) { //
                //     _now4Week = _currentWeek.subtract(1, 'day');
                // }

                var ranges = {
                    'Today': [now.clone(), now.clone()],
                    'Yesterday': [now.clone().subtract('days', 1), now.clone().subtract('days', 1)],
                    'Last 7 Days': [now.clone().subtract('days', 6), now.clone()],
                    'This Week': [_now4Week.clone().startOf('isoweek'), _now4Week.clone().endOf('isoweek')],
                    'Last Week': [_now4Week.clone().isoWeekday(-6), _now4Week.clone().isoWeekday(0).endOf('day')],
                    'Last 30 Days': [now.clone().subtract('days', 29), now.clone()],
                    'This Month': [now.clone().startOf('month'), now.clone().endOf('month')],
                    'Last Month': [now.clone().subtract('month', 1).startOf('month'), now.clone().subtract('month', 1).endOf('month')],
                    // 'This Quarter': [moment(), moment()],
                    // 'Last Quarter': [moment(), moment()],
                    'This Year': [now.clone().startOf('year'), now.clone().endOf('days')]
                };

                if (isEvent) {
                    startDate = iAttrs.start ? moment(parseInt(iAttrs.start)).utc() : moment().utc().subtract('days', subtractDays);
                    endDate = iAttrs.end ? moment(parseInt(iAttrs.end)).utc() : moment().utc();
                }

                if (userStatistic) {
                    delete ranges['Last 30 Days'];
                    delete ranges['This Month'];
                    delete ranges['Last Month'];
                }

                scope.$on('resetDateRange', function () {
                    setTimeout(function () {
                        
                        if(isEvent){
                            startDate = iAttrs.start ? moment(parseInt(iAttrs.start)).utc() : moment().utc().subtract('days', subtractDays);
                            endDate = iAttrs.end ? moment(parseInt(iAttrs.end)).utc() : moment().utc();
                        }else{
                            startDate = iAttrs.start ? moment(parseInt(iAttrs.start)) : moment().subtract('days', subtractDays);
                            endDate = iAttrs.end ? moment(parseInt(iAttrs.end)) : moment();
                        }
                        
                        console.log('alo alo');
                        $('#' + dateRangeId).data('daterangepicker').setStartDate(startDate);
                        $('#' + dateRangeId).data('daterangepicker').setEndDate(endDate);
                        $('#' + dateRangeId + ' span').html(startDate.format('ll') + ' - ' + endDate.format('ll'));
                    }, 500);
                });

                if (dateRangeId) {
                    $(function () {
                        $('#' + dateRangeId).daterangepicker({
                            opens: position,
                            startDate: startDate,
                            endDate: endDate,
                            showDropdowns: true,
                            showWeekNumbers: true,
                            timePicker: false,
                            timePickerIncrement: 1,
                            timePicker12Hour: true,
                            linkedCalendars: false,
                            ranges: ranges,
                            buttonClasses: ['btn'],
                            applyClass: 'green',
                            cancelClass: 'default',
                            format: 'MM/DD/YYYY',
                            separator: ' to ',
                            locale: {
                                applyLabel: 'Apply',
                                fromLabel: 'From',
                                toLabel: 'To',
                                customRangeLabel: 'Custom Range',
                                daysOfWeek: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
                                monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
                                firstDay: 1
                            }
                        },
                            function (start, end) {
                                if (isEvent) {
                                    var startStr = angular.copy(start).format('MM/DD/YYYY'),
                                        endStr = angular.copy(end).format('MM/DD/YYYY');

                                    $('#' + dateRangeId + ' span').html(moment.utc(startStr).format('ll') + ' - ' + moment.utc(endStr).format('ll'));
                                } else {
                                    $('#' + dateRangeId + ' span').html(start.format('ll') + ' - ' + end.format('ll'));
                                }
                            }
                        );

                        //Set the initial state of the picker label
                        $('#' + dateRangeId + ' span').html(startDate.format('ll') + ' - ' + endDate.format('ll'));
                    });
                }
            }
        };
    }]);
})();