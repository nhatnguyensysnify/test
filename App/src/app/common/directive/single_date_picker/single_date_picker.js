(function(){
	'use strict';
	angular.module('app.Directive.singleDatePicker',[]).directive('singleDatePicker',['$parse','$timeout',function($parse,$timeout){
	return{
		restrict: 'AE',
		replace: true,
		scope: {
			id:'@id',
			data: '=ngModel'
		},
		link: function(scope,iElement, iAttrs, ngModelCtrl){ 
			$timeout(function(){
				$(function () {
                    $('#' + iAttrs.id).datepicker({
                        format: 'mm/dd/yyyy',
        				todayHighlight: true,
						todayBtn: "linked",
						autoclose: true,
						pickerPosition: 'bottom-right'
                    },function (start, end) {
						var newValue = $('#' + iAttrs.id + " input").val();
						scope.$apply(function(){
							scope.data  = newValue;
						});
						// scope.data = start.format('MM/DD/YYYY');
						// $('#' + id).val(start.format('MM/DD/YYYY'));
					});
				});

				$('#' + iAttrs.id).click(function(){
					var popup =$(this).offset();
					var popupTop = popup.top + 35;
					$('.datepicker-dropdown').css({
					  'top' : popupTop
					 });
				});
			},2000);	 
		}
	};
	}]);
})();

