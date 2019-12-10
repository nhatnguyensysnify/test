(function () {
    'use strict';

    angular.module('app.event')
        .controller('EventConfirmationCtrl', EventConfirmationCtrl).config(function ($mdDateLocaleProvider) {
            // Can change week display to start on Monday.
            $mdDateLocaleProvider.firstDayOfWeek = 1;
            // Optional.
        });

    /** @ngInject */
    function EventConfirmationCtrl($rootScope, $stateParams, $scope, $state, $timeout, $ngBootbox, $q, appUtils, DataUtils, toaster, authService, eventService, employeeService, memTerritoryService, memberShipFacilitiesService, memStateService, memRegionService, eventGoalService, eventExportService, eventExportFullService, calendarConfig, $uibModal, NgMap) {
        $rootScope.settings = angular.copy($rootScope.storage.settings);

        $rootScope.settings.layout.pageSidebarClosed = true;
        $rootScope.settings.layout.showSmartphone = false;
        $rootScope.settings.layout.showPageHead = false;
        $rootScope.settings.layout.showSideBar = false;
        $rootScope.settings.layout.showHeader = false;
        $rootScope.settings.layout.showSmartphone = false;
        $rootScope.settings.layout.showFooter = false;
        // var currentUser = authService.getCurrentUser(), //$rootScope.storage.currentUser,
        var appSettings = $rootScope.storage.appSettings;
        $scope.showInvalid = false;
        $scope.emailRegx = /^[^!'"\/ ]+$/;

        $scope.userPermission = $rootScope.storage.statePermission;
        // $scope.userPermission.isAdmin = appUtils.checkSpecifyRole(currentUser, 'admin');
        // $scope.userPermission.isRep = appUtils.checkSpecifyRole(currentUser, 'rep');

        var eventVm = this; //
        var timestampStart = moment().utc().startOf('month'),
            timestampEnd = moment().utc().endOf('month');

        // eventVm.currentUid = currentUser.$id;
        // eventVm.currentUser = currentUser;
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
        eventVm.resetFiler = resetFiler;
        eventVm.showConfirmEvent = showConfirmEvent;
        eventVm.requester = null;

        eventVm.cri = {
            keyword: $stateParams.keyword ? $stateParams.keyword : '',
            type: $stateParams.type || 'All',
            status: $stateParams.status || '1',
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
        eventVm.events = [];
        eventVm.campaignType = '48 hours';






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
                    search();
                });
            }, 800);
        });

        //===================
        function loadData() {
            var filterUser = null;
            eventVm.chooseState = "TX";
            if ($stateParams.token) {
                eventVm.uniqueUrl = $stateParams.token;
            }

            var all = [_loadEventTypes(), _loadStates(), _loadRegions(), _loadFacilities(), _loadTerritories()];


            return $q.all(all).then(function () {
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
            // eventVm.cri.from = 0;
            // eventVm.paging.currentPage = 0;
            // if (isFilter) {
            //     eventVm.cri.requester = $('#filterRequester').val();
            // }
            _search();
        }


        function resetFiler() {

            // $timeout(function () {
            //     $state.go('event.confirmation', { 'keyword': '', 'start': null, 'end': null, 'page': 0, 'requester': (!$scope.userPermission.isRep ? 'All' : currentUser.$id), 'facilityId': null, 'alias': eventVm.cri.alias, 'type': 'All', 'state': null, 'plantype': null, 'territory': null, 'status': '1', 'viewMap': eventVm.viewMap }, { reload: true });
            // }, 100);
        }

        function _search() {
            if (!eventVm.uniqueUrl) {
                return;
            }
            eventService.searchEventsByUniqueUrl(eventVm.uniqueUrl).then(function (result) {
                appUtils.hideLoading();
                eventVm.loaded = true;
                let currentD = moment().format('MM/DD/YYYY');
                var tsCurrentDate = moment.utc(currentD).startOf('day').valueOf();

                //once token is expired, throw out....
                if (!result || (tsCurrentDate >= result.runData.expireDate) || (result.userDetail && !result.userDetail.isAuthorized) || (result.userDetail && result.userDetail.isDeleted)) {
                    $timeout(angular.noop, 200);
                    return;
                }
                loadAddressEvents(result.events);
                console.log('result.events', result.events);

                eventVm.eventsCompleted = angular.copy(_.filter(result.events, eventDetail => {
                    return eventDetail.verifyStatus == appUtils.eventVerifyStatusEnum.CANCELED || eventDetail.verifyStatus == appUtils.eventVerifyStatusEnum.CONFIRMED;
                }));
                eventVm.events = angular.copy(_.filter(result.events, eventDetail => {
                    eventDetail.submitVerifyStatus = 1;
                    return !eventDetail.verifyStatus || eventDetail.verifyStatus == appUtils.eventVerifyStatusEnum.PENDING;
                }));

                eventVm.runData = result.runData;
                eventVm.currentUser = result.userDetail;
                eventVm.campaignType = result.runData.source === 'ServicePhase2' ? '24 hours' : '48 hours';
                $timeout(angular.noop, 200);

                // $timeout(function () {
                //     $state.go('event.confirmation', { 'keyword': eventVm.cri.keyword, 'start': eventVm.timestampStart, 'end': eventVm.timestampEnd, 'page': eventVm.paging.currentPage, 'requester': eventVm.cri.requester, 'facilityId': eventVm.cri.facilities, 'alias': eventVm.cri.alias, 'type': eventVm.cri.type, 'state': eventVm.cri.state, 'plantype': eventVm.cri.plantypes, 'territory': eventVm.cri.territory, 'status': eventVm.cri.status, 'viewMap': eventVm.viewMap }, { notify: false });
                // }, 100);
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
        function loadAddressEvents(events) {
            _.forEach(events, (event, index) => {
                // if (!event.mailingAddressTxt || !event.locationTxt) { //first load address
                let address = {};
                // if (!event.mailingAddress) {
                //     let facility = _.find(eventVm.allFacilities, function (item) {
                //         return item.$id === event.facilityId;
                //     });
                //     if (!facility) {
                //         return;
                //     }
                //     address = facility;
                //     event.mailingAddress = address;
                // } else {
                address = event.mailingAddress;
                // }

                event.mailingAddressTxt = address ? `${address.address} ${address.address_2}, ${address.city_name} ${address.state_code} ${address.zip_code}` : '';
            });
        }
        function showConfirmEvent(form) {

            $scope.showInvalid = true;
            if (form.$invalid) {
                return;
            }
            let emails = [eventVm.currentUser.email.toLowerCase()];
            eventVm.verifyEmail = _.trim(eventVm.verifyEmail);
            if (eventVm.currentUser.notificationEmail) {
                emails.push(eventVm.currentUser.notificationEmail.toLowerCase());
            }
            if (emails.indexOf(eventVm.verifyEmail.toLowerCase()) === -1) {
                toaster.error("Email incorrect!");
            } else {
                $ngBootbox.confirm(`Do you really want to submit the form?`).then(function () {
                    eventService.updateVerifyStatus(eventVm.events, eventVm.runData, eventVm.currentUser).then(() => {
                        //hanlde local
                        eventVm.eventsCompleted = angular.copy(eventVm.events);
                        _.forEach(eventVm.eventsCompleted, event => {
                            event.verifyStatus = event.submitVerifyStatus;
                        });
                        eventVm.events = null;
                        eventVm.runData.status = 1;
                        toaster.success("Update Events Successfully!");

                    }, error => {
                        toaster.error(error);
                    });
                }, () => {
                });
            }

        }
        $scope.$on('$destroy', function () {
            $rootScope.settings = angular.copy($rootScope.storage.settings);
        });
    }
})();