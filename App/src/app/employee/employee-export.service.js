(function() {
    'use strict';

    angular.module("app.employee").factory("employeeExportService", employeeExportService);

    /** @ngInject **/
    function employeeExportService($rootScope, $http, $q, appUtils, DataUtils, employeeService, departmentSevice) {
        var services = {
            exportEmployee: exportEmployee,
            exportEmployeeUnavailable: exportEmployeeUnavailable
        };
        return services;

        function exportEmployee(cri, opts) {
            var p;
            opts.cri = cri;
            p = _getStyles().then(function(res) {
                opts.theme = res;
            });
            p = p.then(function() {
                return _getRawData(cri, opts).then(function(res) {
                    return _getManagerText(res.items);
                });
            });
            p = p.then(function(res) {
                return _sheetsData(res, opts);
            });
            p = p.then(function(data) {
                _export(data, opts.fileName || 'Files', opts);
            });
            return p;

        }

        function exportEmployeeUnavailable(cri, opts) {
            var p;
            opts.cri = cri;
            p = _getStyles().then(function(res) {
                opts.theme = res;
            });
            p = p.then(function() {
                return _getManagerText(opts.rawData);
            });
            p = p.then(function(res) {
                return _sheetsDataEmployeeUnavailable(res, opts);
            });
            p = p.then(function(data) {
                _export(data, opts.fileName || 'Files', opts);
            });
            return p;

        }

        function _getRawData(cri, opts) {
            var p, size = 10000;
            cri.sort = 'timestampCreated:asc';
            p = employeeService.search(cri);
            return p.then(function(data) {
                if (data && data.totalRecords !== 0) {
                    var pages = Math.ceil(data.totalRecords / size);
                    var reqs = [];
                    for (var i = 0; i < pages; i++) {
                        var _cri = angular.copy(cri);
                        _cri.size = size;
                        _cri.from = i * _cri.size;
                        _cri.sort = 'timestampCreated:asc';
                        reqs.push(employeeService.search(_cri));
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

        function _sheetsData(rawData, opts) {
            var sheets = {};
            var empSheetStruct = _getEmpSheetStruct(opts);

            //employee sheet
            sheets.emp = {
                name: 'Employee - Summary',
                data: []
            };
            // Header
            var header = _.map(empSheetStruct.basicG.fields, function(cellS) {
                return [cellS.label, null, cellS.hStyle];
            });
            sheets.emp.data.push(header);
            sheets.emp.cols = _.map(empSheetStruct.basicG.fields, function(cellS) {
                return { width: cellS.width || 10 };
            });
            var states = opts.states,
                territories = opts.territories,
                roles = opts.roles,
                licenseTypes = appUtils.licenseTypeEnum,
                hireTypes = appUtils.hireTypes,
                licenseAppointed = appUtils.appointedEnum;

            _.each(rawData, function(item, index) {
                item.index = _.clone(index) + 1;
                // format Data
                Object.assign(item, {
                    createdDateTxt: item.timestampCreated ? moment(item.timestampCreated).format("MM/DD/YYYY") : '',
                    modifiedDateTxt: item.timestampModified ? moment(item.timestampModified).format("MM/DD/YYYY") : '',
                    lastActivityDateTxt: item.timestampActivity ? moment(item.timestampActivity).format("MM/DD/YYYY hh:mm A") : '',
                    hireDateTxt: item.dateOfHire ? moment(item.dateOfHire).format("MM/DD/YYYY") : '',
                    roleTxt: _getRoleText(item, roles),
                    statusTxt: item.isAuthorized !== undefined && item.isAuthorized === true ? 'Active' : 'Inactive'
                });
                //get working states
                if (item.workingStates) {
                    var workingStates = [];
                    _.forEach(item.workingStates, function(value, key) {
                        if (states[key] && states[key].name) {
                            workingStates.push(states[key].name);
                        }
                    });
                    item.workingStatesTxt = workingStates.join(',');
                }
                //get working territories
                if (item.workingTerritories) {
                    var workingTerritories = [];
                    _.forEach(item.workingTerritories, function(value, key) {
                        if (territories[key] && territories[key].name) {
                            workingTerritories.push(territories[key].name);
                        }
                    });
                    item.workingterritoriesTxt = workingTerritories.join(',');
                }

                if (item.typeOfHire) {
                    var hireType = _.find(hireTypes, function(hire) {
                        return hire.value === item.typeOfHire;
                    });

                    item.hireTypeTxt = (hireType && hireType.text) || '';
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
                var empSheetRow = _.map(empSheetStruct.basicG.fields, function(cellS) {
                    var val = item[cellS.field] || '',
                        cellData;
                    cellData = [val, null, cellS.style];
                    return cellData;
                });
                sheets.emp.data.push(empSheetRow);
            });

            //End process employee sheet

            //Licensing sheet
            var licensingSheetStruct = _getLicensingSheetStruct(opts);
            sheets.licensing = {
                name: 'Licensing',
                data: []
            };
            // Header
            var licensingHeader = _.map(licensingSheetStruct.basicG.fields, function(cellS) { //jslint:ignore
                return [cellS.label, null, cellS.hStyle];
            });
            sheets.licensing.data.push(licensingHeader);
            sheets.licensing.cols = _.map(licensingSheetStruct.basicG.fields, function(cellS) {
                return { width: cellS.width || 10 };
            });
            var licensingStates = opts.states;
            var licensingTerritories = opts.territories;
            var licensingRoles = opts.roles;
            var licensingLicenseTypes = appUtils.licenseTypeEnum;
            var licensingHireTypes = appUtils.hireTypes;
            var licensingLicenseAppointed = appUtils.appointedEnum;

            _.each(rawData, function(item, index) {
                item.index = _.clone(index) + 1;
                // format Data
                Object.assign(item, {
                    createdDateTxt: item.timestampCreated ? moment(item.timestampCreated).format("MM/DD/YYYY") : '',
                    modifiedDateTxt: item.timestampModified ? moment(item.timestampModified).format("MM/DD/YYYY") : '',
                    lastActivityDateTxt: item.timestampActivity ? moment(item.timestampActivity).format("MM/DD/YYYY hh:mm A") : '',
                    hireDateTxt: item.dateOfHire ? moment(item.dateOfHire).format("MM/DD/YYYY") : '',
                    roleTxt: _getRoleText(item, licensingRoles),
                    statusTxt: item.isAuthorized !== undefined && item.isAuthorized === true ? 'Active' : 'Inactive'
                });
                //get working states
                if (item.workingStates) {
                    var workingStates = [];
                    _.forEach(item.workingStates, function(value, key) {
                        if (licensingStates[key] && licensingStates[key].name) {
                            workingStates.push(licensingStates[key].name);
                        }
                    });
                    item.workingStatesTxt = workingStates.join(',');
                }
                //get working territories
                if (item.workingTerritories) {
                    var workingTerritories = [];
                    _.forEach(item.workingTerritories, function(value, key) {
                        if (licensingTerritories[key] && licensingTerritories[key].name) {
                            workingTerritories.push(licensingTerritories[key].name);
                        }
                    });
                    item.workingterritoriesTxt = workingTerritories.join(',');
                }

                if (item.typeOfHire) {
                    var hireType = _.find(licensingHireTypes, function(hire) {
                        return hire.value === item.typeOfHire;
                    });

                    item.hireTypeTxt = (hireType && hireType.text) || '';
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
                var licensingSheetRow = _.map(licensingSheetStruct.basicG.fields, function(cellS) {
                    var val = item[cellS.field] || '',
                        cellData;
                    cellData = [val, null, cellS.style];
                    return cellData;
                });
                sheets.licensing.data.push(licensingSheetRow);

                if (item.licenses) {
                    var licenseH = _.map(licensingSheetStruct.licenseG.fields, function(cellS, index) {
                        if (index === 4) {
                            return ['Licenses', null, cellS.mainHStyle];
                        }
                        return ['', null, cellS.mainHStyle];
                    });
                    sheets.licensing.data.push(licenseH);
                    var licenseG = _.map(licensingSheetStruct.licenseG.fields, function(cellS) {
                        return [cellS.label, null, cellS.hStyle];
                    });
                    sheets.licensing.data.push(licenseG);
                    item.licenses = _.sortBy(item.licenses, 'expirationDate');
                    _.each(item.licenses, function(license) {
                        var state = licensingStates[license.issueState];
                        Object.assign(license, {
                            issueDateTxt: license.issueDate ? moment(license.issueDate).format("MM/DD/YYYY") : '',
                            expiredDateTxt: license.expirationDate ? moment(license.expirationDate).format("MM/DD/YYYY") : '',
                            createdDateTxt: license.timestampCreated ? moment(license.timestampCreated).format("MM/DD/YYYY") : '',
                            ModifiedDateTxt: license.timestampModified ? moment(license.timestampModified).format("MM/DD/YYYY") : '',
                            licenseTypeTxt: licensingLicenseTypes[license.type] || '',
                            stateTxt: state && state.name || '',
                            appointedTxt: licensingLicenseAppointed[license.appointed] || ''
                        });
                        var licensingRow = _.map(licensingSheetStruct.licenseG.fields, function(cellS) {
                            var value = license[cellS.field] || '';
                            var cellSubData = [value, null, cellS.style];
                            return cellSubData;
                        });
                        sheets.licensing.data.push(licensingRow);
                    });
                }
            });

            return sheets;
        }

        function _sheetsDataEmployeeUnavailable(rawData, opts) {
            var sheets = {};
            var empSheetStruct = _getEmpSheetStructEmployeeUnavailable(opts);

            //employee sheet
            sheets.emp = {
                name: 'Employee - Summary',
                data: []
            };
            // Header
            var header = _.map(empSheetStruct.basicG.fields, function(cellS) {
                return [cellS.label, null, cellS.hStyle];
            });
            sheets.emp.data.push(header);
            sheets.emp.cols = _.map(empSheetStruct.basicG.fields, function(cellS) {
                return { width: cellS.width || 10 };
            });
            var states = opts.states,
                territories = opts.territories,
                roles = opts.roles,
                licenseTypes = appUtils.licenseTypeEnum,
                hireTypes = appUtils.hireTypes,
                licenseAppointed = appUtils.appointedEnum;

            _.each(rawData, function(item, index) {
                item.index = _.clone(index) + 1;
                // format Data
                Object.assign(item, {
                    createdDateTxt: item.timestampCreated ? moment(item.timestampCreated).format("MM/DD/YYYY") : '',
                    modifiedDateTxt: item.timestampModified ? moment(item.timestampModified).format("MM/DD/YYYY") : '',
                    lastActivityDateTxt: item.timestampActivity ? moment(item.timestampActivity).format("MM/DD/YYYY hh:mm A") : '',
                    hireDateTxt: item.dateOfHire ? moment(item.dateOfHire).format("MM/DD/YYYY") : '',
                    roleTxt: _getRoleText(item, roles),
                    statusTxt: item.isAuthorized !== undefined && item.isAuthorized === true ? 'Active' : 'Inactive'
                });
                //get working states
                if (item.workingStates) {
                    var workingStates = [];
                    _.forEach(item.workingStates, function(value, key) {
                        if (states[key] && states[key].name) {
                            workingStates.push(states[key].name);
                        }
                    });
                    item.workingStatesTxt = workingStates.join(',');
                }
                //get working territories
                if (item.workingTerritories) {
                    var workingTerritories = [];
                    _.forEach(item.workingTerritories, function(value, key) {
                        if (territories[key] && territories[key].name) {
                            workingTerritories.push(territories[key].name);
                        }
                    });
                    item.workingterritoriesTxt = workingTerritories.join(',');
                }

                if (item.typeOfHire) {
                    var hireType = _.find(hireTypes, function(hire) {
                        return hire.value === item.typeOfHire;
                    });

                    item.hireTypeTxt = (hireType && hireType.text) || '';
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
                var empSheetRow = _.map(empSheetStruct.basicG.fields, function(cellS) {
                    var val = item[cellS.field] || '',
                        cellData;
                    cellData = [val, null, cellS.style];
                    return cellData;
                });
                sheets.emp.data.push(empSheetRow);
            });

            //End process employee sheet
            return sheets;
        }
        function _getLicensingSheetStruct(opts) {
            var rowS = opts.theme.styles.tbl.row,
                hRowS = opts.theme.styles.tbl.hRow;
            var licensingSheetStruct = {
                basicG: {
                    fields: [
                        { field: 'index', label: 'No.', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 5, },

                        { field: 'firstName', label: 'First Name', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 15 },
                        { field: 'lastName', label: 'Last Name', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 15 },
                        { field: 'displayName', label: 'Full Name', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 15 },

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
                        { field: 'hireTypeTxt', label: 'Type of Hire', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 30 },
                        { field: 'hireDateTxt', label: 'Date of Hire', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 15 },
                        { field: 'statusTxt', label: 'Status', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 15 },
                        { field: 'lastActivityDateTxt', label: 'Last Activity Performed', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 15 },
                        { field: 'createdDateTxt', label: 'Created Date', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 15 },
                        { field: 'modifiedDateTxt', label: 'Modified Date', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 15 },
                    ]
                },
                licenseG: {
                    fields: [
                        { field: '', label: '', style: rowS.basicCell, hStyle: rowS.basicCell, mainHStyle: rowS.basicCell, width: 10 },

                        { field: '', label: '', style: rowS.basicCell, hStyle: rowS.basicCell, mainHStyle: rowS.basicCell, width: 10 },
                        { field: '', label: '', style: rowS.basicCell, hStyle: rowS.basicCell, mainHStyle: rowS.basicCell, width: 10 },
                        { field: '', label: '', style: rowS.basicCell, hStyle: rowS.basicCell, mainHStyle: rowS.basicCell, width: 10 },

                        { field: 'stateTxt', label: 'State', style: rowS.basicCell, hStyle: hRowS.blueLightCell, mainHStyle: hRowS.blueCell, width: 10 },
                        { field: 'issueDateTxt', label: 'Issue Date', style: rowS.dateCell, hStyle: hRowS.blueLightCell, mainHStyle: hRowS.blueCell, width: 10 },
                        { field: 'licenseTypeTxt', label: 'License Type', style: rowS.basicCell, hStyle: hRowS.blueLightCell, mainHStyle: hRowS.blueCell, width: 10 },
                        { field: 'number', label: 'License Number', style: rowS.basicCell, hStyle: hRowS.blueLightCell, mainHStyle: hRowS.blueCell, width: 10 },
                        { field: 'expiredDateTxt', label: 'Expiration Date', style: rowS.dateCell, hStyle: hRowS.blueLightCell, mainHStyle: hRowS.blueCell, width: 10 },
                        { field: 'ModifiedDateTxt', label: 'Last Modified Date', style: rowS.dateCell, hStyle: hRowS.blueLightCell, mainHStyle: hRowS.blueCell, width: 10 },
                        { field: 'appointedTxt', label: 'Appointed', style: rowS.basicCell, hStyle: hRowS.blueLightCell, mainHStyle: hRowS.blueCell, width: 10 },
                        { field: '', label: '', style: rowS.basicCell, hStyle: hRowS.blueLightCell, mainHStyle: hRowS.blueCell, width: 10 },
                        { field: '', label: '', style: rowS.basicCell, hStyle: hRowS.blueLightCell, mainHStyle: hRowS.blueCell, width: 10 },
                        { field: '', label: '', style: rowS.basicCell, hStyle: hRowS.blueLightCell, mainHStyle: hRowS.blueCell, width: 10 },
                        { field: '', label: '', style: rowS.basicCell, hStyle: hRowS.blueLightCell, mainHStyle: hRowS.blueCell, width: 10 },
                        { field: '', label: '', style: rowS.basicCell, hStyle: hRowS.blueLightCell, mainHStyle: hRowS.blueCell, width: 10 },
                        { field: '', label: '', style: rowS.basicCell, hStyle: hRowS.blueLightCell, mainHStyle: hRowS.blueCell, width: 10 },
                        { field: '', label: '', style: rowS.basicCell, hStyle: hRowS.blueLightCell, mainHStyle: hRowS.blueCell, width: 10 },
                        { field: '', label: '', style: rowS.basicCell, hStyle: hRowS.blueLightCell, mainHStyle: hRowS.blueCell, width: 10 },
                        { field: '', label: '', style: rowS.basicCell, hStyle: hRowS.blueLightCell, mainHStyle: hRowS.blueCell, width: 10 }
                    ]
                }
                // availabilityG: {
                //     fields: [
                //         { field: '', label: '', style: rowS.basicCell, hStyle: rowS.basicCell, mainHStyle: rowS.basicCell, width: 10 },
                //         { field: '', label: '', style: rowS.basicCell, hStyle: rowS.basicCell, mainHStyle: rowS.basicCell, width: 10 },
                //         { field: '', label: '', style: rowS.basicCell, hStyle: rowS.basicCell, mainHStyle: rowS.basicCell, width: 10 },
                //         { field: 'monday', label: 'Monday', style: rowS.basicCell, hStyle: hRowS.greenLightCell, mainHStyle: hRowS.greenCell, width: 10 },
                //         { field: 'tuesday', label: 'Tuesday', style: rowS.dateCell, hStyle: hRowS.greenLightCell, mainHStyle: hRowS.greenCell, width: 10 },
                //         { field: 'wednesday', label: 'Wednesday', style: rowS.basicCell, hStyle: hRowS.greenLightCell, mainHStyle: hRowS.greenCell, width: 10 },
                //         { field: 'thursday', label: 'Thursday', style: rowS.basicCell, hStyle: hRowS.greenLightCell, mainHStyle: hRowS.greenCell, width: 10 },
                //         { field: 'friday', label: 'Friday', style: rowS.dateCell, hStyle: hRowS.greenLightCell, mainHStyle: hRowS.greenCell, width: 10 },
                //         { field: 'saturday', label: 'Saturday', style: rowS.dateCell, hStyle: hRowS.greenLightCell, mainHStyle: hRowS.greenCell, width: 10 },
                //         { field: 'sunday', label: 'Sunday', style: rowS.basicCell, hStyle: hRowS.greenLightCell, mainHStyle: hRowS.greenCell, width: 10 },
                //         { field: '', label: '', style: rowS.basicCell, hStyle: hRowS.greenLightCell, mainHStyle: hRowS.greenCell, width: 10 },
                //         { field: '', label: '', style: rowS.basicCell, hStyle: hRowS.greenLightCell, mainHStyle: hRowS.greenCell, width: 10 },
                //         { field: '', label: '', style: rowS.basicCell, hStyle: hRowS.greenLightCell, mainHStyle: hRowS.greenCell, width: 10 },
                //         { field: '', label: '', style: rowS.basicCell, hStyle: hRowS.greenLightCell, mainHStyle: hRowS.greenCell, width: 10 },
                //         { field: '', label: '', style: rowS.basicCell, hStyle: hRowS.greenLightCell, mainHStyle: hRowS.greenCell, width: 10 },
                //         { field: '', label: '', style: rowS.basicCell, hStyle: hRowS.greenLightCell, mainHStyle: hRowS.greenCell, width: 10 }
                //     ]
                // },
            };
            return licensingSheetStruct;
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
                        { field: 'hireTypeTxt', label: 'Type of Hire', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 30 },
                        { field: 'hireDateTxt', label: 'Date of Hire', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 15 },
                        { field: 'statusTxt', label: 'Status', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 15 },
                        { field: 'lastActivityDateTxt', label: 'Last Activity Performed', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 15 },
                        { field: 'createdDateTxt', label: 'Created Date', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 15 },
                        { field: 'modifiedDateTxt', label: 'Modified Date', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 15 },
                    ]
                }
            };
            return empSheetStruct;
        }

        function _getEmpSheetStructEmployeeUnavailable(opts) {
            var rowS = opts.theme.styles.tbl.row,
                hRowS = opts.theme.styles.tbl.hRow;
            var empSheetStruct = {
                basicG: {
                    fields: [
                        { field: 'index', label: 'No.', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 5, },

                        { field: 'firstName', label: 'First Name', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 15 },
                        { field: 'lastName', label: 'Last Name', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 15 },
                        { field: 'displayName', label: 'Full Name', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 15 },

                        { field: 'email', label: 'Email', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 40 },
                        { field: 'repCode', label: 'Rep Code', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 15 },
                        { field: 'roleTxt', label: 'Role', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 30 },
                        { field: 'manager', label: 'Manager (R: Regional, D: District, A: Area)', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 45 },
                        { field: 'sourceTxt', label: 'Availability Source', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 45 },

                        { field: 'address', label: 'Address', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 15 },
                        { field: 'city', label: 'City', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 15 },
                        { field: 'state', label: 'State', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 15 },
                        { field: 'zipCode', label: 'Zip', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 15 },

                        { field: 'workingStatesTxt', label: 'Working States', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 30 },
                        { field: 'workingterritoriesTxt', label: 'Working Territories', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 30 },
                        { field: 'hireTypeTxt', label: 'Type of Hire', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 30 },
                        { field: 'hireDateTxt', label: 'Date of Hire', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 15 },
                        { field: 'statusTxt', label: 'Status', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 15 },
                        { field: 'lastActivityDateTxt', label: 'Last Activity Performed', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 15 },
                        { field: 'createdDateTxt', label: 'Created Date', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 15 },
                        { field: 'modifiedDateTxt', label: 'Modified Date', style: rowS.basicCell, hStyle: hRowS.yellowCell, width: 15 },
                    ]
                }
            };
            return empSheetStruct;
        }

        function _export(sheets, fileName, opts) {
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

        function _getStyles(opts) {
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
            return $http.get('./assets/employees/e-export-styles.xml').then(function(res) {
                return {
                    styles: styles,
                    xml: res.data,
                    cols: cols,
                };
            });
        }

        function _getManagerText(items) {
            var reqs = [];
            _.forEach(items, function(item) {
                item.rep = appUtils.checkSpecifyRole(item, 'rep');
                if (item.managers && item.managers.length > 0) {
                    var alias = item.managers[0];
                    var req = departmentSevice.get(alias).then(function(data) {
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
            return $q.all(reqs).then(function() {
                return items;
            });
        }

        function _getRoleText(user, roles) {
            var roleText = "";
            if (user.acl && user.acl.roles) {
                var roleIds = Object.keys(user.acl.roles);
                if (roleIds && roleIds.length > 0) {
                    var assigned = [];
                    _.forEach(roleIds, function(roleId) {
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