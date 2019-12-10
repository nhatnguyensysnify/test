(function() {
    'use strict';

    angular.module('app.event')
        .controller('EventListModalCtrl', EventListModalCtrl);

    /** @ngInject */
    function EventListModalCtrl($uibModalInstance, $scope, $timeout, $q, appUtils, authService, eventService, employeeService, memberShipFacilitiesService, criteria) {
        var currentUser = authService.getCurrentUser();
        var eventModalVm = this,
            dashboardCrl = $scope.eventVm; //

        eventModalVm.cri = angular.copy(criteria);
        eventModalVm.cri.status = '1';
        eventModalVm.cri.size = 20;
        eventModalVm.chooseStates = angular.copy(dashboardCrl.chooseStates);
        eventModalVm.chooseRegions = angular.copy(dashboardCrl.chooseRegions);
        eventModalVm.eventStatus = appUtils.eventStatus;
        eventModalVm.eventTypes = angular.copy(dashboardCrl.eventTypes);
        eventModalVm.allStates = angular.copy(dashboardCrl.allStates);
        eventModalVm.allTerritories = angular.copy(dashboardCrl.allTerritories);
        eventModalVm.allRegions = angular.copy(dashboardCrl.allRegions);
        eventModalVm.close = close;
        eventModalVm.searchKeyword = searchKeyword;
        eventModalVm.search = search;
        eventModalVm.changePage = changePage;
        eventModalVm.resetFiler = resetFiler;
        eventModalVm.getType = dashboardCrl.getType;
        eventModalVm.getState = dashboardCrl.getState;
        eventModalVm.getFacility = dashboardCrl.getFacility;
        eventModalVm.getRequesters = dashboardCrl.getRequesters;
        eventModalVm.getTerritory = dashboardCrl.getTerritory;
        eventModalVm.getDateTime = getDateTime;
        eventModalVm.requester = null;
        eventModalVm.toggleSort = toggleSort;
        eventModalVm.cri.sort = 'startDate:desc';
        eventModalVm.sort = {
            field: 'startDate',
            desc: true
        };
        eventModalVm.dataEnteredOpts = [
            { val: null, text: 'All' },
            { val: false, text: 'New' },
            { val: true, text: 'Data Entered' }
        ];

        eventModalVm.paging = {
            pageSize: 20,
            currentPage: 0,
            totalPage: 0,
            totalRecord: 0
        };

        eventModalVm.events = [];
        eventModalVm.select2Options = {
            AllowClear: true,
            //minimumInputLength: 3,
            ajax: {
                dataType: 'json',
                delay: 250,
                transport: function(params, success, failure) {
                    var $request = employeeService.search(params.data);
                    $request.then(success, failure);
                    return $request;
                },
                data: function(params) {
                    var alias = null;
                    if (!$scope.userPermission.isAdmin) {
                        alias = currentUser.alias;
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
                processResults: function(data) {
                    var result = _.map(data.items, function(item) {
                        return _composeSelectBoxText(item);
                    });
                    return {
                        results: result
                    };
                }
            }
        };

        eventModalVm.select2OptionsF = {
            AllowClear: true,
            //minimumInputLength: 3,
            ajax: {
                dataType: 'json',
                delay: 250,
                transport: function(params, success, failure) {
                    var $request = memberShipFacilitiesService.search(params.data);
                    $request.then(success, failure);
                    return $request;
                },
                data: function(params) {
                    return params.term || '';
                },
                processResults: function(data) {
                    var result = _.map(data, function(item) {
                        return _composeFacilitySelectBoxText(item);
                    });
                    return {
                        results: result
                    };
                }
            }
        };

        // Make sure DOM is loaded before get elems
        angular.element(document).ready(function() {
            $timeout(function() {
                $('#EventModalRange').on('apply.daterangepicker', function(ev, picker) {
                    var startControl = angular.copy(picker.startDate._d),
                        endControl = angular.copy(picker.endDate._d);

                    var startStr = moment(startControl).format('MM/DD/YYYY'),
                        endStr = moment(endControl).format('MM/DD/YYYY');

                    eventModalVm.cri.timestampStart = moment.utc(startStr).startOf("day").valueOf();
                    eventModalVm.cri.timestampEnd = moment.utc(endStr).endOf("day").valueOf();
                    eventModalVm.cri.requester = $('#chooseManager').val();
                    //
                    search();
                });
                loadData();
            }, 800);
        });

        //===================
        function loadData() {
            var filterUser = null;
            eventModalVm.chooseTerritories = [];
            eventModalVm.chooseFacilities = [];
            eventModalVm.cri.alias = !$scope.userPermission.isAdmin ? currentUser.alias : null;
            eventModalVm.cri.requester = !$scope.userPermission.isRep ? 'All' : currentUser.$id;
            var all = [];
            if (eventModalVm.cri.requester !== 'All' && eventModalVm.cri.requester !== currentUser.$id) {
                var arr = angular.copy(eventModalVm.cri.requester).split(','),
                    managerId = arr && arr[0] || null;
                if (managerId) {
                    var req = employeeService.getUser(managerId).then(function(user) {
                        filterUser = user || null;
                    });
                    all.push(req);
                }
            } else {
                filterUser = currentUser;
            }

            return $q.all(all).then(function() {
                $timeout(function() {
                    var option, selectOpt;
                    if (eventModalVm.cri.requester === 'All') {
                        option = new Option('All Managers/Area Managers/Representative', 'All', true, true);
                        $('#chooseManager').append(option).trigger('change');
                    } else {
                        if (filterUser) {
                            selectOpt = _composeSelectBoxText(filterUser);
                            option = new Option(selectOpt.text, selectOpt.id, true, true);
                            $('#chooseManager').append(option).trigger('change');
                        }
                    }
                }, 400);
                search();
            });
            //});
        }

        function changePage() {
            eventModalVm.cri.from = eventModalVm.paging.currentPage * eventModalVm.cri.size;
            _search();
        }

        function search(isFilter) {
            appUtils.showLoading();
            eventModalVm.cri.from = 0;
            if (isFilter) {
                eventModalVm.cri.requester = $('#chooseManager').val();
            }
            _search();
        }

        function searchKeyword() {
            var length = eventModalVm.cri.keyword.length;
            if (length === 0 || length >= 3) {
                search();
            }
        }

        function resetFiler() {
            eventModalVm.cri = angular.copy(criteria);
            eventModalVm.cri.status = '1';
            eventModalVm.cri.size = 20;
            eventModalVm.cri.type = 'All';
            $timeout(function() {
                $('#chooseStates').val([]).trigger('change');
                $('#chooseRegions').val([]).trigger('change');
                $('#chooseTerritories').val([]).trigger('change');
                $('#chooseFacility').val([]).trigger('change');
            }, 200);
            eventModalVm.chooseStates = [];
            eventModalVm.chooseRegions = [];
            eventModalVm.chooseTerritories = [];
            eventModalVm.chooseFacilities = [];
            $scope.$broadcast('resetDateRange');
            loadData();
        }

        function _search() {
            eventModalVm.cri.state = eventModalVm.chooseStates && eventModalVm.chooseStates.length > 0 ? eventModalVm.chooseStates.join(',') : '';
            eventModalVm.cri.territory = eventModalVm.chooseTerritories && eventModalVm.chooseTerritories.length > 0 ? eventModalVm.chooseTerritories.join(',') : '';
            eventModalVm.cri.facilities = eventModalVm.chooseFacilities && eventModalVm.chooseFacilities.length > 0 ? eventModalVm.chooseFacilities.join(',') : '';
            eventModalVm.cri.plantypes = eventModalVm.chooseRegions && eventModalVm.chooseRegions.length > 0 ? eventModalVm.chooseRegions.join(',') : '';
            eventService.search(eventModalVm.cri).then(function(result) {
                appUtils.hideLoading();
                console.log(result);
                eventModalVm.events = result.items;
                angular.extend(eventModalVm.paging, {
                    totalRecord: result.totalRecords,
                    totalPage: result.pages
                });
                $timeout(angular.noop);
            });
        }

        function getDateTime(value) {
            var time = parseInt(value);
            if (isNaN(time)) {
                return '';
            }
            return moment(time).utc().format('MM/DD/YYYY');
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
                id: data.$id,
                text: text.join(' ')
            };
        }

        function toggleSort(field) {
            if (field == eventModalVm.sort.field) {
                eventModalVm.sort.desc = !eventModalVm.sort.desc;
            } else {
                Object.assign(eventModalVm.sort, {
                    field: field,
                    desc: true
                });
            }
            eventModalVm.cri.sort = field + ":" + (eventModalVm.sort.desc && 'desc' || 'asc');
            search();
        }

        function close() {
            $uibModalInstance.close();
        }

        function _composeFacilitySelectBoxText(data) {
            return {
                id: data.$id,
                text: data.name + ' (' + data.facility_promo_code + ')'
            };
        }
    }
})();