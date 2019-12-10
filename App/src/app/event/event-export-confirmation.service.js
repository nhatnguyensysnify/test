(function () {
    'use strict';
    angular.module("app.event").factory("eventExportConfirmationService", eventExportConfirmationService);
    /** @ngInject **/
    function eventExportConfirmationService(firebaseDataRef, eventService, $rootScope, memStateService, $http, $q, employeeService, appUtils, departmentSevice) {
        var services = {
            exportWorkbook: exportWorkbook,
            exportCampaignsWorkbook: exportCampaignsWorkbook,
            exportRunsWorkbook: exportRunsWorkbook
        };
        return services;

        function exportWorkbook(cri, opts) {
            var p;
            p = _getEventStyles(opts).then(function (res) {
                opts.theme = res;
            });
            p = p.then(function () {
                if (opts.rawData) {
                    return opts.rawData;
                }
                return _getRawData(cri, opts).then(function (res) {
                    return res.items;
                });
            });
            p = p.then(function (res) {
                return _sheetsData(res, opts);
            });
            p = p.then(function (exportData) {
                _export(exportData, opts.fileName || 'Files', opts);
            });
            return p;
        }
        function exportRunsWorkbook(cri, opts) {
            var p;
            p = _getStyles(opts).then(function (res) {
                opts.theme = res;
            });
            p = p.then(function () {
                return _getRawEmployeesData(cri, opts);
            });
            p = p.then(function (res) {
                return _sheetsNotificationsData(res, opts);
            });
            p = p.then(function (exportData) {
                _export(exportData, opts.fileName || 'Files', opts);
            });
            return p;
        }
        function exportCampaignsWorkbook(cri, opts) {
            console.log('exportCampaignsWorkbook', opts);
            
            var p;
            p = _getStyles(opts).then(function (res) {
                opts.theme = res;
            });
            p = p.then(function () {
                if (opts.rawData) {
                    return opts.rawData;
                }
                return _getRawData(cri, opts).then(function (res) {
                    return res.items;
                });
            });
            p = p.then(function (res) {
                return _sheetsCampaignData(res, opts);
            });
            p = p.then(function (exportData) {
                _export(exportData, opts.fileName || 'Files', opts);
            });
            return p;
        }
        function loadOpts() {

        }

        function _getRawEmployeesData(cri, opts) {
            cri.fullSource = true;
            let _cri = {
                from: 0,
                size: 10000,
            };
            console.log('opts.rawData', opts.rawData);

            _cri.ids = _.map(opts.rawData._originRuns, i => i.uid);
            return employeeService.search(_cri).then(data => {
                return _getManagerText(data.items);
            }).then(users => {
                console.log('users', users);
                opts.rawEmployeesData = _.groupBy(users, '$id');
                return opts.rawData;
            });
        }

        function _getEmpSheetStruct(opts) {
            var rowS = opts.theme.styles.tbl.row,
                hRowS = opts.theme.styles.tbl.hRow;
            var empSheetStruct = {
                basicG: {
                    fields: [
                        { field: 'index', label: 'No.', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 5, },

                        { field: 'firstName', label: 'First Name', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 15 },
                        { field: 'lastName', label: 'Last Name', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 15 },
                        { field: 'displayName', label: 'Full Name', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 15 },
                        { field: 'txtChannel', label: 'Channel', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 15 },
                        { field: 'txtTotalEvents', label: 'Total Events', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 15 },
                        { field: 'txtResponseStatus', label: 'Response Status', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 15 },

                        { field: 'email', label: 'Email', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 40 },
                        { field: 'repCode', label: 'Rep Code', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 15 },
                        { field: 'roleTxt', label: 'Role', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 30 },
                        { field: 'manager', label: 'Manager (R: Regional, D: District, A: Area)', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 45 },

                        { field: 'address', label: 'Address', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 15 },
                        { field: 'city', label: 'City', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 15 },
                        { field: 'state', label: 'State', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 15 },
                        { field: 'zipCode', label: 'Zip', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 15 },

                        { field: 'workingStatesTxt', label: 'Working States', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 30 },
                        { field: 'workingterritoriesTxt', label: 'Working Territories', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 30 },
                        { field: 'statusTxt', label: 'Status', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 15 },
                    ]
                }
            };
            return empSheetStruct;
        }
        function _getCampaignSheetStruct(opts) {
            var rowS = opts.theme.styles.tbl.row,
                hRowS = opts.theme.styles.tbl.hRow;
            var sheetStruct = {
                basicG: {
                    fields: [
                        { field: 'index', label: 'No.', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 5, },

                        { field: 'title', label: 'Campaign', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 15 },
                        { field: 'dateString', label: 'Sent Date', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 15 },
                        { field: 'totalSend', label: 'Total Notifications', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 15 },
                        { field: 'totalEvents', label: 'Total Classes', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 15 },
                        { field: 'totalEventsConfirmed', label: 'Classes Confirmed', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 18 },
                        { field: 'totalEventsCanceled', label: 'Classes Cancelled', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 15 },
                        { field: 'totalRepsWaiveOff', label: 'Reps Waived Off', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 15 },
                    ]
                }
            };
            return sheetStruct;
        }
        function _getEventsSheetStruct(opts) {
            var rowS = opts.theme.styles.tbl.row,
                hRowS = opts.theme.styles.tbl.hRow;
            var eventsSheetStruct = {
                basicG: {
                    fields: [
                        { field: 'index', label: 'No.', style: rowS.cell, hStyle: hRowS.bCell, width: 5, },
                        { field: 'name', label: 'Name', style: rowS.cell, hStyle: hRowS.bCell, width: 50 },
                        { field: 'description', label: 'Description', style: rowS.cell, hStyle: hRowS.bCell },
                        { field: 'typeTxt', label: 'Type', style: rowS.cell, hStyle: hRowS.bCell, width: 30 },
                        { field: 'stateTxt', label: 'State', style: rowS.cell, hStyle: hRowS.bCell, width: 10 },
                        { field: 'planTypeTxt', label: 'Plan Type', style: rowS.cell, hStyle: hRowS.bCell, width: 30 },
                        { field: 'territoryTxt', label: 'Territory', style: rowS.cell, hStyle: hRowS.bCell, width: 30 },
                        { field: 'facilityTxt', label: 'Facility', style: rowS.cell, hStyle: hRowS.bCell, width: 30 },
                        { field: 'promoCode', label: 'Promo Code', style: rowS.cell, hStyle: hRowS.bCell, width: 10 },
                        { field: 'startTxt', label: 'Start Date', style: rowS.cell, hStyle: hRowS.bCell, width: 10 },
                        { field: 'managerTxt', label: 'Manager', style: rowS.cell, hStyle: hRowS.bCell, width: 20 },
                        { field: 'areaManagerTxt', label: 'Area Manager', style: rowS.cell, hStyle: hRowS.bCell, width: 20 },
                        { field: 'attendeesTxt', label: 'Representative', style: rowS.cell, hStyle: hRowS.bCell, width: 20 },
                        { field: 'appUploadedTxt', label: 'Apps Uploaded', style: rowS.cell, hStyle: hRowS.bCell, width: 7 },
                        { field: 'cashTotal', label: 'Cash Total', style: rowS.moneyCell, hStyle: hRowS.bCell, width: 20 },
                        { field: 'addressTxt', label: 'Address 1', style: rowS.moneyCell, hStyle: hRowS.bCell, width: 20 },
                        { field: 'address2Txt', label: 'Address 2', style: rowS.moneyCell, hStyle: hRowS.bCell, width: 20 },
                        { field: 'cityTxt', label: 'City', style: rowS.moneyCell, hStyle: hRowS.bCell, width: 15 },
                        { field: 'stateAddressTxt', label: 'Address State', style: rowS.moneyCell, hStyle: hRowS.bCell, width: 15 },
                        { field: 'zipCodeTxt', label: 'Zip Code', style: rowS.moneyCell, hStyle: hRowS.bCell, width: 10 },
                        { field: 'verifyStatusTxt', label: 'Status', style: rowS.moneyCell, hStyle: hRowS.bCell, width: 10 },
                    ]
                }
            };
            return eventsSheetStruct;
        }

        function _sheetsData(rawData, opts) {
            console.log('rawData', rawData);

            var sheets = {};
            var eventsSheetStruct = _getEventsSheetStruct(opts);
            var eventSheet = {
                name: 'Event',
                data: [],
                merges: [
                ],
                index: 0
            };

            //events sheet
            sheets.events = eventSheet;
            // Header
            var header = _.map(eventsSheetStruct.basicG.fields, function (cellS) {
                return [cellS.label, null, cellS.hStyle];
            });
            sheets.events.data.push(header);
            sheets.events.cols = _.map(eventsSheetStruct.basicG.fields, function (cellS) {
                return { width: cellS.width || 10 };
            });
            var types = opts.eventTypes,
                facs = opts.facilities,
                states = opts.states,
                territories = opts.territories,
                regions = opts.regions,
                eventListVerifyStatus = opts.eventListVerifyStatus;
            var usersTxtFn = function (usersO) {
                var txt;
                txt = _.map(usersO, function (u, key) {
                    var text = [],
                        displayName = _.trim(u.displayName),
                        repCode = _.trim(u.repCode);

                    if (displayName) {
                        text.push(displayName);
                    }

                    if (repCode) {
                        text.push('(' + repCode + ')');
                    }
                    return text.join(' ');
                }).join(';');
                return txt;
            };
            var getVerifyStatus = function (value) {
                var status = _.find(eventListVerifyStatus, function (item) {
                    return item.value === value;
                });

                return status && status.text || '';
            };
            // var allTotalCash = 0;
            _.each(rawData._allEvents, function (item) {
                console.log('item', item);

                var state = states[item.state],
                    type = types[item.type],
                    region = regions[item.region],
                    territory = territories[item.territory],
                    facility = facs[item.facilityId];
                // allTotalCash += (item.cashTotal || 0);
                //load address
                let address = {};
                if (!item.mailingAddress && facility) {
                    address = facility;
                } else if (item.mailingAddress) {
                    address = item.mailingAddress;
                }
                let stateAddress = states[address.state_code] || {};
                if (address.city_name) {
                    address.city_name = address.city_name.replace(/undefined/g, '');
                    address.city_name = address.city_name.replace(/Undefined/g, '');
                }

                // format Data
                Object.assign(item, {
                    startTxt: item.startDate ? moment.utc(item.startDate).format('MM/DD/YYYY') : '',
                    typeTxt: type && type.text || '',
                    stateTxt: state && state.name || '',
                    planTypeTxt: region && region.guid || '',
                    territoryTxt: territory && territory.name || '',
                    facilityTxt: facility && facility.name || '',
                    promoCode: facility && facility.facility_promo_code || '',
                    appUploadedTxt: (item.appUploaded === true || item.appUploaded === false) ? (item.appUploaded ? 'Yes' : 'No') : 'N/A',
                    managerTxt: item.requester && usersTxtFn(item.requester) || '',
                    areaManagerTxt: item.areaManager && usersTxtFn(item.areaManager) || '',
                    attendeesTxt: item.representativeAttended && usersTxtFn(item.representativeAttended) || '',
                    addressTxt: address.address || '',
                    address2Txt: address.address_2 || '',
                    cityTxt: address.city_name || '',
                    stateAddressTxt: stateAddress.name || '',
                    zipCodeTxt: address.zip_code || '',
                    moneyOrder: item.moneyOrder || '',
                    verifyStatusTxt: getVerifyStatus(item.verifyStatus)
                });
                // end format Data
                // all summary Sheet
                var allSheetRow = _.map(eventsSheetStruct.basicG.fields, function (cellS) {
                    var val = item[cellS.field] || '';
                    if (cellS.field === 'index') {
                        val = ++eventSheet.index;
                    }
                    var cellData = [val, null, cellS.style];
                    return cellData;
                });
                sheets.events.data.push(allSheetRow);

            });
           
            //end process event sheet
            return sheets;
        }
        function _sheetsCampaignData(rawData, opts) {
            console.log('rawData', rawData);

            var sheets = {};
            var eventsSheetStruct = _getCampaignSheetStruct(opts);
            var eventSheet = {
                name: 'Campaigns',
                data: [],
                merges: [
                ],
                index: 0
            };

            //events sheet
            sheets.events = eventSheet;
            // Header
            var header = _.map(eventsSheetStruct.basicG.fields, function (cellS) {
                return [cellS.label, null, cellS.hStyle];
            });
            sheets.events.data.push(header);
            sheets.events.cols = _.map(eventsSheetStruct.basicG.fields, function (cellS) {
                return { width: cellS.width || 10 };
            });
           
            // var allTotalCash = 0;
            _.each(rawData, function (item) {
                
                // all summary Sheet
                var allSheetRow = _.map(eventsSheetStruct.basicG.fields, function (cellS) {
                    var val = item[cellS.field] || '';
                    if (cellS.field === 'index') {
                        val = ++eventSheet.index;
                    }
                    var cellData = [val, null, cellS.style];
                    return cellData;
                });
                sheets.events.data.push(allSheetRow);

            });
           
            //end process event sheet
            return sheets;
        }

        function _sheetsNotificationsData(rawData, opts) {
            console.log('rawData', rawData);

            var sheets = {};
            var empSheetStruct = _getEmpSheetStruct(opts);

            var empSheet = {
                name: 'Notifications',
                data: [],
                merges: [
                ],
                index: 0
            };
            //events sheet
            sheets.runs = empSheet;

            var types = opts.eventTypes,
                facs = opts.facilities,
                states = opts.states,
                territories = opts.territories,
                regions = opts.regions,
                employeesData = opts.rawEmployeesData,
                roles = opts.roles;


            // var allTotalCash = 0;

            //end process events sheet
            //Notifications sheet
            // var empSheetStruct = _getEmpSheetStruct(opts);
            // sheets.emp = {
            //     name: 'Notifications',
            //     data: []
            // };
            // Header
            var header = _.map(empSheetStruct.basicG.fields, function (cellS) {
                return [cellS.label, null, cellS.hStyle];
            });
            sheets.runs.data.push(header);
            sheets.runs.cols = _.map(empSheetStruct.basicG.fields, function (cellS) {
                return { width: cellS.width || 10 };
            });

            _.each(rawData._originRuns, function (_item, index) {
                let item = employeesData[_item.uid] && employeesData[_item.uid][0] || null;
                if (!item) {
                    return;
                }
                console.log('item', item);

                item.index = _.clone(index) + 1;
                item.txtChannel = _.map(_item.transaction, 'channel').join(', ');
                let txtTotalEvents = Object.keys(_item.eventSnapshot || {}).length;
                item.txtTotalEvents = txtTotalEvents;
                item.txtResponseStatus = _item.status == 0 ? 'Pending Response' : 'Responded';

                // format Data
                Object.assign(item, {
                    roleTxt: _getRoleText(item, roles),
                    statusTxt: item.isAuthorized !== undefined && item.isAuthorized === true ? 'Active' : 'Inactive'
                });
                //get working states
                if (item.workingStates) {
                    var workingStates = [];
                    _.forEach(item.workingStates, function (value, key) {
                        if (states[key] && states[key].name) {
                            workingStates.push(states[key].name);
                        }
                    });
                    item.workingStatesTxt = workingStates.join(',');
                }
                // get working territories
                if (item.workingTerritories) {
                    var workingTerritories = [];
                    _.forEach(item.workingTerritories, function (value, key) {
                        if (territories[key] && territories[key].name) {
                            workingTerritories.push(territories[key].name);
                        }
                    });
                    item.workingterritoriesTxt = workingTerritories.join(',');
                }



                var addressTxt = [],
                    address = _.trim(item.address),
                    city = _.trim(item.city),
                    state = _.trim(item.state),
                    zipCode = _.trim(item.zipCode);

                if (address) {
                    addressTxt.push(address);
                }
                if (city) {
                    addressTxt.push(city);
                }
                var stateNzip = '';
                if (state) {
                    stateNzip = state;
                }
                if (zipCode) {
                    stateNzip += ' ' + zipCode;
                }
                addressTxt.push(stateNzip);
                item.addressTxt = addressTxt.join(', ');
                // end format Data
                // all summary Sheet
                var empSheetRow = _.map(empSheetStruct.basicG.fields, function (cellS) {
                    var val = item[cellS.field] || '',
                        cellData;
                    cellData = [val, null, cellS.style];
                    return cellData;
                });
                sheets.runs.data.push(empSheetRow);
            });
            //end process Notifications sheet

            //start reps waived off sheet
            var repWaivedOffSheetStruct = _getEmpSheetStruct(opts);
            var repWaivedOffSheet = {
                name: 'Reps Waived Off',
                data: [],
                merges: [
                ],
                index: 0
            };
            //events sheet
            sheets.repWaivedOff = repWaivedOffSheet;




            // var allTotalCash = 0;

            //end process events sheet
            //Notifications sheet
            // var empSheetStruct = _getEmpSheetStruct(opts);
            // sheets.emp = {
            //     name: 'Notifications',
            //     data: []
            // };
            // Header
            var header2 = _.map(repWaivedOffSheetStruct.basicG.fields, function (cellS) {
                return [cellS.label, null, cellS.hStyle];
            });
            sheets.repWaivedOff.data.push(header2);
            sheets.repWaivedOff.cols = _.map(repWaivedOffSheetStruct.basicG.fields, function (cellS) {
                return { width: cellS.width || 10 };
            });

            _.each(rawData.runsHaveEventsCanceled, function (_item, index) {
                let item = employeesData[_item.uid] && employeesData[_item.uid][0] || null;
                if (!item) {
                    return;
                }

                item.index = _.clone(index) + 1;
                item.txtChannel = _.map(_item.transaction, 'channel').join(', ');
                let txtTotalEvents = Object.keys(_.filter(_item.eventSnapshot, i => i.verifyStatus == -1) || {}).length;
                item.txtTotalEvents = txtTotalEvents;
                item.txtResponseStatus = _item.status == 0 ? 'Pending Response' : 'Responded';

                // format Data
                Object.assign(item, {
                    roleTxt: _getRoleText(item, roles),
                    statusTxt: item.isAuthorized !== undefined && item.isAuthorized === true ? 'Active' : 'Inactive'
                });
                //get working states
                if (item.workingStates) {
                    var workingStates = [];
                    _.forEach(item.workingStates, function (value, key) {
                        if (states[key] && states[key].name) {
                            workingStates.push(states[key].name);
                        }
                    });
                    item.workingStatesTxt = workingStates.join(',');
                }
                // get working territories
                if (item.workingTerritories) {
                    var workingTerritories = [];
                    _.forEach(item.workingTerritories, function (value, key) {
                        if (territories[key] && territories[key].name) {
                            workingTerritories.push(territories[key].name);
                        }
                    });
                    item.workingterritoriesTxt = workingTerritories.join(',');
                }



                var addressTxt = [],
                    address = _.trim(item.address),
                    city = _.trim(item.city),
                    state = _.trim(item.state),
                    zipCode = _.trim(item.zipCode);

                if (address) {
                    addressTxt.push(address);
                }
                if (city) {
                    addressTxt.push(city);
                }
                var stateNzip = '';
                if (state) {
                    stateNzip = state;
                }
                if (zipCode) {
                    stateNzip += ' ' + zipCode;
                }
                addressTxt.push(stateNzip);
                item.addressTxt = addressTxt.join(', ');
                // end format Data
                // all summary Sheet
                var empSheetRow = _.map(repWaivedOffSheetStruct.basicG.fields, function (cellS) {
                    var val = item[cellS.field] || '',
                        cellData;
                    cellData = [val, null, cellS.style];
                    return cellData;
                });
                sheets.repWaivedOff.data.push(empSheetRow);
            });
            //end process reps waived off
            return sheets;
        }
        function _D_sheetsData(rawData, opts) {
            console.log('rawData', rawData);
            console.log('opts', opts);

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
            summarySheet.data = _sheetsData(rawData, opts);
            var sLength = summarySheet.data.length;
            if (sLength > 1) {
                var cL = summarySheet.data[1].length;
                summarySheet.cols = _.map(_.range(cL + 1), function (d, index) {
                    var width = index !== 0 && index < cL ? 15 : 40;
                    return { width: width };
                });
            }
            console.log('sheets', sheets);



            // end leoSheet

            return sheets;
        }
        function _getRoleText(user, roles) {
            var roleText = "";
            if (user.acl && user.acl.roles) {
                var roleIds = Object.keys(user.acl.roles);
                if (roleIds && roleIds.length > 0) {
                    var assigned = [];
                    _.forEach(roleIds, function (roleId) {
                        if (roles[roleId]) {
                            assigned.push(roles[roleId]);
                        }
                    });
                    var highestRole = _.minBy(assigned, 'number');
                    roleText = highestRole && highestRole.name || "";
                }
            }

            return roleText;
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
        function _getManagerText(items) {
            var reqs = [];
            _.forEach(items, function (item) {
                item.rep = appUtils.checkSpecifyRole(item, 'rep');
                if (item.managers && item.managers.length > 0) {
                    var alias = item.managers[0];
                    var req = departmentSevice.get(alias).then(function (data) {
                        var manager = data && data.manager || {},
                            text = [];
                        if (manager.alias) {
                            var arr = manager.alias.split("_");
                            if (arr && arr.length > 0) {
                                text.push(arr[0]);
                            }
                        }
                        if (manager.name) {
                            text.push(manager.name);
                        }
                        item.manager = text.length > 0 && text.join(': ') || '';
                    });
                    reqs.push(req);
                }
            });
            return $q.all(reqs).then(function () {
                return items;
            });
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
                hRow: {
                    blueCell: 5,
                    yellowCell: 1,
                    blueLightCell: 4,
                    greenCell: 6,
                    greenLightCell: 7
                },
                row: {
                    basicCell: 2,
                    dateCell: 3
                }
            };
            var cols = [];
            return $http.get('./assets/employees/e-export-styles.xml').then(function (res) {
                return {
                    styles: styles,
                    xml: res.data,
                    cols: cols,
                };
            });
        }

        function _getEventStyles() {
			var styles = {};
			styles.tbl = {
				row: {
					cell: 5,
					perCell: 8,
					moneyCell: 9

				},
				hRow: {
					bCell: 1,
					estCell: 2,
					iptCell: 3,
					sysCell: 4
				}
			};
			var cols = [];
			return $http.get('./assets/events/full-export-styles.xml').then(function (res) {
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

            _.each(sheets, function (sheet) {
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
                    if (cell.v === null) {
                        if (cell.f) cell.t = 'n';
                        else if (!o.cellStubs) continue;
                        else cell.t = 'z';
                    } else if (typeof cell.v === 'number') cell.t = 'n';
                    else if (typeof cell.v === 'boolean') cell.t = 'b';
                    else if (cell.v instanceof Date) {
                        cell.z = o.dateNF || XLSX.utils.SSF._table[14];
                        if (o.cellDates) {
                            cell.t = 'd';
                            cell.w = XLSX.utils.SSF.format(cell.z, XLSX.utils.datenum(cell.v));
                        } else {
                            cell.t = 'n';
                            cell.v = XLSX.utils.datenum(cell.v);
                            cell.w = XLSX.utils.SSF.format(cell.z, cell.v);
                        }
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