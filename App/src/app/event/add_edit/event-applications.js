(function() {
    'use strict';

    angular.module('app.event')
        .controller('eventApplicationsCtrl', eventApplicationsCtrl);

    /** @ngInject */
    function eventApplicationsCtrl($rootScope, $scope, $stateParams, $state, $q, appUtils, authService, memAppService, $timeout, employeeService, memStateService) {
        var currentUser = authService.getCurrentUser();
        $scope.userPermission = $rootScope.storage.statePermission;
        $scope.userPermission.viewAllApplication = $rootScope.can('access', ' ViewAllApplications');
        $scope.userPermission.isAdmin = appUtils.checkSpecifyRole(currentUser, 'admin');
        $scope.userPermission.isRep = appUtils.checkSpecifyRole(currentUser, 'rep');

        //Default Start Date & End Date
        var defaultSDate = moment().subtract('days', 6).startOf('day');
        var defaultEDate = moment().endOf('day');
        //
        var itemStatusMap = {
            'New': { icon: 'fa-file font-blues' },
            'Processing': { icon: 'fa-spinner font-grey-silver' },
            'Verified': { icon: 'fa-check-square-o font-grey-silver' },
            'Billing Pending': { icon: 'fa-hourglass-half font-grey-silver' },
            'Billing Denied': { icon: 'fa-hourglass-half font-grey-silver' },
            'Cancelled': { icon: 'fa-times font-grey-silver' },
            'Error': { icon: 'fa-exclamation-triangle font-grey-silver' },
            'Billing Approved': { icon: 'fa-user font-grey-silver' },
            'Billing Required': { icon: 'fa-usd font-red' },
            'Default': { icon: 'fa-file-o font-grey-silver' }
        };

        var itemPriorityStatusMap = {
            'true': { class: 'fa-flag font-red' },
            'false': { class: 'fa-flag-o font-grey-silver' }
        };

        var eventAppVm = this; // jshint ignore:line
        eventAppVm.eventId = $stateParams.id || null;
        eventAppVm.timestampStart = Date.parse(new Date(defaultSDate));
        eventAppVm.timestampEnd = Date.parse(new Date(defaultEDate));
        eventAppVm.cri = {
            keyword: '',
            state: 'All',
            timestampStart: eventAppVm.timestampStart,
            timestampEnd: eventAppVm.timestampEnd,
            isDashboard: false,
            sort: 'asc',
            from: 0,
            size: 15,
            status: '-1',
            clients: 'All',
            alias: null,
            event: eventAppVm.eventId
        };

        eventAppVm.clients = null;
        eventAppVm.reportDate = 'timestampCreated';
        eventAppVm.appStatus = appUtils.appStatus;
        eventAppVm.modelItems = [];
        eventAppVm.appStatelist = [];
        eventAppVm.paging = {
            pageSize: 15,
            totalPage: 0,
            totalRecord: 0
        };

        eventAppVm.reportDates = [{
                value: 'Created Date',
                key: 'timestampCreated'
            },
            {
                value: 'Signature Date',
                key: 'timestampSignatured'
            }
        ];

        eventAppVm.sortByData = [{
                value: 'Oldest',
                key: 'asc'
            },
            {
                value: 'Newest',
                key: 'desc'
            }
        ];

        eventAppVm.select2Options = {
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
                    var alias = currentUser.alias;
                    if ($scope.userPermission.isAdmin || $scope.userPermission.viewAllApplication) {
                        alias = null;
                    }
                    var cri = {
                        keyword: params.term,
                        size: 25,
                        from: 0,
                        alias: null,
                        isAuthorized: true
                    };
                    return cri;
                },
                processResults: function(data) {
                    //
                    var result = _.map(data.items, function(item) {
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
        angular.element(document).ready(function() {
            $timeout(function() {
                $('#EventApplicationsRange').on('apply.daterangepicker', function(ev, picker) {
                    var startControl = angular.copy(picker.startDate._d),
                        endControl = angular.copy(picker.endDate._d);

                    var startStr = moment(startControl).format('MM/DD/YYYY'),
                        endStr = moment(endControl).format('MM/DD/YYYY');

                    eventAppVm.cri.timestampStart = eventAppVm.timestampStart = moment(startStr).startOf("day").valueOf();
                    eventAppVm.cri.timestampEnd = eventAppVm.timestampEnd = moment(endStr).endOf("day").valueOf();
                    search(true);
                });
            }, 400);
        });

        $scope.$on('refreshEmployeeLogsList', function(data) {
            initPage();
        });


        //Functions
        eventAppVm.getMethodName = getMethodName;
        eventAppVm.getStateName = getStateName;
        eventAppVm.getStatusName = getStatusName;
        eventAppVm.getFileStatus = getFileStatus;
        eventAppVm.getStatusFlagIcon = getStatusFlagIcon;
        eventAppVm.getIconStatus = getIconStatus;
        eventAppVm.changePage = changePage;
        eventAppVm.reset = reset;
        eventAppVm.search = search;
        eventAppVm.goEdit = goEdit;
        $scope.eventVm.loadApplications = initPage;

        //=======================================================================
        function initPage() {
            var reqs = [];
            reqs.push(memStateService.getAll().then(function(data) {
                eventAppVm.appStatelist = data;
            }));

            reqs.push(loadFilterClientsData());
            return $q.all(reqs).then(function() {
                search(true);
            });
        }

        function loadFilterClientsData() {
            //eventAppVm.cri.alias = !$scope.userPermission.isAdmin && !$scope.userPermission.viewAllApplication ? currentUser.alias : null;
            eventAppVm.cri.clients = 'All'; //!$scope.userPermission.isRep ? 'All' : (currentUser.repCode || currentUser.username);
            var filterUser = null,
                reqs = [];
            if (eventAppVm.cri.clients !== 'All' && eventAppVm.cri.clients !== currentUser.repCode) {
                var arr = angular.copy(eventAppVm.cri.clients).split(','),
                    repCode = arr && arr[0] || null;
                if (repCode) {
                    var req = employeeService.getUserByRepCode(repCode).then(function(user) {
                        filterUser = user || null;
                    });
                    reqs.push(req);
                }
            } else {
                filterUser = currentUser;
            }
            return Promise.all(reqs).then(function() {
                $timeout(function() {
                    var option;
                    if (eventAppVm.cri.clients === 'All') {
                        option = new Option('All Reps', 'All', true, true);
                        $('#ChooseClients').append(option).trigger('change');
                    } else {
                        if (filterUser) {
                            var selectOpt = _composeSelectBoxText(filterUser);
                            option = new Option(selectOpt.text, selectOpt.id, true, true);
                            $('#ChooseClients').append(option).trigger('change');
                        }
                    }
                }, 100);
            });
        }

        function changePage() {
            eventAppVm.cri.from = eventAppVm.paging.currentPage * eventAppVm.cri.size;
            _search();
        }

        function search(reset) {
            if (reset) {
                eventAppVm.cri.from = eventAppVm.paging.currentPage = 0;
            }
            //
            if (eventAppVm.reportDate === 'timestampSignatured') {
                eventAppVm.cri.isDashboard = true;
            } else {
                eventAppVm.cri.isDashboard = false;
            }
            //
            eventAppVm.cri.clients = $('#ChooseClients').val();
            _search();
        }

        function _search() {
            appUtils.showLoading();
            memAppService.search(eventAppVm.cri).then(function(result) {
                var reqs = [];
                _.forEach(result && result.items || [], function(item) {
                    var req = _getAuthorInfo(item);
                    reqs.push(req);
                });
                Promise.all(reqs).then(function(response) {
                    appUtils.hideLoading();
                    $timeout(function() {
                        $scope.$apply(function() {
                            eventAppVm.modelItems = response;
                            //console.log(response);
                            angular.extend(eventAppVm.paging, {
                                totalRecord: result.totalRecords,
                                totalPage: result.pages
                            });
                        });
                    }, 200);
                });
            });
        }

        function _getAuthorInfo(item) {
            return employeeService.getUser(item.author || '').then(function(author) {
                item.authorName = 'Unknown';
                if (author) {
                    item.authorName = _composeSelectBoxText(author).text;
                }
                return item;
            });
        }

        function reset() {
            eventAppVm.timestampStart = Date.parse(new Date(defaultSDate));
            eventAppVm.timestampEnd = Date.parse(new Date(defaultEDate));
            eventAppVm.cri = {
                keyword: '',
                state: 'All',
                timestampStart: eventAppVm.timestampStart,
                timestampEnd: eventAppVm.timestampEnd,
                isDashboard: false,
                sort: 'asc',
                from: 0,
                size: 15,
                status: '-1',
                event: eventAppVm.eventId
            };
            eventAppVm.paging.currentPage = 0;
            eventAppVm.reportDate = 'timestampCreated';
            return loadFilterClientsData().then(function() {
                _search();
            });
        }

        function getMethodName(key) {
            var rs = _.find(appUtils.appMethods, { 'key': key });
            return rs && rs.value || '';
        }

        function getStateName(key) {
            var rs = _.find(eventAppVm.appStatelist, { 'iso': key });
            return rs && rs.name || '';
        }

        function getStatusName(key) {
            var rs = _.find(eventAppVm.appStatus, { 'key': key });
            return rs && rs.value || '';
        }

        function getFileStatus(key) {
            var rs = _.find(appUtils.appFileStatus, { 'key': key });
            return rs && rs.value || '';
        }

        function getStatusFlagIcon(item) {
            return item && item.priority ? itemPriorityStatusMap[item.priority + ''].class : itemPriorityStatusMap['false'].class;
        }

        function getIconStatus(item) {
            if (item && item.status) {
                var statusObj = _.find(eventAppVm.appStatus, { key: parseInt(item.status) });
                if (statusObj) {
                    return itemStatusMap[statusObj.value].icon;
                }
            }
            /* jshint ignore:start */
            return itemStatusMap['Default'].icon;
            /* jshint ignore:end */
        }

        function goEdit(item) {
            $timeout(function() {
                $state.go('membership.editApplication', { id: item.$id, 'tab': item.status, 'status': item.status, 'keyword': eventAppVm.cri.keyword, 'start': eventAppVm.cri.timestampStart, 'end': eventAppVm.cri.timestampEnd, 'page': eventAppVm.paging.currentPage, 'author': eventAppVm.cri.clients, 'alias': eventAppVm.cri.alias, 'state': eventAppVm.cri.states, 'reportBy': eventAppVm.reportDate, 'sortBy': eventAppVm.cri.sort });
            }, 100);
        }

        function _composeSelectBoxText(data) {
            var text = [],
                fName = _.trim(data.firstName),
                lName = _.trim(data.lastName),
                repCode = _.trim(data.repCode || data.username || '');

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