(function() {
    'use strict';

    angular.module('app.event')
    .controller('RegionalGoalCtrl', RegionalGoalCtrl);

    /** @ngInject **/
    function RegionalGoalCtrl($rootScope, $scope, $state, $stateParams, $uibModal,$timeout, $ngBootbox, $q, appUtils, eventGoalService,memStateService, toaster) {
        $scope.userPermission = $rootScope.storage.statePermission;
        var egVm = this,
        	now =  moment(),
            nowMTS = now.clone().utc().startOf('month').valueOf()/1000,
            daysOfMonth = now.clone().endOf('month').date(),
            currentDate = now.date(),
            stateIndexes = {};

        Object.assign(egVm, {
            numberRegx: /^\d+$/,
            months: _.range(1,13).map(function(i,index){return {text: moment().month(i-1).format('MMMM'), val: i};}),
            states: [],
        	cri:  {
	        	month: now.get('month') +1,
	        	year: now.get('year'),
                regions: []
	        },
	        result: {
	        	items: [],
                prevItems:{}
	        },
	        showGoalModal: showGoalModal,
            search: search,
            edit: showGoalModal,
            delete: delItem,
            reset: reset
        });

        init();

        function init(){
            loadRegion().then(function(){
                return search();
            });
        }
        function loadRegion(){
            return memStateService.statesLoadOnce().then(function(regions){
                egVm.states = regions;
                _.each(regions, function(r){
                    stateIndexes[r.iso] = r.name;
                });
            });
        }

        function search(){
        	var cri = {
        		fromMonth: egVm.cri.month,
        		toMonth: egVm.cri.month,
        		fromYear: egVm.cri.year,
        		toYear: egVm.cri.year,
                regions: egVm.cri.regions
        	};
            // current 
        	var currentP = eventGoalService.search(cri);
            //prev

            // var prevCri = Object.assign({}, cri, {fromYear: cri.fromYear-1, toYear: cri.toYear-1});
            var prevCri = Object.assign({}, cri, {fromMonth: cri.fromMonth-1, toMonth: cri.toMonth-1});
            if(cri.fromMonth == 1){
                prevCri = Object.assign({}, cri, {fromMonth: 12, toMonth: 12, fromYear: cri.fromYear -1, toYear: cri.toYear -1});
            }
            var prevP = eventGoalService.search(prevCri);
            $q.all([currentP, prevP]).then(function(reses){
                var currentData = reses[0],
                    prevData = reses[1];
                var items = _.map(currentData, function(goal, index){
                    var prev = prevData[goal.y+'/'+(goal.m-1)+'-'+goal.r];
                    if(goal.m === 1){
                        prev = prevData[(goal.y-1)+'/'+(12)+'-'+goal.r];
                    }
                    if(prev){
                        goal.prevPlan =prev.plan;
                        goal.prevRevenue = prev.revenue;
                    }
                    goal.region = stateIndexes[goal.r];
                    goal.progress = calProgress(goal);
                    
                    return goal;
                });
                egVm.result.items = items;
            });

        }

        function showGoalModal(item){
            console.log(item);
        	var modal = $uibModal.open({
                templateUrl: 'app/event/goal-modal/goal-modal.tpl.html',
                controller: 'EventGoalModalCtrl as egmVm',
                // size: 'lg',
                scope: $scope,
                backdrop: 'static',
                windowClass: 'set-goal-modal',
                resolve: {
                    goalData:item 
                }
            });

            modal.result.then(function (result) {
                $('html').removeClass('modal-open');
                if(result){
                    search();
                }
            });
        }

        function delItem(item){
            var goalName = item.r +': '+ item.m + '/' +item.y ;
            $ngBootbox.confirm('Are you sure want to remove Goal of '+ goalName+' ?').then(function () {
                appUtils.showLoading();
                var req = eventGoalService.remove(item);
                req.then(function (res) {
                    appUtils.hideLoading();
                    // if (!res.result) {
                    //     $ngBootbox.alert(res.errorMsg);
                    //     return;
                    // }
                    toaster.pop('success', 'Success', 'Remove Goal of '+goalName+' Successfully!');
                    search();
                });
            }, function () {
                appUtils.hideLoading();
            });
        }

        function calProgress(item){
            var progress = 0,
                monthProgress = 0,
                status = 'alert',
                target = item.plan,
                revenue = item.revenue || 0; 

            if(!target){
                return {
                    progress: null,
                    status: 'unknow'
                };
            }
            // la thang hien tai
            if(nowMTS == item.mTs){
                // target = item.plan
                target = item.plan/daysOfMonth * currentDate;
            }
            

            progress = revenue/target * 100;
            progress = Math.round(progress*100) /100;
            monthProgress = revenue/item.plan * 100;
            monthProgress = Math.round(monthProgress*100) /100;
            // console.log(item.r, target, item.plan, item);
            if(progress >= 100){
                status  = 'met';
            }else if(progress >= 80){
                status = 'warning';
            }
            
            return {
                progress: monthProgress,
                status: status
            };
        }

        function reset(){
            $timeout(function(){
                $('#egVmRegionsFilter').val(null).trigger('change');
                $('#egVmMonthFilter').val('number:'+ egVm.cri.month).trigger('change');

            },0);
            
            egVm.cri = {
                month: now.get('month') +1,
                year: now.get('year'),
                regions: []
            };
            search();
        }

    }
})();