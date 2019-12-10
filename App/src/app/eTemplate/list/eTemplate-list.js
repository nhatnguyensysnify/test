(function() {
    'use strict';

    angular.module('app.eTemplate')
        .controller('eTemplateListCtrl', eTemplateListCtrl);

    /** @ngInject */
    function eTemplateListCtrl($rootScope, $scope, $state, $timeout, $stateParams, toaster, $ngBootbox, appUtils, $filter, eTemplateService, authService) {
        var currentUser = authService.getCurrentUser();
        $rootScope.settings.layout.showBreadcrumb = false;
        $scope.userPermission = $rootScope.storage.statePermission;
        $scope.userPermission.isAdmin = appUtils.checkSpecifyRole(currentUser, 'admin');

        var tplVm = this; // jshint ignore:line

        tplVm.cri = {
            keyword: ''
        };

        tplVm.filteredItems = [];
        tplVm.pagedItems = [];
        tplVm.paging = {
            pageSize: 25,
            currentPage: 0,
            totalPage: 0,
            totalRecord: 0
        };

        tplVm.changePage = changePage;
        tplVm.search = search;
        tplVm.goEdit = goEdit;
        tplVm.remove = remove;

        initPage();
        //===============================================================
        //Functions
        function initPage() {
            search(tplVm.cri);
        }

        function groupToPages() {
            tplVm.pagedItems = [];
            for (var i = 0; i < tplVm.filteredItems.length; i++) {
                if (i % tplVm.paging.pageSize === 0) {
                    tplVm.pagedItems[Math.floor(i / tplVm.paging.pageSize)] = [tplVm.filteredItems[i]];
                } else {
                    tplVm.pagedItems[Math.floor(i / tplVm.paging.pageSize)].push(tplVm.filteredItems[i]);
                }
            }
            tplVm.paging.totalPage = Math.ceil(tplVm.filteredItems.length / tplVm.paging.pageSize);
        }


        function changePage() {
            groupToPages();
        }

        function search(keyword) {
            appUtils.showLoading();
            eTemplateService.search(tplVm.cri).then(function(result) {
                appUtils.hideLoading();
                tplVm.filteredItems = appUtils.sortArray(result, 'timestampCreated');
                tplVm.paging.totalRecord = result.length;
                tplVm.paging.currentPage = 0;
                //group by pages
                groupToPages();
            });
        }

        function goEdit(item) {
            $state.go('eTemplate.details', { id: item.$id, channel: item.channel });
        }

        function remove(item) {
            $ngBootbox.confirm('Are you sure want to remove this template?').then(function() {
                appUtils.showLoading();
                var req = eTemplateService.remove(item);
                req.then(function(result) {
                    appUtils.hideLoading();
                    initPage();
                });
            });
        }

    }

})();