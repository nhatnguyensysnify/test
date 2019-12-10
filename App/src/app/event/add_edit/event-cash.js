(function () {
    'use strict';
    angular.module('app.event')
        .controller('EventCashCtrl', EventCashCtrl);
    /** @ngInject */
    function EventCashCtrl($rootScope, $scope, $state, $stateParams, $uibModal, $timeout, $ngBootbox, $q, appUtils, authService, toaster, DataUtils, eventService, employeeService, eventCashService, eventExportFullService) {
    	var currentUser = authService.getCurrentUser(),
            appSettings = $rootScope.storage.appSettings;
        var eventVm = $scope.eventVm,
        	eCashVm = this;

        // fields
        Object.assign(eCashVm, {
        	eventId: $stateParams.id || null,
        	model: {
        		mem: null,
	       		memId: null,
	       		amount: null,
                // moneyOrder: null, 
                // fees: null,
	       		editing: true
        	},
        	items: [],
        });

        // functions
        Object.assign(eCashVm, {
        	add: add,
            cancel: cancel,
            edit: edit,
            remove: remove,
            save: save,
            saveMO: saveMO,
            exportExcel: exportExcel,
            updateEventCashTotal: updateEventCashTotal
        });

        init();


        function init(){
            $scope.$on('event-save', function(){
                // save all
                var editingItems = _.filter(eCashVm.items, {editing: true}),
                    promises = [];
                if(editingItems.length > -1){
                    promises = _.map(editingItems, function(item){
                        return eventCashService.update(item, eCashVm.eventId);
                    });  
                }
                var p = promises.length >-1 ? $q.all(promises) : $q.defer();
                p.then(function(){
                    updateEventCashTotal();
                });
                
            });
            loadData();
        }

        function loadData(){
        	var p = eventCashService.getEventCash(eCashVm.eventId).then(function(data){
                eCashVm.items = data || [];
            });
        	return p;
        }

        function add(){
        	// eCashVm.model.timestampCreated = + new Date()
        	eCashVm.model.$id = eventCashService.genId(eCashVm.eventId);
        	eCashVm.items.unshift(_.clone(eCashVm.model));
        }
        function edit(item){
        	item.editing = true;
            item.origin = _.clone(item);
        }
        function cancel(item){
			item.editing = false;
            // var origin = item.origin;
            Object.assign(item, item.origin);
            delete item.origin;
        }
        function save(item){
        	item.editing = false;
            delete item.origin;
        	eventCashService.update(item, eCashVm.eventId).then(function(){
                updateEventCashTotal();
            });
            

        }
        function remove(item, $index){
        	$ngBootbox.confirm('Are you sure want to delete this record?').then(function () {
                // console.log(item);
                
                appUtils.showLoading();
                var req = eventCashService.remove(item, eCashVm.eventId);
                req.then(function (res) {
                    eCashVm.items.splice($index, 1);
                    // var total =  _.sumBy(eCashVm.items, 'amount');
                    // eventVm.model.cashTotal = total;
                    // eventCashService.updateEventCashTotal(eCashVm.eventId,total);
                    updateEventCashTotal();
                    appUtils.hideLoading();
                    

                    // if (!res.result) {
                    //     $ngBootbox.alert(res.errorMsg);
                    //     return;
                    // }
                    // item.status = -1;
                    // toaster.pop('success', 'Success', "Archive Event Successfully!");
                });
            }, function () {
                appUtils.hideLoading();
            });
        	
        }
        function saveMO(){
            eventCashService.updateEventMoneyOrder(eCashVm.eventId, eventVm.model.moneyOrder).then(function(){
                // console.log('success');
                $timeout(function(){
                    toaster.pop('success', 'Success', "Saved Money Order");
                },0);
                
            });
        }
        function updateEventCashTotal(save){
            // var total =  _.sumBy(eCashVm.items, function(item){
            //     var amount = item.amount || 0, fees = eventVm.model.fees || 0;
            //     // console.log(amount, fees);
            //     return amount + fees;
            // });
            var total = _.sumBy(eCashVm.items, 'amount') + (eventVm.model.fees || 0);
            var eventUpdatedData = {
                cashTotal: total,
                cashMems: _.map(eCashVm.items, 'mem').join(' '),
                cashMemIds: _.map(eCashVm.items, 'memId').join(' ')
            };
            Object.assign(eventVm.model, eventUpdatedData);
            $timeout(angular.noop,0);
            if(save !== false){
                // eventCashService.updateEventCashTotal(eCashVm.eventId,total);
                // console.log(eventUpdatedData);
                eventCashService.updateCashInfoEvent(eCashVm.eventId,eventUpdatedData);
            }
        }
        function exportExcel(){
            var data = _.cloneDeep(eventVm.model);
            data.cashCollected =  _.filter(eCashVm.items,function(item){
                return item.timestampCreated;
            });
            var exportFileName = "Event_Export" + '_' + eventVm.model.name.replace(/[^a-zA-Z0-9]/g, "").replace(/ /g, '-');
            var opts = {
                rawData: [data],
                states: DataUtils.array2ObjectIndex(eventVm.allStates, 'iso'), 
                eventTypes: DataUtils.array2ObjectIndex(eventVm.eventTypes, '$id'),
                facilities: DataUtils.array2ObjectIndex(eventVm.allFacilities, '$id'),
                territories: DataUtils.array2ObjectIndex(eventVm.allTerritories, '$id'),
                regions: DataUtils.array2ObjectIndex(eventVm.regionGroups[eventVm.model.state], 'id'), 
                fileName: exportFileName,
                onlyCashSheet: true

            };
            eventExportFullService.exportWorkbook(null, opts).then(function(){
                
            });

        }
    }
})();