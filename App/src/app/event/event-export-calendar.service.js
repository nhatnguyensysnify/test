(function() {
    'use strict';
    angular.module("app.event").factory("eventExportCalendarService", eventExportCalendarService);
    /** @ngInject **/
    function eventExportCalendarService(firebaseDataRef, eventService, $rootScope, memStateService, $http, $q) {
        var services = {
            exportWorkbook: exportWorkbook
        };
        return services;

        function exportWorkbook(cri, opts) {
            var p;
            p = _getStyles(opts).then(function(res) {
                opts.theme = res;
            });
            p = p.then(function() {
                if (opts.rawData) {
                    return opts.rawData;
                }
                return _getRawData(cri, opts).then(function(res) {
                    return res.items;
                });
            });
            p = p.then(function(res) {
                return _D_sheetsData(res, opts);
            });
            p = p.then(function(exportData) {
                _export(exportData, opts.fileName || 'Files', opts);
            });
            return p;
        }

        function loadOpts() {

        }

        function _getRawData(cri, opts) {
            var p, size = 10000;
            cri.fullSource = true;
            p = eventService.search(cri);
            return p.then(function(data) {
                if (data && data.totalRecords !== 0) {
                    var pages = Math.ceil(data.totalRecords / size);
                    var reqs = [];
                    for (var i = 0; i < pages; i++) {
                        var _cri = angular.copy(cri);
                        _cri.size = size;
                        _cri.from = i * _cri.size;
                        reqs.push(eventService.search(_cri));
                    }
                    return Promise.all(reqs).then(function(res) {
                        var result = [];
                        if (res && res.length > 0) {
                            _.forEach(res, function(r) {
                                if (r && r.items && r.items.length > 0) {
                                    result = result.concat(r.items);
                                }
                            });
                        }
                        return { items: result };
                    });
                }
                return data;
            });
        }


        function _D_sheetsData(rawData, opts) {
            var sheets = [],
                summarySheet = {
                    name: 'U.S',
                    data: [],
                    merges: [],
                    cols: [],
                    index: 0
                };
            // sheet all
            sheets.push(summarySheet);
            summarySheet.data = _D_sheet1WeekTable(rawData, opts);
            var sLength = summarySheet.data.length;
            if (sLength > 1) {
                var cL = summarySheet.data[1].length;
                summarySheet.cols = _.map(_.range(cL + 1), function(d, index) {
                    var width = index !== 0 && index < cL ? 15 : 40;
                    return { width: width };
                });
            }



            // end leoSheet

            return sheets;
        }

        function _D_sheet1WeekTable(rData, opts, cornerLabel) {
            // console.log('styles', opts);

            var data = [],
                styles = opts.theme.styles.tbl;

            // styles = {
            // 	header1: '94'
            // };
            // Header: show Week
            //nhat start
            _.forEach(rData, (eventsByState) => {
                if (eventsByState.groupByDateRange && eventsByState.groupByDateRange.length > 0) {

                    let timeRangeHeaderRow = [];
                    let timeRangeHeaderRow2 = [];
                    let activitiesScheduleRow = [];
                    let repsScheduledRow = [];
                    let totalRepsAvailableRow = [];
                    let repsUnScheduledRow = [];
                    let utilizationRow = [];

                    timeRangeHeaderRow.push(['', null, styles.header1]);
                    timeRangeHeaderRow2.push([eventsByState.stateTxt, null, styles.header1]);
                    activitiesScheduleRow.push(['Activites Scheduled', null, styles.basic]);
                    repsScheduledRow.push(['# Reps Scheduled', null, styles.basic]);
                    totalRepsAvailableRow.push(['Total Reps Available', null, styles.basic]);
                    repsUnScheduledRow.push(['# Reps Un-Scheduled', null, styles.basic]);
                    utilizationRow.push(['% Utilization', null, styles.basic]);
                    _.forEach(eventsByState.groupByDateRange, dayDetail => {

                        timeRangeHeaderRow.push([dayDetail.title, null, styles.header1]);
                        timeRangeHeaderRow2.push([moment(dayDetail.title).format('ddd'), null, styles.header1]);

                        let activitiesScheduleByDay = dayDetail.events ? dayDetail.events.length : 0;
                        // let repsScheduledByDay = dayDetail.repsActivities ? dayDetail.repsActivities.length : 0;

                        activitiesScheduleRow.push([activitiesScheduleByDay, null, styles.basic]);
                        repsScheduledRow.push([dayDetail.repsUtilized, null, styles.basic]);
                        totalRepsAvailableRow.push([dayDetail.employeesAvailableDay.length || 0, null, styles.basic]);
                        repsUnScheduledRow.push([dayDetail.usersUnutilized.length || 0, null, styles.basic]);
                        let utilizationTxt = dayDetail.utilization !== Infinity ? dayDetail.utilization + '%' : 'NaN';
                        let backgorundColor = styles.rule[getDynamicClassColor(dayDetail.utilization)];
                        utilizationRow.push([utilizationTxt, null, backgorundColor]);
                    });
                    data.push(timeRangeHeaderRow);
                    data.push(timeRangeHeaderRow2);
                    data.push(activitiesScheduleRow);
                    data.push(repsScheduledRow);
                    data.push(totalRepsAvailableRow);
                    data.push(repsUnScheduledRow);
                    data.push(utilizationRow);
                    data.push([]);
                }

            });

            return data;
        }

        function getDynamicClassColor(number) {
            if (!number) {
                return 0;
            }
            if (number === Infinity || number > 100) {
                return 100;
            }
            return Math.round(Number(number) / 10, 10) * 10;
        }

        function _getStyles() {
            var styles = {};
            styles.tbl = {
                rule: {
                    0: 10,
                    10: 11,
                    20: 12,
                    30: 13,
                    40: 14,
                    50: 16,
                    60: 17,
                    70: 18,
                    80: 19,
                    90: 20,
                    100: 15,
                    range: 3,
                },
                basic: '',
                row: {
                    // cell: 5,
                    // perCell: 8,
                    // moneyCell: 9

                },
                header1: 2
            };
            var cols = [];
            return $http.get('./assets/events/calendar-export-styles.xml').then(function(res) {
                return {
                    styles: styles,
                    xml: res.data,
                    cols: cols,
                };
            });
        }

        function _export(sheets, fileName, opts) {

            // var now = moment().format('DD_MM_YYYY_hh_mm');
            // fileName = `${fileName}.xlsx`;
            fileName = fileName + '.xlsx';

            var wb = XLSX.utils.book_new();
            wb.xmlStyles = opts.theme.xml;

            _.each(sheets, function(sheet) {
                var ws = sheet_add_aoa(null, sheet.data, {});
                ws['!cols'] = sheet.cols || null;
                ws['!merges'] = sheet.merges || null;
                XLSX.utils.book_append_sheet(wb, ws, sheet.name);
            });
            /* save to file */
            XLSX.writeFile(wb, fileName);
        }

        function _parseToNumber(value) {
            var number = parseFloat(value);
            if (isNaN(number)) {
                number = null;
            }
            return number;
        }

        function _formatCurrency(value) {
            var n = parseFloat(value);
            if (_.isNaN(n)) {
                return '';
            }
            // return (Math.round(n * 1000) / 1000).toFixed(2);
            return Math.round(n * 1000) / 1000;
        }

        function _formatClosingRate(value) {
            var n = parseFloat(value);
            if (_.isNaN(n)) {
                return null;
            }
            // return (n / 100).toFixed(4);
            return (n / 100);
        }
        /** clone from XLSX.utils sheet_add_aoa, overrite that function **/
        var DENSE = null;

        function sheet_add_aoa(_ws, data, opts) {
            var o = opts || {};
            var dense = _ws ? Array.isArray(_ws) : o.dense;
            if (DENSE != null && dense == null) dense = DENSE;
            var ws = _ws || (dense ? ([]) : ({}));
            var _R = 0,
                _C = 0;
            if (ws && o.origin != null) {
                if (typeof o.origin == 'number') _R = o.origin;
                else {
                    var _origin = typeof o.origin == "string" ? XLSX.utils.decode_cell(o.origin) : o.origin;
                    _R = _origin.r;
                    _C = _origin.c;
                }
            }
            var range = ({ s: { c: 10000000, r: 10000000 }, e: { c: 0, r: 0 } });
            if (ws['!ref']) {
                var _range = XLSX.utils.safe_decode_range(ws['!ref']);
                range.s.c = _range.s.c;
                range.s.r = _range.s.r;
                range.e.c = Math.max(range.e.c, _range.e.c);
                range.e.r = Math.max(range.e.r, _range.e.r);
                if (_R == -1) range.e.r = _R = _range.e.r + 1;
            }
            for (var R = 0; R != data.length; ++R) {
                for (var C = 0; C != data[R].length; ++C) {
                    if (typeof data[R][C] === 'undefined') continue;
                    var cell = ({ v: data[R][C] });
                    if (Array.isArray(cell.v)) {
                        cell.f = data[R][C][1];
                        cell.v = cell.v[0];
                        // tdang add
                        cell.sId = data[R][C][2];
                        // tdang end
                    }
                    var __R = _R + R,
                        __C = _C + C;
                    if (range.s.r > __R) range.s.r = __R;
                    if (range.s.c > __C) range.s.c = __C;
                    if (range.e.r < __R) range.e.r = __R;
                    if (range.e.c < __C) range.e.c = __C;
                    // tdang add
                    if (cell.v === null) { cell.v = ''; }
                    // tdang end
                    if (cell.v === null) { if (cell.f) cell.t = 'n';
                        else if (!o.cellStubs) continue;
                        else cell.t = 'z'; } else if (typeof cell.v === 'number') cell.t = 'n';
                    else if (typeof cell.v === 'boolean') cell.t = 'b';
                    else if (cell.v instanceof Date) {
                        cell.z = o.dateNF || XLSX.utils.SSF._table[14];
                        if (o.cellDates) { cell.t = 'd';
                            cell.w = XLSX.utils.SSF.format(cell.z, XLSX.utils.datenum(cell.v)); } else { cell.t = 'n';
                            cell.v = XLSX.utils.datenum(cell.v);
                            cell.w = XLSX.utils.SSF.format(cell.z, cell.v); }
                    } else cell.t = 's';
                    if (dense) {
                        if (!ws[__R]) ws[__R] = [];
                        ws[__R][__C] = cell;
                    } else {
                        var cell_ref = XLSX.utils.encode_cell(({ c: __C, r: __R }));
                        ws[cell_ref] = cell;
                    }
                }
            }
            if (range.s.c < 10000000) ws['!ref'] = XLSX.utils.encode_range(range);
            return ws;
        }
        /** clone from XLSX.utils sheet_add_aoa **/

    }
})();