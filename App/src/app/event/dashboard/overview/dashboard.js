(function () {
    'use strict';

    angular.module('app.event').controller('EventDashboardCtrl', EventDashboardCtrl);

    /** @ngInject */
    function EventDashboardCtrl($rootScope, $scope, $timeout, $q, appUtils, DataUtils, 
        authService, $uibModal, $anchorScroll, $location, eventService, memStateService, 
        memberShipFacilitiesService, memTerritoryService, memRegionService, eventGoalService, eventExportService, eventExportFullService) {
        $rootScope.settings.layout.showSmartphone = false;
        $rootScope.settings.layout.pageSidebarClosed = true;
        var currentUser = authService.getCurrentUser(),
            startDate = moment().utc().startOf('month'),
            endDate = moment().utc().endOf('month');

        $scope.userPermission = $rootScope.storage.statePermission;
        $scope.userPermission.isAdmin = appUtils.checkSpecifyRole(currentUser, 'admin');
        $scope.userPermission.isRep = appUtils.checkSpecifyRole(currentUser, 'rep');

        var eventVm = this; // jshint ignore:line
        var now = moment(),
            nowMTS = now.clone().utc().startOf('month').valueOf() / 1000,
            daysOfMonth = now.clone().endOf('month').date(),
            currentDate = now.date();

        eventVm.months = _.range(1, 13).map(function (i, index) { return { text: moment().month(i - 1).format('MMMM'), val: i }; });
        eventVm.cri_goal = {
            month: now.get('month') + 1,
            year: now.get('year')
        };
        eventVm.tabIdx = 1;
        var onScrollDebounce = 500,
            onScrollTimeout = null,
            loadingQueue = 0,
            isLoading = false;

        var initPage = true,
            initSaleByRegionChart = true,
            initTop10 = true,
            initPieChartEvent = true,
            initPieChartNotification = true,
            initRanking = true;
        //
        eventVm.aggregations = [];
        eventVm.eventTypes = [];
        eventVm.allTerritories = [];
        eventVm.allStates = [];
        eventVm.allRegions = [];
        eventVm.allFacilities = [];
        eventVm.regionGroups = {};
        eventVm.chooseStates = [];
        eventVm.chooseRegions = [];
        //
        eventVm.changePage = changePage;
        eventVm.changeType = eventVm.changeState = eventVm.changeInterval = changeFilter;
        //
        eventVm.getState = getState;
        eventVm.getRegion = getRegion;
        eventVm.getType = getType;
        eventVm.getFacility = getFacility;
        eventVm.getTerritory = getTerritory;
        eventVm.getRequesters = getRequesters;
        eventVm.getDateTime = getDateTime;
        eventVm.onSwitchTabs = onSwitchTabs;
        //
        eventVm.exportEventData = exportEventData;
        eventVm.exportD = exportD;
        //
        eventVm.parseToNumber = _parseToNumber;
        eventVm.showEventListPopup = showEventListPopup;
        eventVm.toggleSort = toggleSort;
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
            "notification-confirmed": '#187696',
            "notification-canceled": '#BD501D',
        };
        //
        eventVm.intervals = [{
            value: 'day',
            text: 'Day'
        },
        {
            value: 'week',
            text: 'Week'
        },
        {
            value: 'month',
            text: 'Month'
        }];

        //
        eventVm.sort = {
            field: 'startDate',
            desc: true
        };
        //
        eventVm.cri = {
            type: 'All',
            state: eventVm.chooseStates.join(','),
            plantypes: eventVm.chooseRegions.join(','),
            requester: !$scope.userPermission.isRep ? 'All' : currentUser.$id,
            alias: null,
            size: 20,
            from: 0,
            status: 1,
            dataEntered: true,
            interval: 'day'
        };

        //get query start date
        eventVm.timestampStart = startDate.valueOf();
        eventVm.cri.timestampStart = angular.copy(startDate).utc().startOf("day").valueOf();

        //get query end date
        eventVm.timestampEnd = endDate.valueOf();
        eventVm.cri.timestampEnd = angular.copy(endDate).utc().endOf("day").valueOf();

        //Chart Config
        Highcharts.setOptions({
            lang: {
                decimalPoint: '.',
                thousandsSep: ','
            }
        });

        $scope.$watch('eventVm.cri_goal.month', function (val) {
            if (initPage) {
                return;
            }
            //Sale By Region Chart
            _watchChangeDateSaleByState();
        });


        $scope.$watch('eventVm.cri_goal.year', function (val) {
            if (initPage) {
                return;
            }
            //Sale By Region Chart
            _watchChangeDateSaleByState();
        });



        // Make sure DOM is loaded before get elems
        angular.element(document).ready(function () {
            $timeout(function () {
                $(window).on('scroll', _onScroll);
            }, 2000);
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

        $scope.$on('$destroy', function () {
            $(window).off('scroll', _onScroll);
        });

        //Section Overview
        eventVm.sectionOverview = [];

        //Section Notification
        eventVm.sectionNotification = [];
        eventVm.sectionNotification.push({
            title: 'Events scheduled',
            key: 'events-scheduled',
            type: 'scheduled',
            color: '#36c6d3',
            icon: 'fa-hourglass-half',
            total: 100
        });
        eventVm.sectionNotification.push({
            title: 'Events confirmed',
            key: 'events-confirmed',
            type: 'confirmed',
            color: '#337ab7',
            icon: 'fa-check',
            total: 15
        });
        eventVm.sectionNotification.push({
            title: 'Events cancelled',
            key: 'events-cancelled',
            type: 'scheduled',
            color: '#961818',
            icon: 'fa-close',
            total: 20
        });
        eventVm.sectionNotification.push({
            title: 'Reps waived off',
            key: 'reps-waived',
            type: 'scheduled',
            color: '#899190',
            icon: 'fa-user',
            total: 3
        });
        eventVm.notificationList = [
            {
                startDate: 1566816635000
            },
            {
                startDate: 1566816635000
            },
            {
                startDate: 1566816635000
            },
            {
                startDate: 1566816635000
            },
            {
                startDate: 1566816635000
            }
        ];
        // eventVm.sectionNotification.push({
        //     title: 'Notifications sent',
        //     key: 'notifications-sent',
        //     type: 'scheduled',
        //     color: '#187696',
        //     icon: 'fa-file-text',
        //     total: 400
        // });
        
        //Revenue Event Line Chart
        eventVm.revenueLineChartData = [];
        eventVm.revenueLineChartAxis = [];

        //Sale By Region Chart
        eventVm.saleByRegionChartData = [];
        eventVm.saleByRegionChartAxis = [];

        //Top 10 Region By Revenue Chart
        eventVm.top10RegionRevenueChartData = [];
        eventVm.top10RegionRevenueChartAxis = [];


        //Top 10 Territory By Renvenue Chart
        eventVm.top10TerritoryRevenueChartData = [];
        eventVm.top10TerritoryRevenueChartAxis = [];

        //Event Pie Chart
        eventVm.eventPieChartData = [];
        eventVm.eventPieChartStatus = 'new';
        eventVm.eventPieChartStatusList = [{
            value: 'new',
            text: 'New Application'
        },
        {
            value: 'revenue',
            text: 'Revenue Application'
        }
        ];
        //Notification Pi Chart
        eventVm.notificationPieChartData = [];

        //Event Pie Chart By Plan Type
        eventVm.eventPlanTypePieChartData = [];

        //Ranking Report
        eventVm.eventsRanking = [];
        eventVm.groupedItems = [];
        eventVm.filteredItems = [];
        eventVm.pagedItems = [];
        eventVm.paging = {
            pageSize: 20,
            currentPage: 0,
            totalPage: 0,
            totalRecord: 0
        };

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
                        text: 'Dollars ($)'
                    },
                    stackLabels: {
                        enabled: true,
                        style: {
                            fontWeight: 'bold',
                            color: (Highcharts.theme && Highcharts.theme.textColor) || 'gray'
                        },
                        format: '<b>${total:,.2f}</b>',

                    }
                },
                tooltip: {
                    split: true,
                    shared: true,
                    headerFormat: '<b>{point.key}</b><br/>',
                    pointFormat: '{series.name}: <b>${point.y:,.2f}</b><br>',
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
                                    showReportInformation(this, 'revenueEventChart');
                                }
                            }
                        }
                    }
                }
            },
            series: eventVm.revenueLineChartData
        };

        //Sale By State Chart Config
        eventVm.saleByRegionChartConfig = {
            options: {
                chart: {
                    type: 'bar',
                    marginRight: 50
                },
                title: {
                    text: ''
                },
                xAxis: {
                    categories: eventVm.saleByRegionChartAxis,
                    tickmarkPlacement: 'on',
                    title: {
                        enabled: false
                    }
                },
                yAxis: {
                    min: 0,
                    title: {
                        text: 'Dollars ($)'
                    },
                    stackLabels: {
                        enabled: true,
                        style: {
                            fontWeight: 'bold',
                            color: (Highcharts.theme && Highcharts.theme.textColor) || 'gray'
                        },
                        format: '<b>${total:,.2f}</b>',
                    }
                },
                tooltip: {
                    // split: true,
                    shared: true,
                    // headerFormat: '<b>{point.key}</b><br/>',
                    // pointFormat: '{series.name}: <b>${point.y:,.2f}</b><br>',
                    valueDecimals: 2,
                    formatter: function () {
                        var points = this.points;
                        var pointsLength = points.length;
                        var tooltipMarkup = pointsLength ? '<b>' + points[0].key + '</b><br/>' : '';
                        var index;
                        for (index = 0; index < pointsLength; index += 1) {
                            if (!(points[index].series.name.includes('Current Goal') === true && points[index].y === 0)) {
                                tooltipMarkup += points[index].series.name + ': <b>$' + Highcharts.numberFormat(points[index].y, 2) + '</b><br/>';
                            }
                        }
                        return tooltipMarkup;
                    }
                },
                plotOptions: {
                    bar: {
                        stacking: 'normal',
                        dataLabels: {
                            color: (Highcharts.theme && Highcharts.theme.dataLabelsColor) || 'white'
                        }
                    },
                    series: {
                        cursor: 'pointer',
                        point: {
                            events: {
                                click: function () {
                                    showReportInformation(this, 'saleByRegionChart');
                                }
                            }
                        }
                    }
                }
            },
            series: eventVm.saleByRegionChartData
        };

        //Top 10 State Chart Config
        eventVm.top10RegionRevenueChartConfig = {
            options: {
                chart: {
                    type: 'bar',
                    marginRight: 50
                },
                title: {
                    text: ''
                },
                xAxis: {
                    categories: eventVm.top10RegionRevenueChartAxis,
                    tickmarkPlacement: 'on',
                    title: {
                        enabled: false
                    }
                },
                yAxis: {
                    min: 0,
                    title: {
                        text: 'Dollars ($)'
                    },
                    stackLabels: {
                        enabled: true,
                        style: {
                            fontWeight: 'bold',
                            color: (Highcharts.theme && Highcharts.theme.textColor) || 'gray'
                        },
                        format: '<b>${total:,.2f}</b>',
                    }
                },
                tooltip: {
                    split: true,
                    shared: true,
                    headerFormat: '<b>{point.key}</b><br/>',
                    pointFormat: '{series.name}: <b>${point.y:,.2f}</b><br>',
                    valueDecimals: 2,
                },
                plotOptions: {
                    bar: {
                        stacking: 'normal',
                        dataLabels: {
                            color: (Highcharts.theme && Highcharts.theme.dataLabelsColor) || 'white'
                        }
                    },
                    series: {
                        cursor: 'pointer',
                        point: {
                            events: {
                                click: function () {
                                    showReportInformation(this, 'top10RegionRevenueChart');
                                }
                            }
                        }
                    }
                }
            },
            series: eventVm.top10RegionRevenueChartData
        };

        //Top 10 Territory Chart Config
        eventVm.top10TerritoryRevenueChartConfig = {
            options: {
                chart: {
                    type: 'bar',
                    marginRight: 50
                },
                title: {
                    text: ''
                },
                xAxis: {
                    categories: eventVm.top10TerritoryRevenueChartAxis,
                    tickmarkPlacement: 'on',
                    title: {
                        enabled: false
                    }
                },
                yAxis: {
                    min: 0,
                    title: {
                        text: 'Dollars ($)'
                    },
                    stackLabels: {
                        enabled: true,
                        style: {
                            fontWeight: 'bold',
                            color: (Highcharts.theme && Highcharts.theme.textColor) || 'gray'
                        },
                        format: '<b>${total:,.2f}</b>',
                    }
                },
                tooltip: {
                    split: true,
                    shared: true,
                    headerFormat: '<b>{point.key}</b><br/>',
                    pointFormat: '{series.name}: <b>${point.y:,.2f}</b><br>',
                    valueDecimals: 2,
                },
                plotOptions: {
                    bar: {
                        stacking: 'normal',
                        enabled: true,
                        dataLabels: {
                            color: (Highcharts.theme && Highcharts.theme.dataLabelsColor) || 'white'
                        }
                    },
                    series: {
                        cursor: 'pointer',
                        point: {
                            events: {
                                click: function () {
                                    showReportInformation(this, 'top10TerritoryRevenueChart');
                                }
                            }
                        }
                    }
                }
            },
            series: eventVm.top10TerritoryRevenueChartData
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
                                    showReportInformation(this, 'eventChart');
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
                                    showReportInformation(this, 'eventChart');
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
        //Event By Plan Type Chart Config
        eventVm.eventPlanTypePieChartConfig = {
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
                                    showReportInformation(this, 'eventPlanTypeChart');
                                }
                            }
                        }
                    }

                }
            },
            series: [{
                name: 'Type',
                colorByPoint: true,
                data: eventVm.eventPlanTypePieChartData
            }],
            loading: false
        };

        _initDashboard();
        //==============================================
        function _initDashboard() {
            eventVm.cri.requester = !$scope.userPermission.isRep ? 'All' : currentUser.$id;
            return $q.all([_loadFacilities(), _loadEventTypes(), _loadStates(), _loadRegions(), _loadTerritory()]).then(function () {
                return _loadData();
            });
        }

        function _loadData() {
            _pushLoading();
            eventVm.cri.state = eventVm.chooseStates.join(',');
            eventVm.cri.plantypes = eventVm.chooseRegions.join(',');
            eventVm.cri.alias = !$scope.userPermission.isAdmin ? currentUser.alias : null;
            eventVm.criRegion = angular.copy(eventVm.cri);
            return eventService.report(eventVm.cri).then(function (result) {
                console.log('===================data report===================');
                console.log(result);
                _popLoading();
                initPage = false;
                eventVm.events = eventVm.eventsRanking = result.items;
                eventVm.aggregations = result.aggregations;
                return Promise.all([loadOverview(result), loadRevenueData(result.aggregations.groupByDay)]);
            });
        }

        //Overview Chart
        function loadOverview(data) {
            var start = moment(_.clone(eventVm.cri.timestampStart)).utc(),
                end = moment(_.clone(eventVm.cri.timestampEnd)).utc();
            var cri = {
                fromMonth: parseInt(_.clone(start).format('M')),
                toMonth: parseInt(_.clone(end).format('M')),
                fromYear: parseInt(_.clone(start).format('YYYY')),
                toYear: parseInt(_.clone(end).format('YYYY'))
            };
            return eventGoalService.search(cri).then(function (rs) {
                return _loadOverviewData(data, rs);
            });
        }

        function _loadOverviewData(data, goalData) {
            var deferred = $q.defer();
            var totalAttendees = 0, totalNewMembers = 0, totalMonthly = 0, totalAnnual = 0, totalRevenue = 0, totalNationalGoals = 0;
            var aggregations = data && data.aggregations || null;
            console.log(aggregations);
            if (aggregations) {
                totalAttendees = aggregations.totalAttendees && aggregations.totalAttendees.value || 0;
                totalNewMembers = aggregations.totalNewMembers && aggregations.totalNewMembers.value || 0;
                totalRevenue = aggregations.totalRevenue && aggregations.totalRevenue.value || 0;
                totalMonthly = aggregations.totalMonthly && aggregations.totalMonthly.value || 0;
                totalAnnual = aggregations.totalAnnual && aggregations.totalAnnual.value || 0;
            }


            if (goalData && Object.keys(goalData).length > 0) {
                var plans = _.map(goalData, function (s) {
                    return s.plan || 0;
                });
                totalNationalGoals = _.sum(plans);
            }

            var percentRevenue = 'N/A';
            if (totalNationalGoals !== 0) {
                percentRevenue = (totalRevenue / totalNationalGoals) * 100;
                percentRevenue = _formatCurrency(percentRevenue);
            }

            eventVm.sectionOverview.push({
                title: 'Revenue VS National Goal',
                key: 'revenue-national-goal',
                value_1: totalRevenue,
                value_2: totalNationalGoals,
                type: 'revenue',
                color: '#FFBA49',
                percent: percentRevenue,
                icon: '',
                total: data.totalRecords
            });

            var percentAttendees = 'N/A';
            if (totalAttendees !== 0) {
                percentAttendees = (totalNewMembers / totalAttendees) * 100;
                percentAttendees = _formatCurrency(percentAttendees);

            }
            eventVm.sectionOverview.push({
                title: 'Attendees VS Members',
                key: 'attendees-new-members',
                value_1: totalAttendees,
                value_2: totalNewMembers,
                color: '#227AB5',
                type: 'number',
                percent: percentAttendees,
                icon: 'fa-group'
            });

            eventVm.sectionOverview.push({
                title: 'Monthly VS Annual',
                key: 'monthly-ạnnual',
                value_1: totalMonthly,
                value_2: totalAnnual,
                color: '#06D6A0',
                hideTotal: true,
                type: 'number',
                percent: 0,
                icon: 'fa-file-text'
            });

            deferred.resolve(true);
            return deferred.promise;
        }

        //Revenue Line Chart
        function loadRevenueData(items) {
            var groupByDay = items && items.buckets || [];
            var deferred = $q.defer();

            //set title
            var start = angular.copy(startDate),
                end = angular.copy(endDate);

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

            var series = _.map(eventVm.eventTypes, function (eType) {
                return {
                    id: eType.value,
                    name: eType.text,
                    data: [],
                    color: eventVm.chartColors[eType.value]
                };
            });

            var dates = [], text;
            _.forEach(groupByDay, function (value, key) {
                if (eventVm.cri.interval === 'day') {
                    dates.push(value.key_as_string);
                } else if (eventVm.cri.interval === 'month') {
                    text = moment(angular.copy(value.key)).utc().format('MMMM');
                    dates.push(text);
                } else {
                    var week_number = moment(angular.copy(value.key)).utc().week();
                    text = 'Week ' + week_number;
                    dates.push(text + ' - ' + value.key_as_string);
                }
                var groupByType = value.groupByType && value.groupByType.buckets || [];
                _.forEach(series, function (s) {
                    var obj = {
                        y: 0,
                        key: value.key,
                        type: s.id
                    };
                    //
                    var lookUp = _.find(groupByType, function (t) {
                        return t.key === s.id;
                    });
                    if (lookUp) {
                        var total = _formatFloat(lookUp.totalRevenue && lookUp.totalRevenue.value || 0);
                        obj.y = total;
                    }
                    s.data.push(obj);
                });
            });

            eventVm.revenueLineChartData = series;
            eventVm.revenueLineChartAxis = dates;
            $timeout(function () {
                eventVm.revenueChartConfig.series = eventVm.revenueLineChartData;
                eventVm.revenueChartConfig.options.xAxis.categories = eventVm.revenueLineChartAxis;
            }, 100);

            deferred.resolve(true);
            return deferred.promise;
        }

        //Sale By Region Chart
        function loadSaleByRegionChart() {
            if (!eventVm.cri_goal.year || !eventVm.cri_goal.month) {
                return;
            }
            eventVm.criRegion = angular.copy(eventVm.cri);
            eventVm.criRegion.size = 0;
            var cri = {
                fromMonth: eventVm.cri_goal.month,
                toMonth: eventVm.cri_goal.month,
                fromYear: eventVm.cri_goal.year,
                toYear: eventVm.cri_goal.year
            };
            var time = moment().utc().year(eventVm.cri_goal.year).month(eventVm.cri_goal.month - 1);
            eventVm.criRegion.timestampStart = _.clone(time).startOf('month').valueOf();
            eventVm.criRegion.timestampEnd = _.clone(time).endOf('month').valueOf();

            var goalReq = eventGoalService.search(cri);
            var realReq = eventService.reportWithGoal(eventVm.criRegion);
            return Promise.all([goalReq, realReq]).then(function (rs) {
                var goalData = rs[0],
                    realData = rs[1] && rs[1].aggregations && rs[1].aggregations.groupByState || null;

                return _loadSaleByRegionData(goalData, realData);
            });
        }

        function _loadSaleByRegionData(goalData, realData) {
            var groupByState = realData && realData.buckets || [];
            var deferred = $q.defer();

            var series = _.map(eventVm.eventTypes, function (eType) {
                return {
                    id: eType.value,
                    name: eType.text,
                    data: [],
                    stack: 'type',
                    color: eventVm.chartColors[eType.value]
                };
            });

            var goalsAlert = [], goalsMet = [], goalsWarning = [], states = [];
            _.forEach(groupByState, function (value, key) {
                var state = _.find(eventVm.allStates, { iso: value.key.toUpperCase() });
                if (state) {
                    states.push(state.name);
                } else {
                    states.push(value.key);
                }
                var groupByType = value && value.groupByType && value.groupByType.buckets || [];
                _.forEach(series, function (s) {
                    var lookUp = _.find(groupByType, function (t) {
                        return t.key === s.id;
                    });
                    if (lookUp) {
                        var total = _formatFloat(lookUp.totalRevenue && lookUp.totalRevenue.value || 0);
                        s.data.push({
                            stateIso: value.key.toUpperCase(),
                            y: total
                        });
                    } else {
                        s.data.push({
                            stateIso: value.key.toUpperCase(),
                            y: 0
                        });
                    }
                });
                var goal = _.find(goalData, { r: value.key.toUpperCase() });
                if (goal) {
                    var status = _calProgressGoal(goal, value && value.totalRevenue && value.totalRevenue.value || 0);
                    var obj = {
                        y: goal.plan,
                        stateIso: value.key.toUpperCase(),
                        class: 'goals'
                    };
                    if (status === 'alert') {
                        obj.color = '#e7505a';
                        goalsAlert.push(obj);
                        goalsMet.push({
                            y: 0,
                            color: '#26C281',
                            stateIso: value.key.toUpperCase(),
                            class: 'goals'
                        });
                        goalsWarning.push({
                            y: 0,
                            color: '#f3c200',
                            stateIso: value.key.toUpperCase(),
                            class: 'goals'
                        });
                    } else if (status === 'met') {
                        obj.color = '#26C281';
                        goalsMet.push(obj);
                        goalsAlert.push({
                            y: 0,
                            color: '#e7505a',
                            stateIso: value.key.toUpperCase(),
                            class: 'goals'
                        });
                        goalsWarning.push({
                            y: 0,
                            color: '#f3c200',
                            stateIso: value.key.toUpperCase(),
                            class: 'goals'
                        });
                    } else if (status === 'warning') {
                        obj.color = '#f3c200';
                        goalsWarning.push(obj);
                        goalsMet.push({
                            y: 0,
                            color: '#26C281',
                            stateIso: value.key.toUpperCase(),
                            class: 'goals'
                        });
                        goalsAlert.push({
                            y: 0,
                            color: '#f3c200',
                            stateIso: value.key.toUpperCase(),
                            class: 'goals'
                        });
                    }
                } else {
                    goalsAlert.push({
                        y: 0,
                        color: '#e7505a',
                        stateIso: value.key.toUpperCase(),
                        class: 'goals'
                    });

                    goalsMet.push({
                        y: 0,
                        color: '#26C281',
                        stateIso: value.key.toUpperCase(),
                        class: 'goals'
                    });

                    goalsWarning.push({
                        y: 0,
                        color: '#f3c200',
                        stateIso: value.key.toUpperCase(),
                        class: 'goals'
                    });
                }
            });

            eventVm.saleByRegionChartAxis = states;
            eventVm.heightStatesTab = (Math.max(200, 40 * (states.length || 0)) + 150);
            series.push({
                id: 'goals-alert',
                name: 'Current Goal Alert (' + moment(angular.copy(eventVm.criRegion.timestampStart)).utc().format('MMM') + ')',
                data: goalsAlert,
                stack: 'goals',
                color: '#e7505a'
            });

            series.push({
                id: 'goals-met',
                name: 'Current Goal Met (' + moment(angular.copy(eventVm.criRegion.timestampStart)).utc().format('MMM') + ')',
                data: goalsMet,
                stack: 'goals',
                color: '#26C281'
            });

            series.push({
                id: 'goals-warning',
                name: 'Current Goal Warning (' + moment(angular.copy(eventVm.criRegion.timestampStart)).utc().format('MMM') + ')',
                data: goalsWarning,
                stack: 'goals',
                color: '#f3c200'
            });

            eventVm.saleByRegionChartData = series;

            $timeout(function () {
                eventVm.saleByRegionChartConfig.series = eventVm.saleByRegionChartData;
                eventVm.saleByRegionChartConfig.options.xAxis.categories = eventVm.saleByRegionChartAxis;
            }, 100);

            deferred.resolve(true);
            return deferred.promise;
        }

        //Top 10 Region Revenue Chart
        function loadTop10RegionRevenue(items) {
            var deferred = $q.defer();
            var groupByState = items && items.buckets || [];
            //
            var data = [], states = [];
            _.forEach(groupByState, function (value, key) {
                var state = _.find(eventVm.allStates, { iso: value.key.toUpperCase() });
                if (state) {
                    states.push(state.name);
                } else {
                    states.push(value.key);
                }
                var total = _formatFloat(value.totalRevenue && value.totalRevenue.value || 0);
                data.push({
                    stateIso: value.key.toUpperCase(),
                    y: total,
                    color: '#f7a35c'
                });
            });
            //
            var series = [];
            series.push({
                id: 'top10RegionRevenue',
                name: 'Total Revenue',
                data: data,
                color: '#f7a35c'
            });
            //
            eventVm.top10RegionRevenueChartAxis = states;
            eventVm.top10RegionRevenueChartData = series;
            //
            $timeout(function () {
                eventVm.top10RegionRevenueChartConfig.series = eventVm.top10RegionRevenueChartData;
                eventVm.top10RegionRevenueChartConfig.options.xAxis.categories = eventVm.top10RegionRevenueChartAxis;
            }, 100);

            deferred.resolve(true);
            return deferred.promise;
        }

        //Top 10 Territory Revenue Chart
        function loadTop10TerritoryRevenue(items) {
            var deferred = $q.defer();
            var groupByTerritory = items && items.buckets || [];
            //
            var data = [], territories = [];
            _.forEach(groupByTerritory, function (value, key) {
                var territory = _.find(eventVm.allTerritories, function (t) {
                    return value.key === t.$id;
                });
                if (territory) {
                    territories.push(territory.name);
                } else {
                    territories.push(value.key);
                }
                var total = _formatFloat(value.totalRevenue && value.totalRevenue.value || 0);
                data.push({
                    territoryId: value.key,
                    y: total,
                    color: '#238abd'
                });
            });
            //
            var series = [];
            series.push({
                id: 'top10TerritoryRevenue',
                name: 'Total Revenue',
                data: data,
                color: '#238abd'
            });
            //
            eventVm.top10TerritoryRevenueChartAxis = territories;
            eventVm.top10TerritoryRevenueChartData = series;
            //
            $timeout(function () {
                eventVm.top10TerritoryRevenueChartConfig.series = eventVm.top10TerritoryRevenueChartData;
                eventVm.top10TerritoryRevenueChartConfig.options.xAxis.categories = eventVm.top10TerritoryRevenueChartAxis;
            }, 100);

            deferred.resolve(true);
            return deferred.promise;
        }

        //Pie Chart Event By Type
        function loadPieChartEvent(items) {
            console.log('loadPieChartEvent', items);

            var deferred = $q.defer();
            var groupByType = items && items.buckets || [];
            _.forEach(groupByType, function (item) {
                var name = _.find(eventVm.eventTypes, { value: item.key });
                if (name) {
                    var obj = {
                        name: name.text,
                        y: item.doc_count,
                        type: item.key,
                        color: eventVm.chartColors[item.key]
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
        function loadPieChartNotification() {
            var deferred = $q.defer();
            var groupByType = [
                {
                    doc_count: 50,
                    key: 'notification-confirmed',
                    name: 'Confirmed'
                }, {
                    doc_count: 20,
                    key: 'notification-canceled',
                    name: 'Canceled'
                }

            ];
            _.forEach(groupByType, function (item) {
                if (item) {
                    var obj = {
                        name: name.name,
                        y: item.doc_count,
                        type: item.key,
                        color: eventVm.chartColors[item.key]
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

        //Pie Chart Event By Plan Type
        function loadEventByPlanTypePieChart(items) {
            var deferred = $q.defer();
            var groupByPlanType = items && items.buckets || [];
            _.forEach(groupByPlanType, function (item) {
                var name = _.find(eventVm.allRegions, { id: item.key });
                if (name) {
                    var obj = {
                        name: name.guid,
                        y: item.doc_count,
                        type: item.key
                    };
                    eventVm.eventPlanTypePieChartData.push(obj);
                }
            });

            $timeout(function () {
                eventVm.eventPlanTypePieChartConfig.series[0].data = eventVm.eventPlanTypePieChartData;
            }, 100);

            deferred.resolve(true);
            return deferred.promise;
        }

        //Ranking Report
        function loadRankingReport(items) {
            eventVm.filteredItems = items;
            eventVm.paging.totalRecord = items.length;
            eventVm.paging.currentPage = 0;
            if (items.length < 20) {
                eventVm.eventsRanking = items;
            } else {
                eventVm.eventsRanking = items.slice(0, 20);
            }
            _groupToPages();
        }

        //Load Common Data==============================================
        function _loadEventTypes() {
            return eventService.getEventTypes().then(function (types) {
                eventVm.eventTypes = types || [];
            });
        }

        function _loadStates() {
            return memStateService.getAll().then(function (data) {
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

        //Public Functions==============================================
        function showReportInformation(pointData, infoType) {

            if ('saleByRegionChart' === infoType && pointData && pointData.class && pointData.class === 'goals') {
                return;
            }
            var modalInstance = $uibModal.open({
                templateUrl: 'app/event/dashboard/modal/info-modal.tpl.html',
                controller: 'eventDashboardInformationModalCtrl as eventModalVm',
                size: 'lg',
                scope: $scope,
                windowClass: 'dashboard-info-modal',
                backdrop: 'static',
                resolve: {
                    pointData: function () {
                        return angular.copy(pointData);
                    },
                    infoType: function () {
                        return angular.copy(infoType);
                    }
                }
            });

            return modalInstance.result.then(function (res) {
                gotoAnchor(res);
            }, function (res) {
                gotoAnchor(res);
            });
        }

        function showEventListPopup(cri) {
            console.log('cri', JSON.stringify(cri));
            var modalInstance = $uibModal.open({
                templateUrl: 'app/event/dashboard/modal/event-list-modal.tpl.html',
                controller: 'EventListModalCtrl as eventModalVm',
                size: 'lg',
                scope: $scope,
                windowClass: 'dashboard-info-modal',
                backdrop: 'static',
                resolve: {
                    criteria: function () {
                        return cri;
                    }
                }
            });
            modalInstance.result.then(function (res) {
                gotoAnchor(res);
            }, function (res) {
                gotoAnchor(res);
            });
        }

        function gotoAnchor(id) {
            var newHash = id;
            if ($location.hash() !== newHash) {
                // set the $location.hash to `newHash` and
                // $anchorScroll will automatically scroll to it
                $location.hash(id);
            } else {
                // call $anchorScroll() explicitly,
                // since $location.hash hasn't changed
                $anchorScroll();
            }
        }

        function changeFilter() {
            initPage = true;
            initSaleByRegionChart = true;
            initTop10 = true;
            initPieChartEvent = true;
            initPieChartNotification = true;
            initRanking = true;
            //Overview
            eventVm.sectionOverview = [];

            //Event Revenue
            eventVm.revenueLineChartData = [];
            eventVm.revenueLineChartAxis = [];
            eventVm.revenueChartConfig.series = [];
            eventVm.revenueChartConfig.options.xAxis.categories = [];
            //Sale By Region Revenue
            eventVm.saleByRegionChartData = [];
            eventVm.saleByRegionChartAxis = [];
            eventVm.saleByRegionChartConfig.series = [];
            eventVm.saleByRegionChartConfig.options.xAxis.categories = [];
            //Top 10 Region By Revenue
            eventVm.top10RegionRevenueChartData = [];
            eventVm.top10RegionRevenueChartAxis = [];
            eventVm.top10RegionRevenueChartConfig.series = [];
            eventVm.top10RegionRevenueChartConfig.options.xAxis.categories = [];
            //Top 10 Territory By Revenue
            eventVm.top10TerritoryRevenueChartData = [];
            eventVm.top10TerritoryRevenueChartAxis = [];
            eventVm.top10TerritoryRevenueChartConfig.series = [];
            eventVm.top10TerritoryRevenueChartConfig.options.xAxis.categories = [];
            //Event By Type
            eventVm.eventPieChartData = [];
            eventVm.eventPieChartConfig.series[0].data = [];
            //Event By Plan Type
            eventVm.eventPlanTypePieChartData = [];
            eventVm.eventPlanTypePieChartConfig.series[0].data = [];
            //Event 20 Ranking
            eventVm.groupedItems = [];
            eventVm.filteredItems = [];
            eventVm.pagedItems = [];
            eventVm.paging = {
                pageSize: 20,
                currentPage: 0,
                totalPage: 0,
                totalRecord: 0
            };
            return _loadData().then(function () {
                if (eventVm.tabIdx === 2) {
                    return loadSaleByRegionChart();
                }
            });
        }

        function changePage() {
            _groupToPages();
        }

        function toggleSort(field) {
            if (field == eventVm.sort.field) {
                eventVm.sort.desc = !eventVm.sort.desc;
            }
            else {
                Object.assign(eventVm.sort, {
                    field: field,
                    desc: true
                });
            }
            var orders = [],
                searchField = eventVm.sort.field;
            var fieldVal = function (field) {
                return function (item) {
                    if (!_.isString(item[field])) {
                        return item[field];
                    }
                    return item[field] && item[field].toLowerCase();
                };
            };
            if (searchField == 'iptTotalRevenue' || searchField == 'iptCloseRate' || searchField == 'appUploaded') {
                fieldVal = function (field) {
                    return function (item) {
                        if (item[field] == undefined) {
                            return eventVm.sort.desc ? -1 : Number.MAX_SAFE_INTEGER;
                        }
                        return item[field];
                    };
                };
            }

            if (searchField === 'planType') {
                orders.push(fieldVal('state'));
                orders.push(fieldVal('region'));
            } else {
                orders.push(fieldVal(eventVm.sort.field));
            }
            var items = _.orderBy(eventVm.events, orders, [eventVm.sort.desc && 'desc' || 'asc']);
            loadRankingReport(items);
        }

        function exportD() {
            var cri = {
                type: 'All',
                state: eventVm.chooseStates.join(','),
                plantypes: eventVm.chooseRegions.join(','),
                requester: !$scope.userPermission.isRep ? 'All' : currentUser.$id,
                timestampStart: eventVm.cri.timestampStart,
                timestampEnd: eventVm.cri.timestampEnd,
                // size: 5000,
                from: 0,
                status: '1',
                // dataEntered: true,
                alias: !$scope.userPermission.isAdmin ? currentUser.alias : null
            };
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
            _pushLoading();
            eventExportService.exportD(cri, opts).then(function () {
                _popLoading();
            });
        }

        function exportEventData() {
            _pushLoading();
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
            eventExportFullService.exportWorkbook(cri, opts).then(function () {
                _popLoading();
            });
        }

        function onSwitchTabs() {
            console.log('initRanking', initRanking);
            console.log('initSaleByRegionChart', initSaleByRegionChart);

            if (initRanking === true || initSaleByRegionChart === true) {
                var reqs = [];
                if (initSaleByRegionChart && eventVm.tabIdx === 2) {
                    _pushLoading();
                    initSaleByRegionChart = false;
                    reqs.push(loadSaleByRegionChart());
                }

                return Promise.all(reqs).then(function () {
                    _popLoading();
                });
            }
        }

        function getState(value) {
            var state = _.find(eventVm.allStates, function (item) {
                return item.iso === value;
            });

            return state && state.name || '';
        }

        function getRegion(state, value) {
            var region = _.find(eventVm.regionGroups[state], function (item) {
                return item.id === value;
            });
            return region && region.guid || '';
        }

        function getTerritory(value) {
            var territory = _.find(eventVm.allTerritories, function (item) {
                return item.$id === value;
            });

            return territory && territory.name || '';
        }

        function getType(value) {
            var type = _.find(eventVm.eventTypes, function (item) {
                return item.value === value;
            });

            return type && type.text || '';
        }

        function getFacility(value) {
            var facility = _.find(eventVm.allFacilities, function (item) {
                return item.$id === value;
            });

            return facility ? facility.name + " (<strong>" + facility.facility_promo_code + "</strong>)" : '';
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
                    text.push(fullName);
                }
            });
            return text.join(";");
        }

        function getDateTime(value) {
            var time = parseInt(value);
            if (isNaN(time)) {
                return '';
            }
            return moment(time).utc().format('MM/DD/YYYY');
        }

        //Private Function ==============================================
        function _pushLoading() {
            loadingQueue = loadingQueue || 0;
            ++loadingQueue;
            if (loadingQueue && !isLoading) {
                appUtils.showLoading();
                isLoading = true;
            }
        }

        function _popLoading() {
            --loadingQueue;
            if (loadingQueue < 1) {
                loadingQueue = 0;
                appUtils.hideLoading();
                isLoading = false;
            }

            $timeout(angular.noop, 200);
        }

        function _groupToPages() {
            eventVm.pagedItems = [];
            for (var i = 0; i < eventVm.filteredItems.length; i++) {
                if (i % eventVm.paging.pageSize === 0) {
                    eventVm.pagedItems[Math.floor(i / eventVm.paging.pageSize)] = [eventVm.filteredItems[i]];
                } else {
                    eventVm.pagedItems[Math.floor(i / eventVm.paging.pageSize)].push(eventVm.filteredItems[i]);
                }
            }
            if (eventVm.filteredItems.length % eventVm.paging.pageSize === 0) {
                eventVm.paging.totalPage = eventVm.filteredItems.length / eventVm.paging.pageSize;
            } else {
                eventVm.paging.totalPage = Math.floor(eventVm.filteredItems.length / eventVm.paging.pageSize) + 1;
            }

        }

        function _parseToNumber(value) {
            var number = parseFloat(value);
            if (isNaN(number)) {
                number = null;
            }
            return number;
        }

        function _formatFloat(value) {
            var n = parseFloat(value);
            if (_.isNaN(n)) {
                return 0;
            }
            return Math.round(n * 1000) / 1000;
        }

        function _formatCurrency(value) {
            var n = parseFloat(value);
            if (_.isNaN(n)) {
                return '';
            }
            return (Math.round(n * 1000) / 1000).toFixed(2);
        }

        function _calProgressGoal(item, revenue) {
            var progress = 0,
                status = 'alert',
                target = item.plan;

            revenue = revenue || 0;

            if (!target) {
                return 'unknow';
            }

            if (nowMTS == item.mTs) {
                target = item.plan / daysOfMonth * currentDate;
            }

            progress = revenue / target * 100;
            progress = Math.round(progress * 100) / 100;
            if (progress >= 100) {
                status = 'met';
            } else if (progress >= 80) {
                status = 'warning';
            }
            return status;
        }

        function _watchChangeDateSaleByState() {
            eventVm.saleByRegionChartData = [];
            eventVm.saleByRegionChartAxis = [];
            eventVm.saleByRegionChartConfig.series = [];
            eventVm.saleByRegionChartConfig.options.xAxis.categories = [];
            loadSaleByRegionChart();
        }

        function _onScroll(event) {
            if (onScrollTimeout) {
                $timeout.cancel(onScrollTimeout);
            }
            onScrollTimeout = $timeout(function () {
                _onScrollLoadData(event);
            }, onScrollDebounce);
        }

        function _onScrollLoadData() {
            if (initPage === false && (initPieChartEvent === true || initTop10 === true)) {
                var top10ChartTop = $('#revenueEventChart').offset() && $('#revenueEventChart').offset().top ? $('#revenueEventChart').offset().top - 200 : 800,
                    eventRevenueChartTop = $('#top10RegionRevenue').offset() && $('#top10RegionRevenue').offset().top ? $('#top10RegionRevenue').offset().top - 200 : 1100;
                //rankingTop = $('#eventChart').offset() && $('#eventChart').offset().top ? $('#eventChart').offset().top - 200 : 1600;

                var scrollTop = $(window).scrollTop(), reqs = [];
                if (scrollTop > top10ChartTop && initTop10 && eventVm.tabIdx === 1) {
                    _pushLoading();
                    initTop10 = false;
                    reqs.push(loadTop10RegionRevenue(eventVm.aggregations.groupByState));
                    reqs.push(loadTop10TerritoryRevenue(eventVm.aggregations.groupByTerritory));
                }
                else if (scrollTop > eventRevenueChartTop && initPieChartEvent && eventVm.tabIdx === 1) {
                    _pushLoading();
                    initPieChartEvent = false;
                    reqs.push(loadPieChartEvent(eventVm.aggregations.groupByType));
                    reqs.push(loadEventByPlanTypePieChart(eventVm.aggregations.groupByPlanType));
                } else if (initPieChartNotification && eventVm.tabIdx === 4) {
                    _pushLoading();
                    initPieChartNotification = false;
                    reqs.push(loadPieChartNotification());
                }
                // else if (scrollTop > rankingTop && initRanking) {
                //     _pushLoading();
                //     initRanking = false;
                //     reqs.push(loadRankingReport(eventVm.events));
                // }
                // else if (initSaleByRegionChart) {
                //     _pushLoading();
                //     initSaleByRegionChart = false;
                //     reqs.push(loadSaleByRegionChart());
                // }

                return Promise.all(reqs).then(function () {
                    _popLoading();
                });
            }
        }
    }
})();