(function () {
    'use strict';

    angular.module('app.media')
        .controller('LibraryCtrl', LibraryCtrl)
        .controller("ViewFileCtrl", ViewFileCtrl);

    /** @ngInject */
    function LibraryCtrl($rootScope, $scope, $state, $ngBootbox, $window, $uibModal, mediaService, appUtils, toaster) {
        $rootScope.settings.layout.showSmartphone = false;
        var mediaVm = this;

        mediaVm.keyword = '';
        mediaVm.filter = 'All';
        mediaVm.filterDate = 'All';
        mediaVm.groupedItems = [];
        mediaVm.filteredItems = [];
        mediaVm.pagedItems = [];
        mediaVm.paging = {
            pageSize: 25,
            currentPage: 0,
            totalPage: 0,
            totalRecord: 0
        };

        //Load Data
        mediaVm.filterDates = appUtils.postFilterDates;
        mediaVm.media = mediaService.media();


        //Functions
        mediaVm.groupToPages = function () {
            mediaVm.pagedItems = [];
            for (var i = 0; i < mediaVm.filteredItems.length; i++) {
                if (i % mediaVm.paging.pageSize === 0) {
                    mediaVm.pagedItems[Math.floor(i / mediaVm.paging.pageSize)] = [mediaVm.filteredItems[i]];
                } else {
                    mediaVm.pagedItems[Math.floor(i / mediaVm.paging.pageSize)].push(mediaVm.filteredItems[i]);
                }
            }
            if (mediaVm.filteredItems.length % mediaVm.paging.pageSize === 0) {
                mediaVm.paging.totalPage = mediaVm.filteredItems.length / mediaVm.paging.pageSize;
            } else {
                mediaVm.paging.totalPage = Math.floor(mediaVm.filteredItems.length / mediaVm.paging.pageSize) + 1;
            }

        };

        mediaVm.editUser = function (email) {
            // userService.getUserByEmail(email).then(function(user){
            //     if(user){
            //         $state.go('editUser',{id:user.$id});
            //     }else{
            //         toaster.error('User could not be found!');
            //     }
            // });
        };

        // mediaVm.changePage = function () {
        //     mediaVm.groupToPages();
        // }

        $scope.changePage = function () {
            mediaVm.groupToPages();
        };

        mediaVm.search = function (keyword) {
            mediaService.searchFile(keyword).then(function (result) {
                mediaVm.filteredItems = appUtils.sortArray(result, 'timestampCreated');
                mediaVm.paging.totalRecord = result.length;
                mediaVm.paging.currentPage = 0;
                //group by pages
                mediaVm.groupToPages();
            });
        };

        mediaVm.search('');

        mediaVm.editFile = function (fileKey) {
            $state.go('editMedia', { id: fileKey });
        };

        mediaVm.filterItems = function () {
            var self = this;
            var lst = mediaService.filterItems(mediaVm.media, mediaVm.filterDate, mediaVm.filter);
            mediaVm.filteredItems = appUtils.sortArray(lst, 'timestampCreated');
            mediaVm.paging.totalRecord = lst.length;
            mediaVm.paging.currentPage = 0;
            //Group by pages
            mediaVm.groupToPages();

        };

        mediaVm.selectAll = function (controlId, name) {
            appUtils.checkAllCheckBox(controlId, name);
        };

        mediaVm.apply = function (chkName, actionControl) {
            var lstfiles = [];
            $('input[name=' + chkName + ']').each(function () {
                if (this.checked === true) {
                    var item = {
                        id: $(this).val() + '',
                        fullPath: $(this).attr('full-path')
                    };
                    lstfiles.push(item);
                }
            });

            var action = $('#' + actionControl).val();
            var actionTxt = $('#' + actionControl + ' option:selected').text();

            if (action === 0) {
                toaster.warning("Please choose action to execute!");
                return;
            }

            if (lstfiles.length === 0) {
                toaster.warning("Please choose some items to execute action!");
                return;
            }


            $ngBootbox.confirm('Are you sure want to apply ' + actionTxt + ' action as selected?').then(function () {

                if (action === 'delete') {
                    _.forEach(lstfiles, function (obj, key) {
                        mediaService.deleteFile(obj.id).then(function (res) {
                            if (res.result) {
                                mediaService.deleteFileInStorage(obj.fullPath);
                                toaster.pop('success', 'Success', "Delete Successful!");
                                mediaVm.search('');
                            } else {
                                toaster.pop('error', 'Error', "Delete  Error! " + res.errorMsg);
                            }
                        });
                    });
                }
            });
        };

        mediaVm.delete = function (item) {
            var self = this;
            $ngBootbox.confirm('Are you sure want to delete ' + item.displayName + '?')
                .then(function () {
                    mediaService.deleteFile(item.$id).then(function (res) {
                        if (res.result) {
                            mediaService.deleteFileInStorage(item.fullPath);
                            toaster.pop('success', 'Success', "Delete Successful!");
                            mediaVm.search('');
                        } else {
                            toaster.pop('error', 'Error', "Delete  Error! " + res.errorMsg);
                        }
                    });
                }, function () {
                });
        };

        mediaVm.view = function (item) {
            var type = item.type.split('/')[0];
            if (type !== "image" && type !== "video") {
                $window.open(item.downloadUrl, '_blank');
                return;
            }
            var modalInstance = $uibModal.open({
                templateUrl: 'app/media/library/view_file.tpl.html',
                controller: 'ViewFileCtrl',
                size: 'md',
                windowClass: 'model-z-index',
                resolve: {
                    item: function () {
                        return item;
                    }
                }
            });
        };
    }
    /** @ngInject */
    function ViewFileCtrl($scope, $sce, $uibModalInstance, item) {
        $scope.item = item;
        $scope.type = $scope.item.type.split('/')[0];
        if ($scope.type == "video") {
            $scope.videoLink = $sce.trustAsResourceUrl($scope.item.downloadUrl);
        }

        $scope.close = function () {
            $uibModalInstance.dismiss('cancel');
        };
    }

})();
