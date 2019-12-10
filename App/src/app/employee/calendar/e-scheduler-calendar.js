(function () {
    'use strict';

    angular.module('app.employee')
        .controller('ESchedulerCalendarCtrl', ESchedulerCalendarCtrl).config(function ($mdDateLocaleProvider) {
            // Can change week display to start on Monday.
            $mdDateLocaleProvider.firstDayOfWeek = 1;
            // Optional.
        });

    /** @ngInject */
    function ESchedulerCalendarCtrl($rootScope, $stateParams, $scope, $state, $timeout, $ngBootbox,
        $q, appUtils, DataUtils, toaster, authService, eventService, employeeService, memTerritoryService,
        memberShipFacilitiesService, memStateService, memRegionService, eventGoalService, eventExportService,
        eventExportFullService, eventExportCalendarService, calendarConfig, $uibModal, departmentSevice,
        roleService, calendarEventTitle, shiftsService, notificationService, shiftUtils) {
        $rootScope.settings.layout.pageSidebarClosed = true;
        var currentUser = authService.getCurrentUser(), //$rootScope.storage.currentUser,
            appSettings = $rootScope.storage.appSettings;

        $scope.userPermission = $rootScope.storage.statePermission;
        $scope.userPermission.isAdmin = appUtils.checkSpecifyRole(currentUser, 'admin');
        $scope.userPermission.isRep = appUtils.checkSpecifyRole(currentUser, 'rep');
        $scope.titlePage = 'E-scheduler';
        $scope._getManagerText = _getManagerText;
        $scope.getRoleText = getRoleText;
        var eCalendarVm = this; //
        moment.locale('en_gb', {
            week: {
                dow: 1 // Monday is the first day of the week
            }
        });
        eCalendarVm.appSettings = appSettings;

        var timestampStart = moment().startOf('day'),
            timestampEnd = moment().endOf('month');
        // eCalendarVm.modeView = 'calendarView';
        var currentDate = moment(); //init local time
        eCalendarVm.timestampCurrent = moment.utc(currentDate.format('MM/DD/YYYY'), 'MM/DD/YYYY').startOf('day').valueOf(); //parse to UTC time
        eCalendarVm.currentUid = currentUser.$id;
        eCalendarVm.userId = $stateParams.id;
        eCalendarVm.currentUser = currentUser;
        eCalendarVm.allStates = [];
        eCalendarVm.eventsByStates = [];
        eCalendarVm.allRegions = [];
        eCalendarVm.regionGroups = {};
        eCalendarVm.allTerritories = [];
        eCalendarVm.allFacilities = [];
        eCalendarVm.allEmployees = [];
        eCalendarVm.employees = [];
        eCalendarVm.eventTypes = [];
        // eCalendarVm.changePage = changePage;
        eCalendarVm.getType = getType;
        eCalendarVm.getState = getState;
        eCalendarVm.getRegion = getRegion;
        eCalendarVm.getTerritory = getTerritory;
        eCalendarVm.getDateTime = getDateTime;
        eCalendarVm.getRequester = getRequester;
        eCalendarVm.getFacility = getFacility;
        // eCalendarVm.search = search;
        eCalendarVm.searchCalendar = searchCalendar;
        eCalendarVm.searchKeyword = searchKeyword;
        eCalendarVm.resetFiler = resetFiler;
        eCalendarVm.exportEventData = exportEventData;
        eCalendarVm.showReportInformation = showReportInformation;
        eCalendarVm.onChangeResourceAvailability = onChangeResourceAvailability;
        eCalendarVm.reRenderUiCalendar = reRenderUiCalendar;
        eCalendarVm.onChangeCalendarView = onChangeCalendarView;
        eCalendarVm.getMonthText = getMonthText;
        eCalendarVm.editShift = editShift;
        eCalendarVm.cancelShift = cancelShift;
        eCalendarVm.showSignUpShiftCalendar = showSignUpShiftCalendar;
        eCalendarVm.createDateRange = createDateRange;
        // eCalendarVm.exportD = exportD;
        eCalendarVm.requester = null;
        eCalendarVm.isLoading = false;
        eCalendarVm.resourceAvailability = false; //!$scope.userPermission.isRep ? true : false;
        eCalendarVm.cri = {
            keyword: $stateParams.keyword ? $stateParams.keyword : '',
            type: $stateParams.type || 'All',
            status: $stateParams.status || '1',
            size: 20,
            from: 0,
            dataEntered: null,
            alias: null,
            moenyOrder: null,
            memKeyword: null,
            state: currentUser.state
        };
        eCalendarVm.chooseState = (currentUser && currentUser.workingStates && Object.keys(currentUser.workingStates).length > 0) ? Object.keys(currentUser.workingStates)[0] : currentUser.state;

        eCalendarVm.dataEnteredOpts = [
            { val: null, text: 'All' },
            { val: false, text: 'New' },
            { val: true, text: 'Data Entered' }
        ];
        calendarEventTitle.monthViewTooltip = calendarEventTitle.weekViewTooltip = calendarEventTitle.dayViewTooltip = function () {
            return '';
        };
        //get query start date
        var start = $stateParams.start && !isNaN(parseInt($stateParams.start)) ? moment(parseInt($stateParams.start)).utc() : timestampStart;


        // eCalendarVm.timestampStart = start.startOf('month').valueOf();
        eCalendarVm.timestampStart = eCalendarVm.cri.timestampStart = moment.utc(start.startOf('month').format('MM/DD/YYYY')).startOf('day').valueOf();
        //get query end date
        // var end = $stateParams.end && !isNaN(parseInt($stateParams.end)) ? moment(parseInt($stateParams.end)).utc() : timestampEnd;
        eCalendarVm.timestampEnd = moment(eCalendarVm.cri.timestampStart).utc().endOf('month').valueOf(); //end.valueOf();
        eCalendarVm.cri.timestampEnd = angular.copy(moment(eCalendarVm.timestampEnd)).utc().endOf('day').valueOf();

        eCalendarVm.paging = {
            pageSize: 20,
            currentPage: $stateParams.page ? parseInt($stateParams.page) : 0,
            totalPage: 0,
            totalRecord: 0
        };
        eCalendarVm.eventStatus = appUtils.eventStatus;
        eCalendarVm.events = [];

        eCalendarVm.select2Options = {
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

        eCalendarVm.select2OptionsF = {
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
        eCalendarVm.calendarView = $stateParams.calendarView ? $stateParams.calendarView : 'month';

        eCalendarVm.viewDate = eCalendarVm.timestampStart ? new Date(moment.utc(eCalendarVm.timestampStart).format('MM/DD/YYYY')) : new Date();

        var actions = [{
            label: '<i class=\'glyphicon glyphicon-pencil\'></i>',
            onClick: function (args) {
                //console.log('Edited', args.calendarEvent);

            }
        }, {
            label: '<i class=\'glyphicon glyphicon-remove\'></i>',
            onClick: function (args) {
                //console.log('Deleted', args.calendarEvent);
            }
        }];
        eCalendarVm.modifyCell = function (cell) {
            cell.cssClass = !eCalendarVm.resourceAvailability ? 'custom-month-cell-employee-calendar' : 'custom-month-cell-manager-calendar';
        };

        // console.log('calendarConfig.colorTypes', JSON.stringify(calendarConfig.colorTypes));
        calendarEventTitle.monthViewTooltip = calendarEventTitle.weekViewTooltip = calendarEventTitle.dayViewTooltip = function () {
            return '';
        };
        eCalendarVm.colorTypes = {
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
                "secondary": "rgb(227, 188, 8)" //"rgb(63, 81, 181)"
            },
            "cancelled": {
                "primary": "rgb(173, 33, 33)",
                "secondary": "#ED98C6" //"rgb(63, 81, 181)"
            },
            "unutilized": {
                "primary": "#fde7e7",
                "secondary": "#6fc2d0" //"rgb(63, 81, 181)"
            },
            "repsavailable": {
                "primary": "rgb(33, 173, 43)",
                "secondary": "rgb(159, 168, 218)" //"rgb(63, 81, 181)"
            },
            "utilized": {
                "primary": "#800080",
                "secondary": "rgb(199, 146, 213" //"rgb(63, 81, 181)"
            },
            "empty": {
                "primary": "rgb(176, 176, 176)",
                "secondary": "rgb(176, 176, 176);" //"rgb(63, 81, 181)"
            },
            "white": {
                "primary": "#800080",
                "secondary": "rgb(255, 255, 255);" //"rgb(63, 81, 181)"
            },
        };

        eCalendarVm.cellIsOpen = false;

        eCalendarVm.addEvent = function () {
        };

        eCalendarVm.eventClicked = function (event) {
            if (event.typeRow) {
                eCalendarVm.showReportInformation(event);
            } else if (event.events && event.events.length > 0) {
                eCalendarVm.editShift(event);
            }
        };


        eCalendarVm.eventEdited = function (event) {
            //console.log('Edited', event);
        };

        eCalendarVm.eventDeleted = function (event) {
            //console.log('Deleted', event);
        };

        eCalendarVm.eventTimesChanged = function (event) {
            //console.log('Dropped or resized', event);
        };

        eCalendarVm.toggle = function ($event, field, event) {
            //console.log('toggle');

            $event.preventDefault();
            $event.stopPropagation();
            event[field] = !event[field];
        };

        eCalendarVm.timespanClicked = function (date, cell) {

            if (eCalendarVm.calendarView === 'month') {
                if ((eCalendarVm.cellIsOpen && moment(date).startOf('day').isSame(moment(eCalendarVm.viewDate).startOf('day'))) || cell.events.length === 0 || !cell.inMonth) {
                    eCalendarVm.cellIsOpen = false;
                } else {
                    eCalendarVm.cellIsOpen = true;
                    eCalendarVm.viewDate = date;
                }
            } else if (eCalendarVm.calendarView === 'year') {
                if ((eCalendarVm.cellIsOpen && moment(date).startOf('month').isSame(moment(eCalendarVm.viewDate).startOf('month'))) || cell.events.length === 0) {
                    eCalendarVm.cellIsOpen = false;
                } else {
                    eCalendarVm.cellIsOpen = true;
                    eCalendarVm.viewDate = date;
                }
            }

        };
        eCalendarVm.viewChangeClicked = function (nextView) {
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

                    eCalendarVm.cri.timestampStart = eCalendarVm.timestampStart = moment.utc(startStr).startOf("day").valueOf();
                    eCalendarVm.cri.timestampEnd = eCalendarVm.timestampEnd = moment.utc(endStr).endOf("day").valueOf();
                    
                    eCalendarVm.viewDate =  moment(moment.utc(eCalendarVm.timestampStart).format('MM/DD/YYYY')).toDate();
                    searchCalendar();

                });
            }, 800);
        });

        //===================
        function loadData() {
            // var ua = navigator.userAgent.toLowerCase();
            // console.log(ua);
            // if (ua.indexOf('crios') === -1 && ua.indexOf('chrome') === -1) {
            //     if (ua.indexOf('safari') != -1) {
            //         //go continute
            //         $ngBootbox.alert('E-Scheduler is not compatible with Safari, please try the best on Chrome. Thank you!');
            //     } else {
            //         // alert("2") // Safari

            //         //return;
            //     }
            // }
            var filterUser = null;
            if ($stateParams.state) {
                eCalendarVm.chooseStates = $stateParams.state.split(',') || [''];
            } else {
                $timeout(function () {

                    eCalendarVm.chooseStates = [(eCalendarVm.currentUser && eCalendarVm.currentUser.workingStates && Object.keys(eCalendarVm.currentUser.workingStates).length > 0) ? Object.keys(eCalendarVm.currentUser.workingStates)[0] : eCalendarVm.currentUser.state];
                }, 200);
            }

            if ($stateParams.territory) {
                eCalendarVm.chooseTerritories = $stateParams.territory.split(',') || [];
            } else {
                $timeout(function () {
                    eCalendarVm.chooseTerritories = [];
                    $('#chooseTerritories').trigger('change');
                }, 200);
            }

            if ($stateParams.plantype) {
                eCalendarVm.chooseRegions = $stateParams.plantype.split(',') || [];
            } else {
                $timeout(function () {
                    eCalendarVm.chooseRegions = [];
                    $('#chooseRegions').trigger('change');
                }, 200);
            }

            if ($stateParams.facilityId) {
                eCalendarVm.chooseFacilities = $stateParams.facilityId.split(',') || [];
            } else {
                $timeout(function () {
                    eCalendarVm.chooseFacilities = [];
                    $('#chooseFacilities').trigger('change');
                }, 200);
            }

            eCalendarVm.cri.alias = $stateParams.alias || (!$scope.userPermission.isAdmin ? currentUser.alias : null);

            //will cleanup code: not use requester
            eCalendarVm.cri.requester = $stateParams.requester || (!$scope.userPermission.isRep ? 'All' : currentUser.$id);
            var all = [_loadEventTypes(), _loadStates(), _loadRegions(), _loadFacilities(), _loadTerritories()];
            if (eCalendarVm.cri.requester !== 'All' && eCalendarVm.cri.requester !== currentUser.$id) {
                var arr = angular.copy(eCalendarVm.cri.requester).split(','),
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
                });

                $timeout(function () {
                    var option, selectOpt;

                    if (!eCalendarVm.cri.alias || eCalendarVm.cri.alias == 'All' || $scope.userPermission.isAdmin) {
                        eCalendarVm.cri.alias = !$scope.userPermission.isAdmin ? eCalendarVm.currentUser.alias : 'All';
                        option = new Option('Managers (Hierarchical Permissions)', eCalendarVm.cri.alias || 'All', true, true);
                        $('#filterRequester').append(option).trigger('change');
                    } else {
                        if (filterUser) {
                            selectOpt = _composeSelectBoxText(filterUser);
                            option = new Option(selectOpt.text, selectOpt.id, true, true);
                            $('#filterRequester').append(option).trigger('change');
                        }
                    }

                    if (eCalendarVm.chooseFacilities) {
                        var facilities = _.filter(eCalendarVm.allFacilities, function (item) {
                            return eCalendarVm.chooseFacilities.indexOf(item.$id) !== -1;
                        });

                        _.forEach(facilities, function (fObj) {
                            selectOpt = _composeFacilitySelectBoxText(fObj);
                            option = new Option(selectOpt.text, selectOpt.id, true, true);
                            $('#chooseFacilities').append(option).trigger('change');
                        });
                    }
                }, 400);
                // console.log('$state.current.url', $state.current.url);
                searchCalendar();
                isCanAddAvailability();
            });
            //});
        }

        function _loadStates() {
            return memStateService.getAll().then(function (data) {
                //compose show ui-select2
                // console.log('allStates', data);

                eCalendarVm.allStates = data || [];

                $timeout(angular.noop, 200);
            });
        }

        function _loadRegions() {
            return memRegionService.getAll().then(function (regionGroups) {
                _.each(regionGroups, function (regionGroup, stateCode) {
                    var regions = DataUtils.toAFArray(regionGroup);
                    eCalendarVm.allRegions = eCalendarVm.allRegions.concat(regions);
                    regionGroups[stateCode] = regions;
                });
                eCalendarVm.regionGroups = regionGroups;
                $timeout(angular.noop, 200);
            });
        }

        function _loadTerritories() {
            return memTerritoryService.getAllTerritoryLoadOnce().then(function (data) {
                eCalendarVm.allTerritories = data || [];
                $timeout(angular.noop, 200);
            });
        }


        function _loadFacilities() {
            return memberShipFacilitiesService.itemsLoadOnce().then(function (data) {
                eCalendarVm.allFacilities = angular.copy(data || []);

                $timeout(angular.noop, 200);
            });
        }

        function _loadEventTypes() {
            return eventService.getEventTypes().then(function (types) {
                // eCalendarVm.eventTypes = types; //_.filter(types, typeItem => typeItem.text != "Miscellaneous") || [];
                eCalendarVm.eventTypes = _.filter(types, typeItem => typeItem.text != "GSW" && typeItem.text != "Counter Sales") || [];
            });
        }


        function searchCalendar(isFilter, isExport) {
            appUtils.showLoading();
            eCalendarVm.isLoading = true;
            eCalendarVm.cri.from = 0;
            if (isFilter) {
                // eCalendarVm.cri.alias = !$scope.userPermission.isAdmin ? $('#filterRequester').val() : null;
                eCalendarVm.cri.alias = $('#filterRequester').val();
                // let requesterSelected = $('#filterRequester').select2('data');
            }
            eCalendarVm.cellAutoOpenDisabled = !mobileAndTabletcheck();
            _searchCalendar(isExport);
        }

        function searchKeyword() {
            var length = eCalendarVm.cri.keyword.length;
            if (length === 0 || length >= 3) {
                search();
            }
        }

        function resetFiler() {
            eCalendarVm.cri = {
                keyword: '',
                type: 'All',
                status: '1',
                size: 20,
                from: 0,
                dataEntered: null,
                alias: null,
                moenyOrder: null,
                memKeyword: null,
                state: ''
            };
            $timeout(function() {
                $('#chooseRegions').val([]).trigger('change');
                $('#chooseFacilities').val([]).trigger('change');
            }, 200);
            eCalendarVm.chooseFacilities = [];
            eCalendarVm.chooseRegions = [];

            var startStr = moment().format('MM/DD/YYYY');

            eCalendarVm.timestampStart = eCalendarVm.cri.timestampStart = moment.utc(startStr).startOf('month').valueOf();
            eCalendarVm.timestampEnd = eCalendarVm.cri.timestampEnd = moment.utc(startStr).endOf('month').valueOf();
            eCalendarVm.viewDate = moment(moment.utc(eCalendarVm.timestampStart).format('MM/DD/YYYY')).toDate();

            // eCalendarVm.timestampStart = eCalendarVm.cri.timestampStart = moment.utc(start.startOf('month').format('MM/DD/YYYY')).startOf('day').valueOf();
            // eCalendarVm.cri.timestampEnd = eCalendarVm.timestampEnd = moment().utc(eCalendarVm.cri.timestampStart).endOf('month').valueOf(); //end.valueOf();
            $timeout(function () {
                $scope.$broadcast('resetDateRange');
                searchCalendar(true);
                $timeout(angular.noop, 0);
                // $state.go('employee.calendar', { 'keyword': '', 'start': null, 'end': null, 'page': 0, 'requester': (!$scope.userPermission.isRep ? 'All' : currentUser.$id), 'facilityId': null, 'alias': eCalendarVm.cri.alias, 'type': 'All', 'state': null, 'plantype': null, 'territory': null, 'status': '1' }, { reload: true });
            }, 400);
        }

        function exportEventData() {
            var cri = angular.copy(eCalendarVm.cri);
            //remove us 
            if (eCalendarVm.cri.state) {
                let eventByUS = _.find(eCalendarVm.eventsExport, item => item.iso == 'US');
                if (eventByUS) {
                    eventByUS.groupByDateRange = [];
                }
            }
            cri.size = 5000;
            appUtils.showLoading();
            var startTxt = moment(eCalendarVm.cri.timestampStart).utc().format('MM/DD/YYYY').replace('/', '_'),
                endTxt = moment(eCalendarVm.cri.timestampEnd).utc().format('MM/DD/YYYY').replace('/', '_');

            var exportFileName = "Resource_Utilization_Export" + '_' + startTxt + "_to_" + endTxt;
            var opts = {
                states: DataUtils.array2ObjectIndex(eCalendarVm.allStates, 'iso'),
                eventTypes: DataUtils.array2ObjectIndex(eCalendarVm.eventTypes, '$id'),
                facilities: DataUtils.array2ObjectIndex(eCalendarVm.allFacilities, '$id'),
                territories: DataUtils.array2ObjectIndex(eCalendarVm.allTerritories, '$id'),
                regions: DataUtils.array2ObjectIndex(eCalendarVm.allRegions, 'id'),
                fileName: exportFileName,
                rawData: eCalendarVm.eventsExport
            };
            return eventExportCalendarService.exportWorkbook(cri, opts).then(function () {
                appUtils.hideLoading();
            });
        }


        function _searchCalendar(isExport) {

            // console.log('stateObj', stateObj);

            // let itemState.iso = stateObj.name || '';
            eCalendarVm.cri.state = ''; //eCalendarVm.chooseStates && eCalendarVm.chooseStates.length > 0 ? eCalendarVm.chooseStates.join(',') : '';
            eCalendarVm.cri.territory = eCalendarVm.chooseTerritories && eCalendarVm.chooseTerritories.length > 0 ? eCalendarVm.chooseTerritories.join(',') : '';
            eCalendarVm.cri.facilities = eCalendarVm.chooseFacilities && eCalendarVm.chooseFacilities.length > 0 ? eCalendarVm.chooseFacilities.join(',') : '';
            eCalendarVm.cri.plantypes = eCalendarVm.chooseRegions && eCalendarVm.chooseRegions.length > 0 ? eCalendarVm.chooseRegions.join(',') : '';
            // eCalendarVm.cri.alias = eCalendarVm.cri.alias != "null" ? eCalendarVm.cri.alias: '';
            eCalendarVm.cri.requester = eCalendarVm.userId; //eCalendarVm.currentUser.uid;


            // delete eCalendarVm.cri.requester;
            let srcP = [eventService.searchCalendar(eCalendarVm.cri, eCalendarVm.allStates)];
            let employeeCri = angular.copy(eCalendarVm.cri);
            employeeCri.ids = eCalendarVm.userId; //eCalendarVm.currentUser.uid;
            //1 - available; 2 - unavailable
            srcP.push(shiftsService.searchShift(employeeCri));
            // }
            $q.all(srcP).then(function (result) {
                appUtils.hideLoading();
                //move state us-obj to first array
                result[0] = _.sortBy(result[0], [item => getState(item.iso).toLowerCase()], ['asc']);
                result[0] = _.sortBy(result[0], item => {
                    return (item.iso == 'US' ? 0 : 1);
                });
                eCalendarVm.employeesAvailable = result[1] || [];

                if (isExport) {
                    eCalendarVm.eventsExport = result[0];
                } else {
                    eCalendarVm.events = result[0];
                    eCalendarVm.eventsByStates = result[0];
                    $scope.events = result[0];
                    eCalendarVm.eventsGroupUS = _.find(result[0], item => item.iso == 'US') || { groupByDateRange: [] };

                }
                eCalendarVm.isHaveRecords = false;
                let groupByDateRange = createDateRange(eCalendarVm.cri.timestampStart, eCalendarVm.cri.timestampEnd);

                result[0].forEach(itemState => {
                    itemState.eventsCalendar = [];
                    itemState.stateTxt = getState(itemState.iso);
                    if ((!itemState.groupByDateRange || itemState.groupByDateRange.length == 0) && (itemState.iso == "US" || eCalendarVm.cri.state == '' || eCalendarVm.cri.state.indexOf(itemState.iso) > -1)) {
                        // fake data
                        // console.log('itemStateUS', JSON.parse(JSON.stringify(itemStateUS)));
                        itemState.groupByDateRange = angular.copy(groupByDateRange) || [];
                        // console.log('itemState', itemState, groupByDateRange);
                    }
                    itemState.groupByDateRange.forEach(item => {
                        //chech existed any event
                        if (item.events && item.events.length > 0) {
                            eCalendarVm.isHaveRecords = true;
                        }

                        var lDate = moment(moment.utc(item.key).format("YYYY MM DD"), 'YYYY MM DD');
                        var startAtDate = lDate.clone().toDate();
                        var endAtDate = lDate.clone().toDate();
                        //call percent
                        let dayOfWeek = lDate.format('dddd').toLowerCase();
                        let sumTotalRevenueEvents = 0;
                        let sumActivitiesEvents = 0;
                        // console.log('item', item);
                        let repsByDay = eCalendarVm.employeesAvailable && eCalendarVm.employeesAvailable[item.key];
                        let currentvaibility = repsByDay && repsByDay.repsAvailable && repsByDay.repsAvailable[0];

                        let statusShift = currentvaibility ? (currentvaibility.availability ? 1 : 0) : -1;
                        let colorShift = getColorByStatus(statusShift);
                        let classShift = getColorAvailabilityByStatus(statusShift);
                        let canEditShift = eCalendarVm.timestampCurrent <= item.key && eCalendarVm.userId === eCalendarVm.currentUid;
                        _.forEach(eCalendarVm.eventTypes, function (typeItem) {
                            let sumTotalRevenue = _.sumBy(_.filter(item.events, ev => { return ev.type == typeItem.value; }), 'iptTotalRevenue');
                            sumTotalRevenueEvents += (Number(sumTotalRevenue) || 0);
                            sumActivitiesEvents += (Number(item.types[typeItem.value]) || 0);

                            //console.log(eCalendarVm.timestampCurrent, item.key);

                            itemState.eventsCalendar.push({
                                title: `<span data-cal-date class="col-md-6 no-padding no-margin">
                                    ${item.types[typeItem.value] || 0}
                                    </span>
                                    <span data-cal-date class="col-md-6 no-padding no-margin">
                                    $${(Number(sumTotalRevenue) || 0).toFixed(2)}
                                    </span>`,
                                activities: item.types[typeItem.value] || 0,
                                titleMonth: `${item.types[typeItem.value] || 0} ${typeItem.text}`,
                                property: typeItem.text,
                                eventType: typeItem.value,
                                sumTotalRevenue: sumTotalRevenue || 0,
                                color: (item.types[typeItem.value] && item.types[typeItem.value] > 0) ? eCalendarVm.colorTypes.info : eCalendarVm.colorTypes.empty,
                                fixedColor: eCalendarVm.colorTypes.info,
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
                                statusShift: statusShift,
                                colorShift: colorShift,
                                classShift: classShift,
                                shiftId: currentvaibility ? currentvaibility.shiftId : '',
                                canEditShift: canEditShift,
                                txtShift: `<span style=" font-size: medium; ">12 </span>`
                            });

                        });
                        // if (!$scope.userPermission.isRep) {
                        setTimeout(() => {
                            itemState.eventsCalendar.push({
                                activities: sumActivitiesEvents,
                                txtTitle: `Grand Total`,
                                property: `Grand Total`,
                                title: `<span data-cal-date class="col-md-6 no-padding no-margin">
                                        ${sumActivitiesEvents}
                                        </span>
                                        <span data-cal-date class="col-md-6 no-padding no-margin">
                                        $${(Number(sumTotalRevenueEvents) || 0).toFixed(2)}
                                        </span>`,
                                sumTotalRevenue: sumTotalRevenueEvents || 0,
                                color: eCalendarVm.colorTypes.important,
                                fixedColor: eCalendarVm.colorTypes.important,
                                monthCssClass: `row-resource-activities-item`,
                                startsAt: startAtDate,
                                endsAt: endAtDate,
                                timestampStart: item.key,
                                draggable: false,
                                resizable: false,
                                funcClick: eCalendarVm.showReportInformation,
                                dayOfWeek: dayOfWeek,
                                resourceAvailability: false,
                                isoState: itemState.iso,
                                state: itemState.stateTxt,
                                typeRow: 'event',

                            });
                        }, 10);
                    });
                    // }


                });

                // reRenderUiCalendar();
                $timeout(angular.noop, 0);
                eCalendarVm.isLoading = false;

                $timeout(function () {
                    // eCalendarVm.eventsGroupUS = _.find($scope.events, item => item.iso == 'US');
                    if (isExport) {
                        exportEventData();
                    } else {
                        // $state.go('employee.calendar', { 'keyword': eCalendarVm.cri.keyword, 'start': eCalendarVm.timestampStart, 'page': eCalendarVm.paging.currentPage, 'facilityId': eCalendarVm.cri.facilities, 'alias': eCalendarVm.cri.alias || null, 'type': eCalendarVm.cri.type, 'state': eCalendarVm.cri.state, 'plantype': eCalendarVm.cri.plantypes, 'territory': eCalendarVm.cri.territory, 'status': eCalendarVm.cri.status }, { notify: false });
                    }

                }, 1000);
            });

        }

        function reRenderUiCalendar() {
            setTimeout(() => {
                // Get max row event
                let countEventByDay = _.map(eCalendarVm.events, item => {
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
                    .addClass(`event-length-${maxEventByDay ? maxEventByDay.count : 4}`);
            }, 1000);

        }

        function getColorByStatus(status) {
            let color = '';
            switch (status) {
                case 0:
                    color = eCalendarVm.colorTypes.cancelled.primary;
                    break;
                case 1:
                    color = eCalendarVm.colorTypes.repsavailable.primary;
                    break;
                case -1:
                    color = '';
                    break;
                default:
                    break;
            }
            return color; //status == 0 ? eCalendarVm.colorTypes.cancelled.primary : eCalendarVm.colorTypes.repsavailable.primary;
            // (
            //     status == 2 ? eCalendarVm.colorTypes.repsavailable.secondary : (
            //         status == 3 ? eCalendarVm.colorTypes.pending.secondary : eCalendarVm.colorTypes.cancelled.secondary
            //     ));
        }

        function getColorAvailabilityByStatus(status) {
            let classShift = '';
            switch (status) {
                case 0:
                    classShift = 'shift-unavailable';
                    break;
                case 1:
                    classShift = 'shift-available';
                    break;
                case -1:
                    classShift = '';
                    break;
                default:
                    break;
            }
            return classShift;
        }

        function getType(value) {

            var type = _.find(eCalendarVm.eventTypes, function (item) {
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
            var state = _.find(eCalendarVm.allStates, function (item) {
                return item.iso === value.toUpperCase();
            });

            return state && state.name || '';
        }

        function getRegion(item) {
            var region = _.find(eCalendarVm.regionGroups[item.state], { id: item.region + '' });
            return region && region.guid || '';
        }

        function getTerritory(value) {
            var territory = _.find(eCalendarVm.allTerritories, function (item) {
                return item.$id === value;
            });

            return territory && territory.name || '';
        }

        function getFacility(value) {
            var facility = _.find(eCalendarVm.allFacilities, function (item) {
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



        function showSignUpShiftCalendar() {
            let modalInstance = $uibModal.open({
                templateUrl: 'app/employee/calendar/modal/sign-up-shifts-modal.tpl.html',
                controller: 'eSchedulerSignUpShiftModalCtrl as shiftModalVm',
                size: 'lg',
                scope: $scope,
                windowClass: 'dashboard-info-modal',
                backdrop: 'static',
                resolve: {
                    currentDay: function () {
                        return angular.copy(moment().valueOf());
                    },
                    shiftsAdded: function () {
                        return angular.copy(eCalendarVm.shiftsAddedInAvailaleDateRange);
                    },
                }
            });

            return modalInstance.result.then(function (res) {

                // window.location.reload();
                // gotoAnchor(res);
            }, function (res) {
                $('.modal-open').removeClass('modal-open');
                if (res) {
                    toaster.success("Save Availability successfully!");
                    loadData();
                    setTimeout(() => {
                        eCalendarVm.isCanAddAvailability = false;
                    }, 3000);
                }

                // gotoAnchor(res);
            });
        }

        function showReportInformation(rowItem) {
            let functionShowEvent = function () {
                let eventsFilter = [];
                let eventsByState = _.find($scope.events, item => item.iso == rowItem.isoState);
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
                        templateUrl: 'app/employee/calendar/modal/events-modal.tpl.html',
                        controller: 'eSchedulerCalendarEventsModalCtrl as eventModalVm',
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
            if (rowItem.typeRow == 'employee' && eCalendarVm.employeesAvailable && eCalendarVm.employeesAvailable[rowItem.isoState] && eCalendarVm.employeesAvailable[rowItem.isoState][rowItem.dayOfWeek]) {
                let users = [];

                let employeesAvailableDay = eCalendarVm.employeesAvailable[rowItem.isoState][rowItem.dayOfWeek];

                if (rowItem.typeFilter == 'all') {
                    //get available employees  by day
                    users = eCalendarVm.employeesAvailable[rowItem.isoState][rowItem.dayOfWeek] ? eCalendarVm.employeesAvailable[rowItem.isoState][rowItem.dayOfWeek].users : [];
                } else {
                    //get utilized employees 
                    let eventsByState = _.find($scope.events, item => item.iso == rowItem.isoState);
                    let eventByTimestamp = _.find(eventsByState.groupByDateRange, item => item.key == rowItem.timestampStart);
                    if (rowItem.typeFilter == 'unutilized') {
                        //get unutilized employees 
                        // let eventByTimestamp = _.find($scope.events, item => item.key == rowItem.timestampStart);
                        users = _.differenceBy(employeesAvailableDay.users, eventByTimestamp.repsActivities, '$id');
                    } else {
                        users = _.intersectionBy(employeesAvailableDay.users, eventByTimestamp.repsActivities, '$id');
                    }
                }
                if (users && users.length > 0) {
                    modalInstance = $uibModal.open({
                        templateUrl: 'app/employee/calendar/modal/employees-modal.tpl.html',
                        controller: 'eSchedulerCalendarEmployeesModalCtrl as eventModalVm',
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
                            }
                        }
                    });

                    return modalInstance.result.then(function (res) {
                        // gotoAnchor(res);
                    }, function (res) {
                        // gotoAnchor(res);
                    });
                } else {
                    functionShowEvent();
                }
            } else { //(rowItem.typeRow == "event") 
                functionShowEvent();
            }


        }

        eCalendarVm.parseToNumber = function (value) {
            var number = parseFloat(value);
            if (isNaN(number)) {
                number = null;
            }
            return number;
        };
        eCalendarVm.getRequesters = function (value) {
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
            if (eCalendarVm.calendarView == 'month') {
                var startStr = moment(eCalendarVm.viewDate).format('MM/DD/YYYY');

                eCalendarVm.timestampStart = moment.utc(startStr).startOf('month').valueOf();
                eCalendarVm.cri.timestampStart = moment.utc(startStr).startOf('month').valueOf();
                eCalendarVm.timestampEnd = moment.utc(startStr).endOf('month').valueOf();
                eCalendarVm.cri.timestampEnd = moment.utc(startStr).endOf('month').valueOf();
                eCalendarVm.viewDate = moment(moment.utc(eCalendarVm.timestampStart).format('MM/DD/YYYY')).toDate();

            } else if (eCalendarVm.calendarView == 'week') {
                eCalendarVm.timestampStart = moment(eCalendarVm.viewDate).startOf('week').valueOf();
                eCalendarVm.cri.timestampStart = moment(eCalendarVm.viewDate).utc().startOf('week').valueOf();
                eCalendarVm.timestampEnd = moment(eCalendarVm.viewDate).endOf('week').valueOf();
                eCalendarVm.cri.timestampEnd = moment(eCalendarVm.viewDate).utc().endOf('week').valueOf();
            }
            // $timeout( $scope.$broadcast('resetDateRange'), 500);
            $scope.$broadcast('resetDateRange');
            searchCalendar(true);

        }

        function getMonthText() {
            return moment.utc(eCalendarVm.cri.timestampStart).format("MMMM YYYY");
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

        function cancelShift(shiftDetail, cell) {
            const cancelDate = moment.utc(shiftDetail.date).format('LL');

            let modalInstance = $uibModal.open({
                templateUrl: 'app/employee/calendar/modal/cancel-shift-modal.tpl.html',
                controller: 'eSchedulerCancelShiftModalCtrl as cancelShiftVm',
                size: 'md',
                scope: $scope.$parent,
                windowClass: 'cancel-shift-modal',
                backdrop: 'static',
                resolve: {
                    cancelDate: function () {
                        return cancelDate;
                    },
                    shift: function () {
                        return shiftDetail;
                    },
                    cUser: function () {
                        return currentUser;
                    }
                }
            });

            modalInstance.result.then(() => {
                // notificationService.notiCancelShift(shiftDetail)
                //     .then(() => {
                toaster.success("Cancel Availability on " + cancelDate + " Successfully!");

                // loadData();
                shiftDetail.status = shiftUtils.StatusEnum.APPROVED;
                shiftDetail.availability = false;
                cell.events[0].classShift = 'shift-unavailable';
                cell.events[0].statusShift = 0;

            }, (reject) => {
                console.log('reject', reject);

            }).finally(() => {
                appUtils.hideLoading();
            });
            // });
        }

        function updateAvailabilityShift(shiftDetail, cell) {
            console.log(shiftDetail);
            shiftDetail.repMail = currentUser.email || currentUser.notificationEmail;
            shiftDetail.dateStr = shiftDetail.dateString;
            shiftDetail.repNotificationEmail = currentUser.notificationEmail;
            $ngBootbox.confirm(`Do you want to switch this ${shiftDetail.dateString} to Available? All changes will be notified to your Manager.`).then(function () {
                shiftsService.setStatusAvailableShift(shiftDetail, shiftUtils.StatusEnum.CONFIRMED).then(res => {
                    //console.log('res', res);
                    toaster.success("Update Availability on " + shiftDetail.dateString + " successfully!");
                    //refresh data 
                    // loadData();
                    shiftDetail.status = shiftUtils.StatusEnum.CONFIRMED;
                    shiftDetail.availability = true;
                    cell.events[0].classShift = 'shift-available';
                    cell.events[0].statusShift = 1;
                });
            }, () => {
                console.log('cancel');
            });
        }

        function editShift(cell) {
            let repsByDay = eCalendarVm.employeesAvailable && eCalendarVm.employeesAvailable[cell.events[0].timestampStart];
            let listShift = repsByDay && repsByDay.repsAvailable && repsByDay.repsAvailable;
            let shiftDetail = (listShift && listShift.length > 0) ? listShift[0] : null;
            if (shiftDetail && shiftDetail.availability) {
                //hanlde cancel shift
                cancelShift(shiftDetail, cell);
            } else if (shiftDetail) {
                //hanlde set status available shift
                updateAvailabilityShift(shiftDetail, cell);

            }
        }

        function isCanAddAvailability() {
            let currentDay = moment().day();

            let isDayCanAddAvailability = appSettings.canAddAvailability.indexOf(currentDay) > -1;

            if (isDayCanAddAvailability) {
                let employeeCri = angular.copy(eCalendarVm.cri);
                let availableScheduleRange = appSettings.availableScheduleRange || 14;

                let today = moment().startOf('day');
                availableScheduleRange = today.day() == 0 ? availableScheduleRange : availableScheduleRange + 2;

                employeeCri.timestampStart = today.utc(today.format('MM/DD/YYYY')).startOf('day').valueOf();
                // var startutc = moment.utc(employeeCri.timestampStart);
                employeeCri.timestampEnd = moment.utc(today.format('MM/DD/YYYY')).add(availableScheduleRange, 'days').day(0).startOf('day').valueOf();

                // employeeCri.timestampEnd = moment(employeeCri.timestampStart).add(4, 'days').day(0).add(14, 'days').startOf('day').utc().startOf('day').valueOf();
                // employeeCri.alias = moment(employeeCri.timestampStart).add(4, 'days').day(0).add(14, 'days').utc().startOf('day').valueOf();
                employeeCri.ids = eCalendarVm.userId; //eCalendarVm.currentUser.uid;
                shiftsService.searchShift(employeeCri).then(result => {
                    eCalendarVm.shiftsAddedInAvailaleDateRange = result;
                    eCalendarVm.isCanAddAvailability = _.find(result, item => item.count == 0);
                });
            }
        }

        function mobileAndTabletcheck() {
            var check = false;
            (function (a) { if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true; })(navigator.userAgent || navigator.vendor || window.opera);
            return check;
        }

    }
})();