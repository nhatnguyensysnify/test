(function () {
    'use strict';

    angular.module('app.membership')
        .controller('FacilityListCtrl', FacilityListCtrl);

    /** @ngInject */
    function FacilityListCtrl($scope, $uibModalInstance, state, facilities, facilityId) {
        $scope.state = state;
        $scope.facilities = _.filter(_.clone(facilities), function(f){
            return f.isActive !== false;
        });
        $scope.facilityId = facilityId;
        $scope.dataModel = [];
        $scope.keyword = '';
        $scope.showValid = false;
        $scope.facilityInActive = false;
        $scope.paging = {
            pageSize: 12,
            currentPage: 0,
            totalPage: 0,
            totalRecord: 0
        };
        if ($.trim(facilityId) !== '') {
            $scope.facilitySelected = _.find(facilities, { $id: facilityId });
        }
        $('.add-web-app-modal').hide();

        $scope.groupToPages = function () {
            $scope.pagedItems = [];
            for (var i = 0; i < $scope.filteredItems.length; i++) {
                if (i % $scope.paging.pageSize === 0) {
                    $scope.pagedItems[Math.floor(i / $scope.paging.pageSize)] = [$scope.filteredItems[i]];
                } else {
                    $scope.pagedItems[Math.floor(i / $scope.paging.pageSize)].push($scope.filteredItems[i]);
                }
            }

            if ($scope.filteredItems.length % $scope.paging.pageSize === 0) {
                $scope.paging.totalPage = $scope.filteredItems.length / $scope.paging.pageSize;
            } else {
                $scope.paging.totalPage = Math.floor($scope.filteredItems.length / $scope.paging.pageSize) + 1;
            }
        };

        $scope.changePage = function () {
            $scope.groupToPages();
        };

        $scope.search = function (keyword) {
            if (keyword === '') {
                $scope.dataModel = moveOnTop($scope.facilities, function (o) { return o.state_code === $scope.state; });
                // if($scope.facilityId !==''){
                //     $scope.dataModel = moveOnTop($scope.facilities, function(o) { return o.$id === $scope.facilityId;});
                // }
            } else {
                $scope.dataModel = _.filter($scope.facilities, function (val) {
                    return val.name.toLowerCase().includes(keyword.toLowerCase()) || val.address.toLowerCase().includes(keyword.toLowerCase()) || val.facility_promo_code.toLowerCase().includes(keyword.toLowerCase());
                });
            }
            if($scope.facilitySelected && $scope.facilitySelected.isActive === false){
                $scope.dataModel.unshift($scope.facilitySelected);
            }
            $scope.filteredItems = $scope.dataModel;
            $scope.paging.totalRecord = $scope.dataModel.length;
            $scope.paging.currentPage = 0;
            //group by pages
            $scope.groupToPages();
        };

        $scope.search($scope.keyword);

        //Functions
        $scope.close = function () {
            $uibModalInstance.dismiss('cancel');
        };

        $scope.checkFacility = function (item) {
            $scope.showValid = false;
            $scope.facilityInActive = false;
            $scope.facilityId = item.$id;
            $('input[name=select-facility]').each(function () {
                $(this).prop('checked', false);
            });
            $('input[value=' + item.$id + ']').prop('checked', true);
            $scope.facilitySelected = item;
        };

        $scope.selectFacility = function () {
            if ($scope.facilitySelected === undefined) {
                $scope.showValid = true;
                return;
            }else if($scope.facilitySelected.isActive === false){
                $scope.facilityInActive = true;
                return;
            }
            $scope.$parent.selectFacility($scope.facilitySelected);
            if($scope.$parent.selectAddress){
                $scope.$parent.selectAddress($scope.facilitySelected);
            }
            $uibModalInstance.close(true);
        };

        function moveOnTop(a, fn) {
            var non_matches = [];
            var matches = a.filter(function (e, i, a) {
                var match = fn(e, i, a);
                if (!match) non_matches.push(e);
                return match;
            });
            return matches.concat(non_matches);
        }

    }

})();
