(function(){
	'use strict';
	angular.module('app.Directive.AutoCompleteSelect',[]).directive('autoCompleteSelect',['$parse',function($parse){
	return{
		restrict: 'AE',
		replace: true,
		require: 'ngModel',
		scope: {
			data:'=ngModel',
            hideselect : '@',
            facilities : '@'
		},
		 template: ['<div data-role="select">',
                        '<select id="AutoCompleteSelect" name="facility" ng-model="data" ng-selected="{{selected2}}" required class="form-control" autocomplete="off" ng-disabled="hideS" ng-options="key as fac.name for (key, fac) in facilityLst">',
                            '<option value="" disabled>Select Facility</option>',
                        '</select>',
                    '</div>'].join(''),
		link: function(scope,iElement, iAttrs, ngModelCtrl){
            scope.facilityLst = scope.facilities;
            scope.hideS = scope.display;
            scope.selected2 = scope.data !=='' ? 'string:'+ scope.data : '';

            $('#AutoCompleteSelect').select2();

            // $('#AutoCompleteSelect').on('change', function() {
            //      console.log('on change event');
            //      var val = $(this).value;
            //      console.log(val);
            //      scope.$apply(function(){
            //          //will cause the ng-model to be updated.
            //          //ngModelCtrl.$setViewValue(val);
            //      });
            // });

            scope.$watch('facilities', function(newData, oldData) {
                if(newData){
                    scope.facilityLst = JSON.parse(newData);
                    $('#add-web-app').removeAttr('tabindex');
                }
            }, true);

            scope.$watch('data', function(newData, oldData) {
                if(newData){
                    scope.data = newData;
                    scope.selected2 = scope.data !=='' ? 'string:'+ scope.data : '';
                }
            }, true);
		}
	};
	}]);
})();

