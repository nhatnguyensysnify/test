(function () {
	'use strict';

	angular.module("app.event").factory("eventExportService", eventExportService);

	/** @ngInject **/
	function eventExportService(firebaseDataRef, eventService, $rootScope, memStateService, $http, $q, employeeService, DataUtils) {

		var services = {
			exportD: exportD
		};
		// clone from event-details
		var fieldsByType = {
			iptCloseRate: {
				show: true,
				types: ['classes', 'event', 'tcole-class-non-usls', 'tcole-class-usls-hosted']
			},
			iptTotalAttendees: {
				show: false,
				types: ['table', 'gunshows', 'aftercallsignin', 'comp-addon', 'miscellaneous']
			}
		};
		function showFieldsByType(type, field) {
			if (!field) {
				field = 'iptTotalAttendees';
			}
			var fieldSetting = fieldsByType[field];

			if (!fieldSetting) {
				return true;
			}
			if (fieldSetting.show) {
				return fieldSetting.types.indexOf(type) > -1;
			}
			if (!fieldSetting.show) {
				return fieldSetting.types.indexOf(type) < 0;
			}
			return true;
		}
		// end clone form event-details

		return services;



		function exportD(cri, opts) {
			// _D_getStyles();
			// tmp
			// Object.assign(cri, {
			// 	timestampStart: moment().utc().month(0).year(2019).startOf('month'),
			// 	timestampEnd:moment().utc().month(0).year(2019).endOf('month')
			// });
			// end tmp
			var p;
			opts.cri = cri;
			opts.eventTypes = _.sortBy(opts.eventTypes, [i => { return i.value == 'gsw'; }, i => { return i.value == 'counter-sales'; }]);
			p = _D_getStyles(opts).then(function (res) {
				opts.theme = res;
			});
			p = p.then(function () {
				return _D_getRawData(cri, opts);
			});
			p = p.then(function (res) {
				// console.log('rawDAta');
				// console.log(res.aggregations);
				opts.employees = res.employees;
				return _D_sheetsData(res.aggregations, opts);
			});
			p = p.then(function (exportData) {
				// console.log('exportData');
				// console.log(exportData);
				_D_export(exportData, opts.fileName || 'Files', opts);
			});
			return p;

		}

		function _D_getRawData(cri, opts) {
			var appSettings = $rootScope.storage.appSettings,
				addOns = Object.keys(appSettings.eventAddons || {});
			var dEnteredEAggs = {},
				aggs = {
					dEnteredE: {
						filter: { match: { dataEntered: true } },
						aggs: dEnteredEAggs
					}
				};
			// summary sheet
			var datePoint = moment(cri.timestampStart).utc(),
				e = cri.timestampEnd, startRange, endRange;

			var sumAddOnsScript = _.map(addOns, function (addOn) {
				return "doc['" + addOn + "'].value";
			}).join('+');
			var calAggs = {
				'attendees': { 'sum': { field: 'iptTotalAttendees' } },
				'member': { 'sum': { field: 'iptNewMember' } },
				'annualMembers': { 'sum': { field: 'iptTotalAnnualMember' } },
				'monthlyMembers': { 'sum': { field: 'iptTotalMonthlyMember' } },
				'addOns': { 'sum': { script: sumAddOnsScript } },
				'closeRate': { 'avg': { field: 'iptCloseRate' } },
				'revenue': { 'sum': { field: 'iptTotalRevenue' } },
			};
			/// eTypes Aggs template
			var eTypeAggsList = {};
			_.each(opts.eventTypes, function (eType) {
				var eTypeAggs = {
					filter: {
						multi_match: {
							query: eType.value,
							type: "phrase_prefix",
							fields: ["type"]
						}
					},
					aggs: _.cloneDeep(calAggs)
				};
				eTypeAggsList['t_' + eType.value] = eTypeAggs;
			});
			// eType Aggs template

			// Add On Aggs template
			var addOnsAggsList = {};
			_.each(addOns, function (addOn) {
				addOnsAggsList[addOn.replace('ipt', '')] = { 'sum': { field: addOn } };
			});
			// end AddOn Aggs template


			// template aggs  for US Sheet and Leo Sheet
			var overrallAggs = _.cloneDeep(calAggs);
			Object.assign(overrallAggs, _.cloneDeep(addOnsAggsList));
			Object.assign(overrallAggs, _.cloneDeep(eTypeAggsList));
			_.each(opts.states, function (state) {
				var stateAggs = {
					'filter': {
						match: {
							state: state.iso
						}
					},
					aggs: _.cloneDeep(calAggs)
				};
				overrallAggs['s_' + state.iso] = stateAggs;
				Object.assign(stateAggs.aggs, _.cloneDeep(eTypeAggsList));
				Object.assign(stateAggs.aggs, _.cloneDeep(addOnsAggsList));
			});

			// US Sheet
			Object.assign(dEnteredEAggs, _.cloneDeep(overrallAggs));
			// end Us Sheet

			// Texas LawShield Sheet, and report have TX state will have Texas sheet
			if (dEnteredEAggs.s_TX) {
				aggs.s_TX = _.cloneDeep(dEnteredEAggs.s_TX);
				var empsAggs = _.cloneDeep(aggs.s_TX.aggs);
				Object.assign(empsAggs, _.cloneDeep(eTypeAggsList));
				Object.assign(empsAggs, _.cloneDeep(addOnsAggsList));
				Object.assign(aggs.s_TX.aggs, {
					'emps': {
						'terms': {
							field: 'requesterId.raw',
							size: 500
						},
						aggs: empsAggs
					}
				});
			}
			// end TexasLawShieldSheet

			// Leo Sheet
			var leoAggs = {
				filter: {
					multi_match: {
						query: 'leo',
						type: "phrase_prefix",
						fields: ["regionCode"]
					}
				},
				aggs: _.cloneDeep(overrallAggs)
			};
			dEnteredEAggs.rc_leo = leoAggs;
			if (opts.leoStates) {
				leoAggs = {
					filter: {
						bool: {
							must: [
								{
									multi_match: {
										query: 'leo',
										type: "phrase_prefix",
										fields: ["regionCode"]
									}
								}
							]
						}
					},
					aggs: _.cloneDeep(overrallAggs)
				};
				// add filter by leo states
				var stateQuery = {
					bool: {
						should: []
					}
				};
				_.each(opts.leoStates, function (state) {
					var bool = {
						match: {
							state: state
						}
					};
					stateQuery.bool.should.push(bool);
				});
				leoAggs.filter.bool.must.push(stateQuery);
				// end add filter by leo states

				/** remove state_aggs not in leo states **/
				var leoStateIsoList = _.map(opts.leoStates, function (s) {
					return 's_' + s.iso;
				});
				_.each(leoAggs.aggs, function (agg, aggKey) {
					if (!_.startsWith(aggKey, 's_') || leoStateIsoList.indexOf(aggKey) > -1) {
						return;
					}
					delete leoAggs.aggs[aggKey];
				});
			}
			// end If leo states
			// End Leo Sheet			
			// console.log('Aggs', aggs);
			// console.log(aggs);
			var p = eventService.analytics(cri, aggs);

			// get employee info
			p = p.then(function (res) {
				var empIds = [], rData = res.aggregations;
				_.each(rData, function (d, key) {

					if (!_.startsWith(key, 's_') || !d.emps || d.emps.buckets.length == 0) {
						return;
					}
					// console.log('hala');
					// console.log(d);
					Array.prototype.push.apply(empIds, _.map(d.emps.buckets, 'key'));
				});
				if (empIds.length == 0) {
					return $q.when(res);
				}
				var ps = employeeService.search({ ids: empIds, size: 1000, from: 0 }).then(function (eres) {
					var emps = DataUtils.array2ObjectIndex(eres.items, '$id');
					res.employees = emps;
					return res;
				});

				return ps;
			});

			return p;
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
			summarySheet.data = _D_sheet1WeekTable(rawData.dEnteredE, opts);
			var sLength = summarySheet.data.length;
			if (sLength > 1) {
				var cL = summarySheet.data[1].length;
				summarySheet.cols = _.map(_.range(cL + 1), function (d, index) {
					var width = index !== 0 && index < cL ? 10 : 40;
					return { width: width };
				});
			}


			// TexasLawShile sheet
			_.each(opts.states, function statesSheet(state) {
				if (state.iso !== 'TX') {
					return;
				}
				var cols = [];
				var stateData = _D_stateTable(state, rawData['s_' + state.iso], opts),
					l = stateData.length;
				if (stateData && stateData.length > 1) {
					var cL = stateData[1].length;
					cols = _.map(_.range(cL + 1), function (d, index) {
						var width = index !== 0 && index < cL ? 10 : 40;
						return { width: width };
					});
				}
				sheets.push({
					name: state.name,
					data: stateData,
					cols: cols
				});
			});

			// Leo Sheet
			var leo_opts = angular.copy(opts);
			if (opts.leoStates) {
				leo_opts.states = opts.leoStates;
			}
			var leoSheet = {
				name: 'LEO',
				data: _D_sheet1WeekTable(rawData.dEnteredE.rc_leo, leo_opts, 'LEO')
			};
			sheets.push(leoSheet);
			sLength = leoSheet.data.length;
			if (sLength > 1) {
				var cL2 = leoSheet.data[1].length;
				leoSheet.cols = _.map(_.range(cL2 + 1), function (d, index) {
					var width = index !== 0 && index < cL2 ? 10 : 40;
					return { width: width };
				});
			}
			// end leoSheet
			return sheets;
		}

		function _D_sheet1WeekTable(rData, opts, cornerLabel) {
			// console.log('styles', opts);
			var data = [],
				styles = opts.theme.styles.week_tbl;
			// Header: show Week
			var sDate = moment(opts.cri.timestampStart).utc().format('MM-DD-YYYY'),
				eDate = moment(opts.cri.timestampEnd).utc().format('MM-DD-YYYY');

			// date Row
			var dateRangeHeader = [['Date Range: ' + sDate + ' to ' + eDate, null, styles.header1]];
			data.push(dateRangeHeader);

			// state Row 
			var stateHeader = _.map(opts.states, function (s, index) {
				return [s.name, null, index % 2 == 0 ? styles.header2.eCell : styles.header2.oCell];
			});
			stateHeader.push(['Total', null, styles.header2.lCell]);
			stateHeader.unshift([cornerLabel || 'U.S.LawShield', null, styles.header2.fCell]);
			data.push(stateHeader);
			// end State Row			

			// Event Types
			_.each(opts.eventTypes, function (eType) {

				var eData = rData['t_' + eType.value],
					gStyle = styles.group; // group Style
				// Event Type Row
				var eventTypeRow = [[eType.text + ' (#)', null, gStyle.fRow.fCell]],
					potentialsRow = [['Potentials', null, gStyle.row.fCell]],
					newMemberRow = [['New Members', null, gStyle.row.fCell]],
					annualRow = [['Annual', null, gStyle.row.fCell]],
					monthlyRow = [['Monthly', null, gStyle.row.fCell]],
					addOnsSoldRow = [['Add-Ons Sold', null, gStyle.row.fCell]],
					closeRateRow = [['Close Rate %', null, gStyle.row.fCell]],
					revenueRow = [['Total Revenue', null, gStyle.lRow.fCell]];

				_.each(opts.states, function (state, index) {
					var eventTypeStateData = rData['s_' + state.iso] && rData['s_' + state.iso]['t_' + eType.value] || {},
						cStyle = index % 2 == 0 ? 'eCell' : 'oCell';
					eventTypeRow.push([eventTypeStateData.doc_count, null, gStyle.fRow[cStyle]]);
					potentialsRow.push([eventTypeStateData.attendees.value, null, gStyle.row[cStyle]]);
					newMemberRow.push([eventTypeStateData.member.value, null, gStyle.row[cStyle]]);
					annualRow.push([eventTypeStateData.annualMembers.value, null, gStyle.row[cStyle]]);

					monthlyRow.push([eventTypeStateData.monthlyMembers.value, null, gStyle.row[cStyle]]);
					addOnsSoldRow.push([eventTypeStateData.addOns.value, null, gStyle.row[cStyle]]);
					closeRateRow.push([eventTypeStateData.closeRate.value && eventTypeStateData.closeRate.value / 100, null, gStyle.pRow[cStyle]]);
					revenueRow.push([eventTypeStateData.revenue.value, null, gStyle.lRow[cStyle]]);
				});

				// Total
				eventTypeRow.push([eData.doc_count, null, gStyle.fRow.lCell]);
				potentialsRow.push([eData.attendees.value, null, gStyle.row.lCell]);
				newMemberRow.push([eData.member.value, null, gStyle.row.lCell]);
				annualRow.push([eData.annualMembers.value, null, gStyle.row.lCell]);

				monthlyRow.push([eData.monthlyMembers.value, null, gStyle.row.lCell]);
				addOnsSoldRow.push([eData.addOns.value, null, gStyle.row.lCell]);
				closeRateRow.push([eData.closeRate.value && eData.closeRate.value / 100, null, gStyle.pRow.lCell]);
				revenueRow.push([eData.revenue.value, null, gStyle.lRow.lCell]);

				// push row
				var eventGroupData = [
					eventTypeRow,
					potentialsRow,
					newMemberRow,
					annualRow,
					monthlyRow,
					addOnsSoldRow,
					closeRateRow,
					revenueRow
				];

				// remove some row base on event type
				if (!showFieldsByType(eType.value, 'iptCloseRate')) {
					eventGroupData.splice(6, 1);
				}
				if (!showFieldsByType(eType.value, 'iptTotalAttendees')) {
					eventGroupData.splice(1, 1);
				}
				if (eType.value === 'gsw') {
					eventGroupData = [eventTypeRow, revenueRow];
				}
				if (eType.value === 'counter-sales') {
					eventGroupData = [eventTypeRow, newMemberRow, revenueRow];
				}

				// end remove somw row base on event type
				Array.prototype.push.apply(data, eventGroupData);


			});
			// handle footer Total

			var tPotentialsRow = [['Total Potentials', null, styles.totalG.fRow.fCell]],
				tNewMemberRow = [['Total New Members', null, styles.totalG.row.fCell]],
				tAnnualRow = [['Total Annual', null, styles.totalG.row.fCell]],
				tMonthlyRow = [['Total Monthly', null, styles.totalG.row.fCell]],
				tMultiStateRow = [['Total Multi-State', null, styles.totalG.row.fCell]],
				tMinorChildRow = [['Total Minor Child', null, styles.totalG.row.fCell]],
				tHunterShieldRow = [['Total Hunter Shield', null, styles.totalG.row.fCell]],
				tBBEWRow = [['Total BB/EW', null, styles.totalG.row.fCell]],
				tGITCRow = [['Total GITC', null, styles.totalG.row.fCell]],
				tCareerShieldRow = [['Total Career Shield', null, styles.totalG.row.fCell]],
				tAddOnsSoldRow = [['Total Add-Ons', null, styles.totalG.row.fCell]],
				tAvgClassCloseRateRow = [['Avg. Class Close Rate', null, styles.totalG.pRow.fCell]],
				tAvgEventCloseRateRow = [['Avg. Workshop/Seminar Close Rate', null, styles.totalG.pRow.fCell]],
				tCloseRateRow = [['Close Rate %', null, styles.totalG.pRow.fCell]],

				tRevenueRow = [['Total Revenue', null, styles.totalG.mRow.fCell]],
				// tCounterSales = [['Total Counter Sales', null, styles.totalG.pRow.fCell]],
				// tGSWRevenue = [['Total GSW Revenue', null, styles.totalG.pRow.fCell]],
				// tNetRevenueRow = [['Net Revenue', null, styles.totalG.lRow.fCell]],

				footerStates = _.cloneDeep(stateHeader);
			footerStates[0] = null;
			footerStates[footerStates.length - 1] = null;

			_.each(footerStates, function (f, index) {
				var cStyle = index % 2 == 0 ? 'eCell' : 'oCell';
				if (!f) {
					return;
				}
				f[2] = styles.footer[cStyle];
			});
			_.each(opts.states, function (state, index) {
				var cStyle = index % 2 == 0 ? 'eCell' : 'oCell';
				// eventTypeRow.push(rData.doc_count);
				tPotentialsRow.push([rData['s_' + state.iso].attendees.value, null, styles.totalG.fRow[cStyle]]);
				tNewMemberRow.push([rData['s_' + state.iso].member.value, null, styles.totalG.row[cStyle]]);
				tAnnualRow.push([rData['s_' + state.iso].annualMembers.value, null, styles.totalG.row[cStyle]]);
				tMonthlyRow.push([rData['s_' + state.iso].monthlyMembers.value, null, styles.totalG.row[cStyle]]);

				tMultiStateRow.push([rData['s_' + state.iso].MultiState.value, null, styles.totalG.row[cStyle]]);
				tMinorChildRow.push([rData['s_' + state.iso].MinorChildren.value, null, styles.totalG.row[cStyle]]);
				tHunterShieldRow.push([rData['s_' + state.iso].HunterShield.value, null, styles.totalG.row[cStyle]]);
				tBBEWRow.push([rData['s_' + state.iso].BailBond.value, null, styles.totalG.row[cStyle]]);
				tGITCRow.push([rData['s_' + state.iso].GITC.value, null, styles.totalG.row[cStyle]]);
				tCareerShieldRow.push([rData['s_' + state.iso].CareerShield.value, null, styles.totalG.row[cStyle]]);
				tAddOnsSoldRow.push([rData['s_' + state.iso].addOns.value, null, styles.totalG.row[cStyle]]);

				tAvgClassCloseRateRow.push([rData['s_' + state.iso].t_classes.closeRate.value && rData['s_' + state.iso].t_classes.closeRate.value / 100, null, styles.totalG.pRow[cStyle]]);
				tAvgEventCloseRateRow.push([rData['s_' + state.iso].t_event.closeRate.value && rData['s_' + state.iso].t_event.closeRate.value / 100, null, styles.totalG.pRow[cStyle]]);
				tCloseRateRow.push([rData['s_' + state.iso].closeRate.value && rData['s_' + state.iso].closeRate.value / 100, null, styles.totalG.pRow[cStyle]]);

				tRevenueRow.push([rData['s_' + state.iso].revenue.value, null, styles.totalG.mRow[cStyle]]);
				// tCounterSales.push([rData['s_' + state.iso]['t_counter-sales'].revenue.value, null, styles.totalG.mRow[cStyle]]);
				// tGSWRevenue.push([rData['s_' + state.iso].t_gsw.revenue.value, null, styles.totalG.mRow[cStyle]]);
				// tNetRevenueRow.push([null, null, styles.totalG.lRow[cStyle]]);

			});
			// Total Col
			tPotentialsRow.push([rData.attendees.value, null, styles.totalG.fRow.blCell]);
			tNewMemberRow.push([rData.member.value, null, styles.totalG.row.blCell]);
			tAnnualRow.push([rData.annualMembers.value, null, styles.totalG.row.blCell]);
			tMonthlyRow.push([rData.monthlyMembers.value, null, styles.totalG.row.blCell]);

			tMultiStateRow.push([rData.MultiState.value, null, styles.totalG.row.blCell]);
			tMinorChildRow.push([rData.MinorChildren.value, null, styles.totalG.row.blCell]);
			tHunterShieldRow.push([rData.HunterShield.value, null, styles.totalG.row.blCell]);
			tBBEWRow.push([rData.BailBond.value, null, styles.totalG.row.blCell]);
			tGITCRow.push([rData.GITC.value, null, styles.totalG.row.blCell]);
			tCareerShieldRow.push([rData.CareerShield.value, null, styles.totalG.row.blCell]);
			tAddOnsSoldRow.push([rData.addOns.value, null, styles.totalG.row.blCell]);

			tAvgClassCloseRateRow.push([rData.t_classes.closeRate.value && rData.t_classes.closeRate.value / 100, null, styles.totalG.pRow.blCell]);
			tAvgEventCloseRateRow.push([rData.t_event.closeRate.value && rData.t_event.closeRate.value / 100, null, styles.totalG.pRow.blCell]);
			tCloseRateRow.push([rData.closeRate.value && rData.closeRate.value / 100, null, styles.totalG.pRow.blCell]);

			tRevenueRow.push([rData.revenue.value, null, styles.totalG.mRow.blCell]);
			// tCounterSales.push([rData['t_counter-sales'].revenue.value, null, styles.totalG.mRow.blCell]);
			// tGSWRevenue.push([rData.t_gsw.revenue.value, null, styles.totalG.mRow.blCell]);
			// tNetRevenueRow.push([null, null, styles.totalG.lRow.blCell]);


			tPotentialsRow.push(['Total Potentials', null, styles.totalG.fRow.lCell]);
			tNewMemberRow.push(['Total New Members', null, styles.totalG.row.lCell]);
			tAnnualRow.push(['Total Annual', null, styles.totalG.row.lCell]);
			tMonthlyRow.push(['Total Monthly', null, styles.totalG.row.lCell]);

			tMultiStateRow.push(['Total Multi-State', null, styles.totalG.row.lCell]);
			tMinorChildRow.push(['Total Minor Child', null, styles.totalG.row.lCell]);
			tHunterShieldRow.push(['Total Hunter Shield', null, styles.totalG.row.lCell]);
			tBBEWRow.push(['Total BB/EW', null, styles.totalG.row.lCell]);
			tGITCRow.push(['Total GITC', null, styles.totalG.row.lCell]);
			tCareerShieldRow.push(['Total Career Shield', null, styles.totalG.row.lCell]);
			tAddOnsSoldRow.push(['Total Add-Ons', null, styles.totalG.row.lCell]);

			tAvgClassCloseRateRow.push(['Avg. Class Close Rate', null, styles.totalG.pRow.lCell]);
			tAvgEventCloseRateRow.push(['Avg. Workshop/Seminar Close Rate', null, styles.totalG.pRow.lCell]);
			tCloseRateRow.push(['Close Rate %', null, styles.totalG.pRow.lCell]);

			tRevenueRow.push(['Total Revenue', null, styles.totalG.mRow.lCell]);
			// tCounterSales.push(['Total Counter Sales', null, styles.totalG.row.lCell]);
			// tGSWRevenue.push(['Total GSW Revenue', null, styles.totalG.mRow.lCell]);
			// tNetRevenueRow.push(['Net Revenue', null, styles.totalG.lRow.lCell]);

			Array.prototype.push.apply(data, [
				tPotentialsRow,
				tNewMemberRow,
				tAnnualRow,
				tMonthlyRow,
				tMultiStateRow,
				tMinorChildRow,
				tHunterShieldRow,
				tBBEWRow,
				tGITCRow,
				tCareerShieldRow,
				tAddOnsSoldRow,
				tAvgClassCloseRateRow,
				tAvgEventCloseRateRow,
				// tCloseRateRow,
				// tCounterSales,
				// tGSWRevenue,
				tRevenueRow,
				// tNetRevenueRow,
				footerStates
			]);
			return data;
		}

		function _D_stateTable(state, rData, opts) {
			// console.log(rData);
			var data = [],
				styles = opts.theme.styles.state_tbl;
			var sDate = moment(opts.cri.timestampStart).utc().format('MM-DD-YYYY'),
				eDate = moment(opts.cri.timestampEnd).utc().format('MM-DD-YYYY');
			var timeHeader = [['Date Range: ' + sDate + ' to ' + eDate, null, styles.header1]];

			var empHeader = _.map(rData.emps.buckets, function (emp, index) {
				var user = opts.employees[emp.key],
					uName = user && (user.displayName || [user.firstName, user.lastName].join(' '));
				return [uName, null, index % 2 == 0 ? styles.header2.eCell : styles.header2.oCell];
			});
			empHeader.push(['Total', null, styles.header2.lCell]);
			empHeader.unshift(['Texas Law Shield', null, styles.header2.fCell]);
			data.push(timeHeader);
			data.push(empHeader);

			// Event Types
			_.each(opts.eventTypes, function (eType) {

				var eData = rData['t_' + eType.value],
					gStyle = styles.group; // group Style
				// Event Type Row
				var eventTypeRow = [[eType.text + ' (#)', null, gStyle.fRow.fCell]],
					potentialsRow = [['Potentials', null, gStyle.row.fCell]],
					newMemberRow = [['New Members', null, gStyle.row.fCell]],
					annualRow = [['Annual', null, gStyle.row.fCell]],
					monthlyRow = [['Monthly', null, gStyle.row.fCell]],
					addOnsSoldRow = [['Add-Ons Sold', null, gStyle.row.fCell]],
					closeRateRow = [['Close Rate %', null, gStyle.row.fCell]],
					revenueRow = [['Revenue', null, gStyle.lRow.fCell]];

				_.each(rData.emps.buckets, function (emp, index) {
					var eventTypeEmpData = emp['t_' + eType.value],
						cStyle = index % 2 == 0 ? 'eCell' : 'oCell';
					eventTypeRow.push([eventTypeEmpData.doc_count, null, gStyle.fRow[cStyle]]);
					potentialsRow.push([eventTypeEmpData.attendees.value, null, gStyle.row[cStyle]]);
					newMemberRow.push([eventTypeEmpData.member.value, null, gStyle.row[cStyle]]);
					annualRow.push([eventTypeEmpData.annualMembers.value, null, gStyle.row[cStyle]]);

					monthlyRow.push([eventTypeEmpData.monthlyMembers.value, null, gStyle.row[cStyle]]);
					addOnsSoldRow.push([eventTypeEmpData.addOns.value, null, gStyle.row[cStyle]]);
					closeRateRow.push([eventTypeEmpData.closeRate.value && eventTypeEmpData.closeRate.value / 100, null, gStyle.pRow[cStyle]]);
					revenueRow.push([eventTypeEmpData.revenue.value, null, gStyle.lRow[cStyle]]);
				});
				// Total Col
				eventTypeRow.push([eData.doc_count, null, gStyle.fRow.lCell]);
				potentialsRow.push([eData.attendees.value, null, gStyle.row.lCell]);
				newMemberRow.push([eData.member.value, null, gStyle.row.lCell]);
				annualRow.push([eData.annualMembers.value, null, gStyle.row.lCell]);

				monthlyRow.push([eData.monthlyMembers.value, null, gStyle.row.lCell]);
				addOnsSoldRow.push([eData.addOns.value, null, gStyle.row.lCell]);
				closeRateRow.push([eData.closeRate.value && eData.closeRate.value / 100, null, gStyle.pRow.lCell]);
				revenueRow.push([eData.revenue.value, null, gStyle.lRow.lCell]);


				// push row
				var eventGroupData = [
					eventTypeRow,
					potentialsRow,
					newMemberRow,
					annualRow,
					monthlyRow,
					addOnsSoldRow,
					closeRateRow,
					revenueRow
				];
				// remove some row base on event type
				if (!showFieldsByType(eType.value, 'iptCloseRate')) {
					eventGroupData.splice(6, 1);
				}
				if (!showFieldsByType(eType.value, 'iptTotalAttendees')) {
					eventGroupData.splice(1, 1);
				}
				if (eType.value === 'gsw') {
					eventGroupData = [eventTypeRow, revenueRow];
				}
				if (eType.value === 'counter-sales') {
					eventGroupData = [eventTypeRow, newMemberRow, revenueRow];
				}
				// end remove somw row base on event type
				// push row
				Array.prototype.push.apply(data, eventGroupData);
			});

			// handle footer Total

			var tPotentialsRow = [['Total Potentials', null, styles.totalG.fRow.fCell]],
				tNewMemberRow = [['Total New Members', null, styles.totalG.row.fCell]],
				tAnnualRow = [['Total Annual', null, styles.totalG.row.fCell]],
				tMonthlyRow = [['Total Monthly', null, styles.totalG.row.fCell]],
				tMultiStateRow = [['Total Multi-State', null, styles.totalG.row.fCell]],
				tMinorChildRow = [['Total Minor Child', null, styles.totalG.row.fCell]],
				tHunterShieldRow = [['Total Hunter Shield', null, styles.totalG.row.fCell]],
				tBBEWRow = [['Total BB/EW', null, styles.totalG.row.fCell]],
				tGITCRow = [['Total GITC', null, styles.totalG.row.fCell]],
				tCareerShieldRow = [['Total Career Shield', null, styles.totalG.row.fCell]],
				tAddOnsSoldRow = [['Total Add-Ons', null, styles.totalG.row.fCell]],
				tAvgClassCloseRateRow = [['Avg. Class Close Rate', null, styles.totalG.pRow.fCell]],
				tAvgEventCloseRateRow = [['Avg. Workshop/Seminar Close Rate', null, styles.totalG.pRow.fCell]],
				tCloseRateRow = [['Close Rate %', null, styles.totalG.pRow.fCell]],
				// tCounterSales = [['Total Counter Sales', null, styles.totalG.pRow.fCell]],
				// tGSWRevenue = [['Total GSW Revenue', null, styles.totalG.pRow.fCell]],
				tRevenueRow = [['Total Revenue', null, styles.totalG.mRow.fCell]],
				// tNetRevenueRow = [['Net Revenue', null, styles.totalG.lRow.fCell]],
				footerStates = _.cloneDeep(empHeader);
			footerStates[0] = null;
			footerStates[footerStates.length - 1] = null;

			_.each(footerStates, function (f, index) {
				var cStyle = index % 2 == 0 ? 'eCell' : 'oCell';
				if (!f) {
					return;
				}
				f[2] = styles.footer[cStyle];
			});
			_.each(rData.emps.buckets, function (emp, index) {
				var cStyle = index % 2 == 0 ? 'eCell' : 'oCell';
				// eventTypeRow.push(rData.doc_count);
				tPotentialsRow.push([emp.attendees.value, null, styles.totalG.fRow[cStyle]]);
				tNewMemberRow.push([emp.member.value, null, styles.totalG.row[cStyle]]);
				tAnnualRow.push([emp.annualMembers.value, null, styles.totalG.row[cStyle]]);
				tMonthlyRow.push([emp.monthlyMembers.value, null, styles.totalG.row[cStyle]]);

				tMultiStateRow.push([emp.MultiState.value, null, styles.totalG.row[cStyle]]);
				tMinorChildRow.push([emp.MinorChildren.value, null, styles.totalG.row[cStyle]]);
				tHunterShieldRow.push([emp.HunterShield.value, null, styles.totalG.row[cStyle]]);
				tBBEWRow.push([emp.BailBond.value, null, styles.totalG.row[cStyle]]);
				tGITCRow.push([emp.GITC.value, null, styles.totalG.row[cStyle]]);
				tCareerShieldRow.push([emp.CareerShield.value, null, styles.totalG.row[cStyle]]);
				tAddOnsSoldRow.push([emp.addOns.value, null, styles.totalG.row[cStyle]]);

				tAvgClassCloseRateRow.push([emp.t_classes.closeRate.value && emp.t_classes.closeRate.value / 100, null, styles.totalG.pRow[cStyle]]);
				tAvgEventCloseRateRow.push([emp.t_event.closeRate.value && emp.t_event.closeRate.value / 100, null, styles.totalG.pRow[cStyle]]);
				tCloseRateRow.push([emp.closeRate.value && emp.closeRate.value / 100, null, styles.totalG.row[cStyle]]);

				// tCounterSales.push([emp['t_counter-sales'].revenue.value, null, styles.totalG.mRow[cStyle]]);
				// tGSWRevenue.push([emp.t_gsw.revenue.value, null, styles.totalG.mRow[cStyle]]);
				tRevenueRow.push([emp.revenue.value, null, styles.totalG.mRow[cStyle]]);
				// tNetRevenueRow.push([null, null, styles.totalG.lRow[cStyle]]);
			});
			// Total Col
			tPotentialsRow.push([rData.attendees.value, null, styles.totalG.fRow.blCell]);
			tNewMemberRow.push([rData.member.value, null, styles.totalG.row.blCell]);
			tAnnualRow.push([rData.annualMembers.value, null, styles.totalG.row.blCell]);
			tMonthlyRow.push([rData.monthlyMembers.value, null, styles.totalG.row.blCell]);

			tMultiStateRow.push([rData.MultiState.value, null, styles.totalG.row.blCell]);
			tMinorChildRow.push([rData.MinorChildren.value, null, styles.totalG.row.blCell]);
			tHunterShieldRow.push([rData.HunterShield.value, null, styles.totalG.row.blCell]);
			tBBEWRow.push([rData.BailBond.value, null, styles.totalG.row.blCell]);
			tGITCRow.push([rData.GITC.value, null, styles.totalG.row.blCell]);
			tCareerShieldRow.push([rData.CareerShield.value, null, styles.totalG.row.blCell]);
			tAddOnsSoldRow.push([rData.addOns.value, null, styles.totalG.row.blCell]);

			tAvgClassCloseRateRow.push([rData.t_classes.closeRate.value && rData.t_classes.closeRate.value / 100, null, styles.totalG.pRow.blCell]);
			tAvgEventCloseRateRow.push([rData.t_event.closeRate.value && rData.t_event.closeRate.value / 100, null, styles.totalG.pRow.blCell]);
			tCloseRateRow.push([rData.closeRate.value && rData.closeRate.value / 100, null, styles.totalG.row.blCell]);

			// tCounterSales.push([rData['t_counter-sales'].revenue.value, null, styles.totalG.mRow.blCell]);
			// tGSWRevenue.push([rData.t_gsw.revenue.value, null, styles.totalG.mRow.blCell]);
			tRevenueRow.push([rData.revenue.value, null, styles.totalG.mRow.blCell]);
			// tNetRevenueRow.push([null, null, styles.totalG.lRow.blCell]);


			tPotentialsRow.push(['Total Potentials', null, styles.totalG.fRow.lCell]);
			tNewMemberRow.push(['Total New Members', null, styles.totalG.row.lCell]);
			tAnnualRow.push(['Total Annual', null, styles.totalG.row.lCell]);
			tMonthlyRow.push(['Total Monthly', null, styles.totalG.row.lCell]);

			tMultiStateRow.push(['Total Multi-State', null, styles.totalG.row.lCell]);
			tMinorChildRow.push(['Total Minor Child', null, styles.totalG.row.lCell]);
			tHunterShieldRow.push(['Total Hunter Shield', null, styles.totalG.row.lCell]);
			tBBEWRow.push(['Total BB/EW', null, styles.totalG.row.lCell]);
			tGITCRow.push(['Total GITC', null, styles.totalG.row.lCell]);
			tCareerShieldRow.push(['Total Career Shield', null, styles.totalG.row.lCell]);
			tAddOnsSoldRow.push(['Total Add-Ons', null, styles.totalG.row.lCell]);

			tAvgClassCloseRateRow.push(['Avg. Class Close Rate', null, styles.totalG.pRow.lCell]);
			tAvgEventCloseRateRow.push(['Avg. Workshop/Seminar Close Rate', null, styles.totalG.pRow.lCell]);
			// tCloseRateRow.push(['Close Rate %', null, styles.totalG.row.lCell]);

			// tCounterSales.push(['Total Counter Sales', null, styles.totalG.row.lCell]);
			// tGSWRevenue.push(['Total GSW Revenue', null, styles.totalG.mRow.lCell]);
			tRevenueRow.push(['Total Revenue', null, styles.totalG.mRow.lCell]);
			// tNetRevenueRow.push(['Net Revenue', null, styles.totalG.lRow.lCell]);

			Array.prototype.push.apply(data, [
				tPotentialsRow,
				tNewMemberRow,
				tAnnualRow,
				tMonthlyRow,
				tMultiStateRow,
				tMinorChildRow,
				tHunterShieldRow,
				tBBEWRow,
				tGITCRow,
				tCareerShieldRow,
				tAddOnsSoldRow,
				tAvgClassCloseRateRow,
				tAvgEventCloseRateRow,
				// tCloseRateRow, 
				// tCounterSales,
				// tGSWRevenue,
				tRevenueRow,
				// tNetRevenueRow,
				footerStates
			]);
			return data;

		}

		function _D_export(sheets, fileName, opts) {

			var now = moment().format('DD_MM_YYYY_hh_mm');
			// fileName = `${fileName}_${now}.xlsx`;
			// fileName = fileName+'_'+now+'.xlsx';

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
		function _D_getStyles(opts) {
			var styles = {
				week_tbl: {
					header1: '94',
					header2: {
						fCell: '66', // first cell
						eCell: '67', // even cell
						oCell: '5', // odd cell
						lCell: '9' // last cell
					},
					group: {
						fRow: {
							fCell: '65',
							eCell: '68',
							oCell: '18',
							lCell: '21'
						},
						row: {
							fCell: '24',
							eCell: '69',
							oCell: '26',
							lCell: '11'
						},
						// percent
						pRow: {
							fCell: '24',
							eCell: '80',
							oCell: '81',
							lCell: '83'
						},
						lRow: {
							fCell: '29',
							eCell: '84',
							oCell: '85',
							lCell: '87'
						}
					},
					totalG: {
						fRow: {
							fCell: '51',
							eCell: '73',
							oCell: '44',
							blCell: '54',
							lCell: '56'
						},
						row: {
							fCell: '58',
							eCell: '71',
							oCell: '26',
							blCell: '60',
							lCell: '61'
						},
						pRow: {
							fCell: '62',
							eCell: '82',
							oCell: '81',
							blCell: '89',
							lCell: '61'
						},
						mRow: {
							fCell: '58',
							eCell: '90',
							oCell: '91',
							blCell: '93',
							lCell: '61'
						},
						lRow: {
							fCell: '63',
							eCell: '99',
							oCell: '100',
							blCell: '102',
							lCell: '64'
						}
					},
					footer: {
						eCell: '59', // even cell
						oCell: '74', // odd cell
					}

				}
			};
			styles.state_tbl = _.cloneDeep(styles.week_tbl);
			var cols = [{ width: 42 }],
				emptyO = {};
			Array.prototype.push.apply(cols,
				_.map(_.range(1, opts.states.length + 2), function () { return emptyO; })
			);
			cols.push({ width: 27 });

			return $http.get('./assets/events/d-export-styles.xml').then(function (res) {
				return {
					styles: styles,
					xml: res.data,
					cols: cols,
				};
			});
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