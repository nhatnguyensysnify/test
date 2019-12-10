(function () {
    'use strict';

    angular.module('app.membership')
        .controller('MembersCtrl', MembersCtrl);

    /** @ngInject */
    function MembersCtrl($rootScope, $scope, $stateParams, $state, $timeout, $ngBootbox, $q, DataUtils, toaster, authService, memberShipService, appUtils, memAppService, employeeService, memRegionService, memStateService, memberShipFacilitiesService) {
        $rootScope.settings.layout.showSmartphone = false;
        $rootScope.settings.layout.pageSidebarClosed = true;

        var currentUser = authService.getCurrentUser(); //$rootScope.storage.currentUser;
        $scope.userPermission = $rootScope.storage.statePermission;
        $scope.userPermission.viewAllApplication = $rootScope.can('access', 'ViewAllApplications');
        $scope.userPermission.isAdmin = appUtils.checkSpecifyRole(currentUser, 'admin');
        $scope.userPermission.isRep = appUtils.checkSpecifyRole(currentUser, 'rep');
        
        var membershipVm = this;
        //Default Start Date & End Date
        var startDate = moment().subtract('days', 6).startOf('day');
        var endDate = moment().endOf('day');

        var timestampStart = Date.parse(new Date(startDate));
        var timestampEnd = Date.parse(new Date(endDate));
        membershipVm.cri = {
            timestampStart: timestampStart,
            timestampEnd: timestampEnd,
            keyword: $stateParams.keyword || '',
            sort: $stateParams.sortBy || 'desc',
            state: $stateParams.state || 'All',
            status: $stateParams.status || 'All',
            isDashboard: true,
            members: true,
            from: 0,
            size: 25
        };
        membershipVm.clients = null;
        membershipVm.memberModel = [];
        membershipVm.regionGroups = {};
        membershipVm.allRegions = [];
        membershipVm.allFacilities = [];
        membershipVm.sortByData = [
            {
                value: 'Newest',
                key: 'desc'
            },
            {
                value: 'Oldest',
                key: 'asc'
            }
        ];

        // membershipVm.reportDates = [
        //     {
        //         value: 'Created Date',
        //         key: 'timestampCreated'
        //     },
        //     {
        //         value: 'Signature Date',
        //         key: 'timestampSignatured'
        //     }
        // ];

        membershipVm.memberStatus = [
            {
                value: 'All',
                key: 'All'
            },
            {
                value: 'Completed',
                key: '4'
            },
            {
                value: 'Billing Required',
                key: '8'
            }
        ];

        membershipVm.appStatus = appUtils.appStatus;
        membershipVm.appMethods = appUtils.appMethods;

        membershipVm.paging = {
            pageSize: 25,
            currentPage: 0,
            totalPage: 0,
            totalRecord: 0
        };

        membershipVm.paging.currentPage = $stateParams.page ? parseInt($stateParams.page) : 0;

        membershipVm.select2Options = {
            AllowClear: true,
            //minimumInputLength: 3,
            ajax: {
                dataType: 'json',
                delay: 250,
                transport: function (params, success, failure) {
                    var $request = employeeService.search(params.data);
                    $request.then(success, failure);
                    return $request;
                },
                data: function (params) {
                    var alias = currentUser.alias;
                    if ($scope.userPermission.isAdmin || $scope.userPermission.viewAllApplication) {
                        alias = null;
                    }
                    var cri = {
                        keyword: params.term,
                        size: 25,
                        from: 0,
                        alias: alias,
                        isAuthorized: true
                    };
                    return cri;
                },
                processResults: function (data) {
                    //
                    var result = _.map(data.items, function (item) {
                        return _composeSelectBoxText(item);
                    });
                    //
                    return {
                        results: result
                    };
                }
            }
        };


        // Make sure DOM is loaded before get elems
        angular.element(document).ready(function () {
            $timeout(function () {
                $('#memberrange').on('apply.daterangepicker', function (ev, picker) {
                    membershipVm.cri.timestampStart = timestampStart = Date.parse(new Date(picker.startDate._d));
                    membershipVm.cri.timestampEnd = timestampEnd = Date.parse(new Date(picker.endDate._d));
                    searchMember(true);
                });
            }, 500);
        });

        membershipVm.changePage = changePage;
        membershipVm.searchMember = searchMember;
        membershipVm.getState = getState;
        membershipVm.getRegion = getRegion;
        membershipVm.filterItems = filterItems;
        membershipVm.resetFilter = resetFilter;
        membershipVm.editMember = editMember;
        membershipVm.getMethod = getMethod;
        membershipVm.recycle = recycle;

        initPage();
        //============================================================================================    
        function initPage() {
            return $q.all([loadStates(), loadRegions(), loadFilterClientsData(), loadFacilities()]).then(function () { 
                $timeout(function () {
                    searchMember(true);
                },800);
            });
        }

        function loadFilterClientsData() {
            membershipVm.cri.alias = $stateParams.alias || (!$scope.userPermission.isAdmin && !$scope.userPermission.viewAllApplication ? currentUser.alias : null);
            membershipVm.cri.clients = $stateParams.author || (!$scope.userPermission.isRep ? 'All' : (currentUser.repCode || currentUser.username));
            if ($stateParams.plantype) {
                membershipVm.chooseRegions = $stateParams.plantype.split(',') || [];
            } else {
                $timeout(function () {
                    membershipVm.chooseRegions = [];
                    $('#chooseRegions').trigger('change');
                }, 200);
            }
            var filterUser = null, reqs = [];
            if (membershipVm.cri.clients !== 'All' && membershipVm.cri.clients !== currentUser.repCode) {
                var arr = angular.copy(membershipVm.cri.clients).split(','),
                    repCode = arr && arr[0] || null;
                if (repCode) {
                    var req = employeeService.getUserByRepCode(repCode).then(function (user) {
                        filterUser = user || null;
                    });
                    reqs.push(req);
                }
            } else {
                filterUser = currentUser;
            }
            Promise.all(reqs).then(function () {
                $timeout(function () {
                    var option;
                    if (membershipVm.cri.clients === 'All') {
                        option = new Option('All Reps', 'All', true, true);
                        $('#filterClients').append(option).trigger('change');
                    } else {
                        if (filterUser) {
                            var selectOpt = _composeSelectBoxText(filterUser);
                            option = new Option(selectOpt.text, selectOpt.id, true, true);
                            $('#filterClients').append(option).trigger('change');
                        }
                    }
                }, 100);
            });
        }

        function loadStates() {
            return memStateService.getAll().then(function (data) {
                membershipVm.allStates = data;
            });
        }

        function loadRegions() {
            return memRegionService.getAll().then(function(regionGroups){
                _.each(regionGroups, function(regionGroup, stateCode){
                    var regions = DataUtils.toAFArray(regionGroup);
                    membershipVm.allRegions = membershipVm.allRegions.concat(regions);
                    regionGroups[stateCode] = regions;
                });
                membershipVm.regionGroups = regionGroups;
                $timeout(angular.noop, 200);
            });
        }
        function loadFacilities() {
            return memberShipFacilitiesService.itemsLoadOnce().then(function (data) {
                membershipVm.allFacilities = data;
                $timeout(angular.noop, 200);
            });
        }


        function changePage() {
            membershipVm.cri.from = membershipVm.paging.currentPage * membershipVm.cri.size;
            searchMember();
        }

        function searchMember(init) {
            appUtils.showLoading();
            if (init) {
                membershipVm.cri.from = 0;
                membershipVm.paging.currentPage = 0;
            }
            membershipVm.cri.clients = $('#filterClients').val();
            membershipVm.cri.clients = decodeURI(membershipVm.cri.clients);
            membershipVm.cri.plantypes = membershipVm.chooseRegions && membershipVm.chooseRegions.length > 0 ? membershipVm.chooseRegions.join(',') : '';
            memAppService.search(membershipVm.cri).then(function (result) {
                _.each(result.items, function(item){
                    var facility = _.find(membershipVm.allFacilities, {$id: item.facilityId});
                    item.facilityText = facility ? (facility.name + (item.facilityCode?' (<strong>' + item.facilityCode + '</strong>)': '')) : '';
                });
                appUtils.hideLoading();
                membershipVm.memberModel = result.items;
                membershipVm.paging.totalRecord = result.totalRecords;
                membershipVm.paging.totalPage = result.pages;
                $timeout(angular.noop, 400);
                $timeout(function () {
                    $state.go('membership.members', { 'keyword': membershipVm.cri.keyword, 'start': membershipVm.cri.timestampStart, 'end': membershipVm.cri.timestampEnd, 'page': membershipVm.paging.currentPage, 'author': decodeURI(membershipVm.cri.clients), 'alias': membershipVm.cri.alias, 'status': membershipVm.cri.status, 'state': membershipVm.cri.state, 'plantype' : membershipVm.cri.plantypes, 'sortBy': membershipVm.cri.sort }, { notify: false });
                }, 100);
            });
        }

        function filterItems() {
            searchMember(true);
        }

        function resetFilter() {
            var clients = (!$scope.userPermission.isRep ? 'All' : (currentUser.repCode || currentUser.username));
            $timeout(function () {
                $state.go('membership.members', { 'keyword': '', 'start': membershipVm.cri.timestampStart, 'end': membershipVm.cri.timestampEnd, 'page': 0, 'author': clients, 'alias': membershipVm.cri.alias, 'status': 'All', 'state': 'All', 'plantype' : null, 'sortBy': 'desc'}, { reload: true });
            }, 100);
        }

        function getMethod(key) {
            var method = _.find(membershipVm.appMethods, { key: parseInt(key) });
            return method !== undefined && method.value ? method.value : '';
        }

        function getState(value) {
            var state = _.find(membershipVm.allStates, function (item) {
                return item.iso === value;
            });

            return state && state.name || '';
        }

        function getRegion(item) {
            var region = _.find(membershipVm.regionGroups[item.state], {id: item.region + ''});
            return region && region.guid || '';
        }

        function recycle(item) {
            $ngBootbox.confirm('Are you sure want to delete this member?').then(function () {
                appUtils.showLoading();
                var req = memberShipService.remove(item.membershipId);
                req.then(function (res) {
                    appUtils.hideLoading();

                    if (!res.result) {
                        $ngBootbox.alert(res.errorMsg);
                        return;
                    }

                    toaster.pop('success', 'Success', "Delete Member Successfully!");

                    //remove apps of member
                    memAppService.remove(item.$id);
                    // var reqs = [];
                    // _.forEach(item.apps,function(appId){
                    //     reqs.push(memAppService.remove(appId));
                    // });

                    // $q.all(reqs);
                    membershipVm.cri.keyword = '';
                    searchMember(true);
                });
            });
        }

        function editMember(id) {
            $state.go('membership.memberdetails', { id: id });
        }

        function _composeSelectBoxText(data) {
            var text = [],
                fName = _.trim(data.firstName),
                lName = _.trim(data.lastName),
                repCode = _.trim(data.repCode);

            if (fName) {
                text.push(fName);
            }
            if (lName) {
                text.push(lName);
            }
            if (repCode) {
                text.push('(' + repCode + ')');
            }
            
            return {
                id: data.repCode,
                text: text.join(' ')
            };
        }
    }
})();
