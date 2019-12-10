(function(){
	'use strict';
	angular.module('app.Directive.RateDatePicker',[]).directive('rateDatePicker',['$parse','$timeout',function($parse,$timeout){
	return{
		restrict: 'AE',
		replace: true,
		require: 'ngModel',
		scope: {
			data:'=ngModel',
			cls: '@',
			clsControl: '@',
			clsLabel: '@',
			isRequireAll: '@',
			requireStart: '@',
			requireEnd: '@',
			isDisable: '@',
			hideEnd: '@'
		},
		 template: [ '<div class="rate-date-picker">',
		 				'<div class="form-group {{cls}}">',
							'<label class="control-label {{clsLabel}}" >{{titleStart}} <span class="required-field" ng-if="req || reqStart">*</span></label>',
							'<div class="{{clsControl}}">',
								'<div class="input-group date form_meridian_datetime start-datetime-{{index}}">',
									'<input type="text" class="form-control" ng-disabled="isDisable" placeholder="mm/dd/yyyy" ng-required="req || reqStart" name="eventstartdatetime" ng-model="startDate">',
									'<span class="input-group-btn input-group-addon no-padding">',
										'<button class="btn default date-set" type="button">',
											'<i class="fa fa-calendar" data-time-icon="icon-time"></i>',
										'</button>',
									'</span>',
								'</div>',
							'</div>',
                    	'</div>',
                    	'<div class="form-group {{cls}}" ng-if="!hideEnd">',
							'<label class="control-label {{clsLabel}}">{{titleEnd}} <span class="required-field" ng-if="req || reqEnd">*</span></label>',
							'<div class="{{clsControl}}">',
	                    		'<div class="input-group date form_meridian_datetime end-datetime-{{index}}">',
									'<input type="text" class="form-control" ng-disabled="isDisable" placeholder="mm/dd/yyyy" ng-required="req || reqEnd"  name="eventenddatetime" ng-model="endDate">',
									'<span class="input-group-btn input-group-addon no-padding">',
										'<button class="btn default date-set" type="button">',
											'<i class="fa fa-calendar" data-time-icon="icon-time"></i>',
										'</button>',
									'</span>',
								'</div>',
	                       '</div>',
                       '</div>',
					'</div>'].join(''),
		link: function(scope,iElement, iAttrs, ngModelCtrl){
			if (!scope.data || !scope.data.$$hashKey) 
				scope.index = Math.floor(Math.random() * 1000, 1);
			else
				scope.index = scope.data.$$hashKey.split(":")[1];
				
			$timeout(function(){
				scope.startDate = scope.data.startDate || scope.data.startTime || '';
				scope.endDate = scope.data.endDate  || scope.data.endTime;
				scope.req = scope.isRequireAll && scope.isRequireAll === 'true' ? true : false;
				scope.reqStart = scope.requireStart && scope.requireStart === 'true' ? true : false;
				scope.reqEnd = scope.requireEnd && scope.requireEnd === 'true' ? true : false;
				scope.isDisable = scope.isDisable && scope.isDisable === 'true' ? true : false;
				scope.hideEnd = scope.hideEnd && scope.hideEnd === 'true' ? true : false;
				scope.titleStart = iAttrs.titleStart ? iAttrs.titleStart : 'Start Date';
				scope.titleEnd = iAttrs.titleEnd ? iAttrs.titleEnd : 'End Date';

				var start = new Date();
				// set end date to max one year period:
				var end = new Date(new Date().setYear(start.getFullYear()+1));
				$(".start-datetime-" + scope.index).datepicker({
	                isRTL: App.isRTL(),
	                format: 'mm/dd/yyyy',
	                autoclose: true,
					pickerPosition: (App.isRTL() ? "bottom-right" : "bottom-left"),
					isInline: false,
					keyboardNavigation: false,
					date: scope.startDate
	            }).on('changeDate', function(){
				    // set the "toDate" start to not be later than "fromDate" ends:
					var newValue = $(".start-datetime-" + scope.index + " input").val();
					if(scope.data.startDate !== undefined){
						scope.data.startDate  = newValue;
					}
					if(scope.data.startTime !== undefined){
						scope.data.startTime  = newValue;
					}

					var sdate = Date.parse(new Date(newValue)), 
						edate = Date.parse(new Date(scope.data.endDate));

					if(sdate > edate){
						scope.data.endDate = '';
						scope.endDate = '';
						$(".end-datetime-" + scope.index + " input").val('');
					}
					
				    $(".end-datetime-" + scope.index).datepicker('setStartDate', new Date(newValue));
				});

	            $(".end-datetime-" + scope.index).datepicker({
	                isRTL: App.isRTL(),
	                format: 'mm/dd/yyyy',
	                autoclose: true,
					pickerPosition: (App.isRTL() ? "bottom-right" : "bottom-left"),
					isInline: false,
					clearBtn: true,
					keyboardNavigation: false,
					date: scope.endDate,
					startDate: scope.startDate
	            }).on('changeDate', function(){
				    // set the "toDate" start to not be later than "fromDate" ends:
					var newValue = $(".end-datetime-" + scope.index + " input").val();
					if(scope.data.endDate !== undefined){
						scope.data.endDate  = newValue;
					}
					if(scope.data.endTime !== undefined){
						scope.data.endTime  = newValue;
					}

					var edate = Date.parse(new Date(newValue)), 
						sdate = Date.parse(new Date(scope.data.startDate));

					if(sdate > edate){
						scope.data.startDate = '';
						scope.startDate = '';
						$(".start-datetime-" + scope.index + " input").val('');
					}

					if(newValue !== ''){
						$(".start-datetime-" + scope.index).datepicker('setEndDate', new Date(newValue));
					}else{
						$(".start-datetime-" + scope.index).datepicker('setEndDate', null);
					}
				});
			},2500);            
		}
	};
	}]);
})();

