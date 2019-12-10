(function() {
    'use strict';
    angular.module('app.Directive.Paging', []).directive('listPaging', ['$parse', function($parse) {
        return {
            restrict: 'AE',
            replace: true,
            require: 'ngModel',
            scope: {
                data: '=ngModel',
                changePages: '&changePage'
            },
            template: ['<div class="">',
                '<div class="col-md-12 col-xs-12 items-info dataTables_paginate paging_bootstrap_extended" id="Paging">',
                '<div class="padding-l-r-10 padding-top-5" id="datatable_products_info" role="status" aria-live="polite">',
                '<label>',
                //'<span class="seperator">|</span>Found total ',
                '<span> Total {{data.totalRecord}}</span> items',
                '</label>',
                '</div>',
                '<div class="pagination-panel">',
                '<a href="#" ng-click="prevPage();" class="btn btn-sm default prev" ng-class="{disabled: curPage == 1}"><i class="fa fa-angle-left"></i></a>',
                '<input type="text" class="pagination-panel-input form-control input-sm input-inline input-mini" maxlenght="5" style="text-align:center; margin: 0 5px;" ng-model="curPage" ng-change="inputChangePage(curPage)">',
                '<a href="#" ng-click="nextPage();" class="btn btn-sm default next" ng-class="{disabled: curPage == data.totalPage}"><i class="fa fa-angle-right"></i></a>',
                '<span class="pagination-panel-total padding-top-5 padding-left-5"> of  {{data.totalPage}} page(s)</span>',
                '</div>',
                //'<div class="dataTables_length" id="datatable_items_length">',
                //	'<label>',
                //		'<span class="seperator">|</span>View ', 
                //		'<select name="datatable_items_length" id="SizeItems" aria-controls="datatable_items" class="form-control input-xs input-sm input-inline" ng-model="data.pageSize"  ng-options="size for size in pageSizeItems track by size">',
                //		'</select> records',	
                //	'</label>',
                //'</div>',							
                '</div>',
                '</div>'
            ].join(''),
            link: function(scope, iElement, iAttrs, ngModelCtrl) {

                var itemsLength = [2, 10, 20, 50, 100, 150];
                scope.curPage = scope.data.currentPage + 1;
                scope.prevPage = function() {
                    if (scope.curPage > 1) {
                        scope.curPage--;
                        scope.data.currentPage--;
                        scope.changePages()();
                    }
                };
                scope.nextPage = function() {
                    if (scope.curPage < scope.data.totalPage) {
                        scope.curPage++;
                        scope.data.currentPage++;
                        scope.changePages()();
                    }
                };

                scope.pageSizeItems = itemsLength;

                scope.$watch('data.currentPage', function() {
                    scope.curPage = scope.data.currentPage + 1;
                });

                scope.inputChangePage = function(pageIdx) {
                    pageIdx = parseInt(pageIdx);
                    if (_.isNaN(pageIdx) || pageIdx > scope.data.totalPage || pageIdx < 1) {
                        scope.curPage = pageIdx = 1;
                    }
                    scope.data.currentPage = pageIdx - 1;
                    scope.changePages()();
                };

                // scope.$watch('curPage', function(newValue, oldValue){
                // 	var pageIdx = parseInt(newValue);
                // 	if(_.isNaN(pageIdx)){
                // 		pageIdx = oldValue;
                // 	}
                // 	if (pageIdx < scope.data.totalPage && pageIdx > 1) {
                // 		scope.data.currentPage = pageIdx - 1;
                // 		scope.changePages()();
                //     }
                // });
                // scope.$watch('data.pageSize', function(){
                // 	scope.curPage = 1;
                // });

                // if(iAttrs.onChange){
                // 	var fn = $parse(iAttrs.onChange);
                // 	scope.$watch('data.currentPage', function(){
                // 		scope.curPage = scope.data.currentPage + 1;
                // 		fn(scope.$parent);
                // 	});
                // 	scope.$watch('curPage', function(){
                // 		scope.data.currentPage = scope.curPage - 1;
                // 		fn(scope.$parent);
                // 	});
                // 	scope.$watch('data.pageSize', function(){
                // 		scope.curPage = 1;
                // 		fn(scope.$parent);
                // 	});
                // }
            }
        };
    }]);
})();