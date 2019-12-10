(function () {
    'use strict';

    angular.module('app.event').controller('EventConfirmationDashboardCtrl', EventConfirmationDashboardCtrl);

    /** @ngInject */
    function EventConfirmationDashboardCtrl($rootScope, $scope, $timeout, $q, appUtils, DataUtils, authService, eventService, memRegionService, memberShipFacilitiesService, memTerritoryService, memStateService, eventCampaignService, $uibModal, employeeService, departmentSevice, eventExportConfirmationService, roleService) {
        $rootScope.settings.layout.showSmartphone = false;
        $rootScope.settings.layout.pageSidebarClosed = true;

        var currentUser = authService.getCurrentUser(),
            startDate = moment().utc().startOf('month'),
            endDate = moment().utc().endOf('month');
        $scope.userPermission = $rootScope.storage.statePermission;
        $scope.userPermission.isAdmin = appUtils.checkSpecifyRole(currentUser, 'admin');
        $scope.userPermission.isRep = appUtils.checkSpecifyRole(currentUser, 'rep');
        $scope._getManagerText = _getManagerText;
        var eventVm = this; // jshint ignore:line
        eventVm.allStates = [];
        eventVm.eventTypes = [];
        eventVm.aggregations = [];
        eventVm.allTerritories = [];
        eventVm.allStates = [];
        eventVm.allRegions = [];
        eventVm.allFacilities = [];
        eventVm.regionGroups = {};
        eventVm.chooseStates = [];
        eventVm.chooseRegions = [];
        eventVm.chooseStatesEventByCampaign = [];
        eventVm.chooseRegionsEventByCampaign = [];
        eventVm.eventListVerifyStatus = angular.copy(appUtils.eventListVerifyDashboard);
        eventVm.eventVerifyStatus = appUtils.eventListVerifyStatus;
        eventVm.cri = {
            // type: 'All',
            state: 'All',
            plantypes: 'All',
            requester: 'All',
            alias: null,
            size: 10000,
            from: 0,
            // status: 1,
            // dataEntered: true,
            interval: 'day',
            type: "classes"
        };
        eventVm.criEventByCampaign = {
            // type: 'All',
            state: 'All',
            plantypes: 'All',
            requester: 'All',
            alias: null,
            size: 12,
            from: 0,
            // status: 1,
            // dataEntered: true,
            interval: 'day',
            verifyStatus: 'All',
            type: "classes"
        };
        eventVm.pagingEventByCampaign = {
            pageSize: 12,
            currentPage: 0,
            totalPage: 0,
            totalRecord: 0
        };
        //get query start date
        eventVm.timestampStart = startDate.valueOf();
        eventVm.cri.timestampStart = angular.copy(startDate).utc().startOf("day").valueOf();

        //get query end date
        eventVm.timestampEnd = endDate.valueOf();
        eventVm.cri.timestampEnd = angular.copy(endDate).utc().endOf("day").valueOf();
        var initPage = true;
        eventVm.tabIdx = 1;
        eventVm.changeType = eventVm.changeState = changeFilter;
        eventVm.changeTypeEventByCampaign = eventVm.changeStateEventByCampaign = changeFilterEventByCampaign;
        eventVm.selectCampaign = selectCampaign;
        eventVm.changeSelectedCampaign = changeSelectedCampaign;
        eventVm.getRequesters = getRequesters;
        eventVm.getFacility = getFacility;
        eventVm.getTerritory = getTerritory;
        eventVm.getDateTime = getDateTime;
        eventVm.getRegion = getRegion;
        eventVm.getState = getState;
        eventVm.getType = getType;
        eventVm.changePageCampaigns = changePageCampaigns;
        eventVm.changePageEventByCampaign = changePageEventByCampaign;
        eventVm.onSwitchTabs = onSwitchTabs;
        eventVm.searchCampaigns = searchCampaigns;
        eventVm.exportEventData = exportEventData;
        eventVm.exportRunsData = exportRunsData;
        eventVm.exportCampaignsData = exportCampaignsData;
        eventVm.criCampaigns = {
            keyword: "",
            from: 0,
            size: 12,
            sort: 'timestampCreated',
            employeeId: '',
            isAuthorized: true
        };
        eventVm.pagingCampaigns = {
            pageSize: 12,
            currentPage: 0,
            totalPage: 0,
            totalRecord: 0
        };
        eventVm.chartColors = {
            "aftercallsignin": '#fccfa1',
            "classes": '#187696',
            "comp-addon": '#70c1b4',
            "event": '#258ABD',
            "gunshows": '#AEDAE2',
            "miscellaneous": '#BD501D',
            "speaking-engagement": '#F2FFBD',
            "table": '#b2dac0',
            "tcole-class-non-usls": '#F15B80',
            "tcole-class-usls-hosted": '#2B908E',
            "notification-responded": '#2B908E',
            "notification-pending": '#FFBA49',
            "Confirmed": '#2B908E',
            "Pending": '#FFBA49', //f5b856
            "Canceled": '#EF5B5B',
        };
        eventVm.eventPieChartData = [];
        eventVm.notificationPieChartData = [];

        //Revenue Chart Config
        eventVm.revenueChartConfig = {
            options: {
                chart: {
                    type: 'column',
                    marginRight: 50
                },
                title: {
                    text: ''
                },
                xAxis: {
                    categories: eventVm.revenueLineChartAxis,
                    tickmarkPlacement: 'on',
                    title: {
                        enabled: false
                    }
                },
                yAxis: {
                    min: 0,
                    title: {
                        text: 'Number of notifications sent'
                    },
                    stackLabels: {
                        enabled: true,
                        style: {
                            fontWeight: 'bold',
                            color: (Highcharts.theme && Highcharts.theme.textColor) || 'gray'
                        },
                        format: '<b>{total:f}</b>',

                    }
                },
                tooltip: {
                    split: true,
                    shared: true,
                    headerFormat: '<b>{point.key}</b><br/>',
                    pointFormat: '{series.name}: <b>{point.y:f}</b><br>',
                    valueDecimals: 2,
                },
                plotOptions: {
                    column: {
                        stacking: 'normal',
                        headerFormat: '<b>{point.key}</b><br/>',
                    },
                    series: {
                        cursor: 'pointer',
                        point: {
                            events: {
                                click: function () {
                                    showReportInformation(this, 'notifications');
                                }
                            }
                        }
                    }
                }
            },
            series: eventVm.revenueLineChartData
        };
        //Event By Types Chart Config
        eventVm.eventPieChartConfig = {
            options: {
                chart: {
                    type: 'pie',
                    plotBackgroundColor: null,
                    plotBorderWidth: null,
                    plotShadow: false

                },
                title: {
                    text: ''
                },
                tooltip: {
                    pointFormat: 'Percentage: <b>{point.percentage:.2f} % </b>'
                },
                plotOptions: {
                    pie: {
                        allowPointSelect: true,
                        cursor: 'pointer',
                        dataLabels: {
                            enabled: true,
                            format: '<b>{point.name}: {point.y}</b>',
                            style: {
                                color: (Highcharts.theme && Highcharts.theme.contrastTextColor) || 'black'
                            },
                            connectorColor: 'silver'
                        }
                    },
                    series: {
                        cursor: 'pointer',
                        point: {
                            events: {
                                click: function () {
                                    showReportInformation(this, 'events');
                                }
                            }
                        }
                    }

                }
            },
            series: [{
                name: 'Type',
                colorByPoint: true,
                data: eventVm.eventPieChartData
            }],
            loading: false
        };
        //Event By Types Chart Config
        eventVm.notificationPieChartConfig = {
            options: {
                chart: {
                    type: 'pie',
                    plotBackgroundColor: null,
                    plotBorderWidth: null,
                    plotShadow: false

                },
                title: {
                    text: ''
                },
                tooltip: {
                    pointFormat: 'Percentage: <b>{point.percentage:.2f} % </b>'
                },
                plotOptions: {
                    pie: {
                        allowPointSelect: true,
                        cursor: 'pointer',
                        dataLabels: {
                            enabled: true,
                            format: '<b>{point.name}: {point.y}</b>',
                            style: {
                                color: (Highcharts.theme && Highcharts.theme.contrastTextColor) || 'black'
                            },
                            connectorColor: 'silver'
                        }
                    },
                    series: {
                        cursor: 'pointer',
                        point: {
                            events: {
                                click: function () {
                                    showReportInformation(this, 'notifications');
                                }
                            }
                        }
                    }

                }
            },
            series: [{
                name: 'Type',
                colorByPoint: true,
                data: eventVm.notificationPieChartData
            }],
            loading: false
        };
        //Section Notification
        eventVm.sectionNotification = [];
        eventVm.sectionNotificationSelectedCampaign = [];

        //Event Revenue
        eventVm.revenueLineChartData = [];
        eventVm.revenueLineChartAxis = [];
        // eventVm.revenueChartConfig.series = [];
        // eventVm.revenueChartConfig.options.xAxis.categories = [];
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
        eventVm.select2OptionsFEventByCampaign = {
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
        function _loadEventTypes() {
            return eventService.getEventTypes().then(function (types) {
                eventVm.eventTypes = types || [];
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
        function _loadStates() {
            return memStateService.getAll().then(function (data) {
                eventVm.allStates = data || [];
                $timeout(angular.noop, 200);
            });
        }
        function _loadTerritory() {
            return memTerritoryService.getAllTerritoryLoadOnce().then(function (data) {
                eventVm.allTerritories = data || [];
                $timeout(angular.noop, 200);
            });
        }

        function _loadFacilities() {
            return memberShipFacilitiesService.itemsLoadOnce().then(function (data) {
                eventVm.allFacilities = data || [];
                $timeout(angular.noop, 200);
            });
        }
        // Make sure DOM is loaded before get elems
        angular.element(document).ready(function () {
            $timeout(function () {
                $('#EventDateRange').on('apply.daterangepicker', function (ev, picker) {
                    //reload UI
                    var startControl = angular.copy(picker.startDate._d),
                        endControl = angular.copy(picker.endDate._d);

                    var startStr = moment(startControl).format('MM/DD/YYYY'),
                        endStr = moment(endControl).format('MM/DD/YYYY');


                    startDate = moment.utc(startStr);
                    endDate = moment.utc(endStr);

                    eventVm.cri.timestampStart = eventVm.timestampStart = startDate.startOf("day").valueOf();
                    eventVm.cri.timestampEnd = eventVm.timestampEnd = endDate.endOf("day").valueOf();
                    changeFilter();
                });
            }, 800);
        });
        _initDashboard();
        function _initDashboard() {
            eventVm.cri.requester = !$scope.userPermission.isRep ? 'All' : currentUser.$id;
            eventVm.criEventByCampaign.requester = !$scope.userPermission.isRep ? 'All' : currentUser.$id;
            return $q.all([_loadFacilities(), _loadEventTypes(), _loadStates(), _loadRegions(), _loadTerritory()]).then(function () {
                roleService.itemsObj().then(function (data) {
                    $scope.roles = data;
                });
                return _loadData();
            });
        }
        function searchDataCampaigns() {
            let startDate = moment.utc(eventVm.cri.timestampStart).subtract(3, 'days').valueOf();
            eventVm.criCampaigns.timestampStart = startDate;
            eventVm.criCampaigns.timestampEnd = eventVm.cri.timestampEnd;
            let p = eventCampaignService.search(eventVm.criCampaigns);
            return p;
        }
        function _loadDataCampaigns(campaigns, events) {
            let start = angular.copy(eventVm.criCampaigns.timestampStart);
            let end = angular.copy(eventVm.criCampaigns.timestampEnd);
            let groupByDateRange = createDateRange(start, end, campaigns, events);
            // console.log('groupByDateRange', groupByDateRange, campaigns);
            initCampaigns(groupByDateRange);
            return groupByDateRange;
        }
        function _loadData() {
            console.time('loaddata');
            appUtils.showLoading();
            try {
                eventVm.cri.state = eventVm.chooseStates.join(',');
                eventVm.cri.plantypes = eventVm.chooseRegions.join(',');
                eventVm.cri.alias = !$scope.userPermission.isAdmin ? currentUser.alias : null;
                eventVm.criRegion = angular.copy(eventVm.cri);
                eventVm.cri.territory = eventVm.chooseTerritories && eventVm.chooseTerritories.length > 0 ? eventVm.chooseTerritories.join(',') : '';
                eventVm.cri.facilities = eventVm.chooseFacilities && eventVm.chooseFacilities.length > 0 ? eventVm.chooseFacilities.join(',') : '';
                let srcP = [];
                srcP.push(eventService.reportConfirmation(eventVm.cri));
                srcP.push(searchDataCampaigns());
                let p = Promise.all(srcP).then(function (result) {
                    // console.log('===================data report===================');
                    console.log(result);
                    console.log('_loadData');

                    initPage = false;
                    let events = result[0];
                    eventVm.events = events.items;

                    let campaigns = result[1] || [];
                    let _campaigns = _loadDataCampaigns(campaigns, eventVm.events);
                    return Promise.all([loadOverview(_campaigns), loadRevenueData(_campaigns, events.items)]);
                });
                p.then(() => {
                    console.timeEnd('loaddata');
                    appUtils.hideLoading();
                });
                return p;
            } catch (error) {
                console.log('error', error);
                appUtils.hideLoading();
                return Promise.resolve();
            }

        }

        function loadOverviewSelectedCampaign() {
            // console.log('loadOverviewSelectedCampaign', eventVm.selectedCampaign);
            if (!eventVm.selectedCampaign) {
                return;
            }
            let events = eventVm.selectedCampaign._allEvents || eventVm.selectedCampaign.allEvents;
            let _eventsPending = _.filter(events, event => event.verifyStatus == appUtils.eventVerifyStatusEnum.PENDING);
            let _eventsScheduledCount = _eventsPending && _eventsPending.length || 0;
            let _eventsConfirmed = _.filter(events, event => event.verifyStatus == appUtils.eventVerifyStatusEnum.CONFIRMED);
            let _eventsConfirmedCount = _eventsConfirmed && _eventsConfirmed.length || 0;
            let _eventsCancelled = _.filter(events, event => event.verifyStatus == appUtils.eventVerifyStatusEnum.CANCELED);
            let _eventsCancelledCount = _eventsCancelled && _eventsCancelled.length || 0;
            eventVm.sectionNotificationSelectedCampaign = [];
            eventVm.sectionNotificationSelectedCampaign.push({
                title: 'Classes pending',
                key: 'events-scheduled',
                type: 'scheduled',
                color: '#FFBA49',
                icon: 'fa-calendar',
                total: _eventsScheduledCount || 0,
                function: function () {
                    showReportInformation({ values: _eventsPending }, 'events');
                }
            });
            eventVm.sectionNotificationSelectedCampaign.push({
                title: 'Classes confirmed',
                key: 'events-confirmed',
                type: 'confirmed',
                color: '#2B908E',
                icon: 'fa-check',
                total: _eventsConfirmedCount || 0,
                function: function () {
                    showReportInformation({ values: _eventsConfirmed }, 'events');
                }
            });
            eventVm.sectionNotificationSelectedCampaign.push({
                title: 'Classes cancelled',
                key: 'events-cancelled',
                type: 'scheduled',
                color: '#EF5B5B',
                icon: 'fa-close',
                total: _eventsCancelledCount || 0,
                function: function () {
                    showReportInformation({ values: _eventsCancelled }, 'events');
                }
            });
            eventVm.sectionNotificationSelectedCampaign.push({
                title: 'Reps waived off',
                key: 'reps-waived',
                type: 'scheduled',
                color: '#95A5A6',
                icon: 'fa-group',
                total: eventVm.selectedCampaign._originTotalRepsWaiveOff,
                function: function () {
                    showReportInformation(eventVm.selectedCampaign._originRunsHaveEventsCanceled, 'employees');
                }
            });
        }
        function loadOverview(campaigns) {
            let _eventsScheduled = _.filter(eventVm.events, event => event.verifyStatus == appUtils.eventVerifyStatusEnum.PENDING);
            let _eventsScheduledCount = _eventsScheduled && _eventsScheduled.length || 0;
            let _eventsConfirmed = _.filter(eventVm.events, event => event.verifyStatus == appUtils.eventVerifyStatusEnum.CONFIRMED);
            let _eventsConfirmedCount = _eventsConfirmed && _eventsConfirmed.length || 0;
            let _eventsCancelled = _.filter(eventVm.events, event => event.verifyStatus == appUtils.eventVerifyStatusEnum.CANCELED);
            let _eventsCancelledCount = _eventsCancelled && _eventsCancelled.length || 0;
            // console.log('_eventsCancelled', _eventsCancelled);
            eventVm.sectionNotification = [];
            eventVm.sectionNotification.push({
                title: 'Classes scheduled',
                key: 'events-scheduled',
                type: 'scheduled',
                color: '#227AB5',
                icon: 'fa-calendar',
                total: eventVm.events.length,
                function: function () {
                    showReportInformation({ values: eventVm.events }, 'events');
                }
            });
            eventVm.sectionNotification.push({
                title: 'Classes confirmed',
                key: 'events-confirmed',
                type: 'confirmed',
                color: '#2B908E',
                icon: 'fa-check',
                total: _eventsConfirmedCount,
                function: function () {
                    showReportInformation({ values: _eventsConfirmed }, 'events');
                }
            });
            eventVm.sectionNotification.push({
                title: 'Classes cancelled',
                key: 'events-cancelled',
                type: 'scheduled',
                color: '#EF5B5B',
                icon: 'fa-close',
                total: _eventsCancelledCount,
                function: function () {
                    showReportInformation({ values: _eventsCancelled }, 'events');
                }
            });
            // console.log('campaigns all', campaigns, eventVm.events);

            // let totalRepsWaiveOff = _.sumBy(campaigns, 'totalRepsWaiveOff'); wrong - duplicate
            let runsHaveEventsCanceled = _.map(campaigns, campaign => campaign.runsHaveEventsCanceled);
            let _runsHaveEventsCanceled = _.flatten(runsHaveEventsCanceled);
            // console.log('_runsHaveEventsCanceled', _runsHaveEventsCanceled);
            let uids = _.map(_runsHaveEventsCanceled, item => item.uid);
            let totalRepsWaiveOff = _.uniq(uids).length;
            eventVm.sectionNotification.push({
                title: 'Reps waived off',
                key: 'reps-waived',
                type: 'scheduled',
                color: '#95A5A6',
                icon: 'fa-group',
                total: totalRepsWaiveOff,
                function: function () {
                    showReportInformation(_runsHaveEventsCanceled, 'employees');
                }
            });
        }

        //Revenue Line Chart
        function loadRevenueData(items, events) {
            var groupByDay = items || [];
            var deferred = $q.defer();

            //set title
            var start = angular.copy(startDate),
                end = angular.copy(endDate);
            // console.log('groupByDateRange', eventVm.campaigns);
            // eventVm.campaigns = groupByDateRange;

            var sDate = start.format("MM/DD/YYYY");
            var eDate = end.format("MM/DD/YYYY");
            var cDate = moment().format("MM/DD/YYYY");

            var title = sDate + ' - ' + eDate;
            if (start.isSame(moment().startOf('month')) && end.isSame(moment().endOf('month'))) {
                title = 'This Month';
            } else if (start.isSame(moment().subtract('month', 1).startOf('month')) && end.isSame(moment().subtract('month', 1).endOf('month'))) {
                title = 'Last Month';
            }

            var diffDay = end.diff(start, 'days');

            //set title
            if (eDate === cDate && diffDay === 6) {
                title = 'Last 7 Days';
            } else if (eDate === cDate && diffDay === 29) {
                title = 'Last 30 Days';
            }

            eventVm.titleRevenueChart = title;

            //set title line set xAxis 
            // var tmp = end;
            // for (var i = 0; i <= diffDay; i++) {
            //     var date = tmp.format("MM/DD/YYYY");
            //     eventVm.revenueLineChartAxis.push(date);
            //     date = tmp.subtract('days', 1);
            // }
            // eventVm.revenueLineChartAxis.reverse();

            // var series = _.map(eventVm.eventTypes, function (eType) {
            //     return {
            //         id: eType.value,
            //         name: eType.text,
            //         data: [],
            //         color: eventVm.chartColors[eType.value]
            //     };
            // });
            let series = [
                {
                    id: 'responded',
                    name: 'Responded',
                    data: [],
                    color: '#2B908E'
                }, {
                    id: 'pending',
                    name: 'Pending',
                    data: [],
                    color: '#FFBA49'
                }];
            var dates = [], text;
            _.forEach(items, function (value, key) {
                if (eventVm.cri.interval === 'day') {
                    dates.push(value.title);
                } else if (eventVm.cri.interval === 'month') {
                    text = moment.utc(angular.copy(value.key)).format('MMMM');
                    dates.push(text);
                } else {
                    var week_number = moment.utc(angular.copy(value.key)).week();
                    text = 'Week ' + week_number;
                    dates.push(text + ' - ' + key);
                }
                var groupByTypePending = _.filter(value.runs, notify => notify.status == 0);
                var groupByTypeResponded = _.filter(value.runs, notify => notify.status == 1);
                _.forEach(series, function (s) {
                    var obj = {
                        y: 0,
                        key: value.key,
                        type: s.id,
                        values: []
                    };
                    //
                    obj.y = (s.id == 'pending') ? groupByTypePending.length : groupByTypeResponded.length;
                    obj.values = (s.id == 'pending') ? groupByTypePending : groupByTypeResponded;
                    s.data.push(obj);
                });
            });

            eventVm.revenueLineChartData = series;
            eventVm.revenueLineChartAxis = dates;
            // console.log('eventVm.revenueLineChartData', eventVm.revenueLineChartData);
            // console.log('eventVm.revenueLineChartAxis', eventVm.revenueLineChartAxis);

            $timeout(function () {
                eventVm.revenueChartConfig.series = eventVm.revenueLineChartData;
                eventVm.revenueChartConfig.options.xAxis.categories = eventVm.revenueLineChartAxis;
            }, 100);

            deferred.resolve(true);
            return deferred.promise;
        }
        //Pie Chart Event By Type
        function loadPieChartEvent(events) {
            // console.log('loadPieChartEvent', events);
            var deferred = $q.defer();
            var groupByType = _.groupBy(events || [], 'verifyStatus');
            // console.log('groupByType', groupByType);
            // console.log('eventVm.eventListVerifyStatus', eventVm.eventListVerifyStatus);

            _.forEach(groupByType, function (item, key) {
                var name = _.find(eventVm.eventListVerifyStatus, item => { return item.value + '' == key; });
                // console.log('name', name, key);

                if (name) {
                    var obj = {
                        name: name.text,
                        y: item.length,
                        type: name.text,
                        color: eventVm.chartColors[name.text],
                        values: item
                    };
                    eventVm.eventPieChartData.push(obj);

                }
            });

            $timeout(function () {
                eventVm.eventPieChartConfig.series[0].data = eventVm.eventPieChartData;
            }, 100);
            deferred.resolve(true);
            return deferred.promise;
        }
        //Pie Chart Notification By Type
        function loadPieChartNotification(runs) {
            var deferred = $q.defer();
            // var groupByType = _.groupBy(runs || [], 'status');
            var groupByType = [
                {
                    doc: _.filter(runs, run => run.status == 1),
                    key: 'notification-responded',
                    name: 'Responded'
                }, {
                    doc: _.filter(runs, run => run.status == 0),
                    key: 'notification-pending',
                    name: 'Pending Response'
                }
            ];
            _.forEach(groupByType, function (item) {
                if (item) {
                    var obj = {
                        name: item.name,
                        y: item.doc.length,
                        type: item.key,
                        color: eventVm.chartColors[item.key],
                        values: item.doc
                    };
                    eventVm.notificationPieChartData.push(obj);
                }
            });

            $timeout(function () {
                eventVm.notificationPieChartConfig.series[0].data = eventVm.notificationPieChartData;
            }, 100);
            deferred.resolve(true);
            return deferred.promise;
        }

        function createDateRange(start, end, groupByDay, events) {
            // return new Promise((resolve, reject) => {
            let startTime = moment.utc(start);
            var endTime = moment.utc(end);
            let groupByDateRange = [];
            const _events = events;
            // $scope.campaignFittingScope = {};
            while (startTime <= endTime) {
                const _events2 = _events;
                let keyDay = moment.utc(startTime).startOf('day');
                const timestampKeyDay = keyDay.valueOf();
                // let campaignF = _.find(groupByDay, (campaign, key) => {
                //     return key == timestampKeyDay;
                // });
                let campaignF = groupByDay[timestampKeyDay];
                // console.log('campaignF', campaignF);

                var campaignFitting = {};
                // $scope.campaignFittingScope[timestampKeyDay] = {};
                // bindCampaign(campaignFitting, {});
                if (campaignF) {
                    // console.log('campaignF', campaignF);
                    let campaignFittingScope = _.map(campaignF, (run, runId) => {
                        let eventCombine = Object.assign(run.eventsInstance || {}, run.events);
                        // console.log('eventCombine', eventCombine);
                        let eventSnapshot = _.map(eventCombine, (event, key) => {
                            return {
                                $id: key,
                                eventId: event.eventId,
                                name: event.name,
                                status: event.status,
                                verifyStatus: event.verifyStatus
                            };
                        });
                        run.eventSnapshot = eventSnapshot;

                        let isHaveEventsCanceled = _.find(run.eventSnapshot, event => event.verifyStatus == -1);

                        run.isHaveEventsCanceled = !!isHaveEventsCanceled;

                        let eventsFitting = _.intersectionBy(_events2, eventSnapshot, '$id');
                        // console.log('eventsFitting', eventsFitting);
                        if (eventsFitting && eventsFitting.length > 0) {
                            let campaignFittingItem = {};
                            campaignFittingItem[runId] = run;
                            campaignFittingItem[runId].eventsFitting = eventsFitting;

                            // _.bind(_bindCampaign,campaignFittingItem);
                            // campaignFitting = {};
                            // var campaignFittingScopeFn = function (params) {
                            //     return {};//campaignFitting;
                            // };
                            // campaignFittingScopeFn();
                            // $scope.campaignFittingItem = {};
                            return campaignFittingItem;                         // $scope.campaignFittingScope[timestampKeyDay] = campaignFittingItem;
                            // bindCampaign(campaignFitting, campaignFittingItem);
                            // Object.assign(campaignFittingItem, campaignFitting);
                            // campaignFitting[runId].eventsFittingLength = eventsFitting.length;
                        }
                        return {};
                    });
                    campaignFitting = Object.assign({}, ...campaignFittingScope);

                }
                // let listRun = _.map(campaignFitting, i=>i);
                // let totalEventsInCampaign = _.sumBy(listRun, 'eventsFittingLength');
                //campaign all
                let runsHaveEventsCanceled = _.filter(campaignFitting, run => run.isHaveEventsCanceled);
                let _runsHaveEventsCanceled = _.uniqBy(runsHaveEventsCanceled, 'uid');
                groupByDateRange.push({
                    key: keyDay.valueOf(),
                    title: keyDay.format("LL"),
                    runs: angular.copy(campaignFitting || {}),
                    _originRuns: angular.copy(campaignF || {}),
                    totalSend: Object.keys(campaignFitting).length,
                    runsHaveEventsCanceled: _runsHaveEventsCanceled,
                    totalRepsWaiveOff: _runsHaveEventsCanceled.length,
                    _runsHaveEventsCanceled: runsHaveEventsCanceled
                    // totalEvents: eventSentByDay.length,
                    // totalEventsConfirmed: eventConfirmedByDay.length,
                    // totalEventsCanceled: eventCanceledByDay.length,
                });
                startTime.add(1, 'day');
            }
            return groupByDateRange;
            // resolve(groupByDateRange);
            // });

        }
        function initCampaigns(groupByDateRange) {
            eventVm.campaigns = [];
            groupByDateRange = _.orderBy(groupByDateRange, ['key'], ['desc']);
            _.forEach(groupByDateRange, campaign => {
                // console.log('campaign', campaign);
                let runs48h = _.filter(campaign.runs, (run, runId) => {
                    run.runId = runId;
                    return run.source == 'ServicePhase1';
                });
                let _originRuns48h = _.filter(campaign._originRuns, (run, runId) => {
                    run.runId = runId;
                    return run.source == 'ServicePhase1';
                });
                let run24h = _.filter(campaign.runs, (run, runId) => {
                    run.runId = runId;
                    return run.source == 'ServicePhase2';
                });
                let _originRuns24h = _.filter(campaign._originRuns, (run, runId) => {
                    run.runId = runId;
                    return run.source == 'ServicePhase2';
                });
                let runSmartAdmin = _.filter(campaign.runs, (run, runId) => {
                    run.runId = runId;
                    return run.source == 'SmartAdmin';
                });
                let _originRunsSmartAdmin = _.filter(campaign._originRuns, (run, runId) => {
                    run.runId = runId;
                    return run.source == 'SmartAdmin';
                });
                // console.log('run24h', run24h);
                // console.log('runSmartAdmin', runSmartAdmin);
                // console.log('_originRuns24h', _originRuns24h);
                // console.log('_originRunsSmartAdmin', _originRunsSmartAdmin);
                if (runs48h && runs48h.length) {
                    let runs = runs48h;
                    let _originRuns = _originRuns48h;
                    let eventSnapshotByDay = _.flatten(_.map(_originRuns, run => run.eventSnapshot));
                    let eventSnapshotSentByDay = _.uniqBy(eventSnapshotByDay, '$id');
                    let eventsFittingByDay = _.flatten(_.map(runs, run => run.eventsFitting));
                    let eventSentByDay = _.uniqBy(eventsFittingByDay, '$id');
                    let eventPendingByDay = _.filter(eventSentByDay, event => event.verifyStatus == appUtils.eventVerifyStatusEnum.PENDING);
                    let eventConfirmedByDay = _.filter(eventSentByDay, event => event.verifyStatus == appUtils.eventVerifyStatusEnum.CONFIRMED);
                    let eventCanceledByDay = _.filter(eventSentByDay, event => event.verifyStatus == appUtils.eventVerifyStatusEnum.CANCELED);
                    let runsHaveEventsCanceled = _.filter(runs, run => run.isHaveEventsCanceled);
                    let _runsHaveEventsCanceled = _.uniqBy(runsHaveEventsCanceled, 'uid');
                    let originRunsHaveEventsCanceled = _.filter(_originRuns, run => run.isHaveEventsCanceled);
                    let _originRunsHaveEventsCanceled = _.uniqBy(originRunsHaveEventsCanceled, 'uid');
                    eventVm.campaigns.push({
                        key: campaign.key,
                        dateString: campaign.title,
                        title: `${campaign.title} - 48 Hours`,
                        runs: angular.copy(runs || {}),
                        _originRuns: angular.copy(_originRuns48h || {}),
                        events: eventSentByDay,
                        eventsSnapshot: eventSnapshotSentByDay,
                        totalSend: runs.length,
                        totalEvents: eventSentByDay.length,
                        totalEventsConfirmed: eventConfirmedByDay.length,
                        totalEventsCanceled: eventCanceledByDay.length,
                        totalEventsScheduled: eventSnapshotSentByDay.length,
                        totalEventsPending: eventPendingByDay.length,
                        runsHaveEventsCanceled: runsHaveEventsCanceled,
                        totalRepsWaiveOff: _runsHaveEventsCanceled.length,
                        _originRunsHaveEventsCanceled: originRunsHaveEventsCanceled,
                        _originTotalRepsWaiveOff: _originRunsHaveEventsCanceled.length
                    });
                }
                if (run24h && run24h.length) {
                    let runs = run24h;
                    let _originRuns = _originRuns24h;
                    let eventSnapshotByDay = _.flatten(_.map(_originRuns, run => run.eventSnapshot));
                    let eventSnapshotSentByDay = _.uniqBy(eventSnapshotByDay, '$id');
                    let eventsFittingByDay = _.flatten(_.map(runs, run => run.eventsFitting));
                    let eventSentByDay = _.uniqBy(eventsFittingByDay, '$id');
                    let eventPendingByDay = _.filter(eventSentByDay, event => event.verifyStatus == appUtils.eventVerifyStatusEnum.PENDING);
                    let eventConfirmedByDay = _.filter(eventSentByDay, event => event.verifyStatus == appUtils.eventVerifyStatusEnum.CONFIRMED);
                    let eventCanceledByDay = _.filter(eventSentByDay, event => event.verifyStatus == appUtils.eventVerifyStatusEnum.CANCELED);
                    let runsHaveEventsCanceled = _.filter(runs, run => run.isHaveEventsCanceled);
                    let _runsHaveEventsCanceled = _.uniqBy(runsHaveEventsCanceled, 'uid');
                    let originRunsHaveEventsCanceled = _.filter(_originRuns, run => run.isHaveEventsCanceled);
                    let _originRunsHaveEventsCanceled = _.uniqBy(originRunsHaveEventsCanceled, 'uid');
                    eventVm.campaigns.push({
                        key: campaign.key,
                        dateString: campaign.title,
                        title: `${campaign.title} - 24 Hours`,
                        runs: angular.copy(runs || {}),
                        _originRuns: angular.copy(_originRuns24h || {}),
                        events: eventSentByDay,
                        eventsSnapshot: eventSnapshotSentByDay,
                        totalSend: runs.length,
                        totalEvents: eventSentByDay.length,
                        totalEventsConfirmed: eventConfirmedByDay.length,
                        totalEventsCanceled: eventCanceledByDay.length,
                        totalEventsScheduled: eventSnapshotSentByDay.length,
                        totalEventsPending: eventPendingByDay.length,
                        runsHaveEventsCanceled: runsHaveEventsCanceled,
                        totalRepsWaiveOff: _runsHaveEventsCanceled.length,
                        _originRunsHaveEventsCanceled: originRunsHaveEventsCanceled,
                        _originTotalRepsWaiveOff: _originRunsHaveEventsCanceled.length
                    });
                }
                if (runSmartAdmin && runSmartAdmin.length) {
                    let runs = runSmartAdmin;
                    let _originRuns = _originRunsSmartAdmin;
                    let eventSnapshotByDay = _.flatten(_.map(_originRuns, run => run.eventSnapshot));
                    let eventSnapshotSentByDay = _.uniqBy(eventSnapshotByDay, '$id');
                    let eventsFittingByDay = _.flatten(_.map(runs, run => run.eventsFitting));
                    let eventSentByDay = _.uniqBy(eventsFittingByDay, '$id');
                    let eventPendingByDay = _.filter(eventSentByDay, event => event.verifyStatus == appUtils.eventVerifyStatusEnum.PENDING);
                    let eventConfirmedByDay = _.filter(eventSentByDay, event => event.verifyStatus == appUtils.eventVerifyStatusEnum.CONFIRMED);
                    let eventCanceledByDay = _.filter(eventSentByDay, event => event.verifyStatus == appUtils.eventVerifyStatusEnum.CANCELED);
                    let runsHaveEventsCanceled = _.filter(runs, run => run.isHaveEventsCanceled);
                    let _runsHaveEventsCanceled = _.uniqBy(runsHaveEventsCanceled, 'uid');
                    let originRunsHaveEventsCanceled = _.filter(_originRuns, run => run.isHaveEventsCanceled);
                    let _originRunsHaveEventsCanceled = _.uniqBy(originRunsHaveEventsCanceled, 'uid');
                    eventVm.campaigns.push({
                        key: campaign.key,
                        dateString: campaign.title,
                        title: `${campaign.title} - Smart Admin`,
                        runs: angular.copy(runs || {}),
                        _originRuns: angular.copy(_originRunsSmartAdmin || {}),
                        events: eventSentByDay,
                        eventsSnapshot: eventSnapshotSentByDay,
                        totalSend: runs.length,
                        totalEvents: eventSentByDay.length,
                        totalEventsConfirmed: eventConfirmedByDay.length,
                        totalEventsCanceled: eventCanceledByDay.length,
                        totalEventsScheduled: eventSnapshotSentByDay.length,
                        totalEventsPending: eventPendingByDay.length,
                        runsHaveEventsCanceled: runsHaveEventsCanceled,
                        totalRepsWaiveOff: _runsHaveEventsCanceled.length,
                        _originRunsHaveEventsCanceled: originRunsHaveEventsCanceled,
                        _originTotalRepsWaiveOff: _originRunsHaveEventsCanceled.length
                    });
                }
            });
            // console.log('eventVm.campaigns', eventVm.campaigns);
            selectCampaign(eventVm.campaigns[0], true);
            _searchCampaigns();


        }
        function changeFilterEventByCampaign() {
            eventVm.pagingEventByCampaign = {
                pageSize: 20,
                currentPage: 0,
                totalPage: 0,
                totalRecord: 0
            };
            return changePageEventByCampaign().then(function () {
                // if (eventVm.tabIdx === 2) {
                //     return loadSaleByRegionChart();
                // }
            });
        }
        function changeFilter() {
            console.log('changeFilter');
            initPage = true;
            //Overview
            eventVm.sectionNotification = [];

            //Event Revenue
            eventVm.revenueLineChartData = [];
            eventVm.revenueLineChartAxis = [];
            eventVm.revenueChartConfig.series = [];
            eventVm.revenueChartConfig.options.xAxis.categories = [];

            eventVm.groupedItems = [];
            eventVm.filteredItems = [];
            eventVm.pagedItems = [];
            eventVm.paging = {
                pageSize: 20,
                currentPage: 0,
                totalPage: 0,
                totalRecord: 0
            };
            eventVm.pagingCampaigns = {
                pageSize: 20,
                currentPage: 0,
                totalPage: 0,
                totalRecord: 0
            };
            eventVm.pagingEventByCampaign = {
                pageSize: 20,
                currentPage: 0,
                totalPage: 0,
                totalRecord: 0
            };
            return _loadData().then(function () {
                // if (eventVm.tabIdx === 2) {
                //     return loadSaleByRegionChart();
                // }
            });
        }
        //Public Functions==============================================
        function showReportInformation(pointData, infoType) {
            // console.log('showReportInformation', pointData, infoType);
            if (infoType == 'events') {
                let firstItem = _.head(pointData.values);
                let currentDay = firstItem ? firstItem.date : null;
                let modalInstance = $uibModal.open({
                    templateUrl: 'app/event/calendar/modal/events-modal.tpl.html',
                    controller: 'eventCalendarEventsModalCtrl as eventModalVm',
                    size: 'lg',
                    scope: $scope,
                    windowClass: 'dashboard-info-modal',
                    backdrop: 'static',
                    resolve: {
                        eventsData: function () {
                            return angular.copy(pointData.values);
                        },
                        currentDay: function () {
                            return angular.copy(null);
                        }
                    }
                });

                return modalInstance.result.then(function (res) {
                }, function (res) {
                });
            } else if (infoType == 'notifications') {
                // console.log('pointData.values', pointData.values);
                let firstItem = _.head(pointData.values);
                let currentDay = firstItem ? firstItem.date : null;
                loadEmployeeList(pointData.values, true).then(values => {
                    // console.log('loadEmployeeList', pointData.values);
                    let modalInstance = $uibModal.open({
                        templateUrl: 'app/event/dashboard/modal/notifications-modal.tpl.html',
                        controller: 'eventNotificationsModalCtrl as eventModalVm',
                        size: 'lg',
                        scope: $scope,
                        windowClass: 'dashboard-info-modal',
                        backdrop: 'static',
                        resolve: {
                            notifications: function () {
                                return angular.copy(values);
                            },
                            currentDay: function () {
                                return angular.copy(currentDay);
                            }
                        }
                    });

                    return modalInstance.result.then(function (res) {
                    }, function (res) {
                    });
                });

            }
            else if (infoType == 'employees') {
                // console.log('pointData.values', pointData);
                loadEmployeeList(pointData).then(values => {
                    // console.log('loadEmployeeList', values);
                    let modalInstance = $uibModal.open({
                        templateUrl: 'app/event/calendar/modal/employees-modal.tpl.html',
                        controller: 'eventCalendarEmployeesModalCtrl as eventModalVm',
                        size: 'lg',
                        scope: $scope,
                        windowClass: 'dashboard-info-modal',
                        backdrop: 'static',
                        resolve: {
                            usersData: function () {
                                return angular.copy(values);
                            },
                            titleParams: function () {
                                return angular.copy('Reps Waive Off');
                            },
                            currentDay: function () {
                                return angular.copy(null);
                            },
                            typeModal: function () {
                                return angular.copy('reps_available');
                            },
                            currentUser: function () {
                                return currentUser;
                            }
                        }
                    });

                    return modalInstance.result.then(function (res) {
                    }, function (res) {
                    });
                });

            }

        }
        function loadEmployeeList(list, isRuns) {
            // console.log('loadEmployeeList', list);
            let uids = _.map(list, item => item.uid);
            let cri = {
                keyword: '',
                role: '',
                from: 0,
                size: 2500,
                sort: 'timestampCreated',
                alias: '',
                licenseType: 'All',
                hireType: 'All',
                // isAuthorized: true,
                ids: uids
            };
            return employeeService.search(cri).then(result => {
                let users = result.items || [];
                if (isRuns) {
                    _.forEach(list, item => {
                        let findUser = _.find(users, user => user.$id == item.uid);
                        item.userDetail = angular.copy(findUser);
                    });
                    return list;
                } else {
                    return users;
                }
            });
        }

        function changeSelectedCampaign(event) {
            // console.log('changeSelectedCampaign', event, eventVm._selectedCampaign);
            let findCampaign = _.find(eventVm.campaigns, campaign => campaign.title == eventVm._selectedCampaign);
            selectCampaign(findCampaign);

        }
        function selectCampaign(campaign, notSwitchTab) {
            if (!campaign) {
                eventVm.selectedCampaign = null;
                return;
            }
            // console.log('selectedCampaign', campaign);
            eventVm.selectedCampaign = campaign;
            eventVm._selectedCampaign = campaign.title;
            _loadDataEventsByCampaign(false);
            _loadDataEventsByCampaign(true).then(() => {
                loadOverviewSelectedCampaign();
                //Event By Type
                eventVm.eventPieChartData = [];
                eventVm.eventPieChartConfig.series[0].data = [];
                loadPieChartEvent(eventVm.selectedCampaign._allEvents);
                eventVm.notificationPieChartData = [];
                eventVm.notificationPieChartConfig.series[0].data = [];
                loadPieChartNotification(campaign._originRuns);
                //swith tab
                if (!notSwitchTab) {
                    eventVm.tabIdx = 2;
                }
            });

        }
        // function loadCampaignDetail(campaign) {
        //     console.log('loadEventsFromCampaign', campaign);
        //     let cri = {
        //         type: 'All',
        //         state: 'All',
        //         plantypes: 'All',
        //         requester: 'All',
        //         alias: null,
        //         size: 2000,
        //         from: 0,
        //         status: 1,
        //         // dataEntered: true,
        //         interval: 'day',
        //         ids: _.map(campaign.eventsSnapshot, event => event.$id)

        //     };
        //     eventService.search(cri).then(_events => {
        //         console.log('eventService search', _events);
        //         campaign.allEvents = _events.items || [];
        //     });
        // }
        function _loadDataEventsByCampaign(getAll) {

            eventVm.criEventByCampaign.state = eventVm.chooseStatesEventByCampaign.join(',');
            eventVm.criEventByCampaign.plantypes = eventVm.chooseRegionsEventByCampaign.join(',');
            eventVm.criEventByCampaign.alias = !$scope.userPermission.isAdmin ? currentUser.alias : null;
            eventVm.criEventByCampaign.ids = _.map(eventVm.selectedCampaign.eventsSnapshot, '$id');
            eventVm.criEventByCampaign.territory = eventVm.chooseTerritoriesEventByCampaign && eventVm.chooseTerritoriesEventByCampaign.length > 0 ? eventVm.chooseTerritoriesEventByCampaign.join(',') : '';
            eventVm.criEventByCampaign.facilities = eventVm.chooseFacilitiesEventByCampaign && eventVm.chooseFacilitiesEventByCampaign.length > 0 ? eventVm.chooseFacilitiesEventByCampaign.join(',') : '';
            let cri = angular.copy(eventVm.criEventByCampaign);
            if (getAll) {
                cri.size = 10000;
            }
            // srcP.push(eventService.reportConfirmation(eventVm.criEventByCampaign));
            return eventService.reportConfirmation(cri).then(function (result) {
                console.log('===================data report===================');
                console.log(getAll, result);
                if (getAll) {
                    eventVm.selectedCampaign._allEvents = result.items;
                } else {
                    eventVm.selectedCampaign.allEvents = result.items;
                }
                angular.extend(eventVm.pagingEventByCampaign, {
                    totalRecord: result.totalRecords,
                    totalPage: result.pages
                });
            });
        }
        function changePageCampaigns() {
            // console.log('changePageCampaigns');
            eventVm.criCampaigns.from = eventVm.pagingCampaigns.currentPage * eventVm.criCampaigns.size;
            _searchCampaigns();
        }
        function changePageEventByCampaign() {
            // console.log('changePageCampaigns');
            eventVm.criEventByCampaign.from = eventVm.pagingEventByCampaign.currentPage * eventVm.criEventByCampaign.size;
            _loadDataEventsByCampaign();
        }
        function searchCampaigns() {
            eventVm.criCampaigns.from = eventVm.pagingCampaigns.currentPage = 0;
            _searchCampaigns();
        }
        function _searchCampaigns() {
            // console.log('_searchCampaigns');

            appUtils.showLoading();

            const curPage = eventVm.pagingCampaigns.currentPage;
            const pageSize = eventVm.pagingCampaigns.pageSize;
            const objs = eventVm.campaigns;

            const pagedCampaigns = _.filter(objs, o => {
                return (o.title && o.title.toLowerCase().includes(eventVm.criCampaigns.keyword.toLowerCase())) ||
                    (o.type && o.type.toLowerCase().includes(eventVm.criCampaigns.keyword.toLowerCase()));
            });

            const totalPage = Math.ceil(pagedCampaigns.length / pageSize);

            angular.extend(eventVm.pagingCampaigns, {
                totalPage: totalPage,
                totalRecord: objs.length
            });

            eventVm.pagedCampaigns = _.chunk(pagedCampaigns, pageSize)[curPage];

            appUtils.hideLoading();
        }
        function exportEventData() {
            console.log('exportEventData');

            var cri = {
                type: 'All',
                state: eventVm.chooseStates.join(','),
                plantypes: eventVm.chooseRegions.join(','),
                requester: !$scope.userPermission.isRep ? 'All' : currentUser.$id,
                timestampStart: eventVm.cri.timestampStart,
                timestampEnd: eventVm.cri.timestampEnd,
                size: 0,
                from: 0,
                status: '1',
                dataEntered: true,
                alias: !$scope.userPermission.isAdmin ? currentUser.alias : null
            };

            // var startTxt = moment(eventVm.cri.timestampStart).utc().format('MM/DD/YYYY').replace('/', '_'),
            //     endTxt = moment(eventVm.cri.timestampEnd).utc().format('MM/DD/YYYY').replace('/', '_');

            var exportFileName = "Events_Export_Campaign_" + eventVm._selectedCampaign;
            var opts = {
                states: DataUtils.array2ObjectIndex(eventVm.allStates, 'iso'),
                eventTypes: DataUtils.array2ObjectIndex(eventVm.eventTypes, '$id'),
                facilities: DataUtils.array2ObjectIndex(eventVm.allFacilities, '$id'),
                territories: DataUtils.array2ObjectIndex(eventVm.allTerritories, '$id'),
                regions: DataUtils.array2ObjectIndex(eventVm.allRegions, 'id'),
                fileName: exportFileName,
                eventListVerifyStatus: appUtils.eventListVerifyStatus,
                rawData: eventVm.selectedCampaign
            };
            eventExportConfirmationService.exportWorkbook(cri, opts).then(function () {
            });
        }
        function exportRunsData() {
            console.log('exportEventData');

            var cri = {
                type: 'All',
                state: eventVm.chooseStates.join(','),
                plantypes: eventVm.chooseRegions.join(','),
                requester: !$scope.userPermission.isRep ? 'All' : currentUser.$id,
                timestampStart: eventVm.cri.timestampStart,
                timestampEnd: eventVm.cri.timestampEnd,
                size: 0,
                from: 0,
                status: '1',
                dataEntered: true,
                alias: !$scope.userPermission.isAdmin ? currentUser.alias : null
            };

            // var startTxt = moment(eventVm.cri.timestampStart).utc().format('MM/DD/YYYY').replace('/', '_'),
            //     endTxt = moment(eventVm.cri.timestampEnd).utc().format('MM/DD/YYYY').replace('/', '_');

            var exportFileName = "Notifications_Export_Campaign_" + eventVm._selectedCampaign;
            var opts = {
                states: DataUtils.array2ObjectIndex(eventVm.allStates, 'iso'),
                eventTypes: DataUtils.array2ObjectIndex(eventVm.eventTypes, '$id'),
                facilities: DataUtils.array2ObjectIndex(eventVm.allFacilities, '$id'),
                territories: DataUtils.array2ObjectIndex(eventVm.allTerritories, '$id'),
                regions: DataUtils.array2ObjectIndex(eventVm.allRegions, 'id'),
                fileName: exportFileName,
                roles: $scope.roles,
                rawData: eventVm.selectedCampaign
            };
            eventExportConfirmationService.exportRunsWorkbook(cri, opts).then(function () {
            });
        }
        function exportCampaignsData() {
            console.log('exportCampaignsData', eventVm.campaigns);
            let cri = {};
            var startTxt = moment(eventVm.cri.timestampStart).utc().format('MM/DD/YYYY').replace('/', '_'),
                endTxt = moment(eventVm.cri.timestampEnd).utc().format('MM/DD/YYYY').replace('/', '_');

            // var startTxt = moment(eventVm.cri.timestampStart).utc().format('MM/DD/YYYY').replace('/', '_'),
            //     endTxt = moment(eventVm.cri.timestampEnd).utc().format('MM/DD/YYYY').replace('/', '_');

            var exportFileName = "Campaigns_Export" + '_' + startTxt + "_to_" + endTxt;
            var opts = {
                states: DataUtils.array2ObjectIndex(eventVm.allStates, 'iso'),
                eventTypes: DataUtils.array2ObjectIndex(eventVm.eventTypes, '$id'),
                facilities: DataUtils.array2ObjectIndex(eventVm.allFacilities, '$id'),
                territories: DataUtils.array2ObjectIndex(eventVm.allTerritories, '$id'),
                regions: DataUtils.array2ObjectIndex(eventVm.allRegions, 'id'),
                fileName: exportFileName,
                roles: $scope.roles,
                rawData: eventVm.campaigns
            };
            eventExportConfirmationService.exportCampaignsWorkbook(cri, opts).then(function () {
            });
        }
        function onSwitchTabs() {
            console.log('initSaleByRegionChart');

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

        function getRequesters(value) {
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
        }
        function _composeFacilitySelectBoxText(data) {
            return {
                id: data.$id,
                text: data.name + ' (' + data.facility_promo_code + ')'
            };
        }
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
    }
})();