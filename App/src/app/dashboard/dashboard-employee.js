(function () {
    'use strict';

    angular.module('app.membership')
	.controller('dashboardEmployeeCtrl', dashboardEmployeeCtrl);

    /** @ngInject */
    function dashboardEmployeeCtrl($rootScope, $scope, $uibModal, memAppService, appUtils, DataUtils, authService, appSettingService , memRegionService) {
		$rootScope.settings.layout.pageSidebarClosed = true;
		$scope.userPermission = $rootScope.storage.statePermission;
        var currentUser = authService.getCurrentUser(); //$rootScope.storage.currentUser;
        var appSettings = $rootScope.storage.appSettings;
        var search = appSettings.elasticSearch ? appSettings.elasticSearch.application : {};

        var dashboardVm = this; // jshint ignore:line
		dashboardVm.dashBoardData = [];
		dashboardVm.regionGroups = {};
		
        //Default Start Date & End Date
		dashboardVm.timestampDStart = moment().startOf('day').valueOf();
        dashboardVm.timestampDEnd = moment().endOf('day').valueOf();
        dashboardVm.getRegion = getRegion;
        initPage();

		$('#dashboardRange').on('apply.daterangepicker', function(ev, picker) {
            //reload UI
			initDashboardModel();
            //            
        	dateRangeChange();
        });

        function initPage(){
            initDashboardModel();
			appUtils.showLoading();
            if(search && search.index){
				getDashboardData();
			}else{
				appSettingService.getSettings().then(function(optionRs){
					appSettings = optionRs;
					search = appSettings.elasticSearch ? appSettings.elasticSearch.application : {};
					getDashboardData();
				});
			}
        }
        

        dashboardVm.showEmployeeDashboardModal = function(type){
			var modalInstance = $uibModal.open({
			   templateUrl: 'app/dashboard/dashboard-modal/dashboard-employee-info-modal.tpl.html',
			   controller: 'DashBoardEmployeeModalCtrl',
			   size: 'lg',
			   scope: $scope,
			   backdrop: 'static',
			   resolve: {
				   reportType: function () {
					  return type;
				   },
				   reportData: function () {
					return dashboardVm.dashBoardData;
				 }
			   }
		    });
		};
		
		function dateRangeChange(){
			appUtils.showLoading();
            //get time range
            var _start = $('#dashboardRange').data('daterangepicker').startDate._d;
            var _end = $('#dashboardRange').data('daterangepicker').endDate._d;

            dashboardVm.timestampDStart = Date.parse(new Date(_start));
			dashboardVm.timestampDEnd = Date.parse(new Date(_end));
            
            if(search && search.index){
				getDashboardData();
			}else{
				appSettingService.getSettings().then(function(optionRs){
					appSettings = optionRs;
					search = appSettings.elasticSearch ? appSettings.elasticSearch.application : {};
					getDashboardData();
				});
			}
			
        }
		
		function initDashboardModel(){
			dashboardVm.dashBoardModel = {
				total: 0,
				ocr: {
					total: 0,
					amount: 0
				},
				manual: {
					total: 0,
					amount: 0
				},
				direct: {
					total: 0,
					amount: 0
				},
				offLine: {
					total: 0,
					amount: 0
				},
				new: {
					total: 0,
					amount: 0
				},
				process: {
					total: 0,
					amount: 0
				},
				verified: {
					total: 0,
					amount: 0
				},
				approved: {
					total: 0,
					amount: 0
				},
				pending: {
					total: 0,
					amount: 0
				},
				denied: {
					total: 0,
					amount: 0
				},
				error: {
					total: 0,
					amount: 0
				},
				cancelled: {
					total: 0,
					amount: 0
				},
				required: {
					total: 0,
					amount: 0
				}
			};
		}
		
		function getDashboardData(){
			//Get datetime txt show UI
			var repCode =  currentUser.repCode ||  currentUser.username || '';
			return memAppService.search({
				size: 10000,
				from: 0,
				timestampStart: dashboardVm.timestampDStart,
				timestampEnd: dashboardVm.timestampDEnd,
				clients: repCode,
				isDashboard: true,
				status: 'All',
				keyword: '',
				sort: true
			}).then(function (res) {
				dashboardVm.dashBoardModel.total = res.totalRecords;
				dashboardVm.dashBoardData = res.items || [];
				detachDashboarData(res.items);
			}).then(function(){
				memRegionService.getAll().then(function (regionGroups) {
					_.each(regionGroups, function (regionGroup, stateCode) {
						regionGroups[stateCode] = DataUtils.toAFArray(regionGroup);
					});
					dashboardVm.regionGroups = regionGroups;
				});
			});
		}

		function detachDashboarData(items) {
			var list = angular.copy(items);
			//group item by method
			var groupItems = _.groupBy(list, 'method');
			//caculate data by status		
			_.forEach(groupItems, function (value, key) {
				if(parseInt(key) === 2 || parseInt(key) === 1){ 
					//OCR method
					dashboardVm.dashBoardModel.ocr.total += value.length;
					dashboardVm.dashBoardModel.ocr.amount += _caculateTotalAmountRevenue(value);
				}else if(parseInt(key) === 0 || parseInt(key) === 3){
					//Manual method
					dashboardVm.dashBoardModel.manual.total += value.length;
					dashboardVm.dashBoardModel.manual.amount += _caculateTotalAmountRevenue(value);
				}
			
			});

			//group item by offline
			groupItems = _.groupBy(list, 'isOffline');
			//caculate data by status
			_.forEach(groupItems, function (value, key) {
				if(key === true || key === 'true'){ 
					dashboardVm.dashBoardModel.offLine = {
						total: value.length,
						amount: _caculateTotalAmountRevenue(value)
					}; //OffLine Application
				}else{
					//Direct Application
					dashboardVm.dashBoardModel.direct.total += value.length;
					dashboardVm.dashBoardModel.direct.amount += _caculateTotalAmountRevenue(value);
				}
			
			});

			//group item by status
			groupItems = _.groupBy(list, 'status');
			//caculate data by status
			_.forEach(groupItems, function (value, key) {
				if(parseInt(key) === 0){ 
					dashboardVm.dashBoardModel.new  = {
						total: value.length,
						amount: _caculateTotalAmountRevenue(value)
					}; //New Application
				}else if(parseInt(key) === 1){
					dashboardVm.dashBoardModel.process  = {
						total: value.length,
						amount: _caculateTotalAmountRevenue(value)
					};  //Processing Application
				}else if(parseInt(key) === 2){
					dashboardVm.dashBoardModel.verified  = {
						total: value.length,
						amount: _caculateTotalAmountRevenue(value)
					};  //Verified Application
				}else if(parseInt(key) === 3){
					dashboardVm.dashBoardModel.pending  = {
						total: value.length,
						amount: _caculateTotalAmountRevenue(value)
					};  //Pending Application
				}else if(parseInt(key) === 4){
					dashboardVm.dashBoardModel.approved  = {
						total: value.length,
						amount: _caculateTotalAmountRevenue(value)
					};  //Approved Application
				}else if(parseInt(key) === 5){
					dashboardVm.dashBoardModel.denied  = {
						total: value.length,
						amount: _caculateTotalAmountRevenue(value)
					};  //Denied Application
				}else if(parseInt(key) === 6){
					dashboardVm.dashBoardModel.cancelled  = {
						total: value.length,
						amount: _caculateTotalAmountRevenue(value)
					};  //Cancelled Application
				}else if(parseInt(key) === 7){
					dashboardVm.dashBoardModel.error  = {
						total: value.length,
						amount: _caculateTotalAmountRevenue(value)
					};  //Error Application
				}else if(parseInt(key) === 8){
					dashboardVm.dashBoardModel.required  = {
						total: value.length,
						amount: _caculateTotalAmountRevenue(value)
					};  //Billing Required Application
				}
			});
			
			appUtils.hideLoading();
		}

		function _caculateTotalAmountRevenue(items) {
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

		function getRegion(state, region) {
            var planType = _.find(dashboardVm.regionGroups[state], {id: region + ''});
            return planType && planType.guid || '';
        }
    }

})();
