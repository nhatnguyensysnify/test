(function () {
    'use strict';

    angular.module('app.event')
        .controller('eventUploadHistoryCtrl', eventUploadHistoryCtrl);

    /** @ngInject */
    function eventUploadHistoryCtrl($scope, $q, $timeout, $state, $stateParams, authService, appUtils, BaseEmployeLogClass, employeeService, employeeLogService, eventUploadLogsService) {
        var currentUser = $scope.user = authService.getCurrentUser(); //$rootScope.storage.currentUser;
        //
        var employeeHistoryVm = this; // jshint ignore:line
        var eventCtrlVm = $scope.eventVm,
            defaultStart = moment.utc(eventCtrlVm.model.startDate).startOf('day'),
            defaultEnd = moment.utc(eventCtrlVm.model.startDate).add('days', 6).endOf('day');

        employeeHistoryVm.fromEvent = true;
        employeeHistoryVm.loading = false;
        employeeHistoryVm.trackingDetails = null;
        employeeHistoryVm.facility = null;
        employeeHistoryVm.eventId = eventCtrlVm.model.$id || $stateParams.id || null;
        employeeHistoryVm.fromEvent = true;
        //        
        var logingProvider = new BaseEmployeLogClass();
        logingProvider.uid = currentUser.$id;
        logingProvider.action = employeeHistoryVm.action = 'uploadPDF';
        logingProvider.eventId = angular.copy(employeeHistoryVm.eventId || 'All');
        logingProvider.facility = 'All';
        logingProvider.timestampStart = employeeHistoryVm.timestampStart = defaultStart.valueOf();
        logingProvider.timestampEnd = employeeHistoryVm.timestampEnd = defaultEnd.valueOf();
        logingProvider.initPage = function () {
            appUtils.showLoading();
            // tdang: add
            return eventUploadLogsService.getFullLog(employeeHistoryVm.eventId).then(function (result) {
                console.log(result);
                appUtils.hideLoading();
                logingProvider.filteredItems = result.items;
                logingProvider.paging.totalRecord = result.totalRecords;
                logingProvider.paging.currentPage = 0;
                // group by pages
                logingProvider.groupToPages();
            });
            // tdnag: end

            // tdang comment
            // return eventUploadLogsService.get(employeeHistoryVm.eventId).then(function(data) {
            //     var req = $q.when([]);
            //     if (data) {
            //         req = employeeLogService.getByPaths(_.map(data, function(item, key) {
            //             return item;
            //         }), {
            //             uid: logingProvider.uid,
            //             timestampStart: logingProvider.timestampStart,
            //             timestampEnd: logingProvider.timestampEnd,
            //             action: logingProvider.action,
            //             facility: logingProvider.facility,
            //             eventId: logingProvider.eventId
            //         });
            //     }
            //     return req.then(function(result) {
            //         //console.log(result);
            //         appUtils.hideLoading();
            //         logingProvider.filteredItems = result.items;
            //         logingProvider.paging.totalRecord = result.totalRecords;
            //         logingProvider.paging.currentPage = 0;
            //         //group by pages
            //         logingProvider.groupToPages();
            //     });
            // });
        };
        //

        $scope.eventVm.loadEventUploadHistory = employeeHistoryVm.initPage = initPage;
        employeeHistoryVm.filter = filter;
        employeeHistoryVm.refresh = refresh;
        employeeHistoryVm.select2Options = logingProvider.select2Options;
        employeeHistoryVm.paging = logingProvider.paging;
        employeeHistoryVm.getAction = logingProvider.getAction;
        employeeHistoryVm.isErrorMessge = logingProvider.isErrorMessage;
        employeeHistoryVm.bytesToSize = appUtils.bytesToSize;
        employeeHistoryVm.getFullName = appUtils.getFullNameApplication;
        employeeHistoryVm.getStatus = appUtils.getStatus;
        employeeHistoryVm.getMethod = appUtils.getMethod;
        employeeHistoryVm.getFacilityTxt = logingProvider.getFacilityTxt;
        employeeHistoryVm.setShowTrackingDetail = setShowTrackingDetail;
        employeeHistoryVm.filterByFacility = filterByFacility;
        employeeHistoryVm.fieldText = logingProvider.fieldText;
        employeeHistoryVm.allStates = eventCtrlVm.states || [];
        employeeHistoryVm.allTerritories = eventCtrlVm.territories || [];
        employeeHistoryVm.getHireType = logingProvider.getHireType;

        //
        $scope.goTo = goTo;
        $scope.changePage = function () { };
        $scope.formatTrackingTime = function (timestamp) {
            timestamp = parseInt(timestamp);
            if (_.isNaN(timestamp)) {
                timestamp = null;
            }
            var time = timestamp ? moment(timestamp) : moment();
            return appUtils.formatDateTimeString(time);
        };

        $scope.$on('refreshEmployeeLogsList', function (data) {
            initPage();
        });

        $scope.$on('refreshDetails', function (event, data) {
            initPage();
            // if (data && data.fileInfo) {
            //     var find = lookup(data);
            //     if (find) {
            //         loadDetail(data, find.pageIndex, find.index);
            //     }
            // }
        });

        $scope.hideDownloadLink = function (status) {
            return parseInt(status) !== 4 && parseInt(status) !== 6 && parseInt(status) !== 8;
        };

        $scope.goToEmployee = function (email) {
            employeeService.getUserByEmail(email).then(function (employee) {
                if (employee) {
                    // $state.go('employee.edit', { id: employee.$id});
                    window.open('#/employees/edit/' + employee.$id + '/');
                }
            });
        };

        //

        // Make sure DOM is loaded before get elems
        angular.element(document).ready(function () {
            $timeout(function () {
                $('#employeeLogDateRange').on('apply.daterangepicker', function (ev, picker) {
                    //get time range
                    var startControl = angular.copy(picker.startDate._d),
                        endControl = angular.copy(picker.endDate._d);

                    var startStr = moment(startControl).format('MM/DD/YYYY'),
                        endStr = moment(endControl).format('MM/DD/YYYY');

                    logingProvider.timestampStart = employeeHistoryVm.timestampStart = moment(startStr).startOf("day").valueOf();
                    logingProvider.timestampEnd = employeeHistoryVm.timestampEnd = moment(endStr).endOf("day").valueOf();
                    logingProvider.action = employeeHistoryVm.action;
                    //
                    employeeHistoryVm.trackingDetails = null;
                    initPage();
                });

                var option = new Option('All Facilities', 'All', true, true);
                $('#filterFacility').append(option).trigger('change');
            }, 800);
        });

        function filter(reset) {
            employeeHistoryVm.trackingDetails = null;
            if (reset) {
                $timeout(function () {
                    var option = new Option('All Facilities', 'All', true, true);
                    $('#filterFacility').append(option).trigger('change');
                    logingProvider.action = employeeHistoryVm.action = 'All';
                    logingProvider.facility = $('#filterFacility').val();
                    logingProvider.timestampStart = employeeHistoryVm.timestampStart = defaultStart;
                    logingProvider.timestampEnd = employeeHistoryVm.timestampEnd = defaultEnd;
                    $scope.$broadcast('resetDateRange');
                    initPage();
                }, 0);
            } else {
                logingProvider.action = employeeHistoryVm.action;
                logingProvider.facility = $('#filterFacility').val();
                initPage();
            }
        }

        function filterByFacility(facility) {
            if (facility) {
                $timeout(function () {
                    var txt = facility.name + ' (' + facility.facility_promo_code + ')';
                    var option = new Option(txt, facility.id, true, true);
                    $('#filterFacility').append(option).trigger('change');
                    logingProvider.facility = $('#filterFacility').val();
                    initPage();
                }, 0);
            }
        }

        //Functions
        function initPage() {
            logingProvider.initPage().then(function () {
                employeeHistoryVm.list = logingProvider.pagedItems;
                console.log(angular.copy(employeeHistoryVm.list));
                $timeout(angular.noop, 200);
            });
        }

        function setShowTrackingDetail(index, item) {
            if (index === employeeHistoryVm.trackingDetails) {
                employeeHistoryVm.trackingDetails = null;
            } else {
                employeeHistoryVm.trackingDetails = index;
                //if (item && item.fileInfo) {
                loadDetail(item);
                //}
            }
        }

        function loadDetail(item, pageIndex, index) {
            employeeHistoryVm.loading = true;
            var reqs = [];
            if (item && item.fileInfo && item.fileInfo.mediaId) {
                var mediaReq = logingProvider.initMedia(item.fileInfo.mediaId).then(function (media) {
                    if (media) {
                        angular.extend(item.fileInfo, media);
                    }
                    $timeout(angular.noop, 400);
                });
                reqs.push(mediaReq);
            }

            if (item && item.fileInfo && item.fileInfo.applications) {
                var applications = angular.copy(item.fileInfo.applications);
                var apps = _.map(applications, function (item, key) {
                    return {
                        appId: key,
                        mediaId: item.mediaId || item.media
                    };
                });

                if (apps && apps.length > 0) {
                    var appReq = logingProvider.loadApplications(apps).then(function (rs) {
                        item.fileInfo.applicationData = rs;
                        var allApproved = _.filter(rs, function (i) {
                            return parseInt(i.status) === 4 || parseInt(i.status) === 6 || parseInt(i.status) === 8;
                        });
                        item.fileInfo.hideDownLoadLink = rs.length === allApproved.length;
                        $timeout(angular.noop, 400);
                    });
                    reqs.push(appReq);
                }
            }
            if (item.diffValue) {
                _.forEach(item.diffValue, function (diff) {
                    diff.class = 'col-xs-12 col-sm-6 col-md-6';
                    if (_.trim(diff.old) === '' && _.trim(diff.new) === '') {
                        diff.hide = true;
                    } else if (diff.field === 'dateOfHire') {
                        diff.oldTxt = moment(diff.old).format('MM/DD/YYYY');
                        diff.newTxt = moment(diff.new).format('MM/DD/YYYY');
                    } else if (diff.field === 'managers') {
                        reqs.push(logingProvider.getManagerInfo(diff.old).then(function (rs) {
                            diff.oldTxt = rs;
                        }));
                        reqs.push(logingProvider.getManagerInfo(diff.new).then(function (rs) {
                            diff.newTxt = rs;
                        }));
                    } else if (diff.field === 'isActive') {
                        diff.oldTxt = diff.old === true ? 'Active' : 'InActive';
                        diff.newTxt = diff.new === true ? 'Active' : 'InActive';
                    } else if (diff.field === 'workingStates' || diff.field === 'state') {
                        diff.oldTxt = logingProvider.getStateTxt(employeeHistoryVm.allStates, diff.old);
                        diff.newTxt = logingProvider.getStateTxt(employeeHistoryVm.allStates, diff.new);
                    } else if (diff.field === 'workingTerritories') {
                        diff.oldTxt = logingProvider.getTerritoryTxt(employeeHistoryVm.allTerritories, diff.old);
                        diff.newTxt = logingProvider.getTerritoryTxt(employeeHistoryVm.allTerritories, diff.new);
                    } else if (diff.field === 'typeOfHire') {
                        diff.oldTxt = logingProvider.getHireType(diff.old);
                        diff.newTxt = logingProvider.getHireType(diff.new);
                    } else if (diff.field === 'acl') {
                        var oldRole = Object.keys(diff.old.roles);
                        var newRole = Object.keys(diff.new.roles);
                        diff.oldTxt = logingProvider.getRoleTxt(oldRole[0]);
                        diff.newTxt = logingProvider.getRoleTxt(newRole[0]);
                    } else if (diff.field === 'availability') {
                        diff.class = 'col-xs-12 col-sm-12 col-md-12';
                        var compare = _.omitBy(diff.new, function (value, key) {
                            return _.isEqual(value, diff.old[key]);
                        });
                        var keys = Object.keys(compare);
                        var oldValue = [], newValue = [];
                        _.forEach(appUtils.dayOfWeekEnum, function (value, key) {
                            if (keys.indexOf(key) !== -1) {
                                var label = appUtils.dayOfWeekEnum[key], val = appUtils.availabilityEnum[diff.old[key]] || 'null';
                                oldValue.push(label + ': ' + val);
                                //
                                val = appUtils.availabilityEnum[diff.new[key]] || 'null';
                                newValue.push(label + ': ' + val);
                            }
                        });
                        diff.oldTxt = oldValue.join(', ');
                        diff.newTxt = newValue.join(', ');
                    } else if (diff.field === 'licenses') {
                        diff.class = 'col-xs-12 col-sm-12 col-md-12';
                        var tpl = '<table class="table table-striped table-bordered">' +
                            '<thead>' +
                            '<th class="text-center width10" style="vertical-align: middle;"> State </th>' +
                            '<th class="text-center width8" style="vertical-align: middle;"> Issue Date </th>' +
                            '<th class="text-center width10" style="vertical-align: middle;"> License Type </th>' +
                            '<th class="text-center width10" style="vertical-align: middle;"> License Number </th>' +
                            '<th class="text-center width8" style="vertical-align: middle;"> Expiration Date </th>' +
                            '<th class="text-center width10" style="vertical-align: middle;"> Appointed </th>' +
                            '<th class="text-center width8" style="vertical-align: middle;"> Modified Date </th>' +
                            '</thead>' +
                            '<tbody>';
                        if (_.isObject(diff.old)) {
                            tpl += '<tr class="font-yellow-gold">' +
                                '<td><strike>' + (logingProvider.getStateTxt(employeeHistoryVm.allStates, diff.old.issueState)) + '</strike></td>' +
                                '<td><strike>' + (moment(diff.old.issueDate).format('MM/DD/YYYY')) + '</strike></td>' +
                                '<td><strike>' + (appUtils.licenseTypeEnum[diff.old.type] || '') + '</strike></td>' +
                                '<td><strike>' + (diff.old.number) + '</strike></td>' +
                                '<td><strike>' + (moment(diff.old.expirationDate).format('MM/DD/YYYY')) + '</strike></td>' +
                                '<td><strike>' + (appUtils.appointedEnum[diff.old.appointed] || '') + '</strike></td>' +
                                '<td><strike>' + (diff.old.timestampModified ? moment(diff.old.timestampModified).format('MM/DD/YYYY') : '') + '</strike></td>' +
                                '</tr>';
                        }
                        if (_.isObject(diff.new)) {
                            tpl += '<tr class="font-yellow-gold" >' +
                                '<td>' + (logingProvider.getStateTxt(employeeHistoryVm.allStates, diff.new.issueState)) + '</td>' +
                                '<td>' + (moment(diff.new.issueDate).format('MM/DD/YYYY')) + '</td>' +
                                '<td>' + (appUtils.licenseTypeEnum[diff.new.type] || '') + '</td>' +
                                '<td>' + (diff.new.number) + '</td>' +
                                '<td>' + (moment(diff.new.expirationDate).format('MM/DD/YYYY')) + '</td>' +
                                '<td>' + (appUtils.appointedEnum[diff.new.appointed] || '') + '</td>' +
                                '<td>' + (diff.new.timestampModified ? moment(diff.new.timestampModified).format('MM/DD/YYYY') : '') + '</td>' +
                                '</tr>';
                        }
                        tpl += '</tbody></table>';
                        console.log(tpl);
                        diff.template = tpl;
                    } else {
                        diff.oldTxt = diff.old;
                        diff.newTxt = diff.new;
                    }
                });
            }
            //appUtils.showLoading();
            return $q.all(reqs).then(function () {
                employeeHistoryVm.loading = false;
                if (index !== undefined && pageIndex !== undefined) {
                    employeeHistoryVm.list[pageIndex][index] = item;
                }
            });
        }

        function refresh(item, index) {
            logingProvider.refresh(item.timestampCreated).then(function (data) {
                if (data) {
                    loadDetail(data, employeeHistoryVm.paging.currentPage, index);
                }
            });
        }

        function goTo(item) {
            var status = parseInt(item.status);
            var tab = status === 0 ? -1 : status;
            window.open('#/membership/application/' + item.appId + '?tab=' + tab + '?page=0');
            //$state.go('membership.editApplication', { id: item.appId, 'tab': tab, 'keyword': '', 'page': 0 });
        }

        function lookup(data) {
            var result = {};
            var list = angular.copy(employeeHistoryVm.list);
            _.forEach(list, function (page, pageIndex) {
                result.pageIndex = pageIndex;
                var existed = _.find(page, function (item, idx) {
                    result.index = idx;
                    return item.timestampCreated === data.timestampCreated;
                });

                if (existed) {
                    return false;
                }
            });

            return result.pageIndex !== undefined && result.index !== undefined ? result : null;
        }

    }
})();