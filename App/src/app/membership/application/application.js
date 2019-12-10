(function () {
    'use strict';

    angular.module('app.membership')
        .controller('ApplicationCtrl', ApplicationCtrl);

    /** @ngInject */
    function ApplicationCtrl($rootScope, $scope, $stateParams, $state, $q, toaster, appUtils, DataUtils, authService, firebaseDataRef, memAppService, memberShipService, memAppHisService, $uibModal, $ngBootbox, $timeout, employeeService, memStateService, memRegionService, memAppTimeLineService, memAppIndicatorService) {
        $rootScope.settings.layout.pageSidebarClosed = true;
        var appSettings = $rootScope.storage.appSettings;
        var indicators = {}, indicatorRef, indicatorCallback = appSettings.indicatorCallback || 5;

        var currentUser = authService.getCurrentUser(); //$rootScope.storage.currentUser;
        $scope.userPermission = $rootScope.storage.statePermission;
        $scope.userPermission.viewAllApplication = $rootScope.can('access', ' ViewAllApplications');
        $scope.userPermission.isAdmin = appUtils.checkSpecifyRole(currentUser, 'admin');
        $scope.userPermission.isRep = appUtils.checkSpecifyRole(currentUser, 'rep');

        //Default Start Date & End Date
        var defaultSDate = moment().subtract('days', 6).startOf('day');
        var defaultEDate = moment().endOf('day');

        var timestampStart = $stateParams.start || Date.parse(new Date(defaultSDate));
        var timestampEnd = $stateParams.end || Date.parse(new Date(defaultEDate));
        $timeout(function () {
            $scope.$apply(function () {
                $scope.itemSelected = $stateParams.id;
            });
        }, 200);
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

        $scope.modelItems = [];

        //App
        var applicationVm = this;
        applicationVm.cri = {
            keyword: $stateParams.keyword || '',
            state: $stateParams.state || 'All',
            timestampStart: timestampStart,
            timestampEnd: timestampEnd,
            isDashboard: false,
            sort: $stateParams.sortBy || 'asc',
            from: 0,
            size: 15,
            alias: null
        };
        applicationVm.clients = null;
        applicationVm.reportDate = $stateParams.reportBy || 'timestampCreated';
        if (applicationVm.reportDate === 'timestampSignatured') {
            applicationVm.cri.isDashboard = true;
        }
        applicationVm.activetab = $stateParams.tab ? parseInt($stateParams.tab) : -1;
        if (applicationVm.activetab === -1) {
            applicationVm.cri.status = $stateParams.status || '-1';
        } else {
            applicationVm.cri.status = $stateParams.tab ? $stateParams.tab + '' : '-1';
        }

        applicationVm.appStatus = appUtils.appStatus;
        applicationVm.appStatelist = [];
        applicationVm.allRegions = [];
        applicationVm.regionsGroups = {};

        applicationVm.showStatusfilter = applicationVm.activetab === -1;

        applicationVm.groupedItems = [];
        applicationVm.filteredItems = [];
        applicationVm.pagedItems = [];
        applicationVm.paging = {
            pageSize: 15,
            totalPage: 0,
            totalRecord: 0
        };

        applicationVm.reportDates = [
            {
                value: 'Created Date',
                key: 'timestampCreated'
            },
            {
                value: 'Signature Date',
                key: 'timestampSignatured'
            }
        ];

        applicationVm.sortByData = [
            {
                value: 'Oldest',
                key: 'asc'
            },
            {
                value: 'Newest',
                key: 'desc'
            }
        ];

        applicationVm.paging.currentPage = $stateParams.page ? parseInt($stateParams.page) : 0;


        applicationVm.select2Options = {
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

        //Load Data
        // $scope.$watch('applicationVm.cri.clients', function (val) {
        //     if (val === null) {
        //         applicationVm.cri.clients = $stateParams.author || currentUser.repCode || currentUser.username || 'All';
        //     }
        // });

        $('#applicationrange').on('apply.daterangepicker', function (ev, picker) {
            //reload UI
            filterItems(true);
        });

        $scope.$on('ReloadApplicationList', function (event, args) {
            $timeout(function () {
                $state.go('membership.editApplication', { 'page': 0 });
            }, 100);
        });

        // $scope.$on('indicatorsLoad', function(event, data) {
        //     checkIndicator();
        // });

        $scope.$on('$destroy', function () {
            var oldModel = angular.copy($scope.modelItems);
            _.forEach(oldModel, function (item) {
                memAppIndicatorService.offOnValue(item.$id);
            });
            // if(indicatorRef){
            // 	indicatorRef.off('value', checkIndicator);
            // }

            // if(indicators){
            //     var oldModel = angular.copy($scope.modelItems);
            //     _.forEach(oldModel, function(item){
            //         clearInterval(indicators[item.$id]);
            //     });

            //     indicators = {};
            // }
        });



        //Functions
        $scope.changePage = changePage;
        applicationVm.search = search;
        applicationVm.executeSearch = executeSearch;
        applicationVm.filterItems = filterItems;
        applicationVm.getMethodName = getMethodName;
        applicationVm.getStatusName = getStatusName;
        applicationVm.getFileStatus = getFileStatus;
        //applicationVm.verified = verified;
        applicationVm.recycle = recycle;
        applicationVm.resetFilter = resetFilter;
        applicationVm.getStatusFlagIcon = getStatusFlagIcon;
        applicationVm.getIconStatus = getIconStatus;
        applicationVm.markPriority = markPriority;
        applicationVm.edit = edit;
        applicationVm.filterByStatus = filterByStatus;
        applicationVm.addApplicationByManualModal = addApplicationByManualModal;

        initPage();

        //=======================================================================
        function initPage() {
            // if(indicatorRef){
            // 	indicatorRef.off('value', checkIndicator);
            // }
            var reqs = [];
            reqs.push(memStateService.statesLoadOnce().then(function (data) {
                applicationVm.appStatelist = data;
            }));

            reqs.push(memRegionService.getAll().then(function (regionGroups) {
                _.each(regionGroups, function (regionGroup, stateCode) {
                    var regions = DataUtils.toAFArray(regionGroup);
                    applicationVm.allRegions = applicationVm.allRegions.concat(regions);
                    regionGroups[stateCode] = regions;
                });
                applicationVm.regionGroups = regionGroups;
                $timeout(angular.noop, 200);
            }));

            reqs.push(loadFilterClientsData());

            //listen indicatior node update
            // indicatorRef = firebaseDataRef.child('membership-applications-indicator');
            // indicatorRef.on('value', checkIndicator);
            return $q.all(reqs).then(function () {
                $timeout(function () {
                    search(true);
                }, 800);
            });
        }

        function loadFilterClientsData() {
            applicationVm.cri.alias = $stateParams.alias || (!$scope.userPermission.isAdmin && !$scope.userPermission.viewAllApplication ? currentUser.alias : null);
            applicationVm.cri.clients = $stateParams.author || (!$scope.userPermission.isRep ? 'All' : (currentUser.repCode || currentUser.username));
            if ($stateParams.plantype) {
                applicationVm.chooseRegions = $stateParams.plantype.split(',') || [];
            } else {
                $timeout(function () {
                    applicationVm.chooseRegions = [];
                    $('#chooseRegions').trigger('change');
                }, 200);
            }
            var filterUser = null, reqs = [];
            if (applicationVm.cri.clients !== 'All' && applicationVm.cri.clients !== currentUser.repCode) {
                var arr = angular.copy(applicationVm.cri.clients).split(','),
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
                    if (applicationVm.cri.clients === 'All') {
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

        function changePage() {
            applicationVm.cri.from = applicationVm.paging.currentPage * applicationVm.cri.size;
            search();
        }

        function search(init) {
            if (init) {
                applicationVm.cri.from = 0;
                applicationVm.paging.currentPage = 0;
            }

            executeSearch();
        }

        function executeSearch() {
            //Clear interval
            var oldModel = angular.copy($scope.modelItems);
            _.forEach(oldModel, function (item) {
                memAppIndicatorService.offOnValue(item.$id);
            });
            var status = applicationVm.cri.status;
            // special case for member tab
            // if( applicationVm.cri.status == 4  ||  applicationVm.cri.status == 8){
            //     status = '4,8';
            // } 
            if (applicationVm.reportDate === 'timestampSignatured') {
                applicationVm.cri.isDashboard = true;
            } else {
                applicationVm.cri.isDashboard = false;
            }
            appUtils.showLoading();
            applicationVm.cri.clients = $('#filterClients').val();
            applicationVm.cri.clients = decodeURI(applicationVm.cri.clients);
            applicationVm.cri.plantypes = applicationVm.chooseRegions && applicationVm.chooseRegions.length > 0 ? applicationVm.chooseRegions.join(',') : '';
            memAppService.search(applicationVm.cri).then(function (result) {
                appUtils.hideLoading();
                $scope.modelItems = result.items;
                _.forEach($scope.modelItems, function (item) {
                    checkIndicatorApplication(item);
                });
                applicationVm.paging.totalRecord = result.totalRecords;
                applicationVm.paging.totalPage = result.pages;
            });
        }

        function filterItems(init) {
            //console.log('filterItems');
            appUtils.showLoading();
            if (init) {
                applicationVm.cri.from = 0;
                applicationVm.paging.currentPage = 0;
            }
            //get time range
            var startDate = $('#applicationrange').data('daterangepicker').startDate._d;
            var endDate = $('#applicationrange').data('daterangepicker').endDate._d;

            applicationVm.cri.timestampStart = timestampStart = Date.parse(new Date(startDate));
            applicationVm.cri.timestampEnd = timestampEnd = Date.parse(new Date(endDate));

            var oldModel = angular.copy($scope.modelItems);
            _.forEach(oldModel, function (item) {
                memAppIndicatorService.offOnValue(item.$id);
            });

            var status = applicationVm.cri.status;
            // special case for member tab
            // if( applicationVm.cri.status == 4  ||  applicationVm.cri.status == 8){
            //     status = '4,8';
            // } 

            if (applicationVm.reportDate === 'timestampSignatured') {
                applicationVm.cri.isDashboard = true;
            } else {
                applicationVm.cri.isDashboard = false;
            }
            applicationVm.cri.clients = $('#filterClients').val();
            applicationVm.cri.clients = decodeURI(applicationVm.cri.clients);
            applicationVm.cri.plantypes = applicationVm.chooseRegions && applicationVm.chooseRegions.length > 0 ? applicationVm.chooseRegions.join(',') : '';
            memAppService.search(applicationVm.cri).then(function (result) {
                appUtils.hideLoading();
                $scope.modelItems = result.items;
                _.forEach($scope.modelItems, function (item) {
                    checkIndicatorApplication(item);
                });
                applicationVm.paging.totalRecord = result.totalRecords;
                applicationVm.paging.totalPage = result.pages;
                $timeout(angular.noop, 500);
                $timeout(function () {
                    if (applicationVm.activetab === -1) {
                        $state.go('membership.editApplication', { id: '', 'tab': applicationVm.activetab, 'status': applicationVm.cri.status, 'keyword': '', 'start': applicationVm.cri.timestampStart, 'end': applicationVm.cri.timestampEnd, 'page': 0, 'author': applicationVm.cri.clients, 'alias': applicationVm.cri.alias, 'state': applicationVm.cri.state, 'plantype': applicationVm.cri.plantypes, 'reportBy': applicationVm.reportDate, 'sortBy': applicationVm.cri.sort }, { notify: false });
                    } else {
                        $state.go('membership.editApplication', { id: '', 'tab': applicationVm.activetab, 'status': undefined, 'keyword': '', 'start': applicationVm.cri.timestampStart, 'end': applicationVm.cri.timestampEnd, 'page': 0, 'author': applicationVm.cri.clients, 'alias': applicationVm.cri.alias, 'state': applicationVm.cri.state, 'plantype': applicationVm.cri.plantypes,'reportBy': applicationVm.reportDate, 'sortBy': applicationVm.cri.sort }, { notify: false });
                    }
                }, 100);
            });
        }

        function getMethodName(key) {
            var rs = _.find(appUtils.appMethods, { 'key': key });
            return rs !== undefined && rs.value ? rs.value : ' ';
        }

        function getStatusName(key) {
            var rs = _.find(appUtils.appStatus, { 'key': key });
            return rs !== undefined && rs.value ? rs.value : ' ';
        }

        function getFileStatus(key) {
            var rs = _.find(appUtils.appFileStatus, { 'key': key });
            return rs !== undefined && rs.value ? rs.value : ' ';
        }

        // function verified(item){
        // 	var actionTxt = item.isVerified === true ? "Unverified" :  "Verified";
        //     $ngBootbox.confirm('Are you sure want to ' + actionTxt + ' of application?').then(function(){
        //         if(item.isVerified === false){
        //             item.timestampVerified = appUtils.getTimestamp();
        //         }
        //         item.isVerified = item.isVerified === true ? false :  true;

        //         var req = memAppService.update(item);
        //         req.then(function(res){
        //             //Create application timeline
        //             var appTimeline = {
        //                 authorName: currentUser.email,
        //                 eventType: appUtils.logEvent.editApp,
        //                 eventId: '',
        //                 submitResult: '',
        //                 message: !res.result ? res.errorMsg : '',
        //                 from: 'Admin Site'
        //             };
        //             memAppTimeLineService.create(item.$id,appTimeline);

        //             if(!res.result){
        //                 $ngBootbox.alert(res.errorMsg);
        //                 return;
        //             }
        //             toaster.pop('success','Success', actionTxt + " Application Successfully!");
        //             applicationVm.search(applicationVm.cri.keyword,true);
        //         });
        //     }, function() {
        //         appUtils.hideLoading();
        //     });

        // }

        function recycle(item) {
            $ngBootbox.confirm('Are you sure want to delete this application?').then(function () {
                var req = memAppService.remove(item.$id);
                req.then(function (res) {
                    if (!res.result) {
                        $ngBootbox.alert(res.errorMsg);
                        return;
                    }
                    toaster.pop('success', 'Success', "Delete Application Successfully!");
                    $timeout(function () {
                        search(true);
                    }, 1000);
                    //add his app
                    memAppHisService.create(item);

                    //remove app in member
                    memberShipService.getWithLoad(item.membershipId).then(function (member) {
                        if (member) {
                            var i = member.apps.indexOf(item.$id);
                            if (i != -1) {
                                member.apps.splice(i, 1);
                            }
                            memberShipService.update(member);
                        }
                    });
                });
            }, function () {
                appUtils.hideLoading();
            });
        }

        function resetFilter() {
            if (applicationVm.showStatusfilter === true) {
                applicationVm.cri.status = "-1";
            }
            var clients = (!$scope.userPermission.isRep ? 'All' : (currentUser.repCode || currentUser.username));
            $timeout(function () {
                if (applicationVm.activetab === -1) {
                    $state.go('membership.editApplication', { id: '', 'tab': applicationVm.activetab, 'status': applicationVm.cri.status, 'keyword': '', 'start': '', 'end': '', 'page': 0, 'author': clients, 'alias': applicationVm.cri.alias, 'state': null, 'plantype': null,'reportBy': 'timestampCreated', 'sortBy': 'desc' });
                } else {
                    $state.go('membership.editApplication', { id: '', 'tab': applicationVm.activetab, 'status': undefined, 'keyword': '', 'start': '', 'end': '', 'page': 0, 'author': clients, 'alias': applicationVm.cri.alias, 'state': null, 'plantype': null,'reportBy': 'timestampCreated', 'sortBy': 'desc' });
                }
            }, 100);
        }

        function getStatusFlagIcon(item) {
            return item && item.priority ? itemPriorityStatusMap[item.priority + ''].class : itemPriorityStatusMap['false'].class;
        }

        function getIconStatus(item) {
            if (item && item.status) {
                var statusObj = _.find(applicationVm.appStatus, { key: parseInt(item.status) });
                if (statusObj) {
                    return itemStatusMap[statusObj.value].icon;
                }
            }
            /* jshint ignore:start */
            return itemStatusMap['Default'].icon;
            /* jshint ignore:end */
        }

        function markPriority(item) {
            item.priority = !item.priority;
            // return memAppService.getWithLoad(item.$id).then(function (app) {
            //     if (app && (!app.$value || app.$value !== null)) {
            //         if (app.priority === undefined) {
            //             app.priority = true;
            //         } else {
            //             app.priority = !app.priority;
            //         }

            //Application tracking timeline obj
            var appTrackingUpdate = {
                eventType: appUtils.logEvent.editApp,
                status: angular.copy(item.status)
            };

            return memAppService.markPriority(item, item.appId).then(function (rs) {
                if (rs && rs.result) {
                    appTrackingUpdate.message = 'Mark priority - Updated application information.';
                    return true;
                } else {
                    appTrackingUpdate.message = rs && rs.errorMsg || 'Mark priority - Update application information has error.';
                    return false;
                }
            }).catch(function (err) {
                appTrackingUpdate.message = err && err.message || 'Mark priority - Update application information has error.';
                return false;
            }).then(function () {
                // //reload UI
                console.log('start re search');
                search(true);
                //console.log('====Mark priority do application tracking=====');
                memAppTimeLineService.create(item.appId, appTrackingUpdate);
            });
            //     }
            // });
        }

        function edit(item) {
            memAppIndicatorService.get(item.$id).then(function (data) {
                //console.log('---------------------------Indicator Data------------------------------');
                //console.log(data);
                if (data && data.editingBy) {
                    var editedBy = _.map(data.editingBy, function (edit) {
                        return edit.fullName || edit.email || edit.userName;
                    }).join(', ');

                    //console.log('---------------------------currentUser------------------------------');
                    //console.log(currentUser);
                    var uEdited = data.editingBy[currentUser.$id];
                    //console.log('---------------------------Existed In Indicator------------------------------');
                    //console.log(uEdited);
                    if (uEdited === undefined) {
                        $ngBootbox.confirm('This application is being edited by ' + editedBy + ', Are you sure want to edit this application ?').then(function () {
                            goEdit(item);
                        }, function () {
                        });
                    } else {
                        goEdit(item);
                    }
                } else {
                    goEdit(item);
                }
            });
        }

        function goEdit(item) {
            $timeout(function () {
                if (applicationVm.activetab === -1) {
                    $state.go('membership.editApplication', { id: item.$id, 'tab': applicationVm.activetab, 'status': applicationVm.cri.status, 'keyword': applicationVm.cri.keyword, 'start': timestampStart, 'end': timestampEnd, 'page': applicationVm.paging.currentPage, 'author': applicationVm.cri.clients, 'alias': applicationVm.cri.alias, 'state': applicationVm.cri.state, 'plantype': applicationVm.cri.plantypes, 'reportBy': applicationVm.reportDate, 'sortBy': applicationVm.cri.sort });
                } else {
                    $state.go('membership.editApplication', { id: item.$id, 'tab': applicationVm.activetab, 'status': undefined, 'keyword': applicationVm.cri.keyword, 'start': timestampStart, 'end': timestampEnd, 'page': applicationVm.paging.currentPage, 'author': applicationVm.cri.clients, 'alias': applicationVm.cri.alias, 'state': applicationVm.cri.state, 'plantype': applicationVm.cri.plantypes, 'reportBy': applicationVm.reportDate, 'sortBy': applicationVm.cri.sort });
                }
                $scope.itemSelected = item.$id;
            }, 100);
        }

        function filterByStatus(status) {
            if (status === -1) {
                applicationVm.showStatusfilter = true;
            } else {
                applicationVm.showStatusfilter = false;
            }
            applicationVm.activetab = status;
            applicationVm.cri.status = status + '';
            $timeout(function () {
                if (applicationVm.activetab === -1) {
                    $state.go('membership.editApplication', { id: '', 'tab': applicationVm.activetab, 'status': applicationVm.cri.status, 'keyword': '', 'start': applicationVm.cri.timestampStart, 'end': applicationVm.cri.timestampEnd, 'page': 0, 'author': applicationVm.cri.clients, 'alias': applicationVm.cri.alias, 'state': applicationVm.cri.state, 'plantype': applicationVm.cri.plantypes,'reportBy': applicationVm.reportDate, 'sortBy': applicationVm.cri.sort });
                } else {
                    $state.go('membership.editApplication', { id: '', 'tab': applicationVm.activetab, 'status': undefined, 'keyword': '', 'start': applicationVm.cri.timestampStart, 'end': applicationVm.cri.timestampEnd, 'page': 0, 'author': applicationVm.cri.clients, 'alias': applicationVm.cri.alias, 'state': applicationVm.cri.state, 'plantype': applicationVm.cri.plantypes, 'reportBy': applicationVm.reportDate, 'sortBy': applicationVm.cri.sort });
                }
            }, 100);
        }

        function addApplicationByManualModal() {
            var addManualModal = $uibModal.open({
                templateUrl: 'app/membership/modal/add-web-app.tpl.html',
                controller: 'AddAppCtrl as applicationVm',
                size: 'lg',
                scope: $scope,
                backdrop: 'static',
                windowClass: 'add-web-app-modal'
            });

            addManualModal.result.then(function () {
                $('html').removeClass('modal-open');
            });
        }

        function checkIndicatorApplication(item) {
            if (item.$id) {
                var ref = firebaseDataRef.child('membership-applications-indicator').child(item.$id);
                ref.on('value', function (snap) {
                    // console.log('%c -------------snap------------- ;' + item.$id, 'color: blue;');
                    if (snap && snap.val()) {
                        var indicatorDetail = memAppIndicatorService._excuteCheckIndicator(snap.val(), item.$id, indicatorCallback);
                        item = angular.extend(item, indicatorDetail);
                        //console.log(indicatorDetail);
                    } else {
                        item = angular.extend(item, {
                            isEdited: false,
                            editingBy: ''
                        });
                        // console.log('null');
                    }
                    $timeout(angular.noop, 200);
                });
                // memAppIndicatorService.getOnValue(item, indicatorCallback).then(function(data){
                //     console.log('data');
                //     console.log(data);
                //     $timeout(angular.noop, 200);
                // });
            }
        }


        function checkIndicator() {
            if ($scope.modelItems && $scope.modelItems.length > 0) {
                _.forEach($scope.modelItems, function (model) {
                    checkIndicatorApplication(model);
                });
            }
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
