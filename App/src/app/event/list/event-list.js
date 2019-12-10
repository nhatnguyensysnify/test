(function () {
    'use strict';

    angular.module('app.event')
        .controller('EventListCtrl', EventListCtrl).config(function ($mdDateLocaleProvider) {
            // Can change week display to start on Monday.
            $mdDateLocaleProvider.firstDayOfWeek = 1;
            // Optional.
        });

    /** @ngInject */
    function EventListCtrl($rootScope, $stateParams, $scope, $state, $timeout, $ngBootbox, $q, appUtils, DataUtils, toaster, authService, eventService, employeeService, memTerritoryService, memberShipFacilitiesService, memStateService, memRegionService, eventGoalService, eventExportService, eventExportFullService, calendarConfig, $uibModal, NgMap) {
        $rootScope.settings.layout.pageSidebarClosed = true;
        var currentUser = authService.getCurrentUser(), //$rootScope.storage.currentUser,
            appSettings = $rootScope.storage.appSettings;

        $scope.userPermission = $rootScope.storage.statePermission;
        $scope.userPermission.isAdmin = appUtils.checkSpecifyRole(currentUser, 'admin');
        $scope.userPermission.isRep = appUtils.checkSpecifyRole(currentUser, 'rep');

        var eventVm = this; //
        var timestampStart = moment().utc().startOf('month'),
            timestampEnd = moment().utc().endOf('month');

        eventVm.currentUid = currentUser.$id;
        eventVm.allStates = [];
        eventVm.allRegions = [];
        eventVm.regionGroups = {};
        eventVm.allTerritories = [];
        eventVm.allFacilities = [];
        eventVm.allEmployees = [];
        eventVm.employees = [];
        eventVm.eventTypes = [];
        eventVm.changePage = changePage;
        eventVm.getType = getType;
        eventVm.getState = getState;
        eventVm.getRegion = getRegion;
        eventVm.getTerritory = getTerritory;
        eventVm.getDateTime = getDateTime;
        eventVm.getRequester = getRequester;
        eventVm.getFacility = getFacility;
        eventVm.search = search;
        eventVm.searchKeyword = searchKeyword;
        eventVm.archived = archived;
        eventVm.restore = restore;
        eventVm.resetFiler = resetFiler;
        eventVm.exportEventData = exportEventData;
        eventVm.onChangeViewMap = onChangeViewMap;
        eventVm.showCustomMarker = showCustomMarker;
        eventVm.viewLocationEvent = viewLocationEvent;
        eventVm.exportD = exportD;
        eventVm.requester = null;
        eventVm.viewMap = $stateParams.viewMap === 'true' || false;

        eventVm.cri = {
            keyword: $stateParams.keyword ? $stateParams.keyword : '',
            type: $stateParams.type || 'All',
            status: $stateParams.status || '1',
            verifyStatus: $stateParams.verifyStatus || 'All',
            size: 20,
            from: 0,
            dataEntered: null,
            alias: null,
            moenyOrder: null,
            memKeyword: null
        };
        // NgMap.getMap().then(function (map) {
        //     eventVm.map = map;
        // }, (error)=>{
        //     console.log('error', error);
        // });
        eventVm.image = {
            url: './img/marker.png',
            scaledSize: [50, 50],
            origin: [0, 0],
            anchor: [25, 50]
        };
        eventVm.dataEnteredOpts = [
            { val: null, text: 'All' },
            { val: false, text: 'New' },
            { val: true, text: 'Data Entered' }
        ];

        //get query start date
        var start = $stateParams.start && !isNaN(parseInt($stateParams.start)) ? moment(parseInt($stateParams.start)).utc() : timestampStart;
        eventVm.timestampStart = start.valueOf();
        eventVm.cri.timestampStart = angular.copy(start).utc().startOf('day').valueOf();

        //get query end date
        var end = $stateParams.end && !isNaN(parseInt($stateParams.end)) ? moment(parseInt($stateParams.end)).utc() : timestampEnd;
        eventVm.timestampEnd = end.valueOf();
        eventVm.cri.timestampEnd = angular.copy(end).utc().endOf('day').valueOf();

        eventVm.paging = {
            pageSize: 20,
            currentPage: $stateParams.page ? parseInt($stateParams.page) : 0,
            totalPage: 0,
            totalRecord: 0
        };
        eventVm.eventStatus = appUtils.eventStatus;
        eventVm.eventVerifyStatus = appUtils.eventListVerifyStatus;

        eventVm.events = [];
        eventVm.select2Options = {
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

        eventVm.select2OptionsF = {
            AllowClear: true,
            //minimumInputLength: 3,
            ajax: {
                dataType: 'json',
                delay: 250,
                transport: function (params, success, failure) {
                    var $request = memberShipFacilitiesService.search(params.data);
                    $request.then(success, failure);
                    return $request;
                },
                data: function (params) {
                    return params.term || '';
                },
                processResults: function (data) {
                    var result = _.map(data, function (item) {
                        return _composeFacilitySelectBoxText(item);
                    });
                    return {
                        results: result
                    };
                }
            }
        };




        loadData();

        // Make sure DOM is loaded before get elems
        angular.element(document).ready(function () {
            $timeout(function () {
                $('#EventRange').on('apply.daterangepicker', function (ev, picker) {
                    var startControl = angular.copy(picker.startDate._d),
                        endControl = angular.copy(picker.endDate._d);

                    var startStr = moment(startControl).format('MM/DD/YYYY'),
                        endStr = moment(endControl).format('MM/DD/YYYY');

                    eventVm.cri.timestampStart = eventVm.timestampStart = moment.utc(startStr).startOf("day").valueOf();
                    eventVm.cri.timestampEnd = eventVm.timestampEnd = moment.utc(endStr).endOf("day").valueOf();
                    eventVm.cri.requester = $('#filterRequester').val();
                    console.log('state', $state);
                    search();
                });
            }, 800);
        });

        //===================
        function loadData() {
            var filterUser = null;
            eventVm.chooseState = "TX";
            if ($stateParams.state) {
                eventVm.chooseStates = $stateParams.state.split(',') || [];
            } else {
                $timeout(function () {
                    eventVm.chooseStates = [];
                    $('#chooseStates').trigger('change');
                }, 200);
            }

            if ($stateParams.territory) {
                eventVm.chooseTerritories = $stateParams.territory.split(',') || [];
            } else {
                $timeout(function () {
                    eventVm.chooseTerritories = [];
                    $('#chooseTerritories').trigger('change');
                }, 200);
            }

            if ($stateParams.plantype) {
                eventVm.chooseRegions = $stateParams.plantype.split(',') || [];
            } else {
                $timeout(function () {
                    eventVm.chooseRegions = [];
                    $('#chooseRegions').trigger('change');
                }, 200);
            }

            if ($stateParams.facilityId) {
                eventVm.chooseFacilities = $stateParams.facilityId.split(',') || [];
            } else {
                $timeout(function () {
                    eventVm.chooseFacilities = [];
                    $('#chooseFacilities').trigger('change');
                }, 200);
            }

            eventVm.cri.alias = $stateParams.alias || (!$scope.userPermission.isAdmin ? currentUser.alias : null);
            eventVm.cri.requester = $stateParams.requester || (!$scope.userPermission.isRep ? 'All' : currentUser.$id);
            var all = [_loadEventTypes(), _loadStates(), _loadRegions(), _loadFacilities(), _loadTerritories()];
            if (eventVm.cri.requester !== 'All' && eventVm.cri.requester !== currentUser.$id) {
                var arr = angular.copy(eventVm.cri.requester).split(','),
                    managerId = arr && arr[0] || null;
                if (managerId) {
                    var req = employeeService.getUser(managerId).then(function (user) {
                        filterUser = user || null;
                    });
                    all.push(req);
                }
            } else {
                filterUser = currentUser;
            }

            return $q.all(all).then(function () {
                $timeout(function () {
                    var option, selectOpt;
                    if (eventVm.cri.requester === 'All') {
                        option = new Option('All Managers/Area Managers/Representative', 'All', true, true);
                        $('#filterRequester').append(option).trigger('change');
                    } else {
                        if (filterUser) {
                            selectOpt = _composeSelectBoxText(filterUser);
                            option = new Option(selectOpt.text, selectOpt.id, true, true);
                            $('#filterRequester').append(option).trigger('change');
                        }
                    }

                    if (eventVm.chooseFacilities) {
                        var facilities = _.filter(eventVm.allFacilities, function (item) {
                            return eventVm.chooseFacilities.indexOf(item.$id) !== -1;
                        });

                        _.forEach(facilities, function (fObj) {
                            selectOpt = _composeFacilitySelectBoxText(fObj);
                            option = new Option(selectOpt.text, selectOpt.id, true, true);
                            $('#chooseFacilities').append(option).trigger('change');
                        });
                    }
                }, 400);
                search();
            });
            //});
        }

        function _loadStates() {
            return memStateService.getAll().then(function (data) {
                //compose show ui-select2
                eventVm.allStates = data || [];

                $timeout(angular.noop, 200);
            });
        }

        function _loadRegions() {
            return memRegionService.getAll().then(function (regionGroups) {
                _.each(regionGroups, function (regionGroup, stateCode) {
                    var regions = DataUtils.toAFArray(regionGroup);
                    eventVm.allRegions = eventVm.allRegions.concat(regions);
                    regionGroups[stateCode] = regions;
                });
                eventVm.regionGroups = regionGroups;
                $timeout(angular.noop, 200);
            });
        }

        function _loadTerritories() {
            return memTerritoryService.getAllTerritoryLoadOnce().then(function (data) {
                eventVm.allTerritories = data || [];
                $timeout(angular.noop, 200);
            });
        }

        // function _loadEmployees() {
        //     if (elasticEmployee) {
        //         var employeeQuery = employeeService.searchQuery(elasticEmployee.index, elasticEmployee.type, '', 5000, 0);
        //         return searchService.search(employeeQuery, 'users').then(function(result) {
        //             eventVm.employees = angular.copy(result && result.items || []);
        //             if ($scope.userPermission.isAdmin) {
        //                 eventVm.allEmployees = result && result.items || [];
        //                 eventVm.allEmployees.unshift({
        //                     $id: 'All',
        //                     text: 'All Managers/Representative'
        //                 });
        //             } else {
        //                 var employees = result && result.items || [];
        //                 eventVm.allEmployees = _.filter(employees, function(user) {
        //                     return user.$id === currentUser.$id;
        //                 });
        //             }
        //             //compose show ui-select2
        //             _.forEach(eventVm.allEmployees, function(e, index) {
        //                 if (e.$id !== 'All') {
        //                     if (_.trim(e.firstName) && _.trim(e.lastName) && _.trim(e.repCode)) {
        //                         e.text = e.firstName + ' ' + e.lastName + ' (' + e.repCode + ')';
        //                     } else {
        //                         e.text = e.firstName + ' ' + e.lastName;
        //                     }
        //                 }
        //             });
        //             $timeout(angular.noop, 200);
        //         });
        //     }
        //     return $q.when([]);
        // }

        function _loadFacilities() {
            return memberShipFacilitiesService.itemsLoadOnce().then(function (data) {
                eventVm.allFacilities = angular.copy(data || []);
                //compose show ui-select2
                // _.forEach(eventVm.allFacilities, function (f, index) {
                //     f.text = f.address && _.trim(f.address) !== '' ? f.name + ' - ' + f.facility_promo_code + ' (' + f.address + ')' : f.name + ' - ' + f.facility_promo_code;
                // });
                // eventVm.allFacilities.unshift({
                //     $id: 'All',
                //     text: 'All Facilities'
                // });
                $timeout(angular.noop, 200);
            });
        }

        function _loadEventTypes() {
            return eventService.getEventTypes().then(function (types) {
                eventVm.eventTypes = types || [];
            });
        }

        function changePage() {
            eventVm.cri.from = eventVm.paging.currentPage * eventVm.cri.size;
            _search();
        }

        function search(isFilter) {
            appUtils.showLoading();
            eventVm.cri.from = 0;
            eventVm.paging.currentPage = 0;
            if (isFilter) {
                eventVm.cri.requester = $('#filterRequester').val();
            }
            _search();
        }


        function searchKeyword() {
            var length = eventVm.cri.keyword.length;
            if (length === 0 || length >= 3) {
                search();
            }
        }

        function resetFiler() {
            deleteMap();

            $timeout(function () {
                $state.go('event.list', { 'keyword': '', 'start': null, 'end': null, 'page': 0, 'requester': (!$scope.userPermission.isRep ? 'All' : currentUser.$id), 'facilityId': null, 'alias': eventVm.cri.alias, 'type': 'All', 'state': null, 'plantype': null, 'territory': null, 'status': '1', 'viewMap': eventVm.viewMap }, { reload: true });
            }, 100);
        }

        function exportEventData() {
            var cri = angular.copy(eventVm.cri);
            cri.size = 5000;
            appUtils.showLoading();
            var startTxt = moment(eventVm.cri.timestampStart).utc().format('MM/DD/YYYY').replace('/', '_'),
                endTxt = moment(eventVm.cri.timestampEnd).utc().format('MM/DD/YYYY').replace('/', '_');

            var exportFileName = "Events_Export" + '_' + startTxt + "_to_" + endTxt;
            var opts = {
                states: DataUtils.array2ObjectIndex(eventVm.allStates, 'iso'),
                eventTypes: DataUtils.array2ObjectIndex(eventVm.eventTypes, '$id'),
                facilities: DataUtils.array2ObjectIndex(eventVm.allFacilities, '$id'),
                territories: DataUtils.array2ObjectIndex(eventVm.allTerritories, '$id'),
                regions: DataUtils.array2ObjectIndex(eventVm.allRegions, 'id'),
                fileName: exportFileName,
                eventListVerifyStatus: appUtils.eventListVerifyStatus
            };
            return eventExportFullService.exportWorkbook(cri, opts).then(function () {
                appUtils.hideLoading();
            });
        }

        function exportD() {
            // var cri = {
            //     type: 'All',
            //     state: eventVm.chooseStates.join(','),
            //     plantypes: eventVm.chooseRegions.join(','),
            //     requester: !$scope.userPermission.isRep ? 'All' : currentUser.$id,
            //     timestampStart: eventVm.cri.timestampStart,
            //     timestampEnd: eventVm.cri.timestampEnd,
            //     // size: 5000,
            //     from: 0,
            //     status: '1,0',
            //     // dataEntered: true,
            //     alias: !$scope.userPermission.isAdmin ? currentUser.alias : null
            // };

            var cri = angular.copy(eventVm.cri);

            var startTxt = moment(eventVm.cri.timestampStart).utc().format('MM/DD/YYYY').replace('/', '_'),
                endTxt = moment(eventVm.cri.timestampEnd).utc().format('MM/DD/YYYY').replace('/', '_');

            var exportFileName = "Events_Summary_Export" + '_' + startTxt + "_to_" + endTxt;

            var statesOpt = eventVm.allStates;

            if (eventVm.chooseStates && eventVm.chooseStates.length > 0) {
                statesOpt = _.filter(eventVm.allStates, function (s) {
                    return eventVm.chooseStates.indexOf(s.iso) > -1;
                });
            }

            var leoS = ['FL', 'PA', 'TX'];
            var leoStatesOpt = _.filter(statesOpt, function (s) {
                return leoS.indexOf(s.iso) > -1;
            });

            var opts = {
                states: statesOpt,
                leoStates: leoStatesOpt,
                eventTypes: eventVm.eventTypes,
                fileName: exportFileName
            };

            appUtils.showLoading();
            return eventExportService.exportD(cri, opts).then(function () {
                appUtils.hideLoading();
            });
        }


        function _search() {
            console.log('eventVm.chooseStates', eventVm.chooseStates);
            hideInfoWindow();
            eventVm.cri.state = eventVm.chooseStates && eventVm.chooseStates.length > 0 ? eventVm.chooseStates.join(',') : '';
            eventVm.cri.territory = eventVm.chooseTerritories && eventVm.chooseTerritories.length > 0 ? eventVm.chooseTerritories.join(',') : '';
            eventVm.cri.facilities = eventVm.chooseFacilities && eventVm.chooseFacilities.length > 0 ? eventVm.chooseFacilities.join(',') : '';
            eventVm.cri.plantypes = eventVm.chooseRegions && eventVm.chooseRegions.length > 0 ? eventVm.chooseRegions.join(',') : '';
            eventService.search(eventVm.cri).then(function (result) {
                appUtils.hideLoading();
                eventVm.events = result.items;

                onChangeViewMap();
                angular.extend(eventVm.paging, {
                    totalRecord: result.totalRecords,
                    totalPage: result.pages
                });
                $timeout(function () {
                    $state.go('event.list', { 'keyword': eventVm.cri.keyword, 'start': eventVm.timestampStart, 'end': eventVm.timestampEnd, 'page': eventVm.paging.currentPage, 'requester': eventVm.cri.requester, 'facilityId': eventVm.cri.facilities, 'alias': eventVm.cri.alias, 'type': eventVm.cri.type, 'state': eventVm.cri.state, 'plantype': eventVm.cri.plantypes, 'territory': eventVm.cri.territory, 'status': eventVm.cri.status, 'viewMap': eventVm.viewMap }, { notify: false });
                }, 100);
            });
        }
        function hideInfoWindow() {
            if (!eventVm.map) {
                return;
            }
            try {
                eventVm.map.hideInfoWindow('foo');
            } catch (error) {

            }
        }
        function addMarkersToMap() {
            let bounds = new google.maps.LatLngBounds();
            //load address map events
            _.forEach(eventVm.events, (event, index) => {
                // if (!event.mailingAddressTxt || !event.locationTxt) { //first load address
                let address = {};
                if (!event.mailingAddress) {
                    let facility = _.find(eventVm.allFacilities, function (item) {
                        return item.$id === event.facilityId;
                    });
                    if (!facility) {
                        return;
                    }
                    address = facility;
                    event.mailingAddress = address;
                } else {
                    address = event.mailingAddress;
                }

                event.mailingAddressTxt = address ? `${address.address} ${address.address_2}, ${address.city_name} ${address.state_code} ${address.zip_code}` : '';
                if (!event.mailingAddress.location) {
                    // case old event not yet update address
                    appUtils.getLatLonByAddressString(event.mailingAddressTxt).then(location => {
                        event.mailingAddress.location = location && location[0];
                        event.locationTxt = !event.mailingAddress.location ? '' :
                            `${event.mailingAddress.location.lat}, ${event.mailingAddress.location.lng || event.mailingAddress.location.lon}`;
                        // if (index === 0) {
                        //     eventVm.mapCenterTxt = event.locationTxt || '';
                        // }
                        if (event.mailingAddress.location) {
                            let loc = new google.maps.LatLng(event.mailingAddress.location.lat, event.mailingAddress.location.lng || event.mailingAddress.location.lon);
                            bounds.extend(loc);
                        }

                    });
                } else {
                    // case old event updated address
                    event.locationTxt = !event.mailingAddress.location ? '' :
                        `${event.mailingAddress.location.lat}, ${event.mailingAddress.location.lng || event.mailingAddress.location.lon}`;
                    // if (index === 0) {
                    //     eventVm.mapCenterTxt = event.locationTxt || '';
                    // }
                    let loc = new google.maps.LatLng(event.mailingAddress.location.lat, event.mailingAddress.location.lng || event.mailingAddress.location.lon);
                    bounds.extend(loc);
                }
                // }
            });
            // Don't zoom in too far on only one marker
            if (bounds.getNorthEast().equals(bounds.getSouthWest())) {
                var extendPoint1 = new google.maps.LatLng(bounds.getNorthEast().lat() + 0.1, bounds.getNorthEast().lng() + 0.1);
                var extendPoint2 = new google.maps.LatLng(bounds.getNorthEast().lat() - 0.1, bounds.getNorthEast().lng() - 0.1);
                bounds.extend(extendPoint1);
                bounds.extend(extendPoint2);
            }
            console.log('bounds', bounds, eventVm.map);

            if (eventVm.map) { //bounds!= initialize
                eventVm.map.fitBounds(bounds);
                eventVm.map.panToBounds(bounds);
            }

            $timeout(angular.noop);
            //end
        }

        function archived(item) {
            $ngBootbox.confirm('Are you sure want to Archive this Event?').then(function () {
                appUtils.showLoading();
                var req = eventService.archived(item.$id);
                return req.then(function (res) {
                    appUtils.hideLoading();
                    if (!res.result) {
                        $ngBootbox.alert(res.errorMsg);
                        return;
                    }
                    $timeout(function () {
                        toaster.success("Archive Event Successfully!");
                    }, 200);
                    item.status = -1;
                    var startDateUtc = moment.utc(item.startDate).startOf('day');
                    return eventGoalService.calGoal({ y: startDateUtc.year(), m: startDateUtc.month() + 1, r: item.state });
                });
            }, function () {
                appUtils.hideLoading();
            });
        }

        function restore(item, status) {
            var text = parseInt(status) === 1 ? 'Publish' : 'UnPublish';
            $ngBootbox.confirm('Are you sure want to ' + text + ' this Event?').then(function () {
                appUtils.showLoading();
                var req = eventService.restore(item.$id, status);
                return req.then(function (res) {
                    appUtils.hideLoading();
                    if (!res.result) {
                        $ngBootbox.alert(res.errorMsg);
                        return;
                    }
                    $timeout(function () {
                        toaster.success(text + " Event Successfully!");
                    }, 200);
                    item.status = parseInt(status);
                    var startDateUtc = moment.utc(item.startDate).startOf('day');
                    return eventGoalService.calGoal({ y: startDateUtc.year(), m: startDateUtc.month() + 1, r: item.state });
                });
            }, function () {
                appUtils.hideLoading();
            });
        }

        function getType(value) {
            var type = _.find(eventVm.eventTypes, function (item) {
                return item.value === value;
            });

            return type && type.text || '';
        }

        function getDateTime(value) {
            var time = parseInt(value);
            if (isNaN(time)) {
                return '';
            }
            return moment(time).utc().format('MM/DD/YYYY');
        }

        function getState(value) {
            var state = _.find(eventVm.allStates, function (item) {
                return item.iso === value;
            });

            return state && state.name || '';
        }

        function getRegion(item) {
            var region = _.find(eventVm.regionGroups[item.state], { id: item.region + '' });
            return region && region.guid || '';
        }

        function getTerritory(value) {
            var territory = _.find(eventVm.allTerritories, function (item) {
                return item.$id === value;
            });

            return territory && territory.name || '';
        }

        function getFacility(value) {
            var facility = _.find(eventVm.allFacilities, function (item) {
                return item.$id === value;
            });
            return facility ? (facility.name + ' (<strong>' + facility.facility_promo_code + '</strong>)') : '';
        }

        function getRequester(value) {
            if (!value) {
                return '';
            }
            var uids = Object.keys(value);
            var uid = uids && uids.length > 0 ? uids[0] : '';
            var e = value[uid];
            var fullName = '';
            if (e) {
                if (_.trim(e.repCode)) {
                    fullName = e.displayName + ' (<strong>' + e.repCode + '</strong>)';
                } else {
                    fullName = e.displayName;
                }
            }
            return fullName;
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

        function _composeFacilitySelectBoxText(data) {
            return {
                id: data.$id,
                text: data.name + ' (' + data.facility_promo_code + ')'
            };
        }

        // code run update
        /*
        var el = document.getElementById('events'),
            scope = angular.element(el).scope();
        scope.eventVm.updateEventStatus()
        */

        eventVm.updateEventStatus = updateEventStatus;
        function updateEventStatus(from) {
            var cri = {
                keyword: '',
                type: 'All',
                status: 'All',
                size: 100,
                from: from || 0
            };
            eventService.search(cri).then(function (r) {
                // console.log(r);
                var total = r.totalRecords,
                    to = cri.from + cri.size;
                // if(total > to){
                //     eventVm.updateEventStatus(to+1);
                // }
                var data = {
                };
                _.each(r.items, function (model) {
                    // appUploaded
                    var appUploaded = null,
                        iptTotalRevenue = parseFloat(model.iptTotalRevenue),
                        iptNewMember = parseInt(model.iptNewMember),
                        appCount = parseInt(model.appCount),
                        fields = {};
                    if (iptTotalRevenue && iptNewMember && appCount) {
                        appUploaded = true;
                    } else if (iptTotalRevenue && iptNewMember && !appCount) {
                        appUploaded = false;
                    }
                    // console.log(appUploaded, iptTotalRevenue, iptNewMember, sysSold)
                    fields.appUploaded = appUploaded;
                    // data entered
                    var dataEntered = true;
                    if (!appSettings.eventDataEnteredDetectFields) {
                        return;
                    }
                    _.each(appSettings.eventDataEnteredDetectFields, function (val, field) {
                        dataEntered = dataEntered && !isNaN(parseFloat(model[field]));
                    });
                    fields.dataEntered = dataEntered;
                    //end
                    // data[model.$id + '/dataEntered'] = dataEntered;
                    data[model.$id + '/appUploaded'] = appUploaded;
                });
                eventService.eventRef.update(data).then(function () {
                    console.log('Finish ' + to);
                    if (total > to) {
                        eventVm.updateEventStatus(to);
                    }
                });
            });
        }

        eventVm.parseToNumber = function (value) {
            var number = parseFloat(value);
            if (isNaN(number)) {
                number = null;
            }
            return number;
        };
        eventVm.getRequesters = function (value) {
            if (!value) {
                return '';
            }
            var text = [];
            _.forEach(value, function (data, key) {
                var fullName = '';
                if (data) {
                    if (_.trim(data.repCode)) {
                        fullName = data.displayName + ' (<strong>' + data.repCode + '</strong>)';
                    } else {
                        fullName = data.displayName;
                    }
                    text.push(fullName);
                }
            });
            return text.join(";");
        };
        function onChangeViewMap(isChangeState) {
            console.log('eventVm.viewMap', eventVm.viewMap);
            console.log('eventVm.map', eventVm.map);

            if (eventVm.viewMap && !eventVm.map) {
                //render map
                NgMap.getMap('map-event-list', { timeout: 20000 }).then(function (map) {
                    if (map.inUse) {
                        return false;
                    }
                    eventVm.map = NgMap.initMap('map-event-list');
                    // let infoWindow = map.infoWindows.foo;
                    // infoWindow = infoWindow.setOptions({ pixelOffset: new google.maps.Size(-20, -100) });
                }, function (error) {
                    console.log('error', error);
                    eventVm.map = NgMap.initMap('map-event-list');
                    console.log('eventVm.map', eventVm.map, NgMap);

                }).finally(function () {
                    console.log('finally');
                    addMarkersToMap();
                    document.onfullscreenchange = function (event) {
                        let map = eventVm.map;
                        if (!map) {
                            return false;
                        }
                        var center = map.getCenter();
                        google.maps.event.trigger(map, "resize");
                        map.setCenter(center);
                    };
                });

            } else if (eventVm.viewMap && eventVm.map) {
                //load address text
                addMarkersToMap();
            } else {
                eventVm.map = null;
            }

            if (isChangeState) {
                $timeout(function () {
                    $state.go('event.list', { 'keyword': eventVm.cri.keyword, 'start': eventVm.timestampStart, 'end': eventVm.timestampEnd, 'page': eventVm.paging.currentPage, 'requester': eventVm.cri.requester, 'facilityId': eventVm.cri.facilities, 'alias': eventVm.cri.alias, 'type': eventVm.cri.type, 'state': eventVm.cri.state, 'plantype': eventVm.cri.plantypes, 'territory': eventVm.cri.territory, 'status': eventVm.cri.status, 'viewMap': eventVm.viewMap }, { notify: false });
                }, 100);
            }

            $timeout(angular.noop, 200);
        }
        function deleteMap() {
            if (!eventVm.map) {
                return;
            }
            //clear marker
            for (let k in eventVm.map.markers) {
                eventVm.map.markers[k].setMap(null);
            }
            //clear shapes
            for (let kk in eventVm.map.shapes) {
                eventVm.map.shapes[kk].setMap(null);
            }
            // let result = NgMap.deleteMap(eventVm.map);
            $('.map-container').html('');

            // eventVm.map.delete();
            // var map = NgMap.deleteMap(eventVm.map);
        }
        function showCustomMarker(eventClick, eventItem, index) {
            console.log('eventItem', eventItem);
            eventVm.selectedEvent = angular.copy(eventItem);
            eventVm.selectedEvent.typeTxt = eventVm.getType(eventVm.selectedEvent.type);
            eventVm.selectedEvent.startDateTxt = moment(eventVm.selectedEvent.startDate).format('MM/DD/YYYY');
            eventVm.selectedEvent.stateTxt = eventVm.getState(eventVm.selectedEvent.state);
            eventVm.selectedEvent.planTypeTxt = eventVm.getRegion(eventVm.selectedEvent);
            eventVm.selectedEvent.territoryTxt = eventVm.getTerritory(eventVm.selectedEvent.territory);
            eventVm.selectedEvent.facilityTxt = eventVm.getFacility(eventVm.selectedEvent.facilityId);
            eventVm.selectedEvent.managerTxt = eventVm.getRequester(eventVm.selectedEvent.requester);
            if (eventVm.selectedEvent.status === 1) {
                eventVm.selectedEvent.statusClassTxt = 'fa fa-play font-green-jungle';
            } else if (eventVm.selectedEvent.status === 0) {
                eventVm.selectedEvent.statusClassTxt = 'fa fa-stop font-red';
            } else if (eventVm.selectedEvent.status === -1) {
                eventVm.selectedEvent.statusClassTxt = 'fa fa-remove font-red';
            }
            eventVm.selectedEvent.appsUploadedTxt = eventVm.selectedEvent.appUploaded === true || eventVm.selectedEvent.appUploaded === false ?
                (eventVm.selectedEvent.appUploaded ? 'Yes' : 'No') : 'N/A';
            // let marker = eventVm.map.markers['custom-marker-' + index];
            // console.log('marker.id', marker.id, 'custom-marker-' + index);

            eventVm.map.showInfoWindow('foo', 'custom-marker-' + index);
        }
        function viewLocationEvent(event, index) {
            if (eventVm.map.markers && eventVm.map.markers['custom-marker-' + index]) {
                let lat = eventVm.map.markers['custom-marker-' + index].internalPosition.lat();
                let lng = eventVm.map.markers['custom-marker-' + index].internalPosition.lng();
                const position = new google.maps.LatLng(lat, lng);
                eventVm.map.panTo(position);
                showCustomMarker(null, event, index);
            }
        }
    }
})();