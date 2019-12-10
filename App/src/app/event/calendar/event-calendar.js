(function () {
    'use strict';

    angular.module('app.event')
        .controller('EventCalendarCtrl', EventCalendarCtrl).config(function ($mdDateLocaleProvider) {
            // Can change week display to start on Monday.
            $mdDateLocaleProvider.firstDayOfWeek = 1;
            // Optional.
        });

    /** @ngInject */
    function EventCalendarCtrl($rootScope, $stateParams, $scope, $state, $timeout, $ngBootbox, $q, appUtils, DataUtils, toaster, authService, eventService, employeeService, memTerritoryService, memberShipFacilitiesService, memStateService, memRegionService, eventGoalService, eventExportService, eventExportFullService, eventExportCalendarService, calendarConfig, $uibModal, departmentSevice, roleService, calendarEventTitle, shiftsService, shiftUtils) {
        $rootScope.settings.layout.pageSidebarClosed = true;
        var currentUser = authService.getCurrentUser(), //$rootScope.storage.currentUser,
            appSettings = $rootScope.storage.appSettings;

        $scope.userPermission = $rootScope.storage.statePermission;
        $scope.userPermission.isAdmin = appUtils.checkSpecifyRole(currentUser, 'admin');
        $scope.userPermission.isRep = appUtils.checkSpecifyRole(currentUser, 'rep');
        $scope.titlePage = 'Utilization Calendar';
        $scope._getManagerText = _getManagerText;
        $scope.getRoleText = getRoleText;
        var eventVm = this; //
        moment.locale('en_gb', {
            week: {
                dow: 1 // Monday is the first day of the week
            }
        });
        var timestampStart = moment().startOf('day'),
            timestampEnd = moment().endOf('month');

        // eventVm.modeView = 'calendarView';
        var currentDate = moment(); //init local time
        eventVm.timestampCurrent = moment.utc(currentDate.format('MM/DD/YYYY'), 'MM/DD/YYYY').startOf('day').valueOf();
        eventVm.currentUid = currentUser.$id;

        eventVm.currentUser = currentUser;
        eventVm.allStates = [];
        // eventVm.eventsByStates = [];
        eventVm.allRegions = [];
        eventVm.regionGroups = {};
        eventVm.allTerritories = [];
        eventVm.allFacilities = [];
        eventVm.allEmployees = [];
        eventVm.employees = [];
        eventVm.eventTypes = [];
        // eventVm.changePage = changePage;
        eventVm.getType = getType;
        eventVm.getState = getState;
        eventVm.getRegion = getRegion;
        eventVm.getTerritory = getTerritory;
        eventVm.getDateTime = getDateTime;
        eventVm.getRequester = getRequester;
        eventVm.getFacility = getFacility;
        // eventVm.search = search;
        eventVm.searchCalendar = searchCalendar;
        eventVm.resetFiler = resetFiler;
        eventVm.exportEventData = exportEventData;
        eventVm.showReportInformation = showReportInformation;
        eventVm.onChangeResourceAvailability = onChangeResourceAvailability;
        eventVm.reRenderUiCalendar = reRenderUiCalendar;
        eventVm.onChangeCalendarView = onChangeCalendarView;
        eventVm.getMonthText = getMonthText;
        // eventVm.exportD = exportD;
        eventVm.requester = null;
        eventVm.isLoading = false;
        eventVm.resourceAvailability = !$scope.userPermission.isRep ? true : false;
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
            memKeyword: null,
            state: $scope.userPermission.isAdmin ? null : currentUser.state
        };
        eventVm.chooseState = $scope.userPermission.isAdmin ? [] : (currentUser && currentUser.workingStates && Object.keys(currentUser.workingStates).length > 0) ? Object.keys(currentUser.workingStates)[0] : currentUser.state;

        eventVm.dataEnteredOpts = [
            { val: null, text: 'All' },
            { val: false, text: 'New' },
            { val: true, text: 'Data Entered' }
        ];
        calendarEventTitle.monthViewTooltip = calendarEventTitle.weekViewTooltip = calendarEventTitle.dayViewTooltip = function () {
            return '';
        };
        //get query start date
        var start = $stateParams.start && !isNaN(parseInt($stateParams.start)) ? moment(parseInt($stateParams.start)).utc() : timestampStart;
        // eventVm.timestampStart = start.startOf('month').valueOf();
        eventVm.timestampStart = eventVm.cri.timestampStart = moment.utc(start.startOf('month').format('MM/DD/YYYY')).startOf('day').valueOf();

        //get query end date
        // var end = $stateParams.end && !isNaN(parseInt($stateParams.end)) ? moment(parseInt($stateParams.end)).utc() : timestampEnd;
        eventVm.timestampEnd = moment(eventVm.cri.timestampStart).utc().endOf('month').valueOf(); //end.valueOf();
        eventVm.cri.timestampEnd = angular.copy(moment(eventVm.timestampEnd)).utc().endOf('day').valueOf();

        eventVm.paging = {
            pageSize: 20,
            currentPage: $stateParams.page ? parseInt($stateParams.page) : 0,
            totalPage: 0,
            totalRecord: 0
        };
        eventVm.eventStatus = appUtils.eventStatus;
        eventVm.eventVerifyStatus = appUtils.eventListVerifyStatus;

        eventVm.events = [];
        // $scope.$watch("eventVm.requester", function (newValue) {
        //     console.log(newValue);
        // });
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

        //These variables MUST be set as a minimum for the calendar to work
        eventVm.calendarView = $stateParams.calendarView ? $stateParams.calendarView : 'month';
        eventVm.viewDate = eventVm.timestampStart ? new Date(moment.utc(eventVm.timestampStart).format('MM/DD/YYYY')) : new Date();

        var actions = [{
            label: '<i class=\'glyphicon glyphicon-pencil\'></i>',
            onClick: function (args) {
                console.log('Edited', args.calendarEvent);

            }
        }, {
            label: '<i class=\'glyphicon glyphicon-remove\'></i>',
            onClick: function (args) {
                console.log('Deleted', args.calendarEvent);
            }
        }];
        eventVm.modifyCell = function (cell) {
            cell.cssClass = !eventVm.resourceAvailability ? 'custom-month-cell-event-calendar' : 'custom-template-cell';
        };

        // console.log('calendarConfig.colorTypes', JSON.stringify(calendarConfig.colorTypes));
        calendarEventTitle.monthViewTooltip = calendarEventTitle.weekViewTooltip = calendarEventTitle.dayViewTooltip = function () {
            return '';
        };
        eventVm.colorTypes = {
            "info": { // events
                "primary": "#1e90ff",
                "secondary": "rgb(129, 205, 242)"
            },
            "important": {
                "primary": "#ad2121",
                "secondary": "rgb(250, 168, 143)"
            },
            "warning": {
                "primary": "#e3bc08",
                "secondary": "rgb(251, 223, 147)"
            },
            "inverse": {
                "primary": "#1b1b1b",
                "secondary": "#c1c1c1"
            },
            "special": {
                "primary": "#800080",
                "secondary": "#373a6d" //"rgb(63, 81, 181)"
            },
            "success": {
                "primary": "#006400",
                "secondary": "rgb(133, 192, 161)"
            },
            "activities": {
                "primary": "#800080",
                "secondary": "rgb(234, 128, 128)" //"rgb(63, 81, 181)"
            },
            "pending": {
                "primary": "#800080",
                "secondary": "#6fc2d0" //"rgb(63, 81, 181)"
            },
            "cancelled": {
                "primary": "#800080",
                "secondary": "#ED98C6" //"rgb(63, 81, 181)"
            },
            "unutilized": {
                "primary": "#fde7e7",
                "secondary": "#86d5a9" //"rgb(63, 81, 181)"
            },
            "repsavailable": {
                "primary": "#e8fde7",
                "secondary": "rgb(159, 168, 218)" //"rgb(63, 81, 181)"
            },
            "utilized": {
                "primary": "#800080",
                "secondary": "rgb(199, 146, 213" //"rgb(63, 81, 181)"
            },
            "empty": {
                "primary": "#800080",
                "secondary": "rgb(176, 176, 176);" //"rgb(63, 81, 181)"
            },
            "white": {
                "primary": "#800080",
                "secondary": "rgb(255, 255, 255);" //"rgb(63, 81, 181)"
            },
        };

        eventVm.cellIsOpen = false;

        eventVm.eventClicked = function (cell) {
            let rowItem = {};
            if (cell.typeRow) {
                rowItem = cell;
            } else {
                if (cell.events && cell.events.length > 0) {
                    rowItem = angular.copy(cell.events[0]);

                } else if (cell.event) {
                    rowItem = angular.copy(cell.event);
                }
                rowItem.typeRow = 'employee';
                rowItem.typeFilter = 'reps_unavailable_add_availability';
                rowItem.property = 'Add Availability';
            }
            eventVm.showReportInformation(rowItem);

            // if (event.funcClick) {
            //     event.funcClick(event);
            // }
        };



        eventVm.eventEdited = function (event) {
            console.log('Edited', event);
        };

        eventVm.eventDeleted = function (event) {
            console.log('Deleted', event);
        };

        eventVm.eventTimesChanged = function (event) {
            console.log('Dropped or resized', event);
        };

        eventVm.toggle = function ($event, field, event) {
            console.log('toggle');

            $event.preventDefault();
            $event.stopPropagation();
            event[field] = !event[field];
        };

        eventVm.timespanClicked = function (date, cell) {

            if (eventVm.calendarView === 'month') {
                if ((eventVm.cellIsOpen && moment(date).startOf('day').isSame(moment(eventVm.viewDate).startOf('day'))) || cell.events.length === 0 || !cell.inMonth) {
                    eventVm.cellIsOpen = false;
                } else {
                    eventVm.cellIsOpen = true;
                    eventVm.viewDate = date;
                }
            } else if (eventVm.calendarView === 'year') {
                if ((eventVm.cellIsOpen && moment(date).startOf('month').isSame(moment(eventVm.viewDate).startOf('month'))) || cell.events.length === 0) {
                    eventVm.cellIsOpen = false;
                } else {
                    eventVm.cellIsOpen = true;
                    eventVm.viewDate = date;
                }
            }

        };
        eventVm.viewChangeClicked = function (nextView) {
            if (nextView === 'day') {
                return false;
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

                    eventVm.timestampStart = moment.utc(startStr).startOf("day").valueOf();
                    eventVm.cri.timestampStart = moment.utc(startStr).startOf("day").valueOf();
                    eventVm.timestampEnd = moment.utc(endStr).endOf("day").valueOf();
                    eventVm.cri.timestampEnd = moment.utc(endStr).endOf("day").valueOf();
                    // eventVm.cri.alias = $('#filterRequester').val();
                    eventVm.viewDate = moment(moment.utc(eventVm.timestampStart).format('MM/DD/YYYY')).toDate();
                    // eventVm.viewDate = eventVm.timestampStart ? moment(eventVm.timestampStart).add(2, 'days').toDate() : new Date();

                    searchCalendar();

                });
            }, 800);
        });

        //===================
        function loadData() {

            // var ua = navigator.userAgent.toLowerCase();
            // if (ua.indexOf('crios') === -1 && ua.indexOf('chrome') === -1) {
            //     if (ua.indexOf('safari') != -1) {} else {
            //         // alert("2") // Safari
            //         $ngBootbox.alert('E-Scheduler is not compatible with Safari, please try the best on Chrome. Thank you!');
            //         //return;
            //     }
            // }
            var filterUser = null;
            if ($stateParams.state) {
                eventVm.chooseStates = $stateParams.state.split(',') || [''];
            } else {
                $timeout(function () {
                    eventVm.chooseStates = $scope.userPermission.isAdmin ? [] : [(eventVm.currentUser && eventVm.currentUser.workingStates && Object.keys(eventVm.currentUser.workingStates).length > 0) ? Object.keys(eventVm.currentUser.workingStates)[0] : eventVm.currentUser.state];
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
                }, 400);
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

            //will cleanup code: not use requester
            eventVm.cri.requester = $stateParams.requester || ($scope.userPermission.isAdmin ? 'All' : currentUser.$id);
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
                roleService.itemsObj().then(function (data) {
                    $scope.roles = data;
                    eventVm.roles = data;
                });

                $timeout(function () {
                    var option, selectOpt;

                    if (!eventVm.cri.alias || eventVm.cri.alias == 'All' || $scope.userPermission.isAdmin) {
                        eventVm.cri.alias = $scope.userPermission.isAdmin ? 'All' : eventVm.currentUser.alias;
                        option = new Option('Managers (Hierarchical Permissions)', eventVm.cri.alias || 'All', true, true);
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

                    searchCalendar();
                }, 700);
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
                eventVm.eventTypes = _.filter(types, typeItem => typeItem.text != "GSW" && typeItem.text != "Counter Sales") || [];
                // eventVm.eventTypes = types;//_.filter(types, typeItem => typeItem.text != "Miscellaneous") || [];
            });
        }

        function searchCalendar(isFilter, isExport) {
            appUtils.showLoading();
            eventVm.isLoading = true;
            eventVm.cri.from = 0;
            if (isFilter) {
                // eventVm.cri.alias = !$scope.userPermission.isAdmin ? $('#filterRequester').val() : null;
                eventVm.cri.alias = $('#filterRequester').val();
                // let requesterSelected = $('#filterRequester').select2('data');
            }
            _searchCalendar(isExport);

        }



        function resetFiler() {
            $timeout(function () {
                $state.go('event.calendar', { 'keyword': '', 'start': null, 'end': null, 'page': 0, 'requester': (!$scope.userPermission.isRep ? 'All' : currentUser.$id), 'facilityId': null, 'alias': eventVm.cri.alias, 'type': 'All', 'state': null, 'plantype': null, 'territory': null, 'status': '1' }, { reload: true });
            }, 100);
        }

        function exportEventData() {
            var cri = angular.copy(eventVm.cri);
            //remove us 
            if (eventVm.cri.state) {
                let eventByUS = _.find(eventVm.eventsExport, item => item.iso == 'US');
                if (eventByUS) {
                    eventByUS.groupByDateRange = [];
                }
            }
            cri.size = 5000;
            appUtils.showLoading();
            var startTxt = moment(eventVm.cri.timestampStart).utc().format('MM/DD/YYYY').replace('/', '_'),
                endTxt = moment(eventVm.cri.timestampEnd).utc().format('MM/DD/YYYY').replace('/', '_');

            var exportFileName = "Resource_Utilization_Export" + '_' + startTxt + "_to_" + endTxt;
            var opts = {
                states: DataUtils.array2ObjectIndex(eventVm.allStates, 'iso'),
                eventTypes: DataUtils.array2ObjectIndex(eventVm.eventTypes, '$id'),
                facilities: DataUtils.array2ObjectIndex(eventVm.allFacilities, '$id'),
                territories: DataUtils.array2ObjectIndex(eventVm.allTerritories, '$id'),
                regions: DataUtils.array2ObjectIndex(eventVm.allRegions, 'id'),
                fileName: exportFileName,
                rawData: eventVm.eventsExport
            };
            return eventExportCalendarService.exportWorkbook(cri, opts).then(function () {
                appUtils.hideLoading();
            });
        }


        function _searchCalendar(isExport) {
            // let itemState.iso = stateObj.name || '';
            eventVm.cri.state = eventVm.chooseStates && eventVm.chooseStates.length > 0 ? eventVm.chooseStates.join(',') : '';
            eventVm.cri.territory = eventVm.chooseTerritories && eventVm.chooseTerritories.length > 0 ? eventVm.chooseTerritories.join(',') : '';
            eventVm.cri.facilities = eventVm.chooseFacilities && eventVm.chooseFacilities.length > 0 ? eventVm.chooseFacilities.join(',') : '';
            eventVm.cri.plantypes = eventVm.chooseRegions && eventVm.chooseRegions.length > 0 ? eventVm.chooseRegions.join(',') : '';
            // eventVm.cri.alias != "null" ? eventVm.cri.alias: '';
            delete eventVm.cri.requester;
            let allStates = isExport ? eventVm.allStates : _.filter(eventVm.allStates, state => eventVm.cri.state.indexOf(state.iso) > -1);
            let srcP = [eventService.searchCalendar(eventVm.cri, allStates)];
            if ((eventVm.resourceAvailability && !$scope.userPermission.isRep) || isExport) {
                let employeeCri = angular.copy(eventVm.cri);
                //1 - available; 2 - unavailable
                srcP.push(shiftsService.searchShift(employeeCri));
                srcP.push(employeeService.getAvailability(employeeCri, allStates));
            }
            $q.all(srcP).then(function (result) {
                //move state us-obj to first array
                result[0] = _.sortBy(result[0], [item => getState(item.iso).toLowerCase()], ['asc']);
                result[0] = _.sortBy(result[0], item => {
                    return (item.iso == 'US' ? 0 : 1);
                });

                eventVm.employeesAvailable = result[1] || {};
                if (result[2]) {
                    eventVm.employees = result[2] || {};
                }

                if (isExport) {
                    eventVm.eventsExport = result[0];
                } else {
                    eventVm.events = result[0];
                    // eventVm.eventsByStates = result[0];
                    // console.log('eventsByStates', eventVm.events, eventVm.eventsByStates);

                    // $scope.events = result[0];
                    eventVm.eventsGroupUS = _.find(result[0], item => item.iso == 'US') || { groupByDateRange: [] };

                }
                // let lastMonth = _.last(result[0]);
                // eventVm.viewDate = lastMonth ? moment(lastMonth.key).toDate() : new Date();
                eventVm.isHaveRecords = false;
                // let numRR = Math.floor(Math.random() * 101);
                let groupByDateRange = createDateRange(eventVm.cri.timestampStart, eventVm.cri.timestampEnd);

                result[0].forEach(itemState => {
                    itemState.eventsCalendar = [];
                    itemState.stateTxt = getState(itemState.iso);

                    if ((!itemState.groupByDateRange || itemState.groupByDateRange.length == 0) && (itemState.iso == "US" || eventVm.cri.state == '' || eventVm.cri.state.indexOf(itemState.iso) > -1)) {
                        // fake data
                        // console.log('itemStateUS', JSON.parse(JSON.stringify(itemStateUS)));
                        itemState.groupByDateRange = angular.copy(groupByDateRange) || [];

                    }
                    // else {
                    itemState.groupByDateRange.forEach(item => {

                        //chech existed any event
                        if (item.events && item.events.length > 0) {
                            eventVm.isHaveRecords = true;
                        }
                        //call percent
                        var lDate = moment(moment.utc(item.key).format("YYYY MM DD"), 'YYYY MM DD');
                        var startAtDate = lDate.clone().toDate();
                        var endAtDate = lDate.clone().toDate();
                        let dayOfWeek = lDate.format('dddd').toLowerCase();
                        let canEditShift = eventVm.timestampCurrent <= item.key;
                        if ((eventVm.resourceAvailability && !$scope.userPermission.isRep) || isExport) {
                            let repsWorkingState = (eventVm.employees[itemState.iso] && eventVm.employees[itemState.iso].users) || [];
                            let shiftOnDay = eventVm.employeesAvailable[item.key] || { count: 0, repsAvailable: [] };
                            let employeesAvailableDay = _.filter(shiftOnDay.repsAvailable, item => item.availability && _.find(repsWorkingState, r => r.$id == item.$id));
                            let shiftsCanceled = _.filter(shiftOnDay.repsAvailable, item => !item.availability && item.status === shiftUtils.StatusEnum.APPROVED && _.find(repsWorkingState, r => r.$id == item.$id));
                            let showBadgeshiftsCanceled = _.filter(shiftsCanceled, item => item.eventsUndo && !item.repAssigned);
                            let repPendingAvailable = _.filter(repsWorkingState, item => !_.find(shiftOnDay.repsAvailable, r => r.$id == item.$id));
                            let numerator = item.repsActivities ? _.filter(item.repsActivities, i => { return _.find(repsWorkingState, r => r.$id == i.$id); }).length : 0;
                            let fraction = ((numerator || 0) * 100) / (employeesAvailableDay.length || 0);
                            fraction = isNaN(fraction) ? 0 : fraction;
                            item.employeesAvailableDay = employeesAvailableDay;
                            item.utilization = Math.round(fraction * 100) / 100;
                            item.repsUtilized = numerator;
                            //rep unavailable 
                            let repsUnavailable = _.differenceBy(repsWorkingState, employeesAvailableDay, '$id');
                            itemState.eventsCalendar.push({
                                value: `<span data-cal-date >${fraction}%</span>`,
                                icon: `<span class="pull-left percent p-${getDynamicClassColor(fraction)}" >`,
                                property: '% Utilization',
                                cssClass: fraction == 0 ? 'p-0' : (fraction < 26 ? 'p-25' : (fraction < 51 ? 'p-50' : (fraction < 76 ? 'p-75' : 'p-100'))),
                                title: '<span data-cal-date class="no-padding no-margin">' + (fraction !== Infinity ? Math.round(fraction * 100) / 100 + '%' : 'NaN') + '</span>',
                                titleMonth: fraction !== Infinity ? Math.round(fraction * 100) / 100 + '% Utilization' : 'NaN Utilization',
                                color: fraction == 0 ? eventVm.colorTypes.important : (fraction < 51 ? eventVm.colorTypes.warning : eventVm.colorTypes.success),
                                fixedColor: eventVm.colorTypes.success,
                                startsAt: startAtDate,
                                endsAt: endAtDate,
                                monthCssClass: `row-percent-event-item`,
                                timestampStart: item.key,
                                draggable: false,
                                resizable: false,
                                dayOfWeek: dayOfWeek,
                                typeRow: 'percent',
                                state: itemState.stateTxt,
                                isoState: itemState.iso,
                                canEditShift: canEditShift,
                            });
                            itemState.eventsCalendar.push({
                                title: `<span data-cal-date class="no-padding no-margin">${item.totalActivities || 0}</span>`,
                                titleMonth: `${item.totalActivities || 0} Activities`,
                                property: 'Activities Scheduled',
                                color: eventVm.colorTypes.activities,
                                fixedColor: eventVm.colorTypes.activities,
                                startsAt: startAtDate,
                                endsAt: endAtDate,
                                monthCssClass: `row-resource-activities-item`,
                                timestampStart: item.key,
                                draggable: false,
                                resizable: false,
                                dayOfWeek: dayOfWeek,
                                typeRow: 'event',
                                isoState: itemState.iso,
                                state: itemState.stateTxt
                            });
                            itemState.eventsCalendar.push({
                                title: `<span data-cal-date class="no-padding no-margin">${shiftsCanceled.length}</span>`,
                                titleMonth: `${shiftsCanceled.length} Cancellation Request`,
                                property: '# Cancellation Request',
                                color: eventVm.colorTypes.cancelled,
                                fixedColor: eventVm.colorTypes.cancelled,
                                startsAt: startAtDate,
                                endsAt: endAtDate,
                                monthCssClass: `row-resource-cancelled-item`,
                                timestampStart: item.key,
                                draggable: false,
                                resizable: false,
                                dayOfWeek: dayOfWeek,
                                isoState: itemState.iso,
                                state: itemState.stateTxt,
                                typeRow: 'employee',
                                typeFilter: 'cancellation_request',
                                showBadge: showBadgeshiftsCanceled.length > 0 ? true : false
                            });
                            itemState.eventsCalendar.push({
                                title: `<span data-cal-date class="no-padding no-margin">${numerator}</span>`,
                                titleMonth: `${numerator} Reps Scheduled`,
                                property: '# Reps Scheduled',
                                color: eventVm.colorTypes.utilized,
                                fixedColor: eventVm.colorTypes.utilized,
                                startsAt: startAtDate,
                                endsAt: endAtDate,
                                monthCssClass: `row-resource-utilized-item`,
                                timestampStart: item.key,
                                draggable: false,
                                resizable: false,
                                // funcClick: eventVm.showReportInformation,
                                dayOfWeek: dayOfWeek,
                                isoState: itemState.iso,
                                state: itemState.stateTxt,
                                typeRow: 'employee',
                                typeFilter: 'utilized'
                            });

                            let usersUnutilized = _.differenceBy(employeesAvailableDay, item.repsActivities, '$id');
                            item.usersUnutilized = usersUnutilized;

                            itemState.eventsCalendar.push({
                                title: `<span data-cal-date class="no-padding no-margin">${usersUnutilized ? usersUnutilized.length : 0}</span>`,
                                titleMonth: `${usersUnutilized ? usersUnutilized.length : 0} Reps Un-Scheduled`,
                                property: '# Reps Un-Scheduled',
                                color: eventVm.colorTypes.unutilized,
                                fixedColor: eventVm.colorTypes.unutilized,
                                startsAt: startAtDate,
                                endsAt: endAtDate,
                                monthCssClass: `row-resource-unutilized-item`,
                                timestampStart: item.key,
                                draggable: false,
                                resizable: false,
                                dayOfWeek: dayOfWeek,
                                typeRow: 'employee',
                                isoState: itemState.iso,
                                state: itemState.stateTxt,
                                typeFilter: 'unutilized'
                            });

                            itemState.eventsCalendar.push({
                                title: `<span data-cal-date class="no-padding no-margin">${employeesAvailableDay.length}</span>`,
                                titleMonth: `${employeesAvailableDay.length} Reps Available`,
                                property: '# Reps Available',
                                color: eventVm.colorTypes.repsavailable,
                                fixedColor: eventVm.colorTypes.repsavailable,
                                startsAt: startAtDate,
                                endsAt: endAtDate,
                                monthCssClass: `row-resource-repsavailable-item`,
                                timestampStart: item.key,
                                draggable: false,
                                resizable: false,
                                dayOfWeek: dayOfWeek,
                                isoState: itemState.iso,
                                state: itemState.stateTxt,
                                typeRow: 'employee',
                                typeFilter: 'reps_available'
                            });

                            // itemState.eventsCalendar.push({
                            //     title: `<span data-cal-date class="no-padding no-margin">${repPendingAvailable.length}</span>`,
                            //     titleMonth: `${repPendingAvailable.length} Reps Pending`,
                            //     property: `# Reps Pending`,
                            //     color: eventVm.colorTypes.repsavailable,
                            //     fixedColor: eventVm.colorTypes.repsavailable,
                            //     startsAt: startAtDate,
                            //     endsAt: endAtDate,
                            //     monthCssClass: `row-resource-pending-item`,
                            //     timestampStart: item.key,
                            //     draggable: false,
                            //     resizable: false,
                            //     dayOfWeek: dayOfWeek,
                            //     isoState: itemState.iso,
                            //     state: itemState.stateTxt,
                            //     typeRow: 'employee',
                            //     typeFilter: 'reps_pending'
                            // });

                            itemState.eventsCalendar.push({
                                title: `<span data-cal-date class="no-padding no-margin">${repsUnavailable.length}</span>`,
                                titleMonth: `${repsUnavailable.length} Reps Unavailable`,
                                property: `# Reps Unavailable`,
                                color: eventVm.colorTypes.pending,
                                fixedColor: eventVm.colorTypes.pending,
                                startsAt: startAtDate,
                                endsAt: endAtDate,
                                monthCssClass: `row-resource-pending-item`,
                                timestampStart: item.key,
                                draggable: false,
                                resizable: false,
                                dayOfWeek: dayOfWeek,
                                isoState: itemState.iso,
                                state: itemState.stateTxt,
                                typeRow: 'employee',
                                typeFilter: 'reps_unavailable'
                            });


                            // let sumTotalRevenueEvents = 0;
                            // let sumActivitiesEvents = 0;
                            // _.forEach(eventVm.eventTypes, function (typeItem) {
                            //     // if ((eventVm.cri.type == "All" && item.types[typeItem.value]) || typeItem.value == eventVm.cri.type || $scope.userPermission.isRep || !eventVm.resourceAvailability || eventVm.calendarView == 'week') {
                            //     // let sumTotalRevenuByType = _.sumBy (_.filter(item.events,ev=>{return ev.type == typeItem.value}),'iptTotalRevenue');
                            //     //check existed
                            //     // let isExisted = _.find(itemState.groupByDateRange, dayDetail => {
                            //     //     return dayDetail.types[typeItem.value] > 0;
                            //     // });
                            //     // if (isExisted) {
                            //     let sumTotalRevenue = _.sumBy(_.filter(item.events, ev => { return ev.type == typeItem.value; }), 'iptTotalRevenue');
                            //     sumTotalRevenueEvents += (sumTotalRevenue || 0);
                            //     sumActivitiesEvents += (item.types[typeItem.value] || 0);
                            //     itemState.eventsCalendar.push({
                            //         // title: `<span data-cal-date class="no-padding no-margin">${item.types[typeItem.value] || 0}</span>`,
                            //         title: `<span data-cal-date class="col-md-6 no-padding no-margin">
                            //         ${item.types[typeItem.value] || 0}
                            //         </span>
                            //         <span data-cal-date class="col-md-6 no-padding no-margin">
                            //         $${(sumTotalRevenue || 0).toFixed(2)}
                            //         </span>`,
                            //         titleMonth: `${item.types[typeItem.value] || 0} ${typeItem.text}`,
                            //         activities: item.types[typeItem.value] || 0,
                            //         sumTotalRevenue: sumTotalRevenue || 0,
                            //         property: typeItem.text,
                            //         eventType: typeItem.value,
                            //         color: (item.types[typeItem.value] && item.types[typeItem.value] > 0) ? eventVm.colorTypes.info : eventVm.colorTypes.empty,
                            //         // color: eventVm.colorTypes.info,
                            //         fixedColor: eventVm.colorTypes.info,
                            //         monthCssClass: (item.types[typeItem.value] && item.types[typeItem.value] > 0) ? `presentation-event-item` : 'empty-event-item',
                            //         startsAt: moment.utc(item.key).toDate(),
                            //         endsAt: moment.utc(item.key).toDate(),
                            //         timestampStart: item.key,
                            //         draggable: false,
                            //         resizable: false,
                            //         dayOfWeek: dayOfWeek,
                            //         isoState: itemState.iso,
                            //         state: getState(itemState.iso),
                            //         typeRow: 'event'
                            //     });
                            // });
                            // setTimeout(() => {
                            //     itemState.eventsCalendar.push({
                            //         activities: sumActivitiesEvents,
                            //         txtTitle: `Grand Total`,
                            //         property: `Grand Total`,
                            //         title: `<span data-cal-date class="col-md-6 no-padding no-margin">
                            //         ${sumActivitiesEvents}
                            //         </span>
                            //         <span data-cal-date class="col-md-6 no-padding no-margin">
                            //         $${(sumTotalRevenueEvents || 0).toFixed(2)}
                            //         </span>`,
                            //         sumTotalRevenue: sumTotalRevenueEvents || 0,
                            //         color: eventVm.colorTypes.important,
                            //         fixedColor: eventVm.colorTypes.important,
                            //         monthCssClass: `row-resource-activities-item`,
                            //         startsAt: moment.utc(item.key).toDate(),
                            //         endsAt: moment.utc(item.key).toDate(),
                            //         timestampStart: item.key,
                            //         draggable: false,
                            //         resizable: false,
                            //         dayOfWeek: dayOfWeek,
                            //         resourceAvailability: false,
                            //         isoState: itemState.iso,
                            //         state: getState(itemState.iso),
                            //         typeRow: 'event',

                            //     });
                            // }, 10);

                        }
                        let sumTotalRevenueEvents = 0;
                        let sumActivitiesEvents = 0;

                        _.forEach(eventVm.eventTypes, function (typeItem) {

                            // if ((eventVm.cri.type == "All" && item.types[typeItem.value]) || typeItem.value == eventVm.cri.type || $scope.userPermission.isRep || !eventVm.resourceAvailability) {
                            let sumTotalRevenue = _.sumBy(_.filter(item.events, ev => { return ev.type == typeItem.value; }), 'iptTotalRevenue');
                            sumTotalRevenueEvents += (Number(sumTotalRevenue) || 0);
                            sumActivitiesEvents += (Number(item.types[typeItem.value]) || 0);
                            itemState.eventsCalendar.push({
                                title: `<span data-cal-date class="col-md-6 no-padding no-margin">
                                    ${item.types[typeItem.value] || 0}
                                    </span>
                                    <span data-cal-date class="col-md-6 no-padding-left no-margin text-right">
                                    $${(Number(sumTotalRevenue) || 0).toFixed(2)}
                                    </span>`,
                                activities: item.types[typeItem.value] || 0,
                                titleMonth: `${item.types[typeItem.value] || 0} ${typeItem.text}`,
                                property: typeItem.text,
                                eventType: typeItem.value,
                                sumTotalRevenue: sumTotalRevenue || 0,
                                color: (item.types[typeItem.value] && item.types[typeItem.value] > 0) ? eventVm.colorTypes.info : eventVm.colorTypes.empty,
                                fixedColor: eventVm.colorTypes.info,
                                monthCssClass: (item.types[typeItem.value] && item.types[typeItem.value] > 0) ? `presentation-event-item` : 'empty-event-item',
                                startsAt: startAtDate,
                                endsAt: endAtDate,
                                timestampStart: item.key,
                                draggable: false,
                                resizable: false,
                                dayOfWeek: dayOfWeek,
                                state: itemState.stateTxt,
                                resourceAvailability: false,
                                isoState: itemState.iso,
                                typeRow: 'event',
                                canEditShift: canEditShift,

                            });

                        });
                        setTimeout(() => {
                            itemState.eventsCalendar.push({
                                activities: sumActivitiesEvents,
                                txtTitle: `Grand Total`,
                                property: `Grand Total`,
                                title: `<span data-cal-date class="col-md-6 no-padding no-margin">
                                    ${sumActivitiesEvents}
                                    </span>
                                    <span data-cal-date class="col-md-6 no-padding-left no-margin text-right">
                                    $${(Number(sumTotalRevenueEvents) || 0).toFixed(2)}
                                    </span>`,
                                sumTotalRevenue: Number(sumTotalRevenueEvents) || 0,
                                color: eventVm.colorTypes.important,
                                fixedColor: eventVm.colorTypes.important,
                                monthCssClass: `row-resource-activities-item`,
                                startsAt: startAtDate,
                                endsAt: endAtDate,
                                timestampStart: item.key,
                                draggable: false,
                                resizable: false,
                                dayOfWeek: dayOfWeek,
                                resourceAvailability: false,
                                isoState: itemState.iso,
                                state: itemState.stateTxt,
                                typeRow: 'event',

                            });
                        }, 10);

                        // }
                    });
                    // }


                });

                // reRenderUiCalendar();
                $timeout(angular.noop, 0);
                eventVm.isLoading = false;
                appUtils.hideLoading();

                $timeout(function () {
                    // eventVm.eventsGroupUS = _.find($scope.events, item => item.iso == 'US');
                    if (isExport) {
                        exportEventData();
                    } else {
                        $state.go('event.calendar', { 'keyword': eventVm.cri.keyword, 'start': eventVm.cri.timestampStart, 'page': eventVm.paging.currentPage, 'facilityId': eventVm.cri.facilities, 'alias': eventVm.cri.alias || null, 'type': eventVm.cri.type, 'state': eventVm.cri.state, 'plantype': eventVm.cri.plantypes, 'territory': eventVm.cri.territory, 'status': eventVm.cri.status }, { notify: false });
                    }

                }, 1000);
            });

        }
        function getDynamicClassColor(number) {
            if (!number) {
                return 0;
            }
            if (number === Infinity || number > 100) {
                return 100;
            }
            return Math.round(Number(number) / 10, 10) * 10;
        }
        function reRenderUiCalendar() {
            setTimeout(() => {
                if (eventVm.events && eventVm.events[0] && eventVm.events[0].groupByDateRange) {
                    // Get max row event
                    let countEventByDay = _.map(eventVm.events[0].groupByDateRange, item => {
                        let count = 0;
                        _.map(item.types, (value, key) => {
                            if (value >= 0) {
                                count++;
                            }
                        });
                        return { count: count };
                    });
                    let maxEventByDay = _.maxBy(countEventByDay, day => day.count);
                    angular.element(document.getElementsByClassName('cal-month-day'))
                        .removeClass('event-length-9')
                        .removeClass('event-length-8')
                        .removeClass('event-length-7')
                        .removeClass('event-length-6')
                        .removeClass('event-length-5')
                        .removeClass('event-length-4')
                        .removeClass('event-length-3')
                        .removeClass('event-length-2')
                        .removeClass('event-length-1')
                        .addClass(`event-length-${maxEventByDay ? maxEventByDay.count : 4}`);
                }
            }, 3000);

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
            if (value == 'US') {
                return 'United States';
            }
            var state = _.find(eventVm.allStates, function (item) {
                return item.iso === value.toUpperCase();
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
                    fullName = ` <a href="#/employees/edit/${uid}/">${e.displayName}  (<strong>${e.repCode}</strong></a>)`;
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
                id: data.alias,
                alias: data.alias,
                text: text.join(' ')
            };
        }

        function _composeFacilitySelectBoxText(data) {
            return {
                id: data.$id,
                text: data.name + ' (' + data.facility_promo_code + ')'
            };
        }


        function showReportInformation(rowItem) {
            let functionShowEvent = function () {
                let eventsFilter = [];
                let eventsByState = _.find(eventVm.events, item => item.iso == rowItem.isoState);
                let eventByTimestamp = _.find(eventsByState.groupByDateRange, item => item.key == rowItem.timestampStart);
                if (rowItem.timestampStart && rowItem.eventType) {
                    eventsFilter = _.filter(eventByTimestamp.events || [], item => {
                        return item.type == rowItem.eventType;
                    });
                } else {
                    eventsFilter = eventByTimestamp.events;
                }
                if (eventsFilter && eventsFilter.length > 0) {
                    modalInstance = $uibModal.open({
                        templateUrl: 'app/event/calendar/modal/events-modal.tpl.html',
                        controller: 'eventCalendarEventsModalCtrl as eventModalVm',
                        size: 'lg',
                        scope: $scope,
                        windowClass: 'dashboard-info-modal',
                        backdrop: 'static',
                        resolve: {
                            eventsData: function () {
                                return angular.copy(eventsFilter);
                            },
                            currentDay: function () {
                                return angular.copy(rowItem.timestampStart);
                            }
                        }
                    });

                    return modalInstance.result.then(function (res) {
                        // gotoAnchor(res);
                    }, function (res) {
                        // gotoAnchor(res);
                    });
                }
            };
            let modalInstance;

            if (rowItem.typeRow == 'employee') {
                let users = [];
                let repsWorkingUSState = angular.copy((eventVm.employees.US && eventVm.employees.US.users) || []);

                let repsWorkingState = angular.copy((eventVm.employees[rowItem.isoState] && eventVm.employees[rowItem.isoState].users) || []);
                let shiftOnDay = angular.copy(eventVm.employeesAvailable[rowItem.timestampStart] || { count: 0, repsAvailable: [] });
                let employeesAvailableDay = angular.copy(_.filter(shiftOnDay.repsAvailable, item => item.availability && _.find(repsWorkingState, r => r.$id == item.$id)));

                // let employeesAvailableDay = eventVm.employeesAvailable[rowItem.isoState][rowItem.timestampStart];

                if (rowItem.typeFilter == 'reps_available') {
                    //get available employees  by day
                    users = employeesAvailableDay;
                } else if (rowItem.typeFilter == 'reps_pending') {
                    // hanlde filter  reps_pending
                    users = _.filter(repsWorkingState, item => !_.find(shiftOnDay.repsAvailable, r => r.$id == item.$id));
                } else if (rowItem.typeFilter == 'cancellation_request') {
                    // hanlde filter  reps_pending
                    users = _.filter(shiftOnDay.repsAvailable, item => !item.availability && item.status === shiftUtils.StatusEnum.APPROVED && _.find(repsWorkingState, r => r.$id == item.$id));
                } else if (rowItem.typeFilter == 'reps_unavailable_add_availability' || rowItem.typeFilter == 'reps_unavailable') {
                    // hanlde filter  reps_unavailable include available && wasn't add availabe shift yet
                    users = _.differenceBy(repsWorkingState, employeesAvailableDay, '$id');
                    users = _.map(users, user => {
                        let listShift = shiftOnDay.repsAvailableGroup && shiftOnDay.repsAvailableGroup[user.uid];
                        if (listShift && listShift.length > 0) {
                            user.shiftDetail = listShift[0];
                            user.shiftDetail.repMail = user.notificationEmail || user.email;
                        }
                        return user;
                    });

                } else {
                    //get utilized employees 
                    let eventsByState = _.find(eventVm.events, item => item.iso == rowItem.isoState);
                    let eventByTimestamp = _.find(eventsByState.groupByDateRange, item => item.key == rowItem.timestampStart);

                    if (rowItem.typeFilter == 'unutilized') {
                        //get unutilized employees 
                        // let eventByTimestamp = _.find($scope.events, item => item.key == rowItem.timestampStart);
                        users = _.differenceBy(employeesAvailableDay, eventByTimestamp.repsActivities, '$id');
                    } else {
                        //get utilized employees 
                        users = _.filter(eventByTimestamp.repsActivities, function (i) { return _.find(repsWorkingState, function (r) { return r.$id == i.$id; }); });
                        // users = _.intersectionBy(repsWorkingUSState, eventByTimestamp.repsActivities, '$id');
                    }
                }
                // if (rowItem.property === "Total Reps Pending" && users && users.length > 0) {
                //     showRepsPendingModal(users, rowItem.timestampStart);
                // }
                // merge info rep
                users = _.map(users, user => {
                    let infoUser = _.find(repsWorkingUSState, rep => rep.$id == user.$id);
                    delete infoUser.availability;
                    let rs = _.merge(user, infoUser);
                    return rs;
                });

                if ((users && users.length > 0) || rowItem.typeFilter == 'reps_unavailable_add_availability') {

                    modalInstance = $uibModal.open({
                        templateUrl: 'app/event/calendar/modal/employees-modal.tpl.html',
                        controller: 'eventCalendarEmployeesModalCtrl as eventModalVm',
                        size: 'lg',
                        scope: $scope,
                        windowClass: 'dashboard-info-modal',
                        backdrop: 'static',
                        resolve: {
                            usersData: function () {
                                return angular.copy(users);
                            },
                            titleParams: function () {
                                return angular.copy(rowItem.property);
                            },
                            currentDay: function () {
                                return angular.copy(rowItem.timestampStart);
                            },
                            typeModal: function () {
                                return angular.copy(rowItem.typeFilter);
                            },
                            currentUser: function () {
                                return currentUser;
                            }
                        }
                    });

                    return modalInstance.result.then(function (res) {
                        $('html').removeClass('modal-open');
                        // gotoAnchor(res);
                    }, function (res) {
                        $('html').removeClass('modal-open');
                        if (res) {
                            searchCalendar();
                        }
                        // gotoAnchor(res);
                    });
                } else {
                    // functionShowEvent();
                }
            } else { //(rowItem.typeRow == "event") 
                functionShowEvent();
            }


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
                    if ($scope.userPermission.isAdmin) {
                        text.push(`<a target="_blank" href="#/employees/edit/${data.employeeId || key}/">${fullName}</a>`);
                    } else {
                        text.push(fullName);
                    }
                }
            });
            return text.join(";");
        };

        //Private
        function _getManagerText(items, isExport) {
            var reqs = [];
            _.forEach(items, function (item) {
                item.rep = appUtils.checkSpecifyRole(item, 'rep');
                if (item.managers && item.managers.length > 0) {
                    var alias = item.managers[0];
                    var req = departmentSevice.get(alias).then(function (data) {
                        var manager = data && data.manager || {},
                            text = [];
                        if (manager.alias) {
                            var arr = manager.alias.split("_");
                            if (arr && arr.length > 0) {
                                if (!isExport) {
                                    // fullName =` <a href="#/employees/edit/${uid}/">${e.displayName}  (<strong>${e.repCode}</strong></a>)`;
                                    text.push(`<strong> ${arr[0]} </strong>`);
                                } else {
                                    text.push(arr[0]);
                                }
                            }
                        }
                        if (manager.name) {
                            text.push(manager.name);
                        }
                        if ($scope.userPermission.isAdmin) {
                            item.manager = `<a target="_blank" href="#/employees/edit/${manager.id}/">${text.length > 0 && text.join(': ') || ''}</a>`;
                        } else {
                            item.manager = text.length > 0 && text.join(': ') || '';
                        }
                    });
                    reqs.push(req);
                }
            });
            return $q.all(reqs);
        }

        function getRoleText(user) {
            var roleText = "";
            if (user.acl && user.acl.roles) {
                var roleIds = Object.keys(user.acl.roles);
                if (roleIds && roleIds.length > 0) {
                    var assigned = [];
                    _.forEach(roleIds, function (roleId) {
                        if ($scope.roles[roleId]) {
                            assigned.push($scope.roles[roleId]);
                        }
                    });
                    var highestRole = _.minBy(assigned, 'number');
                    roleText = highestRole && highestRole.name || "";
                }
            }

            return roleText;
        }

        function onChangeResourceAvailability() {
            searchCalendar();
        }

        function onChangeCalendarView() {
            // var defaultStart = Date.parse(new Date(moment().subtract('days', 6).startOf('day')));
            // var defaultEnd = Date.parse(new Date(moment().endOf('day')));

            let startStr = moment(eventVm.viewDate).format('MM/DD/YYYY');
            if (eventVm.calendarView == 'month') {


                // eventVm.timestampStart = moment(eventVm.viewDate).add(1, 'days').startOf('month').valueOf();
                // eventVm.cri.timestampStart = moment(eventVm.viewDate).add(1, 'days').utc().startOf('month').valueOf();
                // eventVm.timestampEnd = moment(eventVm.viewDate).add(1, 'days').endOf('month').valueOf();
                // eventVm.cri.timestampEnd = moment(eventVm.viewDate).add(1, 'days').utc().endOf('month').valueOf();
                eventVm.timestampStart = moment.utc(startStr).startOf("month").valueOf();
                eventVm.cri.timestampStart = moment.utc(startStr).startOf("month").valueOf();
                eventVm.timestampEnd = moment.utc(startStr).endOf('month').valueOf();
                eventVm.cri.timestampEnd = moment.utc(startStr).endOf('month').valueOf();
                eventVm.viewDate = moment(moment.utc(eventVm.timestampStart).format('MM/DD/YYYY')).toDate();//moment(eventVm.timestampStart).toDate();
                console.log('eventVm.viewDate', eventVm.viewDate);
                console.log('eventVm.timestampStart', eventVm.timestampStart);
            } else if (eventVm.calendarView == 'week') {
                eventVm.timestampStart = moment.utc(startStr).startOf("week").valueOf();
                eventVm.cri.timestampStart = moment.utc(startStr).startOf("week").valueOf();
                eventVm.timestampEnd = moment.utc(startStr).endOf('week').valueOf();
                eventVm.cri.timestampEnd = moment.utc(startStr).endOf('week').valueOf();
                eventVm.viewDate = moment(moment.utc(eventVm.timestampStart).format('MM/DD/YYYY')).toDate();

                // eventVm.timestampStart = moment(eventVm.viewDate).startOf('week').valueOf();
                // eventVm.cri.timestampStart = moment(eventVm.viewDate).utc().startOf('week').valueOf();
                // eventVm.timestampEnd = moment(eventVm.viewDate).endOf('week').valueOf();
                // eventVm.cri.timestampEnd = moment(eventVm.viewDate).utc().endOf('week').valueOf();
                // eventVm.viewDate = moment(eventVm.timestampStart).toDate();
            }
            // $timeout( $scope.$broadcast('resetDateRange'), 500);
            $scope.$broadcast('resetDateRange');
            searchCalendar(true);

        }

        function getMonthText() {
            return moment.utc(eventVm.cri.timestampStart).format("MMMM YYYY");
        }

        function createDateRange(start, end) {
            var startTime = moment(start).utc();
            var endTime = moment(end).utc();
            let groupByDateRange = [];
            while (startTime <= endTime) {
                groupByDateRange.push({
                    key: new moment(startTime).utc().startOf('day').valueOf(),
                    title: new moment(startTime).utc().startOf('day').format("MM/DD/YYYY"),
                    events: [],
                    repsActivities: [],
                    totalActivities: 0,
                    totalEvents: 0,
                    types: {}
                });
                startTime.add(1, 'day');
            }
            return groupByDateRange;
        }



    }
})();