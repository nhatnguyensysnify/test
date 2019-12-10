(function(){
	'use strict';
	angular.module('app.Directive.TreeCatsList',[]).directive('treeCatsList',['$parse','$compile',function($parse,$compile){
	return{
			restrict: "E",
	        scope: {
				family: '=',
				updateCate: '&updateCat',
				removeCate: '&removeCat',
				addChildCate: '&addChildCat'
			},
	        template: [
	 				'<ul ng-repeat="cate in family.children" class="cats-tree">',
	 					'<li id="{{cate.$id}}">',
		 					'<div class="row item-cat" ng-class="{\'line\' : cate.isChild }">',
		 						'<span class="child-line" ng-show="cate.isChild" aria-hidden="false"></span>',
		 						'<div class="col-xs-12 col-sm-8 col-md-9 no-padding-left-right cat-info">',
		 							'<p class="name font-blue-steel sbold" ng-show="!cate.isEdit">',
                                        '<span><strong style="color: black;">Name:</strong> <a ng-click="showEditTool(cate)">{{cate.name}}</a></span>',
                                    '</p>',
									'<input ng-show="cate.isEdit" class="form-control margin-bottom-10" placeholder="Enter Category Name" ng-model="cate.name" type="text">',
									'<p ng-if="modalMode && !hideSlug" class="font-blue-steel sbold"><strong style="color: black;">Slug: </strong>{{cate.slug || ""}}</p>',
									'<p ng-if="!cate.isEdit && !hideTotal" class="font-blue-steel sbold"><strong style="color: black;">Total Items: </strong>{{countItems(cate)}}</p>',
                                    '<input ng-show="cate.isEdit" class="form-control margin-bottom-10" placeholder="Enter Description" ng-model="cate.description" type="text">',
		 						'</div>',
		 						'<div class="col-xs-12 col-sm-4 col-md-3 no-padding-left-right  action-tools">',
		 							'<a href="#" ng-show="!cate.isEdit" title="edit" ng-click="showEditTool(cate)" class="padding-5 badge badge-primary" >',
	                                '<i class="fa fa-edit"></i>',
		                            '</a>',
		                             '<a href="#" ng-show="cate.isEdit" title="save" ng-click="saveEdit(cate)" class="padding-5 badge badge-success">',
                                        '<i class="fa fa-save"></i>',
                                    '</a>',
		                            '<a href="#" class="padding-5 badge badge-warning" title="add"  ng-if="!hideAddChild" ng-click="addChild(cate)">',
		                                '<i class="fa fa-code-fork "></i>',
		                            '</a>',
		                            '<a ng-show="!cate.isEdit" href="#" class="padding-5 badge badge-danger" title="delete" ng-click="remove(cate)">',
		                                '<i class="fa fa-trash"></i>',
		                            '</a>',
									'<a ng-show="cate.isEdit" href="#" class="padding-5 badge badge-danger" title="cancel" ng-click="cancel(cate)">',
		                                '<i class="fa  fa-undo"></i>',
		                            '</a>',
		 						'</div>',
		 					'</div><br>',
	 					'</li>',
                        '<tree-cats-list family="cate" hide-total="{{hideTotal}}" hide-slug="{{hideSlug}}" hide-add-child="{{hideAddChild}}" modal-mode="{{modalMode}}" update-cat="updateCate()" remove-cat="removeCate()" add-child-cat="addChildCate()"></tree-cats-list>',
                    '</ul>'
                    ].join(''),
                    link: function(scope,iElement, iAttrs, ngModelCtrl,appUtils){
						scope.nameRegx = /^(a-z|A-Z|0-9)*[^!#$%^&*()'"\/\\;:@=+,?\[\]\/]*$/;
						scope.hideTotal = iAttrs.hideTotal && iAttrs.hideTotal === 'true' ? true : false;
						scope.hideSlug = iAttrs.hideSlug && iAttrs.hideSlug === 'true' ? true : false;
						scope.hideAddChild = iAttrs.hideAddChild && iAttrs.hideAddChild === 'true' ? true : false;
						scope.modalMode = iAttrs.modalMode && iAttrs.modalMode === 'true' ? true : false;


						scope.showEditTool = function(cate){
							if(!scope.modalMode){
								cate.isEdit = !cate.isEdit;
								return;								
							}
							scope.updateCate()(cate);
						};

						scope.saveEdit = function(cate){
							cate.isEdit = !cate.isEdit;
							scope.updateCate()(cate);
						};

						scope.remove = function(cate){
							scope.removeCate()(cate);
						};

						scope.cancel = function(cate){
							cate.isEdit = !cate.isEdit;
						};

						scope.addChild = function(cate){
							if(!scope.modalMode){
								addChildFn(cate);	
								return;								
							}
							
							scope.addChildCate()(cate, true);
						};
						
						function addChildFn(cate){
							$('#newChild').remove();
							var newChildTpml = '<ul class="cats-tree" id="newChild" ng-controller="categoriesCtrl">' +
							                        '<li>'+
							                            '<form role="form" id="createChildForm" name="createChildForm" novalidate>' +
							                                '<div class="row item-cat line" >' +
							                                    '<span class="child-line" aria-hidden="false"></span>' +
							                                    '<div class="col-xs-12 col-sm-8 col-md-9 no-padding-left-right cat-info">' +
							                                    	'<table class="table table-hover table-light" style="margin-bottom: 0px;">'+
											                            '<tbody>'+
											                                '<tr>'+
											                                    '<td ng-class="{\'has-error\': (editValid && createChildForm.catName.$error.required) || createChildForm.catName.$error.pattern}">'+
											                                        '<input class="form-control" placeholder="Enter Category Name" ng-model="childModel.name" type="text" name="catName" required ng-pattern="nameRegx">'+
											                                    '</td>'+
											                                '</tr>'+
											                                '<tr>' +
											                                	'<td ng-class="{\'has-error\': editValid && createChildForm.catDes.$error.required}">'+
											                                        '<input class="form-control" placeholder="Enter Description" ng-model="childModel.description" type="text" name="catDes" required>'+
											                                    '</td>'+
											                                 '</tr>'+
											                            '</tbody>'+
										                        	'</table>'+
							                                    '</div>' +
							      
							                                    '<div class="col-xs-12 col-sm-4 col-md-3 no-padding-left-right action-tools">' +
							                                        '<a href="#" class="padding-5 badge badge-success" title="create" ng-click="createChild(createChildForm)">'+
							                                            '<i class="fa fa-save"></i>'+
							                                        '</a>'+
							                                        '<a href="#" class="padding-5 badge badge-danger" title="cancel" ng-click="cancelCreateChild()">'+
							                                            '<i class="fa fa-close"></i>'+
							                                        '</a>'+
							                                    '</div>' +
							                                '</div>' +
							                            '</form>' +
							                        '</li>' +
							                    '</ul>' ;
							scope.editValid = false;
				            scope.childModel = {};
				            scope.childModel.description = '';
				            scope.childModel.name = '';
				            scope.childModel.parent = cate.$id;
							$('#' + cate.$id).parent().append($compile(newChildTpml)(scope));
							//scope.addChildCate()(cate.$id);
						}
						
						scope.countItems = function(cate){
							return cate.products ? Object.keys(cate.products).length : 0;
						};
					}
		};
	}]);
})();