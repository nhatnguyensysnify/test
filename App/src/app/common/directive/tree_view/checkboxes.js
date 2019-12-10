(function(){
	'use strict';
	angular.module('app.Directive.TreeCheckBoxes',[]).directive('treeCheckBoxes',['$parse',function($parse){
	return{
			restrict: "E",
	        scope: {family: '='},
	        template: [
	 				'<tr ng-repeat="cate in family.children">',
                        '<td class="width10">',
                            '<label class="mt-checkbox mt-checkbox-outline">',
                                '<input type="checkbox" ng-model="cate.checked" name="chk-category" ng-checked="cate.checked" id="{{cate.$id}}" value="{{cate.$id}}" ng-click="checked();" />',
                                '<span></span>',
                            '</label>',
                        '</td>',
                        '<td><label for="{{cate.$id}}">{{cate.name}}</label>',
                        	'<table>',
                        		'<tbody>',
	                    			'<tree-check-boxes family="cate" style="display: block;"></tree-check-boxes>',
	                    		'</tbody>',
	                    	'</table>',
                        '</td>',
                    '</tr>'
                    ].join(''),
			link: function(scope,iElement, iAttrs, ngModelCtrl)
			{
				scope.checked = function()
				{
					//console.log(this);
					if(this.cate !== undefined && this.cate.checked === true)
					{
						var parent = this.$parent;
						while(parent.family !==undefined  )
						{
							parent.family.checked = true;
							parent = parent.$parent;
						}
					}
					else if (this.cate !== undefined && this.cate.checked === false)
					{
						scope.uncheck(this.cate);
					}
				};
				scope.uncheck = function(family)
				{
					if(family!== undefined)
					{
						family.checked = false;
						var arrChildren = family.children;
						arrChildren.forEach(function(children) {
							scope.uncheck(children);
						}, this);
					}		
				};
			}
		};
	}]);
})();

