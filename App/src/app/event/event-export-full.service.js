(function () {
	'use strict';
	angular.module("app.event").factory("eventExportFullService", eventExportFullService);
	/** @ngInject **/
	function eventExportFullService(firebaseDataRef, eventService, $rootScope, memStateService, $http, $q) {
		var services = {
			exportWorkbook: exportWorkbook
		};
		return services;

		function exportWorkbook(cri, opts) {
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
				return _sheetsData(res, opts);
			});
			p = p.then(function (exportData) {
				// console.log('exportData');
				// console.log(exportData);
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
			return p.then(function (data) {
				if (data && data.totalRecords !== 0) {
					var pages = Math.ceil(data.totalRecords / size);
					var reqs = [];
					for (var i = 0; i < pages; i++) {
						var _cri = angular.copy(cri);
						_cri.size = size;
						_cri.from = i * _cri.size;
						reqs.push(eventService.search(_cri));
					}
					return Promise.all(reqs).then(function (res) {
						var result = [];
						if (res && res.length > 0) {
							_.forEach(res, function (r) {
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
			var sheets = {},
				allSheet = {
					name: 'All',
					data: [],
					merges: [
					],
					index: 0
				};

			sheets.all = allSheet;

			// sheet structure
			var allSheetStruct = _getAllSheetStruct(opts);
			var colIndex = 0;
			// TLS-1252
			// var allSheetGroupHeader = _.flatten(_.map(allSheetStruct, function(group, key){
			// 	var cell = [group.label, null, group.style];
			// 	var cells = _.map(_.range(0, group.fields.length), function(){
			// 		return ['', null, group.style];
			// 	});
			// 	if(cells.length >0){
			// 		cells[0][0] = group.label; 
			// 	}
			// 	// handle merge;
			// 	if(cells.length > 1){
			// 		allSheet.merges.push({
			// 			s: {r: 0, c:colIndex}, e: {r: 0, c: colIndex + cells.length - 1}
			// 		});
			// 	}
			// 	colIndex =  colIndex + cells.length;
			// 	return cells;
			// }));

			allSheetStruct.fields = _.flatten(_.map(allSheetStruct, 'fields'));
			var allSheetHeader = _.map(allSheetStruct.fields, function (cellS) {
				return [cellS.label, null, cellS.hStyle];
			});
			// allSheet.data.push(allSheetGroupHeader); TLS-1252
			allSheet.data.push(allSheetHeader);
			allSheet.cols = _.map(allSheetStruct.fields, function (cellS) {
				return { width: cellS.width || 10 };
			});

			// var typeSheetStruct = _getTypeSheetStruct(opts);
			// _.each(opts.eventTypes, function(t){
			// 	var typeSheet = {
			// 		name: t.text.replace(/[^a-zA-Z0-9]/g, '-'),
			// 		data: []
			// 	};
			// 	// header
			// 	var header =  _.map(typeSheetStruct.fields, function(cellS){
			// 		return [cellS.label, null, cellS.hStyle];
			// 	});
			// 	typeSheet.cols = _.map(typeSheetStruct.fields, function(cellS){
			// 		return {width: cellS.width || 10};
			// 	});
			// 	typeSheet.data.push(header);
			// 	sheets[t.$id] = typeSheet;
			// });

			var cashSheetStruct = _getCashSheetStruct(opts);
			sheets.cash = {
				name: 'Cash Collected',
				data: []
			};
			// cash Header
			var cashHeader = _.map(cashSheetStruct.fields, function (cellS) {
				return [cellS.label, null, cellS.hStyle];
			});
			sheets.cash.data.push(cashHeader);
			sheets.cash.cols = _.map(cashSheetStruct.fields, function (cellS) {
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
			var allTotalCash = 0;
			_.each(rawData, function (item) {

				var state = states[item.state],
					type = types[item.type],
					region = regions[item.region],
					territory = territories[item.territory],
					facility = facs[item.facilityId];
				allTotalCash += (item.cashTotal || 0);
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
				Object.assign(item, {
					iptTotalAttendeesRegistered: _parseToNumber(item.iptTotalAttendeesRegistered),
					iptTotalAttendees: _parseToNumber(item.iptTotalAttendees),
					iptNewMember: _parseToNumber(item.iptNewMember),
					iptCloseRate: _formatClosingRate(item.iptCloseRate),
					iptTotalMonthlyMember: _parseToNumber(item.iptTotalMonthlyMember),
					iptTotalAnnualMember: _parseToNumber(item.iptTotalAnnualMember),
					iptMultiState: _parseToNumber(item.iptMultiState),
					iptMinorChildren: _parseToNumber(item.iptMinorChildren),
					iptHunterShield: _parseToNumber(item.iptHunterShield),
					iptBailBond: _parseToNumber(item.iptBailBond),
					iptGITC: _parseToNumber(item.iptGITC),
					iptCareerShield: _parseToNumber(item.iptCareerShield),
					iptTotalRevenue: _formatCurrency(item.iptTotalRevenue),
					iptAnE: _parseToNumber(item.iptAnE) || 0,
					iptGSW: _parseToNumber(item.iptGSW) || 0,
					// sysSold: _parseToNumber(item.sysSold),
					// sysCloseRate: _formatClosingRate(item.sysCloseRate),
					// sysTotalMonthlyMember: _parseToNumber(item.sysTotalMonthlyMember),
					// sysTotalAnnualMember: _parseToNumber(item.sysTotalAnnualMember),
					// sysMultiState: _parseToNumber(item.sysMultiState),
					// sysMinorChildren: _parseToNumber(item.sysMinorChildren),
					// sysHunterShield: _parseToNumber(item.sysHunterShield),
					// sysBailBond: _parseToNumber(item.sysBailBond),
					// sysGITC: _parseToNumber(item.sysGITC),
					// sysCareerShield: _parseToNumber(item.sysCareerShield),
					// sysTotalRevenue: _formatCurrency(item.sysTotalRevenue), TLS-1252
					cashTotal: _formatCurrency(item.cashTotal)
					// fees: _formatCurrency(item.fees),
				});
				// end format Data
				// all summary Sheet
				var allSheetRow = _.map(allSheetStruct.fields, function (cellS) {
					var val = item[cellS.field] || '';
					if (cellS.field === 'index') {
						val = ++allSheet.index;
					}
					var cellData = [val, null, cellS.style];
					return cellData;
				});
				allSheet.data.push(allSheetRow);

				// type summary Sheet
				var typeSheetRow, typeSheet = sheets[item.type];
				if (typeSheet && typeSheet.data) {
					typeSheetRow = _.map(typeSheetStruct.fields, function (cellS) {
						var val = item[cellS.field] || '';
						var cellData = [val, null, cellS.style];
						return cellData;
					});
					typeSheet.data.push(typeSheetRow);
				}
				// event Cash  Sheet
				// event fees row
				if (!opts.onlyCashSheet && (item.fees || item.fees === 0)) {
					Object.assign(item, {
						mem: null,
						memId: null,
						amount: null,
						fees: _formatCurrency(item.fees),
						cTotal: _formatCurrency(item.fees)
					});
					var cashRow = _.map(cashSheetStruct.fields, function (cellS) {
						var val = item[cellS.field] || '';
						if (!val && item[cellS.field] === 0) {
							val = 0;
						}
						var cellData = [val, null, cellS.style];
						return cellData;
					});


					sheets.cash.data.push(cashRow);
				}
				// end event Fees Row

				if (item.cashCollected) {
					var eventFees = item.fees;
					_.each(item.cashCollected, function (c) {

						Object.assign(item, {
							mem: c.mem,
							memId: c.memId,
							// moneyOrder: c.moneyOrder, 
							amount: _formatCurrency(c.amount),
							cTotal: _formatCurrency(c.amount),
							fees: null, // replace vent fees for print out
							// fees: _formatCurrency(c.fees),
							// cTotal:  _formatCurrency((c.amount || 0) + (item.fees || 0))
						});
						var cashRow = _.map(cashSheetStruct.fields, function (cellS) {
							var val = item[cellS.field] || '';
							if (!val && item[cellS.field] === 0) {
								val = 0;
							}
							var cellData = [val, null, cellS.style];
							return cellData;
						});


						sheets.cash.data.push(cashRow);
					});
					Object.assign(item, { fees: eventFees }); // recorver envet fees
				}
			});

			// add TotalCash
			if (sheets.cash.data.length > 1 || opts.onlyCashSheet) {
				sheets.cash.data.unshift([
					['Cash Total: ', null, opts.theme.styles.tbl.row.cell],
					[allTotalCash, null, opts.theme.styles.tbl.row.moneyCell],
				]);
			}

			if (opts.onlyCashSheet) {
				sheets = {
					cash: sheets.cash
				};
				if (rawData.length > 0) {
					sheets.cash.data.splice(1, 0, [
						['Event Fees', null, opts.theme.styles.tbl.row.cell],
						[rawData[0].fees || '', null, opts.theme.styles.tbl.row.moneyCell],
					]);
					sheets.cash.data.splice(1, 0, [
						['Money Order #: ', null, opts.theme.styles.tbl.row.cell],
						[rawData[0].moneyOrder, null, opts.theme.styles.tbl.row.moneyCell],
					]);

				}
			}
			else {
				// remove sheets dont have items
				_.each(sheets, function (sheet, key) {
					if (sheet.data.length < 2) {
						delete sheets[key];
					}
				});
			}
			return sheets;

		}
		
		
		function _getAllSheetStruct(opts) {
			var rowS = opts.theme.styles.tbl.row,
				hRowS = opts.theme.styles.tbl.hRow;
			var allSheetStruct = {
				basicG: {
					label: 'Basic Information',
					style: hRowS.bCell,
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
				},
				estG: {
					label: 'Estimation',
					style: hRowS.estCell,
					fields: [
						{ field: 'empty', label: 'Est. Attendees', style: rowS.cell, hStyle: hRowS.estCell },
						{ field: 'empty', label: 'Potential Members', style: rowS.cell, hStyle: hRowS.estCell },
						{ field: 'empty', label: 'Est. Revenue', style: rowS.cell, hStyle: hRowS.estCell },
					]
				},
				actualG: {
					label: 'Actual Data Input',
					style: opts.theme.styles.tbl.hRow.iptCell,
					fields: [
						{ field: 'iptTotalAttendeesRegistered', label: 'Total Attendees', style: rowS.cell, hStyle: hRowS.iptCell },
						{ field: 'iptTotalAttendees', label: 'Total Potential', style: rowS.cell, hStyle: hRowS.iptCell },
						{ field: 'iptNewMember', label: 'New Members', style: rowS.cell, hStyle: hRowS.iptCell },
						{ field: 'iptCloseRate', label: 'Closing Rate', style: rowS.perCell, hStyle: hRowS.iptCell },
						{ field: 'iptTotalMonthlyMember', label: 'Total Monthly Members', style: rowS.cell, hStyle: hRowS.iptCell },
						{ field: 'iptTotalAnnualMember', label: 'Total Annual Members', style: rowS.cell, hStyle: hRowS.iptCell },
						{ field: 'iptMultiState', label: 'Total Multi State Protection', style: rowS.cell, hStyle: hRowS.iptCell },
						{ field: 'iptMinorChildren', label: 'Total Minor Children Protection', style: rowS.cell, hStyle: hRowS.iptCell },
						{ field: 'iptBailBond', label: 'Total BB EW', style: rowS.cell, hStyle: hRowS.iptCell },
						{ field: 'iptHunterShield', label: 'Total Hunter Shield', style: rowS.cell, hStyle: hRowS.iptCell },
						{ field: 'iptGITC', label: 'Total GITC', style: rowS.cell, hStyle: hRowS.iptCell },
						{ field: 'iptCareerShield', label: 'Total Career Shield Protection', style: rowS.cell, hStyle: hRowS.iptCell },
						{ field: 'iptTotalRevenue', label: 'Total Revenue', style: rowS.moneyCell, hStyle: hRowS.iptCell },
						{ field: 'iptAnE', label: 'Total A&E', style: rowS.cell, hStyle: hRowS.iptCell },
						{ field: 'iptGSW', label: 'Total GSW', style: rowS.cell, hStyle: hRowS.iptCell }
					]
				},
				// sysG: {
				// 	label: 'System (SmartAdmin & Field App)',
				// 	style: opts.theme.styles.tbl.hRow.sysCell,
				// 	fields: [
				// 		{ field: 'sysSold', label: 'Sold By System', style: rowS.cell, hStyle: hRowS.sysCell },
				// 		{ field: 'sysCloseRate', label: 'System Closing Rate', style: rowS.perCell, hStyle: hRowS.sysCell },
				// 		{ field: 'sysTotalMonthlyMember', label: 'System Total Monthly Members', style: rowS.cell, hStyle: hRowS.sysCell },
				// 		{ field: 'sysTotalAnnualMember', label: 'System Total Annual Members', style: rowS.cell, hStyle: hRowS.sysCell },
				// 		{ field: 'sysMultiState', label: 'System Total Multi State Protection', style: rowS.cell, hStyle: hRowS.sysCell },
				// 		{ field: 'sysMinorChildren', label: 'System Total Minor Children Protection', style: rowS.cell, hStyle: hRowS.sysCell },
				// 		{ field: 'sysBailBond', label: 'System Total BB EW', style: rowS.cell, hStyle: hRowS.sysCell },
				// 		{ field: 'sysHunterShield', label: 'System Total Hunter Shield', style: rowS.cell, hStyle: hRowS.sysCell },
				// 		{ field: 'sysGITC', label: 'System Total GITC', style: rowS.cell, hStyle: hRowS.sysCell },
				// 		{ field: 'sysCareerShield', label: 'System Total Career Shield Protection', style: rowS.cell, hStyle: hRowS.sysCell },
				// 		// {field:'sysTotalRevenue',label:'System Total Revenue',style: rowS.moneyCell, hStyle: hRowS.sysCell} TLS-1252
				// 	]
				// }
			};
			return allSheetStruct;
		}

		function _getTypeSheetStruct(opts) {
			var rowS = opts.theme.styles.tbl.row,
				hRowS = opts.theme.styles.tbl.hRow;
			var typeSheetStruct = {
				fields: [
					{ field: 'typeTxt', label: 'Type', style: rowS.cell, hStyle: hRowS.bCell, width: 30 },
					{ field: 'facilityTxt', label: 'Facility', style: rowS.cell, hStyle: hRowS.bCell, width: 30 },
					{ field: 'promoCode', label: 'Promo Code', style: rowS.cell, hStyle: hRowS.bCell, width: 10 },
					{ field: 'stateTxt', label: 'State', style: rowS.cell, hStyle: hRowS.bCell, width: 10 },
					{ field: 'planTypeTxt', label: 'Plan Type', style: rowS.cell, hStyle: hRowS.bCell, width: 30 },
					{ field: 'territoryTxt', label: 'Territory', style: rowS.cell, hStyle: hRowS.bCell, width: 30 },
					{ field: 'startTxt', label: 'Start Date', style: rowS.cell, hStyle: hRowS.bCell },
					{ field: 'managerTxt', label: 'Manager', style: rowS.cell, hStyle: hRowS.bCell, width: 20 },
					{ field: 'areaManagerTxt', label: 'Area Manager', style: rowS.cell, hStyle: hRowS.bCell, width: 20 },
					{ field: 'attendeesTxt', label: 'Representative', style: rowS.cell, hStyle: hRowS.bCell, width: 20 },
					{ field: 'appUploadedTxt', label: 'Apps Uploaded', style: rowS.cell, hStyle: hRowS.bCell, width: 7 },
					{ field: 'empty', label: 'Potential Members', style: rowS.cell, hStyle: hRowS.bCell },

					{ field: 'iptNewMember', label: 'New Members', style: rowS.cell, hStyle: hRowS.iptCell },
					{ field: 'iptTotalAnnualMember', label: 'Total Annual Members', style: rowS.cell, hStyle: hRowS.iptCell },
					{ field: 'iptTotalMonthlyMember', label: 'Total Monthly Members', style: rowS.cell, hStyle: hRowS.iptCell },
					{ field: 'iptMultiState', label: 'Total Multi State Protection', style: rowS.cell, hStyle: hRowS.iptCell },
					{ field: 'iptMinorChildren', label: 'Total Minor Children Protection', style: rowS.cell, hStyle: hRowS.iptCell },
					{ field: 'iptBailBond', label: 'Total BB EW', style: rowS.cell, hStyle: hRowS.iptCell },
					{ field: 'iptHunterShield', label: 'Total Hunter Shield', style: rowS.cell, hStyle: hRowS.iptCell },
					{ field: 'iptGITC', label: 'Total GITC', style: rowS.cell, hStyle: hRowS.iptCell },
					{ field: 'iptCareerShield', label: 'Total Career Shield Protection', style: rowS.cell, hStyle: hRowS.iptCell },
					{ field: 'iptTotalRevenue', label: 'Total Revenue', style: rowS.moneyCell, hStyle: hRowS.iptCell },
					{ field: 'iptCloseRate', label: 'Closing Rate', style: rowS.perCell, hStyle: hRowS.iptCell },
				]
			};
			return typeSheetStruct;
		}

		function _getCashSheetStruct(opts) {
			var rowS = opts.theme.styles.tbl.row,
				hRowS = opts.theme.styles.tbl.hRow;
			var cashStruct = {
				fields: [
					{ field: 'name', label: 'Event Name', style: rowS.cell, hStyle: hRowS.bCell, width: 30 },
					{ field: 'mem', label: 'Member Name', style: rowS.cell, hStyle: hRowS.bCell, width: 30 },
					{ field: 'memId', label: 'Member Number', style: rowS.cell, hStyle: hRowS.bCell, width: 20 },
					{ field: 'typeTxt', label: 'Type', style: rowS.cell, hStyle: hRowS.bCell, width: 30 },
					{ field: 'stateTxt', label: 'State', style: rowS.cell, hStyle: hRowS.bCell, width: 10 },
					{ field: 'startTxt', label: 'Date Of Event', style: rowS.cell, hStyle: hRowS.bCell, width: 10 },
					//{field: 'planTypeTxt', label: 'Plan Type', style: rowS.cell, hStyle: hRowS.bCell, width: 30},
					{ field: 'territoryTxt', label: 'Territory', style: rowS.cell, hStyle: hRowS.bCell, width: 30 },
					{ field: 'facilityTxt', label: 'Facility', style: rowS.cell, hStyle: hRowS.bCell, width: 30 },
					{ field: 'promoCode', label: 'Promo Code', style: rowS.cell, hStyle: hRowS.bCell, width: 10 },
					//{field: 'managerTxt', label: 'Manager', style: rowS.cell, hStyle: hRowS.bCell, width: 20},
					//{field: 'areaManagerTxt', label: 'Area Manager', style: rowS.cell, hStyle: hRowS.bCell, width: 20},
					{ field: 'attendeesTxt', label: 'Representative', style: rowS.cell, hStyle: hRowS.bCell, width: 20 },
					{ field: 'amount', label: 'Member Cash($)', style: rowS.moneyCell, hStyle: hRowS.bCell, width: 20 },
					{ field: 'fees', label: 'Event Fees($)', style: rowS.moneyCell, hStyle: hRowS.bCell },
					{ field: 'moneyOrder', label: 'Money Order #', style: rowS.cell, hStyle: hRowS.bCell },
					{ field: 'cTotal', label: 'Total($)', style: rowS.moneyCell, hStyle: hRowS.bCell, width: 20 },
				]
			};
			return cashStruct;
		}

		function _getStyles() {
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
			var _R = 0, _C = 0;
			if (ws && o.origin != null) {
				if (typeof o.origin == 'number') _R = o.origin;
				else {
					var _origin = typeof o.origin == "string" ? XLSX.utils.decode_cell(o.origin) : o.origin;
					_R = _origin.r; _C = _origin.c;
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
						cell.f = data[R][C][1]; cell.v = cell.v[0];
						// tdang add
						cell.sId = data[R][C][2];
						// tdang end
					}
					var __R = _R + R, __C = _C + C;
					if (range.s.r > __R) range.s.r = __R;
					if (range.s.c > __C) range.s.c = __C;
					if (range.e.r < __R) range.e.r = __R;
					if (range.e.c < __C) range.e.c = __C;
					// tdang add
					if (cell.v === null) { cell.v = ''; }
					// tdang end
					if (cell.v === null) { if (cell.f) cell.t = 'n'; else if (!o.cellStubs) continue; else cell.t = 'z'; }
					else if (typeof cell.v === 'number') cell.t = 'n';
					else if (typeof cell.v === 'boolean') cell.t = 'b';
					else if (cell.v instanceof Date) {
						cell.z = o.dateNF || XLSX.utils.SSF._table[14];
						if (o.cellDates) { cell.t = 'd'; cell.w = XLSX.utils.SSF.format(cell.z, XLSX.utils.datenum(cell.v)); }
						else { cell.t = 'n'; cell.v = XLSX.utils.datenum(cell.v); cell.w = XLSX.utils.SSF.format(cell.z, cell.v); }
					}
					else cell.t = 's';
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