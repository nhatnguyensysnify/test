(function () {
    'use strict';

    angular.module('app.event')
        .controller('EventDetailsCtrl', EventDetailsCtrl);

    /** @ngInject */
    function EventDetailsCtrl($rootScope, $scope, $state, $stateParams, $uibModal, $timeout, $ngBootbox, $q, appUtils, authService, toaster, DataUtils,
        eventService, employeeService, memberShipFacilitiesService, memStateService, memRegionService, memTerritoryService, eventGoalService,
        memberShipAddOnsService, shiftsService, NgMap) {
        $rootScope.settings.layout.pageSidebarClosed = true;
        var currentUser = authService.getCurrentUser(),
            appSettings = $rootScope.storage.appSettings;

        $scope.userPermission = $rootScope.storage.statePermission;
        $scope.userPermission.modify = false;
        $scope.userPermission.isAdmin = appUtils.checkSpecifyRole(currentUser, 'admin');
        $scope.userPermission.isRep = appUtils.checkSpecifyRole(currentUser, 'rep');

        var eventVm = this; //
        var eventId = $stateParams.id || null;

        eventVm.tabIdx = 1;
        eventVm.isEdit = false;
        eventVm.ready = false;
        eventVm.showInvalid = false;
        eventVm.nameRegx = /^(a-z|A-Z|0-9)*[^!#$%^&*()'"\/\\;:@=+,?\[\]\/]*$/;
        eventVm.numberRegx = /^\d+$/;
        eventVm.closingRateRegx = /(\d+(\.\d+)?)/;
        eventVm.zipcodeRegx = /(^\d{5}$)|(^\d{5}-\d{4}$)/;

        eventVm.initPopup = false;
        eventVm.allStates = [];
        eventVm.allFacilities = [];
        eventVm.addOns = [];
        eventVm.addOnsSetting = appSettings.eventAddons || {};
        eventVm.addOnsData = [];
        eventVm.allTerritories = [];
        eventVm.regionGroups = {};
        eventVm.addonBGStyle = [
            'bg-green-sharp', 'bg-red-haze', 'bg-blue-sharp', 'bg-purple-soft',
            'bg-green-turquoise', 'bg-yellow-gold', 'bg-yellow-soft', 'bg-blue',
            'bg-purple-seance', 'bg-grey-cascade', 'bg-red', 'bg-grey-salsa',
            'bg-red-mint', 'bg-green-sharp', 'bg-red-haze', 'bg-blue-sharp',
            'bg-purple-soft', 'bg-green-turquoise', 'bg-yellow-gold', 'bg-yellow-soft',
            'bg-blue', 'bg-purple-seance', 'bg-grey-cascade', 'bg-red'
        ];

        var chicago = new google.maps.LatLng(41.850033, -87.6500523);
        // NgMap.getMap().then(function (map) {

        //     eventVm.map = map;
        // });

        eventVm.image = {
            url: './img/marker.png',
            scaledSize: [50, 50],
            origin: [0, 0],
            anchor: [25, 50]
        };
        function initModel() {
            eventVm.model = {
                sysCloseRate: 0,
                sysSold: 0,
                sysTotalRevenue: 0,
                sysTotalAnnualMember: 0,
                sysTotalMonthlyMember: 0,
                sysMultiState: 0,
                sysMinorChildren: 0,
                sysHunterShield: 0,
                sysBailBond: 0,
                sysGITC: 0,
                sysCareerShield: null,
                iptBailBond: null,
                iptHunterShield: null,
                iptMinorChildren: null,
                iptMultiState: null,
                iptTotalMonthlyMember: null,
                iptTotalAnnualMember: null,
                iptGITC: null,
                iptCareerShield: null,
                iptCloseRate: null,
                iptTotalRevenue: null,
                iptNewMember: null,
                iptTotalAttendees: null,
                iptTotalAttendeesRegistered: null,
                iptAnE: 0,
                iptGSW: 0,
                estTotalRevenue: null,
                estProspectiveMember: null,
                estAttendees: null,
                description: "",
                endDate: "",
                facilityCode: "",
                facilityId: "",
                isActive: true,
                name: "",
                state: "",
                region: "",
                regionCode: "",
                territory: "",
                representativeAttended: {},
                requester: {},
                areaManager: {},
                startDate: "",
                type: "",
                uid: currentUser.$id,
                status: 1,
                // verifyStatus: "",
                managers: [],
                managerRefs: []
            };
            eventVm.model.createdBy = eventVm.model.modifiedBy = currentUser.email;
        }

        eventVm.facilityTxt = "";

        //
        eventVm.requesters = [];
        eventVm.areaManagers = [];
        eventVm.representativeAttended = [];

        eventVm.allEmployees = [];
        eventVm.eventTypes = [];
        eventVm.eventStatus = appUtils.eventStatus;
        eventVm.eventVerifyStatus = appUtils.eventVerifyStatus;

        //
        eventVm.showPopupFacilityList = showPopupFacilityList;
        eventVm.cancel = cancel;
        eventVm.save = save;
        eventVm.autoChangeCloseRate = autoChangeCloseRate;
        eventVm.autoChangeNewMember = autoChangeNewMember;
        eventVm.showPopupTrackingActivities = showPopupTrackingActivities;
        eventVm.showPopupSendNotification = showPopupSendNotification;
        eventVm.getState = getState;
        eventVm.getRegion = getRegion;
        eventVm.showFieldsByType = showFieldsByType;
        eventVm.saveAddress = saveAddress;
        eventVm.cancelAddress = cancelAddress;
        eventVm.directionMap = directionMap;
        eventVm.showModalAddEventAddress = showModalAddEventAddress;
        eventVm.initMap = initMap;
        eventVm.enablePromoCode = true;
        eventVm.submitForceRefreshEventData = submitForceRefreshEventData;
        eventVm.fieldsByType = {
            iptCloseRate: {
                show: true,
                types: ['classes', 'event', 'tcole-class-non-usls', 'tcole-class-usls-hosted']
            },
            iptTotalAttendees: {
                show: false,
                types: ['table', 'gunshows', 'aftercallsignin', 'comp-addon', 'miscellaneous']
            }
        };
        eventVm.mailingAddress = {
            address: '',
            address_2: '',
            state_code: '',
            city_name: '',
            zip_code: ''
        };
        eventVm.mailingAddressTxt = '';
        //
        $scope.selectFacility = selectFacility;
        $scope.selectAddress = selectAddress;
        //
        eventVm.chartColors = {
            green: '#26c281',
            red: '#EF4836',
            yellow: '#f3c200',
            blue: '#3598DC',
            orange: '#EF4836'
        };

        $scope.$on('$destroy', function () {
            stopCheck = true;
        });

        $scope.$watch('eventVm.model.state', function (newValue, oldValue) {
            if (!eventVm.ready) {
                return;
            }
            if (_.trim(newValue) !== _.trim(oldValue) && (oldValue !== '' || !eventVm.isEdit)) {
                var autoSelect = eventVm.regionGroups[newValue];
                if (autoSelect && autoSelect.length === 1) {
                    eventVm.model.region = autoSelect[0].id;
                    eventVm.model.regionCode = autoSelect[0].code;
                }
            }
            _loadAddOns(eventVm.model.state, eventVm.model.region);
        });

        $scope.$watch('eventVm.model.region', function (newValue, oldValue) {
            if (!eventVm.ready) {
                return;
            }
            if (_.trim(newValue) !== _.trim(oldValue)) {
                _loadAddOns(eventVm.model.state, eventVm.model.region);
            }
        });

        $scope.$watch('eventVm.startDate', function (newValue, oldValue) {
            if (!eventVm.ready) {
                return;
            }
            onChangeStartDate();
        });

        var timeoutCheck = 60000,
            stopCheck = false;

        function isSelect2Ready(defered) {
            if (!defered) {
                defered = $q.defer();
            }

            var $selectRep = $('#Representative').data('select2');
            var $selectManager = $('#Manager').data('select2');
            var $selectAreaManager = $('#AreaManager').data('select2');
            if ($selectRep && $selectRep.options && $selectRep.options.options && $selectManager && $selectManager.options && $selectManager.options.options && $selectAreaManager && $selectAreaManager.options && $selectAreaManager.options.options) {
                defered.resolve(true);
            } else {
                timeoutCheck -= 500;
                if (timeoutCheck <= 0 && !stopCheck) {
                    defered.resolve(false);
                }
                $timeout(function () {
                    isSelect2Ready(defered);
                }, 500);
            }

            return defered.promise;
        }

        function initSelect2Data() {
            appUtils.clearSelection();
            return isSelect2Ready().then(function (ready) {
                $('#Representative').on('select2:select', function (e) {
                    var isNew = e.params.data.id === e.params.data.text;
                    if (isNew) {
                        var tagName = e.params.data.text,
                            id = tagName.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_'),
                            value = id + '-new-' + tagName;

                        $('#Representative').find('[data-select2-tag="true"]').remove();

                        if (!eventVm.representativeAttended) {
                            eventVm.representativeAttended = [];
                        }
                        //
                        if (eventVm.representativeAttended.indexOf(value) === -1) {
                            eventVm.representativeAttended.push(value);
                            var option = new Option(tagName, value, true, true);
                            var $select = $('#Representative');

                            // save current config. options
                            var options = $select.data('select2').options.options;

                            // build new items
                            var items = $('#Representative').select2('data');
                            items.push({
                                id: value,
                                text: tagName,
                                displayName: tagName,
                                email: '',
                                repCode: tagName
                            });

                            $select.append(option);
                            // add new items
                            options.data = items;
                            $select.select2(options);
                        }
                    }
                });

                $('#Manager').on('select2:select', function (e) {
                    var isNew = e.params.data.id === e.params.data.text;
                    if (isNew) {
                        eventVm.requesters = [];
                        $('#Manager').find('[data-select2-tag="true"]').remove();
                        $timeout(function () {
                            $scope.$apply();
                        }, 200);
                    }
                });

                $('#AreaManager').on('select2:select', function (e) {
                    var isNew = e.params.data.id === e.params.data.text;
                    if (isNew) {
                        eventVm.areaManagers = [];
                        $('#AreaManager').find('[data-select2-tag="true"]').remove();
                        $timeout(function () {
                            $scope.$apply();
                        }, 200);
                    }
                });

                return initPage();
            });
        }

        function initDefaultSelect2() {
            var currentManager = currentUser.managers && currentUser.managers[0] || 'null';
            return employeeService.getUserByAlias(currentManager).then(function (myManager) {
                $timeout(function () {
                    $scope.$apply(function () {
                        var defaultOption = _composeSelectBoxText(currentUser),
                            option = new Option(defaultOption.text, defaultOption.id, true, true);

                        //default representative is currentUser =============================
                        eventVm.representativeAttended = [currentUser.$id];
                        _addDefaultDataSelect2('Representative', option, defaultOption);
                        var currentIsArea = appUtils.checkSpecifyRole(currentUser, 'area');
                        onChangeStartDate();
                        if (!myManager) {
                            //default manager is currentUser ================================
                            eventVm.requesters = [currentUser.$id];
                            _addDefaultDataSelect2('Manager', option, defaultOption);

                            // check current is areamanager
                            if (currentIsArea) {
                                //Area Manager is currentUser
                                defaultOption = _composeSelectBoxText(currentUser);
                                option = new Option(defaultOption.text, defaultOption.id, true, true);
                                eventVm.areaManagers = [currentUser.$id];
                                _addDefaultDataSelect2('AreaManager', option, defaultOption);
                            }

                        } else {
                            //default manager is direct manager of currentUser ================================
                            defaultOption = _composeSelectBoxText(myManager);
                            option = new Option(defaultOption.text, defaultOption.id, true, true);
                            eventVm.requesters = [myManager.$id];
                            _addDefaultDataSelect2('Manager', option, defaultOption);

                            //default area manager is direct manager or currentUser has role area manager ===============================
                            var managerIsArea = appUtils.checkSpecifyRole(myManager, 'area');

                            if (currentIsArea) {
                                //Area Manager is currentUser
                                defaultOption = _composeSelectBoxText(currentUser);
                                option = new Option(defaultOption.text, defaultOption.id, true, true);
                                eventVm.areaManagers = [currentUser.$id];
                                _addDefaultDataSelect2('AreaManager', option, defaultOption);
                            } else if (managerIsArea) {
                                //Area Manager is direct manager of currentUser
                                eventVm.areaManagers = [myManager.$id];
                                _addDefaultDataSelect2('AreaManager', option, defaultOption);
                            }
                        }
                    });
                }, 200);
            });
        }

        function _addDefaultDataSelect2(id, option, defaultOption) {
            var $select = $('#' + id);
            // save current config. options
            var options = $select.data('select2').options.options;
            // build new items
            var items = [];
            items.push(defaultOption);
            $select.append(option);
            // add new items
            options.data = items;
            $select.select2(options);
        }

        function _resetSelect2(id) {
            var $select = $('#' + id);
            // save current config. options
            var options = $select.data('select2').options.options;
            // build new items
            options.data.pop();
            $select.select2(options);

            $select.find('[data-select2-tag="true"]').remove();
            $timeout(function () {
                $select.trigger('change');
            }, 200);
        }

        angular.element(document).ready(function () {
            initSelect2Data();
        });

        $scope.select2Options = {
            allowClear: true,
            tags: true
        };

        $scope.select2OptionsRepresentative = {
            AllowClear: true,
            tags: false,
            //minimumInputLength: 3,
            ajax: {
                dataType: 'json',
                delay: 250,
                transport: function (params, success, failure) {
                    // var $request = employeeService.search(params.data);
                    // $request.then(success, failure);
                    // return $request;
                    //try load shift available on the date
                    var startDateUtc = moment.utc(eventVm.startDate).startOf('day').valueOf();
                    var shiftCriteria = {
                        timestampStart: startDateUtc,
                        timestampEnd: startDateUtc,
                        keyword: '',
                        alias: null,
                        ids: null
                    };
                    console.log('eventVm.model', eventVm.model);

                    return shiftsService.searchShiftAvailable(shiftCriteria).then((uids) => {
                        params.data.ids = uids.map(i => i.rep);
                        console.log(params.data);
                        return employeeService.search(params.data);
                    }).then(success, failure);
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
                        isAuthorized: true
                    };
                    return cri;
                },
                processResults: function (data) {
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

        $scope.select2OptionsManager = {
            AllowClear: true,
            tags: true,
            //minimumInputLength: 3,
            maximumSelectionLength: 1,
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
                        isAuthorized: true
                    };
                    return cri;
                },
                processResults: function (data) {
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

        $scope.select2OptionsAreaManager = {
            AllowClear: true,
            tags: true,
            //minimumInputLength: 3,
            maximumSelectionLength: 1,
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
                        isAuthorized: true
                    };
                    return cri;
                },
                processResults: function (data) {
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

        function initPage() {
            var reqInit = $q.when({});
            if (eventId) {
                eventVm.isEdit = true;
                eventVm.showInvalid = true;
                reqInit = _loadEventDetails();
            } else {
                initModel();
                eventVm.isEdit = false;
                eventVm.showInvalid = false;
                eventVm.startDate = moment().format('MM/DD/YYYY');
                reqInit = initDefaultSelect2();
            }
            return reqInit.then(function () {
                return _loadData();
            }).then(function () {
                var selectedFacility = _.find(eventVm.allFacilities, { $id: eventVm.model.facilityId });
                if (selectedFacility) {
                    selectFacility(selectedFacility);
                }
                if (eventId && selectedFacility && !eventVm.model.mailingAddress) {
                    selectAddress(selectedFacility);
                } else if (eventId && selectedFacility && eventVm.model.mailingAddress) {
                    eventVm.mailingAddress = angular.copy(eventVm.model.mailingAddress);
                    eventVm.mailingAddressTxt = `${eventVm.mailingAddress.address}, ${eventVm.mailingAddress.city_name} ${eventVm.mailingAddress.state_code} ${eventVm.mailingAddress.zip_code}`;
                    initMap();
                }
                $scope.userPermission.modify = _allowModify();
                eventVm.ready = true;
                _loadAddOns(eventVm.model.state, eventVm.model.region);
                $timeout(angular.noop, 200);
            });
        }

        function _allowModify() {
            if (!eventVm.isEdit) {
                return true;
            } else if ($scope.userPermission.isAdmin) {
                return true;
            } else {
                if (eventVm.model.managers) {
                    var idx = eventVm.model.managers.indexOf(currentUser.alias);
                    if (idx !== -1) {
                        return true;
                    }
                } else if (eventVm.model.requester && eventVm.model.requester[currentUser.$id] !== undefined) {
                    return true;
                } else if (eventVm.model.representativeAttended && eventVm.model.representativeAttended[currentUser.$id] !== undefined) {
                    return true;
                } else if (eventVm.model.areaManager && eventVm.model.areaManager[currentUser.$id] !== undefined) {
                    return true;
                }
            }
            return false;
        }

        function _loadData() {
            return $q.all([_loadEventTypes(), _loadFacilities(), _loadAddonsData(), _loadTerritories(), _loadStates(), _loadRegions()]);
        }

        function _loadStates() {
            return memStateService.getAll().then(function (data) {
                eventVm.allStates = data;
                $timeout(angular.noop, 200);
            });
        }

        function _loadRegions() {
            return memRegionService.getAll().then(function (regionGroups) {
                _.each(regionGroups, function (regionGroup, stateCode) {
                    regionGroups[stateCode] = DataUtils.toAFArray(regionGroup);
                });
                eventVm.regionGroups = regionGroups;
                $timeout(angular.noop, 200);
            });
        }

        function _loadFacilities() {
            return memberShipFacilitiesService.itemsLoadOnce().then(function (data) {
                eventVm.allFacilities = data;
                $timeout(angular.noop, 200);
            });
        }

        function _loadAddonsData() {
            return memberShipAddOnsService.getAll().then(function (data) {
                eventVm.addOnsData = data;
                $timeout(angular.noop, 200);
            });
        }

        function _loadAddOns(state, planType) {
            var keywords = [],
                addOnsKeywords = "";
            var addOnsByState = _.find(eventVm.addOnsData, function (value, key) {
                return key === state;
            });
            if (addOnsByState) {
                var addOnsByPlanType = _.filter(addOnsByState, function (value, key) {
                    return value.region_id && value.region_id === planType;
                });
                var groups = _.groupBy(addOnsByPlanType, 'sku');
                if (groups) {
                    keywords = Object.keys(groups);
                }
            }
            //special for plan type = LEO
            var selectedPlanType = _.find(eventVm.regionGroups[state], { id: planType });
            if (selectedPlanType && selectedPlanType.code.toLowerCase() == 'leo') {
                keywords.push('hunter_shield');
                keywords.push('gunowner_identity_theft_coverage');
            }

            if (selectedPlanType && selectedPlanType.code.toLowerCase() == 'sec') {
                keywords.push('gunowner_identity_theft_coverage');
            }

            addOnsKeywords = keywords.join(' ').replace("-", "_");
            eventVm.addOnsObj = {};
            _.forEach(eventVm.addOnsSetting, function (value, key) {
                value.show = addOnsKeywords.includes(value.keywords);
                value.$id = key;
                eventVm.addOnsObj[key] = value;
            });
            eventVm.addOns = _.sortBy(eventVm.addOnsSetting, 'order');
            _.forEach(eventVm.addOns, function (ad) {
                if (!ad.show) {
                    eventVm.model[ad.$id] = null;
                }
            });
            $timeout(_loadChart(), 1000);
        }

        function _loadTerritories() {
            return memTerritoryService.getAllTerritoryLoadOnce().then(function (data) {
                $timeout(function () {
                    $scope.$apply(function () {
                        eventVm.allTerritories = data;
                        // eventVm.allTerritories.unshift({
                        //     id: '',
                        //     name: 'Choose Territory'
                        // });
                    });
                }, 300);
            });
        }

        function _loadEventTypes() {
            return eventService.getEventTypes().then(function (types) {
                eventVm.eventTypes = types || [];
                $timeout(angular.noop, 200);
            });
        }

        function _loadEventDetails() {

            return eventService.get(eventId).then(function (event) {
                if (!event) {
                    return;
                }
                eventVm.model = _.clone(event);

                eventVm.model._verifyStatus = angular.copy(eventVm.model.verifyStatus);
                var start = parseInt(_.clone(event.startDate));
                eventVm.startDate = moment(start).utc().format('MM/DD/YYYY');
                if (event.endDate && _.trim(event.endDate) !== '') {
                    var end = parseInt(event.endDate);
                    eventVm.model.endDate = moment(end).utc().format('MM/DD/YYYY');
                } else {
                    eventVm.model.endDate = '';
                }

                if (!eventVm.model.managers) {
                    eventVm.model.managers = [];
                }

                // _checkValidData(eventVm.model);
                if (!eventVm.model.managerRefs) {
                    eventVm.model.managerRefs = [];
                }
                console.log('eventVm.model', eventVm.model);
                
                if (!eventVm.model.iptAnE) {
                    eventVm.model.iptAnE = 0;
                }

                if (!eventVm.model.iptGSW) {
                    eventVm.model.iptGSW = 0;
                }

                return isSelect2Ready().then(function (ready) {
                    if (event.representativeAttended) {
                        eventVm.representativeAttended = Object.keys(event.representativeAttended);
                        _loadSelect2Data('Representative', event.representativeAttended);
                    }

                    if (event.requester) {
                        eventVm.requesters = Object.keys(event.requester);
                        _loadSelect2Data('Manager', event.requester);
                    }

                    if (event.areaManager) {
                        eventVm.areaManagers = Object.keys(event.areaManager);
                        _loadSelect2Data('AreaManager', event.areaManager);
                    }
                });
            });
        }

        function _loadSelect2Data(id, data) {
            var $select = $('#' + id);
            var options = $select.data('select2').options.options;
            var items = [];
            _.forEach(data, function (value, employeeId) {
                var text = [],
                    displayName = _.trim(value.displayName),
                    repCode = _.trim(value.repCode);

                if (displayName) {
                    text.push(displayName);
                }
                if (repCode) {
                    text.push('(' + repCode + ')');
                }
                var option = new Option(text.join(' '), employeeId, true, true);
                items.push({
                    id: employeeId,
                    text: text.join(' '),
                    email: value.email || '',
                    repCode: repCode || '',
                    displayName: displayName || ''
                });
                $select.append(option);
            });
            options.data = items;
            $select.select2(options);
        }

        function _checkValidData(model) {
            var fields = [
                'iptBailBond',
                'iptHunterShield',
                'iptMinorChildren',
                'iptMultiState',
                'iptGITC',
                'iptCareerShield',
                'iptTotalMonthlyMember',
                'iptTotalAnnualMember',
                'iptCloseRate',
                'iptTotalRevenue',
                'iptNewMember',
                'iptTotalAttendees',
                'iptTotalAttendeesRegistered',
                'estTotalRevenue',
                'estProspectiveMember',
                'estAttendees',
                'sysCloseRate',
                'iptCloseRate',
                'sysSold',
                'sysTotalRevenue',
                'sysTotalAnnualMember',
                'sysTotalMonthlyMember',
                'sysMultiState',
                'sysMinorChildren',
                'sysHunterShield',
                'sysBailBond',
                'sysGITC',
                'sysCareerShield'
            ];
            _.each(fields, function (field) {
                if (!model[field]) {
                    model[field] = 0;
                }
            });
        }

        function _updateAppUploadedStatus(model) {
            var appUploaded = null,
                iptTotalRevenue = parseFloat(model.iptTotalRevenue),
                iptNewMember = parseInt(model.iptNewMember),
                appCount = parseInt(model.appCount);
            if (iptTotalRevenue && iptNewMember && appCount) {
                appUploaded = true;
            } else if (iptTotalRevenue && iptNewMember && !appCount) {
                appUploaded = false;
            }
            model.appUploaded = appUploaded;
        }

        function _updateDataEnteredStatus(model) {
            var dataEntered = true;
            if (!appSettings.eventDataEnteredDetectFields) {
                return;
            }
            _.each(appSettings.eventDataEnteredDetectFields, function (val, field) {
                dataEntered = dataEntered && !isNaN(parseFloat(model[field]));
            });
            model.dataEntered = dataEntered;
        }

        function _getDataFromSelect2(select2ID, dataModel, requests) {
            var select2Data = $('#' + select2ID).select2('data');
            if (select2Data && select2Data.length > 0) {
                _.forEach(select2Data, function (value) {
                    var id = angular.copy(value.id);
                    if (id && _.trim(id) !== '') {
                        var arr = id.split('-new-');
                        id = arr[0];
                        var req = employeeService.getUser(id).then(function (user) {
                            var compose = value,
                                managers = [];
                            if (user) {
                                compose = _composeSelectBoxText(user);
                                managers = angular.copy(user.managers || []);
                                if (user.alias) {
                                    managers.unshift(user.alias);
                                }
                            }
                            var obj = {
                                displayName: compose.displayName || '',
                                email: compose.email || '',
                                repCode: compose.repCode || ''
                            };
                            if (select2ID === 'Manager') {
                                dataModel.requester[id] = obj;
                            } else if (select2ID === 'AreaManager') {
                                dataModel.areaManager[id] = obj;
                            } else if (select2ID === 'Representative') {
                                dataModel.representativeAttended[id] = obj;
                            }
                            //
                            if (managers.length > 0) {
                                dataModel.managerRefs.push(managers);
                            }
                        });
                        requests.push(req);
                    }
                });
            }
        }

        function _getDataAddress(requests) {
            if (!requests) {
                requests = [];
            }
            let req = new Promise(function (resolve, reject) {
                eventVm.model.mailingAddress = angular.copy(eventVm.mailingAddress);
                eventVm.model.mailingAddress.location = {};
                let p = null;
                // if (eventVm.map) {
                //     p = new Promise(function (resolve, reject) {
                //         let location = eventVm.map.getCenter();
                //         if (location) {
                //             eventVm.model.mailingAddress.location.lat = location.lat();
                //             eventVm.model.mailingAddress.location.lon = location.lng();
                //         }
                //         resolve(true);
                //     });
                // } else {
                let address = eventVm.mailingAddress;
                eventVm.mailingAddressTxt = address ? `${address.address} ${address.address_2}, ${address.city_name} ${address.state_code} ${address.zip_code}` : '';
                console.log('getLatLonByAddressString start');
                p = appUtils.getLatLonByAddressString(eventVm.mailingAddressTxt).then(location => {
                    console.log('getLatLonByAddressString', location);
                    eventVm.model.mailingAddress.location = location && location[0];
                }, function (error) {
                    console.log('error', error);
                });
                // }
                resolve(p);
            });
            requests.push(req);
        }
        function save(form, goContinue) {
            console.log('save', form);
            appUtils.showLoading();
            eventVm.showInvalid = true;
            if (form.$invalid) {
                toaster.pop('error', 'Error', 'Please fill in the required fields');
                appUtils.hideLoading();
                return;
            }
            if (eventVm.model.type !== 'event') {
                eventVm.model.fees = null;
            }
            eventVm.model.managerRefs = [];
            var reqs = [];
            eventVm.model.requester = {};
            _getDataFromSelect2('Manager', eventVm.model, reqs);
            console.log('_getDataFromSelect2');

            eventVm.model.areaManager = {};
            _getDataFromSelect2('AreaManager', eventVm.model, reqs);

            eventVm.model.representativeAttended = {};
            _getDataFromSelect2('Representative', eventVm.model, reqs);

            if (!eventVm.isEdit) {
                _getDataAddress(reqs);
            }

            return Promise.all(reqs).then(function () {

                var startDateUtc = moment.utc(eventVm.startDate).startOf('day');
                eventVm.model.startDate = startDateUtc.valueOf();
                if (eventVm.model.endDate && _.trim(eventVm.model.endDate) !== '') {
                    eventVm.model.endDate = moment.utc(eventVm.model.endDate).endOf('day').valueOf();
                }
                // _checkValidData(eventVm.model);
                _updateAppUploadedStatus(eventVm.model);
                _updateDataEnteredStatus(eventVm.model);
                eventVm.model.managers = [];
                eventVm.model.managers = _.uniq(_.flatten(eventVm.model.managerRefs));
                eventGoalService.calGoal({ y: startDateUtc.year(), m: startDateUtc.month() + 1, r: eventVm.model.state });
                // set Total Attendees/Total Potential = null by type
                if (eventVm.model.type === 'table' || eventVm.model.type === 'gunshows' || eventVm.model.type === 'aftercallsignin' || eventVm.model.type === 'comp-addon' || eventVm.model.type === 'miscellaneous') {
                    eventVm.model.iptTotalAttendeesRegistered = eventVm.model.iptTotalAttendees = null;
                }
                eventVm.model.regionCode = $('[name="planType"]:visible option:selected').attr('data-code');

                // save requeterid for report
                eventVm.model.requesterId = eventVm.model.requester && Object.keys(eventVm.model.requester)[0] || '';


                if (eventVm.isEdit) {
                    if (eventVm.model.status === -1) {
                        appUtils.hideLoading();
                        $ngBootbox.confirm('All applications of this event will be cancelled. Are you sure want to Archive this Event?').then(function () {
                            appUtils.showLoading();
                            return update();
                        }, function () {
                            appUtils.hideLoading();
                        });
                    } else {
                        return update();
                    }
                } else {
                    return create(goContinue);
                }
            });
        }

        function create(goContinue) {
            return eventService.create(eventVm.model).then(function (res) {
                appUtils.hideLoading();
                if (!res.result) {
                    $ngBootbox.alert(res.errorMsg);
                    return;
                }
                toaster.pop('success', 'Success', "Event Created.");
                if (goContinue) {
                    // $timeout(function () {
                    //     $state.go('event.details', { id: res.key }, { reload: true });
                    // }, 300);
                    $state.go('event.details', { id: res.key });
                    //initPage();
                } else {
                    $state.reload();
                }
            }, function (res) {
                appUtils.hideLoading();
                $ngBootbox.alert(res.errorMsg);
                return;
            });
        }

        function update() {
            eventVm.model.modifiedBy = currentUser.email;
            return eventService.update(eventVm.model).then(function (res) {
                appUtils.hideLoading();
                if (!res.result) {
                    $ngBootbox.alert(res.errorMsg);
                    return;
                }
                // update cashTota
                // $scope.eCashTotal.updateEventCashTotal();
                $scope.$broadcast('event-save');

                var start = parseInt(angular.copy(eventVm.model.startDate));
                eventVm.startDate = moment(start).utc().format('MM/DD/YYYY');
                if (eventVm.model.endDate && _.trim(eventVm.model.endDate) !== '') {
                    var end = parseInt(angular.copy(eventVm.model.endDate));
                    eventVm.model.endDate = moment(end).utc().format('MM/DD/YYYY');
                } else {
                    eventVm.model.endDate = '';
                }
                _loadChart();
                $scope.userPermission.modify = _allowModify();
                eventVm.model._verifyStatus = parseInt(angular.copy(eventVm.model.verifyStatus));
                eventVm.model.lockedVerifyStatus = eventVm.model._verifyStatus === appUtils.eventVerifyStatusEnum.CANCELED && eventVm.model.verifyStatus === appUtils.eventVerifyStatusEnum.CANCELED;
                toaster.pop('success', 'Success', "Event Updated.");
                $timeout(angular.noop, 400);
            }, function (res) {
                appUtils.hideLoading();
                $ngBootbox.alert(res.errorMsg);
                return;
            });
        }

        function selectFacility(item) {
            $timeout(function () {
                $scope.$apply(function () {
                    eventVm.notBelongState = false;
                    eventVm.model.facilityId = item.$id;
                    eventVm.model.facilityCode = item.facility_promo_code;
                    eventVm.facilityTxt = item.address && $.trim(item.address) !== '' ? item.name + ' - ' + item.facility_promo_code + ' (' + item.address + ')' : item.name + ' - ' + item.facility_promo_code;
                    eventVm.facilityObj = item;
                    eventVm.facilityObj.id = item.$id;
                    if (item.state_code !== eventVm.model.state) {
                        eventVm.notBelongState = true;
                    }
                });
            }, 300);
        }

        function selectAddress(itemFacility) {
            $timeout(function () {
                $scope.$apply(function () {
                    eventVm.model.mailingAddress = {
                        address: itemFacility.address,
                        address_2: itemFacility.address_2,
                        city_name: itemFacility.city_name,
                        state_code: itemFacility.state_code,
                        zip_code: itemFacility.zip_code
                    };
                    eventVm.mailingAddress = angular.copy(eventVm.model.mailingAddress);
                    eventVm.mailingAddressTxt = `${itemFacility.address}, ${itemFacility.city_name} ${itemFacility.state_code} ${itemFacility.zip_code}`;

                    initMap();
                    // $timeout(angular.noop, 200);
                });
            }, 300);
        }

        function showPopupFacilityList(state) {
            eventVm.initPopup = false;
            if (!state || state === '') {
                eventVm.initPopup = true;
                return;
            }

            var modalInstance = $uibModal.open({
                templateUrl: './app/membership/modal/facility-list-popup.tpl.html',
                controller: 'FacilityListCtrl',
                size: 'lg',
                scope: $scope,
                backdrop: 'static',
                windowClass: 'facility-list-modal',
                resolve: {
                    state: function () {
                        return state;
                    },
                    facilities: function () {
                        return eventVm.allFacilities;
                    },
                    facilityId: function () {
                        return eventVm.model.facilityId;
                    }
                }
            });
            modalInstance.result.then(function (rs) {
                console.log('rs', rs);
                _getDataAddress();
            }, function (error) {
                console.log('rserror', error);
            });
        }

        function showPopupTrackingActivities() {
            var modalInstance = $uibModal.open({
                templateUrl: './app/event/modal/event-tracking-log.tpl.html',
                controller: 'eventTrackingLogCtrl as eTrackingVm',
                size: 'lg',
                scope: $scope,
                windowClass: 'tracking-activities-modal',
                backdrop: 'static',
                resolve: {
                    eventId: function () {
                        return angular.copy(eventId);
                    }
                }
            });
        }
        function showPopupSendNotification() {
            var modalInstance = $uibModal.open({
                templateUrl: './app/event/modal/event-notification-popup.tpl.html',
                controller: 'EventNotificationPopupCtrl as eventVm',
                size: 'm',
                scope: $scope,
                windowClass: '',
                backdrop: 'static',
                resolve: {
                    eventDetail: function () {
                        return angular.copy(eventVm.model);
                    }
                }
            });
            modalInstance.result.then(function (rs) {
                if (rs) {
                    toaster.pop('success', 'Success', "Sent notify successfully.");
                    setTimeout(() => {
                        $state.reload();
                    }, 1000);
                }

            }, function (error) {
                console.log('error', error);
            });
        }

        function submitForceRefreshEventData() {
            if (!eventVm.model.type || !eventVm.model.primaryTLSKey) {
                return;
            }
            $ngBootbox.confirm(`Do you really want to force refresh event data?`).then(function () {
                let callback = function() {
                    appUtils.hideLoading();
                    setTimeout(() => {
                        toaster.pop('success', 'Success', "Submit refresh event successfully.");
                        $timeout(angular.noop, 400);
                        $state.reload();
                    }, 2000);
                };
                appUtils.showLoading();
                eventService.forceRefreshEventData(eventVm.model.type, eventId, eventVm.model.primaryTLSKey, callback).then(rs => {

                    // setTimeout(() => {
                    //     $state.reload();
                    // }, 3000);
                });
            }, () => {

            });
        }

        function showModalAddEventAddress() {
            var modalInstance = $uibModal.open({
                templateUrl: './app/event/modal/event-address-popup.tpl.html',
                controller: 'EventAddressPopupCtrl as eventVm',
                size: 'lg',
                scope: $scope,
                windowClass: '',
                backdrop: 'static',
                resolve: {
                    mailingAddress: function () {
                        return angular.copy(eventVm.mailingAddress);
                    },
                    allStates: function () {
                        return angular.copy(eventVm.allStates);
                    }
                }
            });
            modalInstance.result.then(function (mailingAddress) {
                if (mailingAddress) {
                    eventVm.mailingAddress = angular.copy(mailingAddress);
                    eventVm.isEditedAddress = true;
                    toaster.pop('success', 'Success', "Address saved successfully.");
                }

            }, function (error) {
                console.log('error', error);
            });
        }

        function autoChangeCloseRate(model) {
            if (!showFieldsByType(eventVm.model.type, 'iptCloseRate')) {
                model.iptCloseRate = null;
                return;
            }
            var iptNewMember = parseInt(model.iptNewMember),
                iptTotalAttendees = parseInt(model.iptTotalAttendees),
                iptCloseRate = null;
            if (!isNaN(iptNewMember) && !isNaN(iptTotalAttendees) && iptTotalAttendees > 0) {
                iptCloseRate = Math.round(((iptNewMember / iptTotalAttendees) * 100) * 100) / 100;
            }
            model.iptCloseRate = iptCloseRate;

            // if (model.iptTotalAttendees && parseInt(model.iptTotalAttendees) > 0) {
            //     var iptCloseRate = (model.iptNewMember / model.iptTotalAttendees) * 100;
            //     var n = parseFloat(iptCloseRate);
            //     model.iptCloseRate = Math.round(n * 100) / 100;
            // }
        }

        function autoChangeNewMember(model) {
            var newMembers = null,
                iptTotalAnnualMember = parseInt(model.iptTotalAnnualMember),
                iptTotalMonthlyMember = parseInt(model.iptTotalMonthlyMember);

            if (!isNaN(iptTotalAnnualMember)) {
                newMembers += iptTotalAnnualMember;
            }
            if (!isNaN(iptTotalMonthlyMember)) {
                newMembers += iptTotalMonthlyMember;
            }
            model.iptNewMember = newMembers;
        }

        function showFieldsByType(type, field) {
            if (!field) {
                field = 'iptTotalAttendees';
            }
            var fieldSetting = eventVm.fieldsByType[field];

            if (!fieldSetting) {
                return true;
            }
            if (fieldSetting.show) {
                return fieldSetting.types.indexOf(type) > -1;
            }
            if (!fieldSetting.show) {
                return fieldSetting.types.indexOf(type) < 0;
            }
            return true;
        }

        function cancel() {
            $state.go('event.list');
        }

        function _parseToNumber(value) {
            var number = parseFloat(value);
            if (isNaN(number)) {
                number = 0;
            }
            return number;
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

            var displayName = angular.copy(text);

            if (repCode) {
                text.push('(' + repCode + ')');
            }

            return {
                id: data.$id,
                text: text.join(' '),
                email: data.email,
                repCode: repCode,
                displayName: displayName.join(' '),
            };
        }

        //#region Chart==============================================================
        //Chart Config
        Highcharts.setOptions({
            lang: {
                decimalPoint: '.',
                thousandsSep: ','
            }
        });

        eventVm.systemChartData = [];
        eventVm.eventRevenueChartData = [];
        eventVm.planAddonsStatisticChartData = [];
        eventVm.planAddonsStatisticChartCategories = [];
        eventVm.chartSize = {
            width: 1200,
            height: 'auto'
        };

        var closingRatePointFormat = {
            headerFormat: '<table>',
            pointFormat: '<tr><td style="color:{series.color};padding:0">{series.name}: </td>' +
                '<td style="padding:0px 10px;"><b>{point.y}%</b></td></tr>',
            footerFormat: '</table>',
            useHTML: true
        };

        eventVm.systemChartConfig = {
            options: {
                chart: {
                    type: 'column',
                    plotBackgroundColor: null,
                    plotBorderWidth: null,
                    plotShadow: false
                },
                title: {
                    text: 'Event Overview'
                },
                tooltip: {
                    headerFormat: '<table>',
                    pointFormat: '<tr><td style="color:{series.color};padding:0">{series.name}: </td>' +
                        '<td style="padding:0px 10px;"><b>{point.y}</b></td></tr>',
                    footerFormat: '</table>',
                    useHTML: true
                },
                xAxis: {
                    categories: ['Attendees', 'Members', 'Closing Rate'],
                },
                yAxis: [{
                    title: {
                        text: 'Numbers'
                    }
                }, {
                    title: {
                        text: 'Percentage'
                    },
                    opposite: true
                }],
                plotOptions: {
                    column: {
                        pointPadding: 0.2,
                        borderWidth: 0,
                    },
                    series: {
                        cursor: 'pointer',
                        point: {
                            events: {
                                click: function () {
                                    showReportInformation(this);
                                }
                            }
                        }
                    }
                },
                legend: {
                    width: (eventVm.chartSize.width - 300),
                    itemWidth: (eventVm.chartSize.width - 350) / 3,
                    itemStyle: {
                        fontSize: '10px',
                        width: (eventVm.chartSize.width - 400) / 3
                    },
                    borderColor: '#fff',
                }
            },
            series: eventVm.systemChartData,
            loading: false
        };

        eventVm.eventRevenueChartConfig = {
            options: {
                chart: {
                    type: 'column',
                    plotBackgroundColor: null,
                    plotBorderWidth: null,
                    plotShadow: false
                },
                title: {
                    text: 'Event Revenue'
                },
                tooltip: {
                    headerFormat: '<table>',
                    pointFormat: '<tr><td style="color:{series.color};padding:0">{series.name}: </td>' +
                        '<td style="padding:0px 10px;"><b>${point.y:,.2f}</b></td></tr>',
                    footerFormat: '</table>',
                    useHTML: true
                },
                xAxis: {
                    categories: ['Revenue']
                },
                yAxis: {
                    min: 0,
                    title: {
                        text: 'Amount'
                    }
                },
                plotOptions: {
                    column: {
                        pointPadding: 0.2,
                        borderWidth: 0,
                        dataLabels: {
                            enabled: true,
                            format: '${point.y:,.2f}'
                        }
                    },
                    series: {
                        cursor: 'pointer',
                        point: {
                            events: {
                                click: function () {
                                    showReportInformation(this);
                                }
                            }
                        }
                    }
                }
            },
            series: eventVm.eventRevenueChartData,
            loading: false
        };

        eventVm.planAddonStatisticChartConfig = {
            options: {
                chart: {
                    type: 'column',
                    plotBackgroundColor: null,
                    plotBorderWidth: null,
                    plotShadow: false

                },
                title: {
                    text: 'Plans and Addons Statistic'
                },
                tooltip: {
                    headerFormat: '<table>',
                    pointFormat: '<tr><td style="color:{series.color};padding:0">{series.name}: </td>' +
                        '<td style="padding:0px 10px;"><b>{point.y}</b></td></tr>',
                    footerFormat: '</table>',
                    useHTML: true
                },
                xAxis: {
                    categories: eventVm.planAddonsStatisticChartCategories
                },
                yAxis: {
                    min: 0,
                    title: {
                        text: 'Number of Plans and Addons'
                    }
                },
                credits: {
                    enabled: false
                },
                plotOptions: {
                    column: {
                        pointPadding: 0.2,
                        borderWidth: 0
                    },
                    series: {
                        cursor: 'pointer',
                        point: {
                            events: {
                                click: function () {
                                    showReportInformation(this);
                                }
                            }
                        }
                    }
                },
                legend: {
                    width: eventVm.chartSize.width - 200,
                    itemWidth: (eventVm.chartSize.width - 250) / 6,
                    itemStyle: {
                        fontSize: '10px',
                        width: (eventVm.chartSize.width - 400) / 6
                    },
                    borderColor: '#fff',
                }
            },
            series: eventVm.planAddonsStatisticChartData,

            loading: false
        };

        function _loadChart() {
            eventVm.chartSize.width = window.innerWidth;
            eventVm.systemChartData = [
                //     {
                //     name: 'Est. Attendees',
                //     data: [eventVm.model.estAttendees, 0, 0],
                //     color: eventVm.chartColors.red,
                //     legendIndex: 0
                // },
                {
                    //linkedTo: ':previous',
                    name: 'Total Attendees',
                    data: [eventVm.model.iptTotalAttendeesRegistered || 0, 0, 0],
                    color: eventVm.chartColors.green,
                    legendIndex: 0
                },
                {
                    //linkedTo: ':previous',
                    name: 'Total Potential',
                    data: [eventVm.model.iptTotalAttendees || 0, 0, 0],
                    color: eventVm.chartColors.blue,
                    legendIndex: 3
                },
                // {
                //     name: 'Prospective Members',
                //     data: [0, eventVm.model.estProspectiveMember, 0],
                //     color: eventVm.chartColors.red,
                //     legendIndex: 1
                // },
                {
                    name: 'New Members',
                    data: [0, eventVm.model.iptNewMember || 0, 0],
                    color: eventVm.chartColors.green,
                    legendIndex: 1
                },
                {
                    name: 'Sold By System',
                    data: [0, eventVm.model.sysSold || 0, 0],
                    color: eventVm.chartColors.yellow,
                    showModal: true,
                    legendIndex: 4
                },
                {
                    name: 'Input Closing Rate',
                    data: [0, 0, _parseToNumber(eventVm.model.iptCloseRate || 0)],
                    yAxis: 1,
                    tooltip: closingRatePointFormat,
                    color: eventVm.chartColors.green,
                    legendIndex: 2
                },
                {
                    name: 'System Closing Rate',
                    data: [0, 0, eventVm.model.sysCloseRate || 0],
                    yAxis: 1,
                    tooltip: closingRatePointFormat,
                    color: eventVm.chartColors.yellow,
                    showModal: true,
                    legendIndex: 5
                }
            ];
            //
            eventVm.eventRevenueChartData = [
                // {
                //     name: 'Est. Revenue',
                //     data: [eventVm.model.estTotalRevenue],
                //     color: eventVm.chartColors.red
                // }, 
                {
                    name: 'Input Revenue',
                    data: [_parseToNumber(eventVm.model.iptTotalRevenue || 0)],
                    color: eventVm.chartColors.green
                }, {
                    name: 'System Revenue',
                    data: [eventVm.model.sysTotalRevenue || 0],
                    color: eventVm.chartColors.yellow,
                    showModal: true
                }
            ];

            var planAddonsStatisticChartData = [{
                name: 'Input Annual Members',
                data: [eventVm.model.iptTotalAnnualMember || 0, 0, 0, 0, 0, 0, 0, 0],
                color: eventVm.chartColors.green,
                legendIndex: 0,
            },
            {
                name: 'System Annual Members',
                data: [eventVm.model.sysTotalAnnualMember || 0, 0, 0, 0, 0, 0, 0, 0],
                color: eventVm.chartColors.yellow,
                showModal: true,
            },
            {
                name: 'Input Monthly Members',
                data: [0, eventVm.model.iptTotalMonthlyMember || 0, 0, 0, 0, 0, 0, 0],
                color: eventVm.chartColors.green,
                legendIndex: 1
            },
            {
                name: 'System Monthly Members',
                data: [0, eventVm.model.sysTotalMonthlyMember || 0, 0, 0, 0, 0, 0, 0],
                color: eventVm.chartColors.yellow,
                showModal: true,
                legendIndex: 7
            }, {
                name: 'Input Multi State Protection',
                data: [0, 0, eventVm.model.iptMultiState || 0, 0, 0, 0, 0, 0],
                color: eventVm.chartColors.green,
                legendIndex: 2,
                fieldName: 'iptMultiState'
            },
            {
                name: 'System Multi State Protection',
                data: [0, 0, eventVm.model.sysMultiState || 0, 0, 0, 0, 0, 0],
                color: eventVm.chartColors.yellow,
                showModal: true,
                legendIndex: 8,
                fieldName: 'iptMultiState'
            },
            {
                name: 'Input Minor Children Protection',
                data: [0, 0, 0, eventVm.model.iptMinorChildren || 0, 0, 0, 0, 0],
                color: eventVm.chartColors.green,
                legendIndex: 3,
                fieldName: 'iptMinorChildren'
            },
            {
                name: 'System Minor Children Protection',
                data: [0, 0, 0, eventVm.model.sysMinorChildren || 0, 0, 0, 0, 0],
                color: eventVm.chartColors.yellow,
                showModal: true,
                legendIndex: 9,
                fieldName: 'iptMinorChildren',
            }, {
                name: 'Input Hunter Shield',
                data: [0, 0, 0, 0, eventVm.model.iptHunterShield || 0, 0, 0, 0],
                color: eventVm.chartColors.green,
                legendIndex: 4,
                fieldName: 'iptHunterShield',
            },
            {
                name: 'System Hunter Shield',
                data: [0, 0, 0, 0, eventVm.model.sysHunterShield || 0, 0, 0, 0],
                color: eventVm.chartColors.yellow,
                showModal: true,
                legendIndex: 10,
                fieldName: 'iptHunterShield',
            }, {
                name: 'Input BBEW',
                data: [0, 0, 0, 0, 0, eventVm.model.iptBailBond || 0, 0, 0],
                color: eventVm.chartColors.green,
                legendIndex: 5,
                fieldName: 'iptBailBond',
            },
            {
                name: 'System BBEW',
                data: [0, 0, 0, 0, 0, eventVm.model.sysBailBond || 0, 0, 0],
                color: eventVm.chartColors.yellow,
                showModal: true,
                legendIndex: 11,
                fieldName: 'iptBailBond',
            },
            {
                name: 'Input GITC',
                data: [0, 0, 0, 0, 0, 0, eventVm.model.iptGITC || 0, 0],
                color: eventVm.chartColors.green,
                legendIndex: 6,
                fieldName: 'iptGITC',
            },
            {
                name: 'System GITC',
                data: [0, 0, 0, 0, 0, 0, eventVm.model.sysGITC || 0, 0],
                color: eventVm.chartColors.yellow,
                showModal: true,
                legendIndex: 12,
                fieldName: 'iptGITC',
            },
            {
                name: 'Input Career Shield Protection',
                data: [0, 0, 0, 0, 0, 0, 0, eventVm.model.iptCareerShield || 0],
                color: eventVm.chartColors.green,
                legendIndex: 7,
                fieldName: 'iptCareerShield',
                fieldNameIndex: 8
            },
            {
                name: 'System Career Shield Protection',
                data: [0, 0, 0, 0, 0, 0, 0, eventVm.model.sysCareerShield || 0],
                color: eventVm.chartColors.yellow,
                showModal: true,
                legendIndex: 13,
                fieldName: 'iptCareerShield'
            }
            ];
            var addOnFieldNames = [];
            _.each(eventVm.addOnsObj, function (a, fieldName) {
                if (a.show === false) {
                    return;
                }
                addOnFieldNames.push(fieldName);
            });
            var dataRemoveIndex = [];
            _.remove(planAddonsStatisticChartData, function (data, index) {
                var del = data.fieldName && addOnFieldNames.indexOf(data.fieldName) < 0;
                if (del) {
                    dataRemoveIndex.push(Math.floor(index / 2));
                }
                return del;
            });
            _.each(planAddonsStatisticChartData, function (d) {
                _.remove(d.data, function (val, index) {
                    return dataRemoveIndex.indexOf(index) > -1;
                });
            });
            eventVm.planAddonsStatisticChartData = planAddonsStatisticChartData;
            eventVm.planAddonsStatisticChartCategories = ['Annual Members', 'Monthly Members'];
            if (addOnFieldNames.indexOf('iptMultiState') > -1) {
                eventVm.planAddonsStatisticChartCategories.push('Multi State Protection');
            }
            if (addOnFieldNames.indexOf('iptMinorChildren') > -1) {
                eventVm.planAddonsStatisticChartCategories.push('Minor Children Protection');
            }
            if (addOnFieldNames.indexOf('iptHunterShield') > -1) {
                eventVm.planAddonsStatisticChartCategories.push('Hunter Shield');
            }
            if (addOnFieldNames.indexOf('iptBailBond') > -1) {
                eventVm.planAddonsStatisticChartCategories.push('BBEW');
            }
            if (addOnFieldNames.indexOf('iptGITC') > -1) {
                eventVm.planAddonsStatisticChartCategories.push('GITC');
            }
            if (addOnFieldNames.indexOf('iptCareerShield') > -1) {
                eventVm.planAddonsStatisticChartCategories.push('Career Shield Protection');
            }
            $timeout(function () {
                eventVm.systemChartConfig.series = eventVm.systemChartData;
                eventVm.eventRevenueChartConfig.series = eventVm.eventRevenueChartData;
                eventVm.planAddonStatisticChartConfig.series = eventVm.planAddonsStatisticChartData;
                eventVm.planAddonStatisticChartConfig.options.xAxis.categories = eventVm.planAddonsStatisticChartCategories;
                window.dispatchEvent(new Event('resize'));
            }, 150);
        }

        function showReportInformation(pointData) {
            if (pointData.series && pointData.series.userOptions && pointData.series.userOptions.showModal) {
                var modalInstance = $uibModal.open({
                    templateUrl: 'app/event/modal/event-detail-chart-popup.tpl.html',
                    controller: 'eventDetailChartPopupCtrl as eventChartVm',
                    size: 'lg',
                    scope: $scope,
                    windowClass: 'dashboard-info-modal',
                    backdrop: 'static',
                    resolve: {
                        pointData: function () {
                            return angular.copy(pointData);
                        },
                        eventId: function () {
                            return angular.copy(eventId);
                        }
                    }
                });
            }
        }

        function getState(value) {
            var state = _.find(eventVm.allStates, function (item) {
                return item.iso === value;
            });
            return state && state.name || '';
        }

        function getRegion(value) {
            var region = _.find(eventVm.regionGroups[eventVm.model.state], function (item) {
                return item.id === value;
            });
            eventVm.enablePromoCode = region && region.settings && region.settings.enable_promo_code === false ? false : true;

            return region && region.guid || '';
        }

        function showHideLegend(field) {
            return (eventVm.addOnsObj && eventVm.addOnsObj[field] && eventVm.addOnsObj[field].show) || false;
        }

        function onChangeStartDate() {
            //verify rep is availale
            var startDateUtc = moment.utc(eventVm.startDate).startOf('day').valueOf();
            var shiftCriteria = {
                timestampStart: startDateUtc,
                timestampEnd: startDateUtc,
                keyword: '',
                alias: null,
                ids: null
            };

            return shiftsService.searchShiftAvailable(shiftCriteria).then((uids) => {
                //clear rep selected 
                eventVm.representativeAttended = _.filter(eventVm.representativeAttended, repId => {
                    return _.find(uids, i => i.rep === repId);
                });
                eventVm.model.representativeAttended = {};
                _resetSelect2('Representative');
            });
        }
        //#endregion

        //#region Address
        function saveAddress() {
            appUtils.showLoading();
            let reqs = [];
            _getDataAddress(reqs);
            return Promise.all(reqs).then(function () {
                eventVm.model.modifiedBy = currentUser.email;
                return eventService.updateAddress(eventVm.model).then(function (res) {
                    appUtils.hideLoading();
                    if (!res.result) {
                        $ngBootbox.alert(res.errorMsg);
                        return;
                    }
                    toaster.pop('success', 'Success', "Event Updated.");
                    $timeout(angular.noop, 400);
                }, function (res) {
                    appUtils.hideLoading();
                    $ngBootbox.alert(res.errorMsg);
                    return;
                });
            });
        }
        function cancelAddress() {
            console.log('cancelAddress', eventVm.model.mailingAddress);

            eventVm.mailingAddress = angular.copy(eventVm.model.mailingAddress);

        }
        function directionMap() {
            console.log('directionMap');

        }
        function initMap() {
            console.log('initMap');

            setTimeout(() => {
                if (!eventVm.map && (eventVm.isEdit && eventVm.tabIdx === 3 || !eventVm.isEdit && eventVm.tabIdx === 1)) {
                    eventVm.map = NgMap.initMap('map-event-detail');
                    document.onfullscreenchange = function (event) {
                        let map = eventVm.map;
                        if (map) {
                            var center = map.getCenter();
                            google.maps.event.trigger(map, "resize");
                            map.setCenter(center);
                        }
                    };
                }
                $timeout(angular.noop, 200);
            }, 200);

        }
        //#region Address
    }
})();