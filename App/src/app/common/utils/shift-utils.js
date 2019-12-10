(function() {
    'use strict';
    angular.module('app.utils').factory('shiftUtils', shiftUtils);
    /** @ngInject **/
    function shiftUtils() {
        const EndRepeatEnum = {
            ON: 1,
            AFTER: 2
        };

        const StatusEnum = {
            ADDED: 0,
            CONFIRMED: 1,
            SYSTEM: 2,
            APPROVED: 3
        };

        const StatusToString = {
            0: 'ADDED',
            1: 'CONFIRMED',
            2: 'SYSTEM',
            3: 'APPROVED'
        };

        const StatusColor = {
            1: '#c3c3c3',
            2: 'rgb(30, 144, 255)',
            3: 'rgb(227, 188, 8)',
            4: 'rgb(173, 33, 33)'
        };

        const Color = {
            true: ['rgb(66, 185, 93)', '#28a745'],
            false: ['#ed6b75', '#ea5460']
        };

        const ShortDaysOfWeek = {
            Mon: 'Monday',
            Tue: 'Tuesday',
            Wed: 'Wednesday',
            Thu: 'Thursday',
            Fri: 'Friday',
            Sat: 'Saturday',
            Sun: 'Sunday'
        };

        const RepeatOptions = {
            1: { name: "Monthly", unit: "month", summary: "Monthly on " },
            2: { name: "Weekly", unit: "week", summary: "Weekly on " },
            3: { name: "Daily", unit: "day", summary: "Daily, " },
            4: { name: "Every Weekday", unit: "week", summary: "Weekly on " }
        };

        function _composeSelectBoxText(data, disabledId = null) {
            var text = [],
                fName = _.trim(data.firstName),
                lName = _.trim(data.lastName),
                repCode = _.trim(data.repCode || data.username || '');

            if (fName) {
                text.push(fName);
            }
            if (lName) {
                text.push(lName);
            }

            var displayName = angular.copy(text);

            if (repCode) {
                text.push('(' + repCode + ')');
            }

            return {
                id: data.$id,
                text: text.join(' '),
                email: data.email,
                repCode: repCode,
                displayName: displayName.join(' '),
                disabled: data.$id === disabledId,
            };
        }

        function formatDateType1(date) {
            return moment(date).format("ddd, MMM DD, YYYY");
        }

        function formatDateType2(date) {
            return moment(date).format("MM/DD/YYYY");
        }

        var shiftUtils = {
            EndRepeatEnum: EndRepeatEnum,
            StatusEnum: StatusEnum,
            StatusToString: StatusToString,
            Color: Color,
            StatusColor: StatusColor,
            ShortDaysOfWeek: ShortDaysOfWeek,

            RepeatOptions: RepeatOptions,
            formatOptions: _composeSelectBoxText,

            formatDateType1: formatDateType1,
            formatDateType2: formatDateType2
        };


        return shiftUtils;
    }
})();