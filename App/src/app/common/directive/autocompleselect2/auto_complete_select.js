(function(){
	'use strict';
	angular.module('app.Directive.SelectAutoComplete',[]).directive('selectAutoComplete',['$parse',function($parse){
	return{
		restrict: 'A',
            scope: {
                  selectAutoComplete : '@'
		},
		link: function(scope,iElement, iAttrs, ngModelCtrl){
                  $('#add-web-app').removeAttr('tabindex');
                  function formatState (state) {
                        if (!state.id) { return state.text; }
                        var facility = scope.facilities[state.id];
                        if (!facility || facility === undefined) { return state.text; }
                        var tmpl = '<ul style="list-style: none;padding-left: 20px; ">'+
                                    '<li style="font-weight: bold;">'+facility.name+'</li>'+
                                    '<ul style="list-style: none;padding-left: 20px;"> '+
                                          '<li>'+facility.facility_promo_code+'</li>'+
                                          '<li>'+facility.address+'</li>'+
                                    '</ul>'+
                              '</ul>';
                        var $state = $(tmpl);
                        return $state;
                  }

                  scope.$watch('selectAutoComplete', function(newData, oldData) {
                        if(iAttrs.selectAutoComplete && iAttrs.selectAutoComplete.length > 0){
                              scope.facilities = JSON.parse(iAttrs.selectAutoComplete);
                              iElement.select2({
                                    templateResult: formatState
                              });
                        }
                  }, true);
		}
	};
	}]);
})();

