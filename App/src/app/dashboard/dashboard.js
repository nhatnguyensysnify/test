(function () {
	'use strict';

	angular.module('app.dashboard')
		.controller('dashboardListCtrl', dashboardListCtrl);

	/** @ngInject */
	function dashboardListCtrl($rootScope, $scope, $state, $timeout, $q, appUtils, DataUtils, toaster, membershipSnapshotService, memAppSnapshotService, memAppService, memberShipService, memberShipFacilitiesService, memRegionService, memStateService, $uibModal, $anchorScroll, $location, employeeService) {
		$rootScope.settings.layout.showSmartphone = false;
		$rootScope.settings.layout.pageSidebarClosed = true;
		$scope.userPermission = $rootScope.storage.statePermission;
		var dashboardVm = this; // jshint ignore:line
		var initData = true;
		dashboardVm.appStatus = appUtils.appStatus;
		dashboardVm.appMethods = appUtils.appMethods;
		dashboardVm.statesLst = [];
		dashboardVm.allRegions = [];
		dashboardVm.regionGroups = {};
		//all items with daterange
		dashboardVm.items = [];

		//Revenue
		dashboardVm.revenueData = [];
		dashboardVm.revenuexAxis = [];
		dashboardVm.titleRevenueChart = '';

		//Application
		dashboardVm.applicationData = [];

		//Revenue Fac Code
		dashboardVm.revenueFacCodeData = [];
		dashboardVm.stateFacCode = null;

		//Revenue State
		dashboardVm.revenueStateData = [];

		//Revenue Repcode
		//dashboardVm.revenueRepCodeData = [];

		//Revenue Plan Type
		dashboardVm.revenuePlanTypeData = [];

		//Selling
		dashboardVm.sellingData = [];

		//Sign Up
		dashboardVm.signUpData = [];
		dashboardVm.signUpAxis = [];
		//Lastest Customer
		dashboardVm.lastedCusData = [];
		dashboardVm.lastedCusNewData = [];
		dashboardVm.lastedCusProgressingData = [];
		dashboardVm.lastedCusProgressedData = [];
		dashboardVm.lastedCusPendingData = [];
		dashboardVm.lastedCusApprovedData = [];
		dashboardVm.lastedCusDeniedData = [];
		dashboardVm.lastedCusErrorData = [];
		dashboardVm.lastedCusRequiredData = [];
		dashboardVm.lastedCusCancellData = [];
		dashboardVm.groupedItems = [];
		dashboardVm.filteredItems = [];
		dashboardVm.pagedItems = [];
		dashboardVm.paging = {
			pageSize: 10,
			currentPage: 0,
			totalPage: 0,
			totalRecord: 0
		};

		// dashboardVm.members = [];
		// memberShipService.itemsLoadOnce().then(function (data) {
		// 	dashboardVm.members = data;
		// });

		dashboardVm.employees = [];
		employeeService.getAll().then(function (employees) {
			dashboardVm.employees = employees || [];
		});

		dashboardVm.criReport = {
			facility: 'cash',
			//repCode: 'cash',
			state: 'cash',
			planType: 'cash'
		};

		dashboardVm.reports = [
			{
				value: 'Cash',
				key: 'cash'
			},
			{
				value: 'Accrual',
				key: 'accrual'
			}
		];

		//Default Start Date & End Date Txt
		var reportTime = moment();
		var startReport = moment().subtract('days', 6).startOf('day');
		var endReport = moment().endOf('day');
		var initAppChart = true, initFacilityChart = true, initLastedChart = true, initSignUpChart = true;

		//Default Start Date & End Date
		var startDate = moment().subtract('days', 6).startOf('day');
		var endDate = moment().endOf('day');
		//Default Start Date & End Date TimeStamp
		var timestampStart = Date.parse(new Date(startDate));
		var timestampEnd = Date.parse(new Date(endDate));

		dashboardVm.refresh = refreshDataReport;
		dashboardVm.facilityReportChange = facilityReportChange;
		dashboardVm.stateReportChange = stateReportChange;
		dashboardVm.planTypeReportChange = planTypeReportChange;
		dashboardVm.pagingByStatus = pagingByStatus;
		dashboardVm.getCustomerInfo = getCustomerInfo;
		dashboardVm.getFullName = appUtils.getFullNameApplication;
		dashboardVm.revenueExport = revenueExport;
		dashboardVm.applicationByStatusExport = applicationByStatusExport;
		dashboardVm.revenueByFacilityExport = revenueByFacilityExport;
		dashboardVm.revenueByStateExport = revenueByStateExport;
		dashboardVm.changeState = changeState;
		dashboardVm.revenueByPlanTypeExport = revenueByRepresentativeCodeExport;

		dashboardVm.importSnap = importSnap;
		dashboardVm.importMemberSnap = importMemberSnap;
		dashboardVm.getFacilityName = getFacilityName;

		//dashboardVm.revenueByRepresentativeCodeExport = revenueByRepresentativeCodeExport;
		//dashboardVm.repCodeReportChange = repCodeReportChange;

		$scope.changePage = changePage;
		var onScrollDebounce = 500,
			onScrollTimeout = null,
			loadingQueue = 0,
			isLoading = false;

		initPage();

		// Make sure DOM is loaded before get elems
		angular.element(document).ready(function () {
			$timeout(function () {
				$(window).on('scroll', onScroll);
			}, 2000);
		});

		$scope.$on('$destroy', function () {
			$(window).off('scroll', onScroll);
		});

		//=======================================================================
		function initPage() {
			//Get data report from cache
			var reqs = [];
			reqs.push(memRegionService.getAll().then(function (regionGroups) {
				_.each(regionGroups, function (regionGroup, stateCode) {
					var regionG = DataUtils.toAFArray(regionGroup);
					regionGroups[stateCode] = regionG;
					dashboardVm.allRegions = dashboardVm.allRegions.concat(regionG);
				});
				dashboardVm.regionGroups = regionGroups;
			}));

			reqs.push(memStateService.statesLoadOnce().then(function (data) {
				dashboardVm.statesLst = data;
			}));

			return Promise.all(reqs).then(function () {
				getDataReport();
			});
		}

		function onScroll(event) {
			if (onScrollTimeout) {
				$timeout.cancel(onScrollTimeout);
			}
			onScrollTimeout = $timeout(function () {
				onScrollLoadData(event);
			}, onScrollDebounce);
		}

		function onScrollLoadData(event) {
			if (initData === false && (initAppChart === true || initFacilityChart === true || initLastedChart === true || initSignUpChart === true)) {
				var lineChartTop = $('#revenueLineChartt').offset() && $('#revenueLineChart').offset().top ? $('#revenueLineChart').offset().top : 0,
					appChartTop = $('#applicationStatusChart').offset() && $('#applicationStatusChart').offset().top ? $('#applicationStatusChart').offset().top : 800,
					facilityChartTop = $('#revenueFacilityChart').offset() && $('#revenueFacilityChart').offset().top ? $('#revenueFacilityChart').offset().top : 1400,
					lastedChartTop = $('#lastedReport').offset() && $('#lastedReport').offset().top ? $('#lastedReport').offset().top : 2000;
				var scrollTop = $(window).scrollTop(), reqs = [];
				if (scrollTop > lineChartTop && initAppChart) {
					initAppChart = false;
					pushLoading();
					reqs.push(loadApplicationData(dashboardVm.items));
					//reqs.push(loadRevenueByRepCodeData(dashboardVm.items));
					reqs.push(loadRevenueByPlanTypeData(dashboardVm.items));
					$q.all(reqs).then(function () {
						// appUtils.hideLoading();
						popLoading();
					});
				}
				if (scrollTop > appChartTop && initFacilityChart) {
					//('State');
					initFacilityChart = false;
					// appUtils.showLoading();
					pushLoading();
					reqs.push(loadRevenueByStateData(dashboardVm.items));
					reqs.push(loadRevenueByFacilityCodeData(dashboardVm.items, dashboardVm.stateFacCode));
					$q.all(reqs).then(function () {
						// appUtils.hideLoading();
						popLoading();
					});
				}
				if (scrollTop > facilityChartTop && initLastedChart) {
					initLastedChart = false;
					// appUtils.showLoading();
					pushLoading();
					loadLastedCusData(dashboardVm.items).then(function () {
						// appUtils.hideLoading();
						popLoading();
					});
				}
				if (scrollTop > lastedChartTop && initSignUpChart) {
					initSignUpChart = false;
					var sDate = moment().subtract('days', 6).startOf('day');
					var eDate = moment().endOf('day');
					// appUtils.showLoading();
					pushLoading();
					loadSignUpData(dashboardVm.items, sDate, eDate).then(function () {
						// appUtils.hideLoading();
						popLoading();
					});
				}
			}
		}

		function pushLoading() {
			loadingQueue = loadingQueue || 0;
			++loadingQueue;
			if (loadingQueue && !isLoading) {
				appUtils.showLoading();
				isLoading = true;

			}
		}

		function popLoading() {
			--loadingQueue;
			if (loadingQueue < 1) {
				loadingQueue = 0;
				appUtils.hideLoading();
				isLoading = false;
			}

			$timeout(angular.noop, 200);
		}

		function getDataReport() {
			//Get datetime txt show UI
			dashboardVm.startDateTxt = startReport.format('LLLL');
			dashboardVm.endDateTxt = endReport.format('LLLL');
			dashboardVm.reportTimeTxt = reportTime.format('LLLL');
			//all items with daterange
			pushLoading();
			memAppService.getDataGolbalReport({
				size: 0,
				from: 0,
				timestampStart: timestampStart,
				timestampEnd: timestampEnd,
				isDashboard: true,
				status: 'All',
				keyword: '',
				sort: true
			}).then(function (res) {
				initData = false;
				dashboardVm.items = res.items;
				loadRevenueData(dashboardVm.items, startDate, endDate);
				loadOverviewReport(dashboardVm.items);
				//loadDataChart();
				// appUtils.hideLoading();
				popLoading();
			});
		}

		function refreshDataReport() {
			delete $rootScope.storage.overviewReport;
			delete $rootScope.storage.revenueReport;
			delete $rootScope.storage.applicationReport;
			delete $rootScope.storage.revenuesFacReport;
			delete $rootScope.storage.revenuesStateReport;
			//delete $rootScope.storage.revenuesRepCodeReport;
			delete $rootScope.storage.revenuesPlanTypeReport;
			delete $rootScope.storage.signUpReport;
			delete $rootScope.storage.lastedReport;
			$state.reload();
		}

		//Private Function
		//--------------------------------------------------------------------------------------------
		//First Dashboard Report
		function loadOverviewReport(items, isFilter) {
			var deferred = $q.defer();
			$scope.overviewReport = {
				totalSale: {
					total: items.length,
					amount: caculateTotalAmountRevenue(items)
				},
				openApp: {
					total: 0,
					amount: 0
				},
				member: {
					total: 0,
					amount: 0
				}
			};
			//group item by status
			var groupItems = _.groupBy(items, 'status');
			//caculate data by status
			_.forEach(groupItems, function (value, key) {
				if (parseInt(key) === 4) {
					//Application Approved
					$scope.overviewReport.member.total += value.length;
					$scope.overviewReport.member.amount += caculateTotalAmountRevenue(value);
				} else if (parseInt(key) !== 4 && parseInt(key) !== 6) {
					//Application not Approved and not Cancelled
					$scope.overviewReport.openApp.total += value.length;
					$scope.overviewReport.openApp.amount += caculateTotalAmountRevenue(value);
				}
			});

			if (!isFilter) {
				delete $rootScope.storage.overviewReport;
				$rootScope.storage.overviewReport = {
					mainReportData: $scope.overviewReport,
					reportTime: reportTime,
					startDate: startReport,
					endDate: endReport
				};
			}

			deferred.resolve(true);
			return deferred.promise;
		}

		$('#overviewReportDateRange').on('apply.daterangepicker', function (ev, picker) {
			var startDate = Date.parse(new Date(picker.startDate._d));
			var endDate = Date.parse(new Date(picker.endDate._d));
			pushLoading();
			memAppService.getDataGolbalReport({
				size: 0,
				from: 0,
				timestampStart: startDate,
				timestampEnd: endDate,
				isDashboard: true,
				status: 'All',
				keyword: '',
				sort: true
			}).then(function (data) {
				loadOverviewReport(data.items, true).then(function () {
					popLoading();
				});
			});
		});

		$scope.goToMembers = function () {
			var dateRangeControl = $('#overviewReportDateRange').data('daterangepicker'),
				start = Date.parse(new Date(dateRangeControl.startDate._d)),
				end = Date.parse(new Date(dateRangeControl.endDate._d));
			$state.go('membership.members', { 'start': start, 'end': end, 'status': 4, 'reportBy': 'timestampSignatured' });
		};

		$scope.goToApplications = function () {
			$state.go('membership.list');
		};

		//Revenue Line Chart
		function loadRevenueData(items, startDate, endDate, isFilter) {
			var deferred = $q.defer();
			//set title
			var cDate = moment().format("MM/DD/YYYY");
			var sDate = startDate.format("MM/DD/YYYY");
			var eDate = endDate.format("MM/DD/YYYY");
			var title = sDate + ' - ' + eDate;
			if (startDate.isSame(moment().startOf('month')) && endDate.isSame(moment().endOf('month'))) {
				title = 'This Month';
			} else if (startDate.isSame(moment().subtract('month', 1).startOf('month')) && endDate.isSame(moment().subtract('month', 1).endOf('month'))) {
				title = 'Last Month';
			}

			var startDay = startDate.date();
			var startMonth = startDate.month();
			var startYear = startDate.year();

			var endDay = endDate.date();
			var endMonth = endDate.month();
			var endYear = endDate.year();

			var diffDay = endDate.diff(startDate, 'days');
			//var total = caculateTotalAmountRevenue(items);

			var lstDataApprove = [], lstDataAnother = [], lstDataAll = [], obj = {}, dataProcessed, dataUnProcessed, totalProcessed = 0, totalUnProcessed = 0;
			//To day || Yesterday
			if (startDay === endDay && startMonth === endMonth && startYear === endYear) {
				//set title line

				if (eDate === cDate) {
					title = 'Today';
				} else {
					title = 'Yesterday';
				}
				//set title line set xAxis
				dashboardVm.revenuexAxis = ['00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];
				//caculate data
				_.forEach(dashboardVm.revenuexAxis, function (value, key) {
					//get timestamp start & end hour in day
					var date = startDate.format("MM/DD/YYYY") + ' ' + value;
					var startOfHour = moment(date).startOf('hour');
					var endOfHour = moment(date).endOf('hour');
					var timestampS = Date.parse(new Date(startOfHour));
					var timestampE = Date.parse(new Date(endOfHour));

					//Caculate total amount in hours of day approve application
					//------------------------------------------------------------
					dataProcessed = _.filter(items, function (item) {
						return parseInt(item.timestampSignatured) >= parseInt(timestampS) && parseInt(item.timestampSignatured) <= parseInt(timestampE) && parseInt(item.status) === 4;
					});

					totalProcessed = caculateTotalAmountRevenue(dataProcessed);

					lstDataApprove.push({
						y: totalProcessed,
						members: dataProcessed.length,
						status: 'cash'
					});

					//------------------------------------------------------------

					//Caculate total amount in hours of day another application
					//------------------------------------------------------------
					dataUnProcessed = _.filter(items, function (item) {
						return parseInt(item.timestampSignatured) >= parseInt(timestampS) && parseInt(item.timestampSignatured) <= parseInt(timestampE) && parseInt(item.status) !== 4 && parseInt(item.status) !== 6;
					});

					totalUnProcessed = caculateTotalAmountRevenue(dataUnProcessed);

					lstDataAnother.push({
						y: totalUnProcessed,
						members: dataUnProcessed.length,
						status: 'accrual'
					});

					//Caculate total amount in hours of day all application
					//------------------------------------------------------------
					// lstDataAll.push({
					// 	y: totalProcessed + totalUnProcessed,
					// 	members: dataProcessed.length + dataUnProcessed.length,
					// 	status: 'all'
					// });
				});

				//------------------------------------------------------------
				// obj = {
				// 	name: 'Total Revenue',
				// 	data: lstDataAll
				// };
				// dashboardVm.revenueData.push(obj);
				//------------------------------------------------------------
				obj = {
					name: 'Cash',
					data: lstDataApprove
				};
				dashboardVm.revenueData.push(obj);
				//------------------------------------------------------------
				obj = {
					name: 'Accrual',
					data: lstDataAnother
				};
				dashboardVm.revenueData.push(obj);
				//------------------------------------------------------------

				dashboardVm.titleRevenueChart = title;
			} else {
				//set title
				if (eDate === cDate && diffDay === 6) {
					title = 'Last 7 Days';
				} else if (eDate === cDate && diffDay === 29) {
					title = 'Last 30 Days';
				}

				//set title line set xAxis 
				var tmp = endDate;
				for (var i = 0; i <= diffDay; i++) {
					var date = tmp.format("MM/DD/YYYY");
					dashboardVm.revenuexAxis.push(date);
					date = tmp.subtract('days', 1);
				}
				dashboardVm.revenuexAxis.reverse();
				//caculate data
				_.forEach(dashboardVm.revenuexAxis, function (value, key) {
					//get timestamp start & end of day
					var startOfDay = moment(value).startOf('day');
					var endOfDay = moment(value).endOf('day');
					var timestampS = Date.parse(new Date(startOfDay));
					var timestampE = Date.parse(new Date(endOfDay));

					//Caculate total amount in hours of day approve application
					//------------------------------------------------------------
					dataProcessed = _.filter(items, function (item) {
						return parseInt(item.timestampSignatured) >= parseInt(timestampS) && parseInt(item.timestampSignatured) <= parseInt(timestampE) && parseInt(item.status) === 4;
					});

					totalProcessed = caculateTotalAmountRevenue(dataProcessed);

					lstDataApprove.push({
						y: totalProcessed,
						members: dataProcessed.length,
						status: 'cash'
					});
					//------------------------------------------------------------

					//Caculate total amount in hours of day another application
					//------------------------------------------------------------
					dataUnProcessed = _.filter(items, function (item) {
						return parseInt(item.timestampSignatured) >= parseInt(timestampS) && parseInt(item.timestampSignatured) <= parseInt(timestampE) && parseInt(item.status) !== 4 && parseInt(item.status) !== 6;
					});

					totalUnProcessed = caculateTotalAmountRevenue(dataUnProcessed);

					lstDataAnother.push({
						y: totalUnProcessed,
						members: dataUnProcessed.length,
						status: 'accrual'
					});

					//Caculate total amount in hours of day all application
					//------------------------------------------------------------
					// lstDataAll.push({
					// 	y: totalProcessed + totalUnProcessed,
					// 	members: dataProcessed.length + dataUnProcessed.length,
					// 	status: 'all'
					// });
				});

				// obj = {
				// 	name: 'Total Revenue',
				// 	data: lstDataAll
				// };
				// //result
				// dashboardVm.revenueData.push(obj);
				//------------------------------------------------------------
				obj = {
					name: 'Cash Revenue',
					data: lstDataApprove
				};

				//result
				dashboardVm.revenueData.push(obj);
				//------------------------------------------------------------
				obj = {
					name: 'Accrual Revenue',
					data: lstDataAnother
				};

				//result
				dashboardVm.revenueData.push(obj);
				//------------------------------------------------------------
				dashboardVm.titleRevenueChart = title;
			}

			if (!isFilter) {
				delete $rootScope.storage.revenueReport;
				$rootScope.storage.revenueReport = {
					revenueData: dashboardVm.revenueData,
					revenuexAxis: dashboardVm.revenuexAxis,
					reportTime: reportTime,
					startDate: startReport,
					endDate: endReport
				};
			}

			deferred.resolve(true);
			return deferred.promise;
		}

		//Chart Config
		Highcharts.setOptions({
			lang: {
				decimalPoint: '.',
				thousandsSep: ','
			}
		});

		dashboardVm.chartRevenueConfig = {
			options: {
				chart: {
					type: 'area',
					events: {
						render: function () {
							console.log('loaded Chart');
						}
					}
				},
				title: {
					text: 'Revenue'
				},
				xAxis: {
					categories: dashboardVm.revenuexAxis,
					tickmarkPlacement: 'on',
					title: {
						enabled: false
					}
				},
				yAxis: {
					title: {
						text: 'Dollars ($)'
					}
				},
				tooltip: {
					split: true,
					shared: true,
					pointFormat: '{series.name}: <b>${point.y:,.2f}</b> <br>Members: <b>{point.members}</b><br>'
				},
				plotOptions: {
					area: {
						stacking: 'normal',
						lineColor: '#666666',
						lineWidth: 1,
						marker: {
							lineWidth: 1,
							lineColor: '#666666'
						}
					},
					series: {
						cursor: 'pointer',
						point: {
							events: {
								click: function () {
									//alert('Category: ' + this.name + ', value: ' + this.y);
									popupDashboardInfoModal(this, 'revenueLineChart');
								}
							}
						}
					}
				}
			},
			series: dashboardVm.revenueData
		};

		//Daterange Change Event
		$('#revenuerange').on('apply.daterangepicker', function (ev, picker) {
			dashboardVm.revenueData = [];
			dashboardVm.revenuexAxis = [];
			//
			var startDate = Date.parse(new Date(picker.startDate._d));
			var endDate = Date.parse(new Date(picker.endDate._d));
			pushLoading();
			memAppService.getDataGolbalReport({
				size: 0,
				from: 0,
				timestampStart: startDate,
				timestampEnd: endDate,
				isDashboard: true,
				status: 'All',
				keyword: '',
				sort: true
			}).then(function (data) {
				var sdate = moment(new Date(picker.startDate._d));
				var edate = moment(new Date(picker.endDate._d));
				loadRevenueData(data.items, sdate, edate, true).then(function () {
					// appUtils.hideLoading();
					popLoading();
					$timeout(function () {
						// if(dashboardVm.revenueData && dashboardVm.revenueData[0]){
						// 	_.forEach(dashboardVm.revenueData[0].data, function(o){
						// 		if(o && o.y){
						// 			o.y = o.y.toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, '$1,');
						// 		}
						// 	});
						// }
						dashboardVm.chartRevenueConfig.series = dashboardVm.revenueData;
						dashboardVm.chartRevenueConfig.options.xAxis.categories = dashboardVm.revenuexAxis;
					}, 100);
				});
			});
		});

		//export CSV
		function revenueExport() {
			var exStartRange, exEndRange, exStartOfDay, exEndOfDay, exStart, exEnd;
			var daterangepicker = $('#revenuerange').data('daterangepicker');
			exStartRange = Date.parse(new Date(daterangepicker.startDate));
			exEndRange = Date.parse(new Date(daterangepicker.endDate));
			var startDate = moment(daterangepicker.startDate).format('MM/DD/YYYY');
			var endDate = moment(daterangepicker.endDate).format('MM/DD/YYYY');
			// if(parseInt(exStartRange) === parseInt(exEndRange)){
			if ((new Date(startDate).getTime() == new Date(endDate).getTime())) {
				exStartOfDay = moment(exStartRange).startOf('hour');
				exEndOfDay = moment(exStartRange).endOf('hour');
				exStart = Date.parse(new Date(exStartOfDay));
				exEnd = Date.parse(new Date(exEndRange));
			} else {
				exStartOfDay = moment(exStartRange).startOf('day');
				exEndOfDay = moment(exEndRange).endOf('day');
				exStart = Date.parse(new Date(exStartOfDay));
				exEnd = Date.parse(new Date(exEndOfDay));
			}
			//Get data renenue from database with startDate & endDate from datetimeRange
			memAppService.getDataGolbalReport({
				size: 0,
				from: 0,
				timestampStart: exStart,
				timestampEnd: exEnd,
				isDashboard: true,
				status: 'All',
				keyword: '',
				sort: true
			}).then(function (data) {
				data.items = _.filter(data.items, function (item) {
					return parseInt(item.timestampSignatured) >= parseInt(exStart) && parseInt(item.timestampSignatured) <= parseInt(exEnd) && parseInt(item.status) !== 6;
				});
				if (data.items && data.items.length === 0) {
					toaster.warning('Data is empty!');
					return;
				}
				var exName = "RevenueExport_" + exStart + "_" + exEnd + ".csv";
				downloadCSV({ filename: exName }, data.items);
				// getDataMember(data.items).then(function (exData) {
				// 	var exName = "RevenueExport_" + exStart + "_" + exEnd + ".csv";
				// 	downloadCSV({ filename: exName }, exData);
				// });
			});
		}

		//--------------------------------------------------------------------------------------------
		//Application Pie Chart
		function loadApplicationData(items, isFilter) {
			var deferred = $q.defer();
			var totalRecord = items.length;
			//group item by status
			var groupItems = _.groupBy(items, 'status');
			//caculate data by status
			_.forEach(groupItems, function (value, key) {
				var total = value.length;
				var totalAmount = caculateTotalAmountRevenue(value);
				var name = _.find(dashboardVm.appStatus, { key: value[0].status });
				if (name) {
					var obj = {
						name: name.value,
						y: total,
						totalAmount: totalAmount,
						statusCode: name.key
					};
					dashboardVm.applicationData.push(obj);
				}
			});

			if (!isFilter) {
				delete $rootScope.storage.applicationReport;
				$rootScope.storage.applicationReport = {
					applicationData: dashboardVm.applicationData,
					reportTime: reportTime,
					startDate: startReport,
					endDate: endReport
				};
			}

			deferred.resolve(true);
			return deferred.promise;
		}
		//Chart Config
		dashboardVm.chartApplicationConfig = {
			options: {
				chart: {
					type: 'pie',
					marginRight: 50
				},
				title: {
					text: 'Application Status'
				},
				tooltip: {
					pointFormat: 'Percentage: <b>{point.percentage:.1f} % </b>'
				},
				plotOptions: {
					pie: {
						allowPointSelect: true,
						cursor: 'pointer',
						dataLabels: {
							enabled: true,
							format: '<b>{point.name}</b> <br>Members: <b>{point.y}</b> <br>Total Amount: <b>${point.totalAmount:,.2f}</b>',
							style: {
								color: (Highcharts.theme && Highcharts.theme.contrastTextColor) || 'black'
							},
							connectorColor: 'silver'
						}
					},
					series: {
						cursor: 'pointer',
						point: {
							events: {
								click: function () {
									//alert('Category: ' + this.name + ', value: ' + this.y);
									popupDashboardInfoModal(this, 'applicationStatusChart');
								}
							}
						}
					}

				}
			},
			series: [{
				name: 'Status',
				colorByPoint: true,
				data: dashboardVm.applicationData
			}],
			loading: false
		};

		$('#applicationrange').on('apply.daterangepicker', function (ev, picker) {
			dashboardVm.applicationData = [];
			var startDate = Date.parse(new Date(picker.startDate._d));
			var endDate = Date.parse(new Date(picker.endDate._d));
			pushLoading();
			memAppService.getDataGolbalReport({
				size: 0,
				from: 0,
				timestampStart: startDate,
				timestampEnd: endDate,
				isDashboard: true,
				status: 'All',
				keyword: '',
				sort: true
			}).then(function (data) {
				loadApplicationData(data.items, true).then(function () {
					popLoading();
					$timeout(function () {
						dashboardVm.chartApplicationConfig.series[0].data = dashboardVm.applicationData;
					}, 100);
				});
			});
		});

		//export CSV
		function applicationByStatusExport() {
			var deferred = $q.defer();
			var exStartRange, exEndRange, exStartOfDay, exEndOfDay, exStart, exEnd;
			exStartRange = Date.parse(new Date($('#applicationrange').data('daterangepicker').startDate));
			exEndRange = Date.parse(new Date($('#applicationrange').data('daterangepicker').endDate));
			exStartOfDay = moment(exStartRange).startOf('day');
			exEndOfDay = moment(exEndRange).endOf('day');
			exStart = Date.parse(new Date(exStartOfDay));
			exEnd = Date.parse(new Date(exEndOfDay));
			//Get data not renenue from database with startDate & endDate from datetimeRange
			memAppService.getDataGolbalReport({
				size: 0,
				from: 0,
				timestampStart: exStart,
				timestampEnd: exEnd,
				isDashboard: true,
				status: 'All',
				keyword: '',
				sort: true
			}).then(function (data) {
				data.items = _.filter(data.items, function (item) {
					return item.status !== undefined && item.status !== '';
				});
				if (data.items && data.items.length === 0) {
					toaster.warning('Data is empty!');
					return;
				}
				var exName = "ApplicationByStatusExport_" + exStart + "_" + exEnd + ".csv";
				downloadCSV({ filename: exName }, data.items, 'applicationByStatusExport');
				// getDataMember(data.items).then(function (exData) {
				// 	var exName = "ApplicationByStatusExport_" + exStart + "_" + exEnd + ".csv";
				// 	downloadCSV({ filename: exName }, exData, 'applicationByStatusExport');
				// });
			});

			deferred.resolve(true);
			return deferred.promise;
		}

		//--------------------------------------------------------------------------------------------
		//Revenue By Facility Chart	
		function loadRevenueByFacilityCodeData(items, state, isFilter) {
			var deferred = $q.defer();
			items = _.filter(items, function (item) {
				if (dashboardVm.criReport.facility === 'cash')
					return parseInt(item.status) === 4;
				else
					return parseInt(item.status) !== 4 && parseInt(item.status) !== 6;
			});
			if (state !== null) {
				items = _.filter(items, function (item) {
					return item.state === state;
				});
			}
			var total = caculateTotalAmountRevenue(items);
			var groupItems = _.groupBy(items, 'facilityId');
			_.forEach(groupItems, function (value, key) {
				var totalFacCode = caculateTotalAmountRevenue(value);
				if (value[0].facilityId && value[0].facilityId !== '') {
					memberShipFacilitiesService.get(value[0].facilityId).then(function (rs) {
						if (rs) {
							var obj = {
								name: rs.facility_promo_code,
								y: value.length,
								number: totalFacCode,
								facilityCode: rs.facility_promo_code,
								facilityId: value[0].facilityId
							};
							dashboardVm.revenueFacCodeData.push(obj);
						}
					});
				}
			});

			if (!isFilter) {
				delete $rootScope.storage.revenuesFacReport;
				$rootScope.storage.revenuesFacReport = {
					revenueFacCodeData: dashboardVm.revenueFacCodeData,
					reportTime: reportTime,
					startDate: startReport,
					endDate: endReport,
					stateFacCode: state
				};
			}

			deferred.resolve(true);
			return deferred.promise;
		}

		dashboardVm.chartFacCodeConfig = {
			options: {
				chart: {
					type: 'pie',
					marginRight: 50
				},
				title: {
					text: 'Revenue By Facility'
				},
				tooltip: {
					pointFormat: 'Percentage: <b>{point.percentage:.1f} % </b> <br> Members: <b>{point.y}</b>'
				},
				plotOptions: {
					pie: {
						allowPointSelect: true,
						cursor: 'pointer',
						dataLabels: {
							enabled: true,
							format: '<b>{point.name}</b><br>Members: <b>{point.y}</b><br>Total Amount: <b>${point.number:,.2f}</b>',
							style: {
								color: (Highcharts.theme && Highcharts.theme.contrastTextColor) || 'black'
							},
							connectorColor: 'silver'
						}
					},
					series: {
						cursor: 'pointer',
						point: {
							events: {
								click: function () {
									popupDashboardInfoModal(this, 'revenueFacilityChart');
								}
							}
						}
					}
				}
			},
			series: [{
				name: 'Total',
				colorByPoint: true,
				data: dashboardVm.revenueFacCodeData
			}],

			loading: false
		};

		$('#faccoderange').on('apply.daterangepicker', function (ev, picker) {
			dashboardVm.revenueFacCodeData = [];
			var startDate = Date.parse(new Date(picker.startDate._d));
			var endDate = Date.parse(new Date(picker.endDate._d));
			pushLoading();
			memAppService.getDataGolbalReport({
				size: 0,
				from: 0,
				timestampStart: startDate,
				timestampEnd: endDate,
				isDashboard: true,
				status: 'All',
				keyword: '',
				sort: true
			}).then(function (data) {
				loadRevenueByFacilityCodeData(data.items, dashboardVm.stateFacCode, true).then(function () {
					popLoading();
					$timeout(function () {
						dashboardVm.chartFacCodeConfig.series[0].data = dashboardVm.revenueFacCodeData;
					}, 100);
				});
			});
		});

		function facilityReportChange() {
			dashboardVm.revenueFacCodeData = [];
			var startDate = Date.parse(new Date($('#faccoderange').data('daterangepicker').startDate));
			var endDate = Date.parse(new Date($('#faccoderange').data('daterangepicker').endDate));
			pushLoading();
			memAppService.getDataGolbalReport({
				size: 0,
				from: 0,
				timestampStart: startDate,
				timestampEnd: endDate,
				isDashboard: true,
				status: 'All',
				keyword: '',
				sort: true
			}).then(function (data) {
				loadRevenueByFacilityCodeData(data.items, dashboardVm.stateFacCode, true).then(function () {
					popLoading();
					$timeout(function () {
						dashboardVm.chartFacCodeConfig.series[0].data = dashboardVm.revenueFacCodeData;
					}, 100);
				});
			});
		}

		function changeState(val) {
			dashboardVm.revenueFacCodeData = [];
			var startDate = Date.parse(new Date($('#faccoderange').data('daterangepicker').startDate));
			var endDate = Date.parse(new Date($('#faccoderange').data('daterangepicker').endDate));
			memAppService.getDataGolbalReport({
				size: 0,
				from: 0,
				timestampStart: startDate,
				timestampEnd: endDate,
				isDashboard: true,
				status: 'All',
				keyword: '',
				sort: true
			}).then(function (data) {
				loadRevenueByFacilityCodeData(data.items, val, true);
				$timeout(function () {
					dashboardVm.chartFacCodeConfig.series[0].data = dashboardVm.revenueFacCodeData;
				}, 100);
			});
		}

		//export CSV
		function revenueByFacilityExport() {
			var exStartRange, exEndRange, exStartOfDay, exEndOfDay, exStart, exEnd;
			exStartRange = Date.parse(new Date($('#faccoderange').data('daterangepicker').startDate));
			exEndRange = Date.parse(new Date($('#faccoderange').data('daterangepicker').endDate));
			exStartOfDay = moment(exStartRange).startOf('day');
			exEndOfDay = moment(exEndRange).endOf('day');
			exStart = Date.parse(new Date(exStartOfDay));
			exEnd = Date.parse(new Date(exEndOfDay));
			//Get data renenue from database with startDate & endDate from datetimeRange
			memAppService.getDataGolbalReport({
				size: 0,
				from: 0,
				timestampStart: exStart,
				timestampEnd: exEnd,
				isDashboard: true,
				status: 'All',
				keyword: '',
				sort: true
			}).then(function (data) {
				data.items = _.filter(data.items, function (item) {
					if (dashboardVm.criReport.facility === 'cash')
						return item.facilityId && item.facilityId !== '' && parseInt(item.status) === 4;
					else
						return item.facilityId && item.facilityId !== '' && parseInt(item.status) !== 4 && parseInt(item.status) !== 6;
				});
				if (dashboardVm.stateFacCode !== null) {
					data.items = _.filter(data.items, function (val) {
						return val.state === dashboardVm.stateFacCode;
					});
				}
				if (data.items && data.items.length === 0) {
					toaster.warning('Data is empty!');
					return;
				}
				var exName = "RevenueByFacilityExport_" + dashboardVm.criReport.facility + '_' + exStart + "_" + exEnd + ".csv";
				downloadCSV({ filename: exName }, data.items);
				// getDataMember(data.items).then(function (exData) {
				// 	var exName = "RevenueByFacilityExport_" + exStart + "_" + exEnd + ".csv";
				// 	downloadCSV({ filename: exName }, exData);
				// });
			});
		}

		//--------------------------------------------------------------------------------------------
		//Revenue By State Chart		
		function loadRevenueByStateData(items, isFilter) {
			var deferred = $q.defer();
			items = _.filter(items, function (item) {
				if (dashboardVm.criReport.state === 'cash')
					return parseInt(item.status) === 4;
				else
					return parseInt(item.status) !== 4 && parseInt(item.status) !== 6;
			});
			var total = caculateTotalAmountRevenue(items);
			var groupItems = _.groupBy(items, 'state');
			_.forEach(groupItems, function (value, key) {
				var totalState = caculateTotalAmountRevenue(value);
				var dataState = _.find(dashboardVm.statesLst, { iso: value[0].state });
				if (dataState) {
					var obj = {
						name: dataState.name,
						y: value.length,
						number: totalState,
						stateIso: dataState.iso
					};
					dashboardVm.revenueStateData.push(obj);
				}

			});

			if (!isFilter) {
				delete $rootScope.storage.revenuesStateReport;
				$rootScope.storage.revenuesStateReport = {
					revenueStateData: dashboardVm.revenueStateData,
					reportTime: reportTime,
					startDate: startReport,
					endDate: endReport
				};
			}

			deferred.resolve(true);
			return deferred.promise;
		}

		//Chart Config
		dashboardVm.chartStateConfig = {
			options: {
				chart: {
					type: 'pie',
					marginRight: 50
				},
				title: {
					text: 'Revenue By State'
				},
				tooltip: {
					pointFormat: 'Percentage: <b>{point.percentage:.1f} % </b> <br> Members: <b>{point.y}</b>'
				},
				plotOptions: {
					pie: {
						allowPointSelect: true,
						cursor: 'pointer',
						dataLabels: {
							enabled: true,
							format: '<b>{point.name}</b><br>Members: <b>{point.y}</b><br>Total Amount: <b>${point.number:,.2f}</b>',
							style: {
								color: (Highcharts.theme && Highcharts.theme.contrastTextColor) || 'black'
							},
							connectorColor: 'silver'
						}
					},
					series: {
						cursor: 'pointer',
						point: {
							events: {
								click: function () {
									//alert('Category: ' + this.name + ', value: ' + this.y);
									popupDashboardInfoModal(this, 'revenueStateChart');
								}
							}
						}
					}
				}
			},
			series: [{
				name: 'Total',
				colorByPoint: true,
				data: dashboardVm.revenueStateData
			}],

			loading: false
		};

		$('#stateRange').on('apply.daterangepicker', function (ev, picker) {
			dashboardVm.revenueStateData = [];
			var startDate = Date.parse(new Date(picker.startDate._d));
			var endDate = Date.parse(new Date(picker.endDate._d));
			pushLoading();
			memAppService.getDataGolbalReport({
				size: 0,
				from: 0,
				timestampStart: startDate,
				timestampEnd: endDate,
				isDashboard: true,
				status: 'All',
				keyword: '',
				sort: true
			}).then(function (data) {
				loadRevenueByStateData(data.items, true).then(function () {
					popLoading();
					$timeout(function () {
						dashboardVm.chartStateConfig.series[0].data = dashboardVm.revenueStateData;
					}, 100);
				});
			});
		});

		//export CSV
		function revenueByStateExport() {
			var exStartRange, exEndRange, exStartOfDay, exEndOfDay, exStart, exEnd;
			exStartRange = Date.parse(new Date($('#stateRange').data('daterangepicker').startDate));
			exEndRange = Date.parse(new Date($('#stateRange').data('daterangepicker').endDate));
			exStartOfDay = moment(exStartRange).startOf('day');
			exEndOfDay = moment(exEndRange).endOf('day');
			exStart = Date.parse(new Date(exStartOfDay));
			exEnd = Date.parse(new Date(exEndOfDay));
			//Get data renenue from database with startDate & endDate from datetimeRange
			memAppService.getDataGolbalReport({
				size: 0,
				from: 0,
				timestampStart: exStart,
				timestampEnd: exEnd,
				isDashboard: true,
				status: 'All',
				keyword: '',
				sort: true
			}).then(function (data) {
				data.items = _.filter(data.items, function (item) {
					if (dashboardVm.criReport.state === 'cash')
						return _.trim(item.state) && parseInt(item.status) === 4;
					else
						return _.trim(item.state) && parseInt(item.status) !== 4 && parseInt(item.status) !== 6;
				});
				if (data.items && data.items.length === 0) {
					toaster.warning('Data is empty!');
					return;
				}
				var exName = "RevenueByStateExport_" + dashboardVm.criReport.state + '_' + exStart + "_" + exEnd + ".csv";
				downloadCSV({ filename: exName }, data.items);
				// getDataMember(data.items).then(function (exData) {
				// 	var exName = "RevenueByStateExport_" + exStart + "_" + exEnd + ".csv";
				// 	downloadCSV({ filename: exName }, exData);
				// });
			});
		}

		function stateReportChange() {
			dashboardVm.revenueStateData = [];
			var startDate = Date.parse(new Date($('#stateRange').data('daterangepicker').startDate));
			var endDate = Date.parse(new Date($('#stateRange').data('daterangepicker').endDate));
			pushLoading();
			memAppService.getDataGolbalReport({
				size: 0,
				from: 0,
				timestampStart: startDate,
				timestampEnd: endDate,
				isDashboard: true,
				status: 'All',
				keyword: '',
				sort: true
			}).then(function (data) {
				loadRevenueByStateData(data.items, true).then(function () {
					popLoading();
					$timeout(function () {
						dashboardVm.chartStateConfig.series[0].data = dashboardVm.revenueStateData;
					}, 100);
				});
			});
		}
		//--------------------------------------------------------------------------------------------
		//Revenue By RepCode Chart		
		// function loadRevenueByRepCodeData(items, isFilter) {
		// 	var deferred = $q.defer();
		// 	items = _.filter(items, function (item) {
		// 		if (dashboardVm.criReport.repCode === 'cash')
		// 			return parseInt(item.status) === 4;
		// 		else
		// 			return parseInt(item.status) !== 4 && parseInt(item.status) !== 6;
		// 	});
		// 	var total = caculateTotalAmountRevenue(items);
		// 	var groupItems = _.groupBy(items, 'representativeCode');
		// 	_.forEach(groupItems, function (value, key) {
		// 		var totalRepcode = caculateTotalAmountRevenue(value);
		// 		if (value[0].representativeCode && value[0].representativeCode !== '') {
		// 			if (value[0].representativeCode !== '') {
		// 				var obj = {
		// 					name: value[0].representativeCode,
		// 					y: value.length,
		// 					number: totalRepcode,
		// 					representativeCode: value[0].representativeCode,
		// 					plans: ''
		// 				};

		// 				var groupPlans = _.groupBy(value, 'planName');
		// 				_.forEach(groupPlans, function (plan, pId) {
		// 					if (plan[0].planName && plan[0].planName !== '') {
		// 						obj.plans += plan[0].planName + ': <b>' + plan.length + '</b><br>';
		// 					}
		// 				});

		// 				dashboardVm.revenueRepCodeData.push(obj);
		// 			}
		// 		}
		// 	});

		// 	if (!isFilter) {
		// 		delete $rootScope.storage.revenuesRepCodeReport;
		// 		$rootScope.storage.revenuesRepCodeReport = {
		// 			revenueRepCodeData: dashboardVm.revenueRepCodeData,
		// 			reportTime: reportTime,
		// 			startDate: startReport,
		// 			endDate: endReport
		// 		};
		// 	}

		// 	deferred.resolve(true);
		// 	return deferred.promise;
		// }

		//Chart Config
		// dashboardVm.chartRepCodeConfig = {
		// 	options: {
		// 		chart: {
		// 			type: 'pie',
		// 			plotBackgroundColor: null,
		// 			plotBorderWidth: null,
		// 			plotShadow: false

		// 		},
		// 		title: {
		// 			text: 'Revenue By Representative Code'
		// 		},
		// 		tooltip: {
		// 			pointFormat: 'Percentage: <b>{point.percentage:.1f} % </b> <br> Members: <b>{point.y}</b> <br>{point.plans}'
		// 		},
		// 		plotOptions: {
		// 			pie: {
		// 				allowPointSelect: true,
		// 				cursor: 'pointer',
		// 				dataLabels: {
		// 					enabled: true,
		// 					format: '<b>{point.name}</b><br>Members: <b>{point.y}</b><br>Total Amount: <b>${point.number:,.2f}</b>',
		// 					style: {
		// 						color: (Highcharts.theme && Highcharts.theme.contrastTextColor) || 'black'
		// 					},
		// 					connectorColor: 'silver'
		// 				}
		// 			},
		// 			series: {
		// 				cursor: 'pointer',
		// 				point: {
		// 					events: {
		// 						click: function () {
		// 							//alert('Category: ' + this.name + ', value: ' + this.y);
		// 							popupDashboardInfoModal(this, 'revenueRepCodeChart');
		// 						}
		// 					}
		// 				}
		// 			}
		// 		}
		// 	},
		// 	series: [{
		// 		name: 'Total',
		// 		colorByPoint: true,
		// 		data: dashboardVm.revenueRepCodeData
		// 	}],

		// 	loading: false
		// };

		// $('#repCodeRange').on('apply.daterangepicker', function (ev, picker) {
		// 	dashboardVm.revenueRepCodeData = [];
		// 	var startDate = Date.parse(new Date(picker.startDate._d));
		// 	var endDate = Date.parse(new Date(picker.endDate._d));
		// 	pushLoading();
		// 	memAppService.getDataGolbalReport({
		// 		size: 10000,
		// 		from: 0,
		// 		timestampStart: startDate,
		// 		timestampEnd: endDate,
		// 		isDashboard: true,
		// 		status: 'All',
		// 		keyword: '',
		// 		sort: true
		// 	}).then(function (data) {
		// 		loadRevenueByRepCodeData(data.items, true).then(function () {
		// 			popLoading();
		// 			$timeout(function () {
		// 				dashboardVm.chartRepCodeConfig.series[0].data = dashboardVm.revenueRepCodeData;
		// 			}, 100);
		// 		});
		// 	});
		// });

		//export CSV
		// function revenueByRepresentativeCodeExport() {
		// 	var exStartRange, exEndRange, exStartOfDay, exEndOfDay, exStart, exEnd;
		// 	exStartRange = Date.parse(new Date($('#repCodeRange').data('daterangepicker').startDate));
		// 	exEndRange = Date.parse(new Date($('#repCodeRange').data('daterangepicker').endDate));
		// 	exStartOfDay = moment(exStartRange).startOf('day');
		// 	exEndOfDay = moment(exEndRange).endOf('day');
		// 	exStart = Date.parse(new Date(exStartOfDay));
		// 	exEnd = Date.parse(new Date(exEndOfDay));
		// 	//Get data renenue from database with startDate & endDate from datetimeRange
		// 	memAppService.getDataGolbalReport({
		// 		size: 10000,
		// 		from: 0,
		// 		timestampStart: exStart,
		// 		timestampEnd: exEnd,
		// 		isDashboard: true,
		// 		status: 'All',
		// 		keyword: '',
		// 		sort: true
		// 	}).then(function (data) {
		// 		data.items = _.filter(data.items, function (item) {
		// 			if (dashboardVm.criReport.repCode === 'cash')
		// 				return item.representativeCode && item.representativeCode !== '' && parseInt(item.status) === 4;
		// 			else
		// 				return item.representativeCode && item.representativeCode !== '' && parseInt(item.status) !== 4 && parseInt(item.status) !== 6;
		// 		});
		// 		if (data.items && data.items.length === 0) {
		// 			toaster.warning('Data is empty!');
		// 			return;
		// 		}
		// 		var exName = "RevenueByRepresentativeCodeExport_" + dashboardVm.criReport.repCode + '_' + exStart + "_" + exEnd + ".csv";
		// 		downloadCSV({ filename: exName }, data.items, 'revenueByRepresentativeCodeExport');
		// 		// getDataMember(data.items).then(function (exData) {
		// 		// 	var exName = "RevenueByRepresentativeCodeExport_" + exStart + "_" + exEnd + ".csv";
		// 		// 	downloadCSV({ filename: exName }, exData, 'revenueByRepresentativeCodeExport');
		// 		// });
		// 	});
		// }

		// function repCodeReportChange() {
		// 	dashboardVm.revenueRepCodeData = [];
		// 	var startDate = Date.parse(new Date($('#repCodeRange').data('daterangepicker').startDate));
		// 	var endDate = Date.parse(new Date($('#repCodeRange').data('daterangepicker').endDate));
		// 	pushLoading();
		// 	memAppService.getDataGolbalReport({
		// 		size: 10000,
		// 		from: 0,
		// 		timestampStart: startDate,
		// 		timestampEnd: endDate,
		// 		isDashboard: true,
		// 		status: 'All',
		// 		keyword: '',
		// 		sort: true
		// 	}).then(function (data) {
		// 		loadRevenueByRepCodeData(data.items, true).then(function () {
		// 			popLoading();
		// 			$timeout(function () {
		// 				dashboardVm.chartRepCodeConfig.series[0].data = dashboardVm.revenueRepCodeData;
		// 			}, 100);
		// 		});
		// 	});
		// }

		//--------------------------------------------------------------------------------------------
		//Revenue By Plan Type Chart		
		function loadRevenueByPlanTypeData(items, isFilter) {
			var deferred = $q.defer();
			items = _.filter(items, function (item) {
				if (dashboardVm.criReport.planType === 'cash')
					return parseInt(item.status) === 4;
				else
					return parseInt(item.status) !== 4 && parseInt(item.status) !== 6;
			});
			var groupItems = _.groupBy(items, 'region');
			_.forEach(groupItems, function (value, key) {
				var totalPlanType = caculateTotalAmountRevenue(value);
				var regionId = value[0] && value[0].region || null;
				if (_.trim(regionId)) {
					var planType = _.find(dashboardVm.allRegions, { id: regionId + '' });
					if (planType) {
						var obj = {
							name: planType.guid,
							y: value.length,
							number: totalPlanType,
							planType: regionId,
							planTypeObj: planType,
							plans: ''
						};

						var groupPlans = _.groupBy(value, 'planName');
						_.forEach(groupPlans, function (plan, pId) {
							if (plan[0].planName && plan[0].planName !== '') {
								obj.plans += plan[0].planName + ': <b>' + plan.length + '</b><br>';
							}
						});

						dashboardVm.revenuePlanTypeData.push(obj);
					}
				}
			});

			if (!isFilter) {
				delete $rootScope.storage.revenuesPlanTypeReport;
				$rootScope.storage.revenuesPlanTypeReport = {
					revenuePlanTypeData: dashboardVm.revenuePlanTypeData,
					reportTime: reportTime,
					startDate: startReport,
					endDate: endReport
				};
			}

			deferred.resolve(true);
			return deferred.promise;
		}

		//Chart Config
		dashboardVm.chartPlanTypeConfig = {
			options: {
				chart: {
					type: 'pie',
					marginRight: 50
				},
				title: {
					text: 'Revenue By Plan Type'
				},
				tooltip: {
					pointFormat: 'Percentage: <b>{point.percentage:.1f} % </b> <br> Members: <b>{point.y}</b> <br>{point.plans}'
				},
				plotOptions: {
					pie: {
						allowPointSelect: true,
						cursor: 'pointer',
						dataLabels: {
							enabled: true,
							format: '<b>{point.name}</b><br>Members: <b>{point.y}</b><br>Total Amount: <b>${point.number:,.2f}</b>',
							style: {
								color: (Highcharts.theme && Highcharts.theme.contrastTextColor) || 'black'
							},
							connectorColor: 'silver'
						}
					},
					series: {
						cursor: 'pointer',
						point: {
							events: {
								click: function () {
									//alert('Category: ' + this.name + ', value: ' + this.y);
									popupDashboardInfoModal(this, 'revenuePlanTypeChart');
								}
							}
						}
					}
				}
			},
			series: [{
				name: 'Total',
				colorByPoint: true,
				data: dashboardVm.revenuePlanTypeData
			}],

			loading: false
		};

		$('#PlanTypeRange').on('apply.daterangepicker', function (ev, picker) {
			dashboardVm.revenuePlanTypeData = [];
			var startDate = Date.parse(new Date(picker.startDate._d));
			var endDate = Date.parse(new Date(picker.endDate._d));
			pushLoading();
			memAppService.getDataGolbalReport({
				size: 0,
				from: 0,
				timestampStart: startDate,
				timestampEnd: endDate,
				isDashboard: true,
				status: 'All',
				keyword: '',
				sort: true
			}).then(function (data) {
				loadRevenueByPlanTypeData(data.items, true).then(function () {
					popLoading();
					$timeout(function () {
						dashboardVm.chartPlanTypeConfig.series[0].data = dashboardVm.revenuePlanTypeData;
					}, 100);
				});
			});
		});

		//export CSV
		function revenueByRepresentativeCodeExport() {
			var exStartRange, exEndRange, exStartOfDay, exEndOfDay, exStart, exEnd;
			exStartRange = Date.parse(new Date($('#PlanTypeRange').data('daterangepicker').startDate));
			exEndRange = Date.parse(new Date($('#PlanTypeRange').data('daterangepicker').endDate));
			exStartOfDay = moment(exStartRange).startOf('day');
			exEndOfDay = moment(exEndRange).endOf('day');
			exStart = Date.parse(new Date(exStartOfDay));
			exEnd = Date.parse(new Date(exEndOfDay));
			//Get data renenue from database with startDate & endDate from datetimeRange
			memAppService.getDataGolbalReport({
				size: 0,
				from: 0,
				timestampStart: exStart,
				timestampEnd: exEnd,
				isDashboard: true,
				status: 'All',
				keyword: '',
				sort: true
			}).then(function (data) {
				data.items = _.filter(data.items, function (item) {
					if (dashboardVm.criReport.planType === 'cash')
						return _.trim(item.region) && parseInt(item.status) === 4;
					else
						return _.trim(item.region) && parseInt(item.status) !== 4 && parseInt(item.status) !== 6;
				});
				if (data.items && data.items.length === 0) {
					toaster.warning('Data is empty!');
					return;
				}
				var exName = "RevenueByPlanTypeExport_" + dashboardVm.criReport.planType + '_' + exStart + "_" + exEnd + ".csv";
				downloadCSV({ filename: exName }, data.items, 'revenueByPlanTypeExport');
				// getDataMember(data.items).then(function (exData) {
				// 	var exName = "RevenueByPlanTypeExport_" + exStart + "_" + exEnd + ".csv";
				// 	downloadCSV({ filename: exName }, exData, 'revenueByPlanTypeExport');
				// });
			});
		}

		function planTypeReportChange() {
			dashboardVm.revenuePlanTypeData = [];
			var startDate = Date.parse(new Date($('#PlanTypeRange').data('daterangepicker').startDate));
			var endDate = Date.parse(new Date($('#PlanTypeRange').data('daterangepicker').endDate));
			pushLoading();
			memAppService.getDataGolbalReport({
				size: 0,
				from: 0,
				timestampStart: startDate,
				timestampEnd: endDate,
				isDashboard: true,
				status: 'All',
				keyword: '',
				sort: true
			}).then(function (data) {
				loadRevenueByPlanTypeData(data.items, true).then(function () {
					popLoading();
					$timeout(function () {
						dashboardVm.chartPlanTypeConfig.series[0].data = dashboardVm.revenuePlanTypeData;
					}, 100);
				});
			});
		}

		//--------------------------------------------------------------------------------------------
		//Lasted Customers Chart		
		function loadLastedCusData(items, isFilter) {
			var deferred = $q.defer();

			dashboardVm.lastedCusData = items.sort(function (a, b) {
				if (a.timestampSignatured !== b.timestampSignatured) {
					return b.timestampSignatured - a.timestampSignatured;
				} else {
					return a.primaryMember - b.primaryMember;
				}
			});

			var groupItems = _.groupBy(dashboardVm.lastedCusData, 'status');
			_.forEach(groupItems, function (value, key) {
				var name = _.find(dashboardVm.appStatus, { key: parseInt(value[0].status) });
				if (name) {
					if (name.key === 0) {
						dashboardVm.lastedCusNewData = value;
					}
					if (name.key === 1) {
						dashboardVm.lastedCusProgressingData = value;
					}
					if (name.key === 2) {
						dashboardVm.lastedCusProgressedData = value;
					}
					if (name.key === 3) {
						dashboardVm.lastedCusPendingData = value;
					}
					if (name.key === 4) {
						dashboardVm.lastedCusApprovedData = value;
					}
					if (name.key === 5) {
						dashboardVm.lastedCusDeniedData = value;
					}
					if (name.key === 6) {
						dashboardVm.lastedCusCancellData = value;
					}
					if (name.key === 7) {
						dashboardVm.lastedCusErrorData = value;
					}
					if (name.key === 8) {
						dashboardVm.lastedCusRequiredData = value;
					}
				}
			});
			//paging default by status completed
			pagingByStatus(0);
			if (!isFilter) {
				delete $rootScope.storage.lastedReport;
				$rootScope.storage.lastedReport = {
					lastedCusData: dashboardVm.lastedCusData,
					lastedCusNewData: dashboardVm.lastedCusNewData,
					lastedCusProgressingData: dashboardVm.lastedCusProgressingData,
					lastedCusProgressedData: dashboardVm.lastedCusProgressedData,
					lastedCusPendingData: dashboardVm.lastedCusPendingData,
					lastedCusApprovedData: dashboardVm.lastedCusApprovedData,
					lastedCusDeniedData: dashboardVm.lastedCusDeniedData,
					lastedCusCancellData: dashboardVm.lastedCusCancellData,
					lastedCusErrorData: dashboardVm.lastedCusErrorData,
					lastedCusRequiredData: dashboardVm.lastedCusRequiredData,
					reportTime: reportTime,
					startDate: startReport,
					endDate: endReport
				};
			}

			deferred.resolve(true);
			return deferred.promise;
		}

		function groupToPages() {
			dashboardVm.pagedItems = [];
			for (var i = 0; i < dashboardVm.filteredItems.length; i++) {
				if (i % dashboardVm.paging.pageSize === 0) {
					dashboardVm.pagedItems[Math.floor(i / dashboardVm.paging.pageSize)] = [dashboardVm.filteredItems[i]];
				} else {
					dashboardVm.pagedItems[Math.floor(i / dashboardVm.paging.pageSize)].push(dashboardVm.filteredItems[i]);
				}
			}
			if (dashboardVm.filteredItems.length % dashboardVm.paging.pageSize === 0) {
				dashboardVm.paging.totalPage = dashboardVm.filteredItems.length / dashboardVm.paging.pageSize;
			} else {
				dashboardVm.paging.totalPage = Math.floor(dashboardVm.filteredItems.length / dashboardVm.paging.pageSize) + 1;
			}
		}
		function getFacilityName(item) {
			memberShipFacilitiesService.get(item.facilityId).then(function (facility) {
				item.facilityName = facility.name;
			});
		}

		function changePage() {
			groupToPages();
		}

		function pagingByStatus(stt) {
			if (stt === 0 || stt === 'New') {
				dashboardVm.filteredItems = appUtils.sortArray(dashboardVm.lastedCusNewData, 'timestampSignatured');
				dashboardVm.paging.totalRecord = dashboardVm.lastedCusNewData.length;
			}
			else if (stt === 1 || stt === 'Processing') {
				dashboardVm.filteredItems = appUtils.sortArray(dashboardVm.lastedCusProgressingData, 'timestampSignatured');
				dashboardVm.paging.totalRecord = dashboardVm.lastedCusProgressingData.length;
			}
			else if (stt === 2 || stt === 'Verified') {
				dashboardVm.filteredItems = appUtils.sortArray(dashboardVm.lastedCusProgressedData, 'timestampSignatured');
				dashboardVm.paging.totalRecord = dashboardVm.lastedCusProgressedData.length;
			}
			else if (stt === 3 || stt === 'Billing Pending') {
				dashboardVm.filteredItems = appUtils.sortArray(dashboardVm.lastedCusPendingData, 'timestampSignatured');
				dashboardVm.paging.totalRecord = dashboardVm.lastedCusPendingData.length;
			}
			else if (stt === 4 || stt === 'Billing Approved') {
				dashboardVm.filteredItems = appUtils.sortArray(dashboardVm.lastedCusApprovedData, 'timestampSignatured');
				dashboardVm.paging.totalRecord = dashboardVm.lastedCusApprovedData.length;
			}
			else if (stt === 5 || stt === 'Billing Denied') {
				dashboardVm.filteredItems = appUtils.sortArray(dashboardVm.lastedCusDeniedData, 'timestampSignatured');
				dashboardVm.paging.totalRecord = dashboardVm.lastedCusDeniedData.length;
			}
			else if (stt === 6 || stt === 'Cancelled') {
				dashboardVm.filteredItems = appUtils.sortArray(dashboardVm.lastedCusCancellData, 'timestampSignatured');
				dashboardVm.paging.totalRecord = dashboardVm.lastedCusCancellData.length;
			}
			else if (stt === 7 || stt === 'Error') {
				dashboardVm.filteredItems = appUtils.sortArray(dashboardVm.lastedCusErrorData, 'timestampSignatured');
				dashboardVm.paging.totalRecord = dashboardVm.lastedCusErrorData.length;
			}
			else if (stt === 8 || stt === 'Billing Required') {
				dashboardVm.filteredItems = appUtils.sortArray(dashboardVm.lastedCusRequiredData, 'timestampSignatured');
				dashboardVm.paging.totalRecord = dashboardVm.lastedCusRequiredData.length;
			}

			dashboardVm.paging.currentPage = 0;
			groupToPages();
		}

		function getCustomerInfo(item) {
			// var member = _.find(dashboardVm.members, function (item) {
			// 	return item.$id === membershipId;
			// });
			// if (member && member.priMember && member.priMember.memberId && member.priMember.memberId !== '')
			// 	return member.priMember.memberId;
			// else if (member && member.secMember && member.secMember.memberId && member.secMember.memberId !== '')
			// 	return member.secMember.memberId;
			// else
			// 	return ' ';
			return memberShipService.getWithLoad(item.membershipId).then(function (member) {
				item.memberId = '';
				if (member) {
					item.memberId = (member.priMember && _.trim(member.priMember.memberId)) || (member.secMember && _.trim(member.secMember.memberId));
				}
				$timeout(angular.noop, 200);
			});
		}

		$('#customersrange').on('apply.daterangepicker', function (ev, picker) {
			//set default
			dashboardVm.lastedCusData = [];
			dashboardVm.lastedCusNewData = [];
			dashboardVm.lastedCusProgressingData = [];
			dashboardVm.lastedCusProgressedData = [];
			dashboardVm.lastedCusPendingData = [];
			dashboardVm.lastedCusApprovedData = [];
			dashboardVm.lastedCusDeniedData = [];
			dashboardVm.lastedCusErrorData = [];
			dashboardVm.lastedCusRequiredData = [];
			dashboardVm.lastedCusCancellData = [];
			dashboardVm.groupedItems = [];
			dashboardVm.filteredItems = [];
			dashboardVm.pagedItems = [];
			//Load Data
			var startDate = Date.parse(new Date(picker.startDate._d));
			var endDate = Date.parse(new Date(picker.endDate._d));
			pushLoading();
			memAppService.getDataGolbalReport({
				size: 0,
				from: 0,
				timestampStart: startDate,
				timestampEnd: endDate,
				isDashboard: true,
				status: 'All',
				keyword: '',
				sort: true
			}).then(function (data) {
				loadLastedCusData(data.items, true).then(function () {
					popLoading();
					//reload UI
					$timeout(function () {
						$('#StatusTab>li.active a').click();
					}, 300);
				});
			});
		});
		//--------------------------------------------------------------------------------------------
		//Signup Data Chart	
		function loadSignUpData(items, startDate, endDate, isFilter) {
			var deferred = $q.defer();

			var startDay = startDate.date();
			var startMonth = startDate.month();
			var startYear = startDate.year();

			var endDay = endDate.date();
			var endMonth = endDate.month();
			var endYear = endDate.year();

			var diffDay = endDate.diff(startDate, 'days');
			var objAppManual = {
				name: 'App New Application',
				data: []
			};

			var objWebManual = {
				name: 'Web New Application',
				data: []
			};

			var objWebOCR = {
				name: 'Web Form Upload',
				data: []
			};

			var objAppOCR = {
				name: 'App Form Capture',
				data: []
			};

			var signUpAxis = [];
			//To day || Yesterday
			if (startDay === endDay && startMonth === endMonth && startYear === endYear) {
				//set title line set xAxis
				dashboardVm.signUpAxis = ['00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];
				//caculate data
				signUpAxis = [];
				_.forEach(dashboardVm.signUpAxis, function (value, key) {
					//get timestamp start & end hour in day
					var date = startDate.format("MM/DD/YYYY") + ' ' + value;
					var startOfHour = moment(date).startOf('hour');
					var endOfHour = moment(date).endOf('hour');
					var timestampS = Date.parse(new Date(startOfHour));
					var timestampE = Date.parse(new Date(endOfHour));
					//Caculate total amount in hours of day
					var data = _.filter(items, function (item) {
						return parseInt(item.timestampSignatured) >= parseInt(timestampS) && parseInt(item.timestampSignatured) <= parseInt(timestampE);
					});
					var groupItems = _.groupBy(data, 'method');
					//caculate data by method
					var appManual = 0;
					var webAdminManual = 0;
					var webOCR = 0;
					var webAdminORC = 0;
					_.forEach(data, function (value, key) {
						var method = _.find(dashboardVm.appMethods, { key: value.method });
						if (method) {
							if (method.value === 'App New Application' || method.key === 0) {
								appManual = appManual + 1;
							} else if (method.value === 'Web New Application' || method.key === 3) {
								webAdminManual = webAdminManual + 1;
							}
							else if (method.value === 'App Form Capture' || method.key === 2) {
								webOCR = webOCR + 1;
							}
							else if (method.value === 'Web Form Upload' || method.key === 1) {
								webAdminORC = webAdminORC + 1;
							}
						}
					});

					if (appManual !== 0 || webAdminManual !== 0 || webOCR !== 0 || webAdminORC !== 0) {
						objAppManual.data.push(appManual);
						objWebManual.data.push(webAdminManual);
						objAppOCR.data.push(webOCR);
						objWebOCR.data.push(webAdminORC);
						signUpAxis.push(value);
					}
				});
				//result
				//result
				dashboardVm.signUpAxis = signUpAxis;
				dashboardVm.signUpData.push(objAppManual);
				dashboardVm.signUpData.push(objWebManual);
				dashboardVm.signUpData.push(objAppOCR);
				dashboardVm.signUpData.push(objWebOCR);
				$timeout(function () {
					dashboardVm.chartSignupConfig.series = dashboardVm.signUpData;
					dashboardVm.chartSignupConfig.options.xAxis.categories = dashboardVm.signUpAxis;
				}, 100);

			} else {
				//set title line set xAxis 
				var tmp = endDate;
				for (var i = 0; i <= diffDay; i++) {
					var date = tmp.format("MM/DD/YYYY");
					dashboardVm.signUpAxis.push(date);
					date = tmp.subtract('days', 1);
				}
				dashboardVm.signUpAxis.reverse();
				//caculate data
				signUpAxis = [];
				_.forEach(dashboardVm.signUpAxis, function (value, key) {
					//get timestamp start & end of day
					var startOfDay = moment(value).startOf('day');
					var endOfDay = moment(value).endOf('day');
					var timestampS = Date.parse(new Date(startOfDay));
					var timestampE = Date.parse(new Date(endOfDay));
					//Caculate total amount in day
					var data = _.filter(items, function (item) {
						return parseInt(item.timestampSignatured) >= parseInt(timestampS) && parseInt(item.timestampSignatured) <= parseInt(timestampE);
					});
					var groupItems = _.groupBy(data, 'method');
					//caculate data by method
					var appManual = 0;
					var webAdminManual = 0;
					var webOCR = 0;
					var webAdminORC = 0;
					_.forEach(data, function (value, key) {
						var method = _.find(dashboardVm.appMethods, { key: value.method });
						if (method) {
							if (method.value === 'App New Application' || method.key === 0) {
								appManual = appManual + 1;
							} else if (method.value === 'Web New Application' || method.key === 3) {
								webAdminManual = webAdminManual + 1;
							}
							else if (method.value === 'App Form Capture' || method.key === 2) {
								webOCR = webOCR + 1;
							}
							else if (method.value === 'Web Form Upload' || method.key === 1) {
								webAdminORC = webAdminORC + 1;
							}
						}
					});

					if (appManual !== 0 || webAdminManual !== 0 || webOCR !== 0 || webAdminORC !== 0) {
						objAppManual.data.push(appManual);
						objWebManual.data.push(webAdminManual);
						objAppOCR.data.push(webOCR);
						objWebOCR.data.push(webAdminORC);
						signUpAxis.push(value);
					}


				});

				//result
				dashboardVm.signUpAxis = signUpAxis;
				dashboardVm.signUpData.push(objAppManual);
				dashboardVm.signUpData.push(objWebManual);
				dashboardVm.signUpData.push(objAppOCR);
				dashboardVm.signUpData.push(objWebOCR);
				$timeout(function () {
					dashboardVm.chartSignupConfig.series = dashboardVm.signUpData;
					dashboardVm.chartSignupConfig.options.xAxis.categories = dashboardVm.signUpAxis;
				}, 100);
			}

			if (!isFilter) {
				delete $rootScope.storage.signUpReport;
				$rootScope.storage.signUpReport = {
					signUpData: dashboardVm.signUpData,
					signUpAxis: dashboardVm.signUpAxis,
					reportTime: reportTime,
					startDate: startReport,
					endDate: endReport
				};
			}

			deferred.resolve(true);
			return deferred.promise;
		}

		//Chart Config
		dashboardVm.chartSignupConfig = {
			options: {
				chart: {
					type: 'column',
					plotBackgroundColor: null,
					plotBorderWidth: null,
					plotShadow: false

				},
				title: {
					text: ''
				},
				tooltip: {
					headerFormat: '<span style="font-size:10px">{point.key}</span><table>',
					pointFormat: '<tr><td style="color:{series.color};padding:0">{series.name}: </td>' +
						'<td style="padding:0"><b>{point.y:.1f} </b></td></tr>',
					footerFormat: '</table>',
					shared: true,
					useHTML: true
				},
				xAxis: {
					categories: dashboardVm.signUpAxis,
					crosshair: true
				},
				yAxis: {
					min: 0,
					title: {
						text: 'Number of Customer'
					}
				},
				plotOptions: {
					column: {
						pointPadding: 0.2,
						borderWidth: 0
					}
				}
			},
			series: dashboardVm.signUpData,

			loading: false
		};

		$('#signuprange').on('apply.daterangepicker', function (ev, picker) {
			dashboardVm.signUpData = [];
			dashboardVm.signUpAxis = [];
			//
			var startDate = Date.parse(new Date(picker.startDate._d));
			var endDate = Date.parse(new Date(picker.endDate._d));
			pushLoading();
			memAppService.getDataGolbalReport({
				size: 0,
				from: 0,
				timestampStart: startDate,
				timestampEnd: endDate,
				isDashboard: true,
				status: 'All',
				keyword: '',
				sort: true
			}).then(function (data) {
				var sdate = moment(new Date(picker.startDate._d));
				var edate = moment(new Date(picker.endDate._d));
				loadSignUpData(data.items, sdate, edate, true).then(function () {
					popLoading();
					$timeout(function () {
						dashboardVm.chartSignupConfig.series = dashboardVm.signUpData;
						dashboardVm.chartSignupConfig.options.xAxis.categories = dashboardVm.signUpAxis;
					}, 100);
				});
			});
		});
		//--------------------------------------------------------------------------------------------
		//Common Functions	
		function caculateTotalAmountRevenue(items) {
			var total = 0;
			_.forEach(items, function (value, key) {
				if (value && value.total) {
					var itemTotal = parseFloat(value.total);
					if (!isNaN(itemTotal)) {
						total = total + itemTotal;
					}
				}
			});

			var n = parseFloat(total);
			total = Math.round(n * 1000) / 1000;
			return total;
		}

		function popupDashboardInfoModal(pointData, infoType) {
			var modalInstance = $uibModal.open({
				templateUrl: 'app/dashboard/dashboard-modal/dashboard-info-modal.tpl.html',
				controller: 'dashboardInfoModalCtrl as dashVm',
				size: 'lg',
				scope: $scope,
				windowClass: 'dashboard-info-modal',
				backdrop: 'static',
				resolve: {
					pointData: function () {
						return pointData;
					},
					infoType: function () {
						return infoType;
					}
				}
			});
			modalInstance.result.then(function (res) {
				gotoAnchor(res);
			}, function (res) {
				gotoAnchor(res);
			});
		}

		function convertArrayOfObjectsToCSV(args, type) {
			var result, ctr, keys, columnDelimiter, lineDelimiter, data, n;

			data = args.data || null;
			if (data === null || !data.length) {
				return null;
			}

			columnDelimiter = args.columnDelimiter || ',';
			lineDelimiter = args.lineDelimiter || '\n';

			if (type && type === 'applicationByStatusExport') {
				keys = ['Full Name', 'Facility Code', 'Facility Name', 'Representative Code', 'Representative Name', 'State', 'Plan Type', 'Status', 'SetupFee', 'Waived Setup Fee', 'Total Amount', 'Signature Date'];
			} else if (type && type === 'revenueByRepresentativeCodeExport') {
				keys = ['Full Name', 'Facility Code', 'Facility Name', 'Representative Code', 'Representative Name', 'State', 'Plan Type', 'Status', 'Plans', 'Addons', 'SetupFee', 'Waived Setup Fee', 'Total Amount', 'Signature Date'];
			} else {
				keys = ['Full Name', 'Facility Code', 'Facility Name', 'Representative Code', 'Representative Name', 'State', 'Plan Type', 'Status', 'SetupFee', 'Waived Setup Fee', 'Total Amount', 'Signature Date'];
			}

			result = '';
			result += lineDelimiter;
			result += keys.join(columnDelimiter);
			result += lineDelimiter;
			
			var replaceRegx = /,/g;
			data.forEach(function (item) {
				ctr = 0;

				keys.forEach(function (key) {
					var value;
					if (key === 'Full Name') {
						if (item.primaryMember !== '') {
							value = _.trim(item.primaryMember);
						} else if (item.secondaryMember !== '') {
							value = _.trim(item.secondaryMember);
						} else {
							value = ' ';
						}
					}
					// if (key === 'Last Name') {
					// 	value = item.lastName || 'Unknown';
					// }
					if (key === 'Facility Code') {
						value = item.facilityCode || '';
					}
					if (key === 'Representative Code') {
						value = item.representativeCode || '';
					}

					if (key === 'Facility Name') {
						value = item.facilityName ? item.facilityName.replace(replaceRegx, '') : '';
					}
					if (key === 'Representative Name') {
						var saleRep = item.saleRep || item.employeeName || '';
						value = saleRep ? saleRep.replace(replaceRegx, '') : '';
					}

					if (key === 'State') {
						var state = _.find(dashboardVm.statesLst, { iso: item.state });
						value = state ? state.name : ' ';
					}

					if (key === 'Plan Type') {
						var planType = _.find(dashboardVm.regionGroups[item.state], { id: item.region });
						value = planType && planType.guid.replace(/[,]/g, ' -') || ' ';
					}

					// if (key === 'Payment Method') {
					// 	var payment = _.find(appUtils.appPaymentMethods, { key: parseInt(item.status) });
					// 	value = payment ? payment.name : ' ';
					// }

					if (key === 'Status') {
						var stt = _.find(dashboardVm.appStatus, { key: parseInt(item.status) });
						value = stt ? stt.value : ' ';
					}
					// if(key === 'Payment Method'){
					// 	value = item.paymentMethodTxt || '';	
					// }
					if (key === 'Plans') {
						value = item.planName || ' ';
						if (value !== '') {
							value = value.replace(',', '.');
						}
					}
					if (key === 'Addons') {
						value = item.selectedAddons ? item.selectedAddons.join("; ") : ' ';
						if (value !== '') {
							value = value.replace(/[,]/g, '.');
						}
					}

					if (key === 'SetupFee') {
						if (item.setupFee) {
							n = parseFloat(item.setupFee);
							value = (Math.round(n * 1000) / 1000).toFixed(2);
						} else {
							value = 0;
						}
					}

					if (key === 'Waived Setup Fee') {
						if (item.waivedSetupFee) {
							value = 'Yes';
						} else {
							value = 'No';
						}
					}

					if (key === 'Total Amount') {
						if (item.total) {
							n = parseFloat(item.total);
							value = (Math.round(n * 1000) / 1000).toFixed(2);
						} else {
							value = 0;
						}
					}

					if (key === 'Signature Date') {
						value = item.timestampSignatured ? moment(item.timestampSignatured).format("MM/DD/YYYY") : ' ';
					}

					if (ctr > 0) result += columnDelimiter;

					result += value + '';
					ctr++;
				});
				result += lineDelimiter;
			});
			return result;
		}

		function downloadCSV(args, lstData, type) {
			var data, filename, link;
			getDataMember(lstData).then(function () {
				var csv = convertArrayOfObjectsToCSV({
					data: lstData
				}, type);

				if (csv === null) return;
				
				filename = args.filename || 'export.csv';
				// if (!csv.match(/^data:text\/csv/i)) {
				// 	csv = 'data:text/csv;charset=utf-8,' + csv;
				// }
				//data = encodeURI(csv);
				saveAs(new Blob([csv], { type: "application/csv" }), filename);
				// link = document.createElement('a');
				// link.setAttribute('href', data);
				// link.setAttribute('download', filename);
				// document.body.appendChild(link);
				// link.click();
				// document.body.removeChild(link);
			});
		}

		function getDataMember(lstApps) {
			var reqs = [];
			_.forEach(lstApps, function (app) {
				reqs.push(memberShipFacilitiesService.get(app.facilityId).then(function (facility) {
					app.facilityName = facility ? facility.name : '';
					var employee = _.find(dashboardVm.employees, function (em) {
						return em.repCode && app.representativeCode && _.trim(em.repCode) !== '' && _.trim(app.representativeCode) !== '' && em.repCode.toLowerCase() === app.representativeCode.toLowerCase();
					});
					app.employeeName = employee !== undefined ? employee.firstName + ' ' + employee.lastName : '';
					$timeout(angular.noop, 200);
				}));

				reqs.push(memAppService.getWaivedSetupFee(app.$id).then(function (apply) {
					app.waivedSetupFee = (apply === undefined || apply === null) ? false : apply;
					$timeout(angular.noop, 200);
				}));
			});

			return $q.all(reqs).then(function () {
				return lstApps;
			});
		}

		function gotoAnchor(id) {
			var newHash = id;
			if ($location.hash() !== newHash) {
				// set the $location.hash to `newHash` and
				// $anchorScroll will automatically scroll to it
				$location.hash(id);
			} else {
				// call $anchorScroll() explicitly,
				// since $location.hash hasn't changed
				$anchorScroll();
			}
		}

		$scope.goTo = function (item) {
			var status = parseInt(item.status);
			// if(status === 4){
			//     $state.go('membership.memberdetails', { id: item.membershipId});
			//     return;
			// }
			var tab = status === 0 ? -1 : status;
			$state.go('membership.editApplication', { id: item.$id, 'tab': tab, 'keyword': '', 'page': 0 });
		};
		//--------------------------------------------------------------------------------------------	
		//Selling
		// dashboardVm.chartSellingConfig = {
		//     options: {
		//         chart: {
		//             type: 'column',
		//             plotBackgroundColor: null,
		//             plotBorderWidth: null,
		//             plotShadow: false

		//         },
		//         title: {
		//     		text: 'Sign Up Method'
		//         },
		//         tooltip: {
		//             headerFormat: '<b>{point.x}</b><br/>',
		//     		pointFormat: '{series.name}: {point.y}<br/>Total: {point.stackTotal}'
		//         },
		//         xAxis: {
		//             categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat' , 'Sun']
		//         },
		//         yAxis: {
		//             min: 0,
		//             title: {
		//                 text: 'Total Plan Selling'
		//             },
		//             stackLabels: {
		//                 enabled: true,
		//                 style: {
		//                     fontWeight: 'bold',
		//                     color: (Highcharts.theme && Highcharts.theme.textColor) || 'gray'
		//                 }
		//             }
		//         },
		//         legend: {
		//             align: 'right',
		//             x: -100,
		//             verticalAlign: 'top',
		//             y: -10,
		//             floating: true,
		//             backgroundColor: (Highcharts.theme && Highcharts.theme.background2) || 'white',
		//             borderColor: '#CCC',
		//             borderWidth: 1,
		//             shadow: false
		//         },
		//         plotOptions: {
		//             column: {
		//                 stacking: 'normal',
		//                 dataLabels: {
		//                     enabled: true,
		//                     color: (Highcharts.theme && Highcharts.theme.dataLabelsColor) || 'white',
		//                     style: {
		//                         textShadow: '0 0 3px black'
		//                     }
		//                 }
		//             }
		//         }
		//     },
		//     series: [{
		//         name: 'Family',
		//         data: [5, 3, 4, 7, 2,4,6]
		//     }, {
		//         name: 'Single',
		//         data: [2, 2, 3, 2, 1,6,7]
		//     }, {
		//         name: 'Couple',
		//         data: [3, 4, 4, 2, 5,1,1]
		//     }],

		//     loading: false
		// };

		// $('#sellingsrange').on('apply.daterangepicker', function(ev, picker) {
		// var startDate = picker.startDate.format('MM/DD/YYYY');
		// var endDate = picker.endDate.format('MM/DD/YYYY');      
		// });
		//---------------------------------------------------------------------------------------------- 
		//function loadDataChart() {
		// 	//--------------------------------------------------------------------------------------------	
		// 	//default load revenue by facility code data last 7 day
		// 	// $timeout(function(){
		// 	// 	loadRevenueByFacilityCodeData(dashboardVm.items, dashboardVm.stateFacCode);
		// 	// },2000);
		// 	// //--------------------------------------------------------------------------------------------	
		// 	// //default load revenue by state code data last 7 day
		// 	// $timeout(function(){
		// 	// 	loadRevenueByStateData(dashboardVm.items);
		// 	// },2000);
		// 	// //--------------------------------------------------------------------------------------------	
		// 	// //default load revenue by repcode code data last 7 day
		// 	// $timeout(function(){
		// 	// 	loadRevenueByRepCodeData(dashboardVm.items);
		// 	// },1000);
		// 	// //--------------------------------------------------------------------------------------------	
		// 	// //default load revenue data last 7 day
		// 	// $timeout(function(){
		// 	// 	loadRevenueData(dashboardVm.items, startDate, endDate);
		// 	// },0);
		// 	//--------------------------------------------------------------------------------------------	
		// 	//default load application data last 7 day
		// 	pushLoading();
		// 	return loadApplicationData(dashboardVm.items)
		// 		.then(loadRevenueByFacilityCodeData(dashboardVm.items, dashboardVm.stateFacCode))
		// 		.then(loadRevenueByStateData(dashboardVm.items))
		// 		.then(loadRevenueByRepCodeData(dashboardVm.items))
		// 		.then(loadLastedCusData(dashboardVm.items))
		// 		.then(loadRevenueData(dashboardVm.items, startDate, endDate))
		// 		.then(function () {
		// 			var sDate = moment().subtract('days', 6).startOf('day');
		// 			var eDate = moment().endOf('day');
		// 			$timeout(function () {
		// 				loadSignUpData(dashboardVm.items, sDate, eDate);
		// 			}, 3000);

		// 			// appUtils.hideLoading();
		// 			popLoading();
		// 		});
		// 	//--------------------------------------------------------------------------------------------	
		// 	//default load lasted customer data last 7 day
		// 	// $timeout(function(){
		// 	// 	loadLastedCusData(dashboardVm.items);
		// 	// },3000);
		// 	//--------------------------------------------------------------------------------------------	
		// 	//default load application data last 7 day
		// }
		function importSnap() {
			memAppSnapshotService.importSnap();
		}

		function importMemberSnap() {
			membershipSnapshotService.importSnap();
		}
	}
})();
