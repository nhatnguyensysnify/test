(function () {
    'use strict';

    angular.module('app.membership')
        .controller('PreviewAppCtrl', PreviewAppCtrl);
    /** @ngInject */
    function PreviewAppCtrl($rootScope, $scope, $timeout, $q, toaster, $sce, appUtils, DataUtils, authService, memStateService, memAppService, memberShipService, memberShipPlansService, memberShipAddOnsService, $uibModal, $stateParams, itemFile, currentVersion, memberShipFacilitiesService, $uibModalInstance, memAppVerifyService, memAppTimeLineService, memRegionService, employeeService, personTitleService) {
        var appSettings = $rootScope.storage.appSettings;
        var currentUser = authService.getCurrentUser(); //$rootScope.storage.currentUser;
        var currenDate = moment(new Date());
        var verifyTimeout/*, eventLog = null*/;
        $scope.currentVersion = currentVersion;
        //
        var applicationVm = this,
            initModalPreview = false,
            appId = $stateParams.id,
            currentSignature = '',
            ignoreKeys = ['fileName', 'id', 'isSelected', 'path', 'processPath', 'processedAt', 'timestampCreated', 'membershipId', 'status'];

        //Form
        applicationVm.showInvalid = true;
        applicationVm.previewMode = true;
        applicationVm.numberRegx = /^\d+$/;
        applicationVm.year2Regx = /(1[6-9])|([2-9][0-9])/;
        applicationVm.monthRegx = /(0[1-9])|(1[012])/;
        applicationVm.yearRegx = /(20[1-9][9]|20[2-9][0-9]|2100)/;
        applicationVm.zipcodeRegx = /(^\d{5}$)|(^\d{5}-\d{4}$)/;
        applicationVm.nameRegx = /^(a-z|A-Z|0-9)*[^!#$%^&*()'"\/\\;:@=+,?\[\]\/]*$/;
        applicationVm.addressRegx = /^(a-z|A-Z|0-9)*[^!$%^&*()'"\/\\;:@=+,?\[\]]*$/;
        // applicationVm.emailRegx = /^[^!'"\/ ]+$/;
        applicationVm.emailRegx = /^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,4})$/;
        applicationVm.currencyRegx = /^\$\d/;
        applicationVm.cvvRegx = /(^\d{3}$)|(^\d{4}$)|^\d+$|^[*]+$/;
        applicationVm.memberIDRegx = /^[a-zA-Z0-9]+$/;

        //common
        applicationVm.statePlans = {};
        applicationVm.secPlanKey = '';
        applicationVm.planItems = [];
        applicationVm.planItemsIndex = {};
        applicationVm.addonItems = [];
        applicationVm.addonItemsIndex = {};
        applicationVm.appStatelist = [];
        applicationVm.activeFileUploadTab = false;
        applicationVm.fileStatus = 0;
        applicationVm.closePupup = false;
        applicationVm.appFacilityItems = [];
        applicationVm.searchedFacilities = [];
        applicationVm.appNumAdultsList = appUtils.appNumAdults;
        applicationVm.appCycleList = appUtils.appCycles;
        applicationVm.appPaymentMethodList = appUtils.appPaymentMethods;
        applicationVm.prefixList = [];
        applicationVm.suffixList = [];

        applicationVm.formTitle = 'Add New Application (Manual)';
        applicationVm.showAllFacilities = false;
        applicationVm.initPopup = false;
        applicationVm.initSeclectEvent = false;
        applicationVm.isEnoughtCast = true;
        applicationVm.facilityTxt = '';
        applicationVm.eventTxt = '';
        applicationVm.getState = getState;
        $scope.isCreate = true;
        applicationVm.selectedRegionSettings = {};
        applicationVm.select = select;
        applicationVm.regionGroups = {};

        //google address variable
        $scope.addressVerification = {
            show: false,
            cls: 'gplace',
            content: $sce.trustAsHtml('<i class="fa fa-spinner font-grey-silver"></i>'),
            place: {
                address: '',
                city: '',
                state: '',
                zipCode: ''
            },
            getPlace: function (place) { }
        };

        $scope.$watch('applicationVm.model.numberOfAdults', function (val) {
            if (!initModalPreview) {
                return;
            }
            _watchPlan();
        });

        $scope.$watch('applicationVm.model.cycle', function (val) {
            if (!initModalPreview) {
                return;
            }
            _watchPlan();
        });

        $scope.$watch('applicationVm.model.cashInput', function (val) {
            if (!initModalPreview) {
                return;
            }
            applicationVm.isEnoughtCast = parseFloat(val) >= parseFloat(applicationVm.model.total.totalAmount);
            applicationVm.cashChange = parseFloat(val - (applicationVm.model.total.totalAmount || 0));
        });

        $scope.$watch('applicationVm.model.total.totalAmount', function (val) {
            if (!initModalPreview) {
                return;
            }
            applicationVm.isEnoughtCast = parseFloat(applicationVm.model.cashInput) >= parseFloat(val);
            applicationVm.cashChange = parseFloat(applicationVm.model.cashInput - (val || 0));
        });

        $scope.$watch('applicationVm.model.creditCard.month', function (val) {
            if (!initModalPreview) {
                return;
            }
            var month = val,
                year = applicationVm.model.creditCard.year;
            if (month && year && applicationVm.model.signature && applicationVm.model.paymentMethod === '0') {
                var time = moment().utc().year(year).month(month - 1);
                applicationVm.expirationCard = _.clone(time).endOf('month').format('MM/DD/YYYY');
            } else {
                applicationVm.expirationCard = null;
            }
        });

        $scope.$watch('applicationVm.model.signature', function (val) {
            if (!initModalPreview) {
                return;
            }
            var month = applicationVm.model.creditCard.month,
                year = applicationVm.model.creditCard.year;
            if (month && year && val && applicationVm.model.paymentMethod === '0') {
                var time = moment().utc().year(year).month(month - 1);
                applicationVm.expirationCard = _.clone(time).endOf('month').format('MM/DD/YYYY');
            } else {
                applicationVm.expirationCard = null;
            }
        });

        $scope.$watch('applicationVm.model.creditCard.year', function (val) {
            if (!initModalPreview) {
                return;
            }
            var month = applicationVm.model.creditCard.month,
                year = val;
            if (month && year && applicationVm.model.signature && applicationVm.model.paymentMethod === '0') {
                var time = moment().utc().year(year).month(month - 1);
                applicationVm.expirationCard = _.clone(time).endOf('month').format('MM/DD/YYYY');
            } else {
                applicationVm.expirationCard = null;
            }
        });

        $scope.$watch('applicationVm.model.state', function (newValue, oldValue) {
            if (!initModalPreview) {
                return;
            }
            if (_.trim(newValue) !== _.trim(oldValue)) {
                var autoSelect = applicationVm.regionGroups[newValue];
                if (autoSelect && autoSelect.length === 1) {
                    applicationVm.model.region = autoSelect[0].id;
                    applicationVm.model.regionCode = autoSelect[0].code;
                    changeRegion();
                } else {
                    applicationVm.model.region = applicationVm.model.regionCode = '';
                }
            }
        });

        _initModal();

        //Functions
        applicationVm.waivedSetupFee = waivedSetupFee;
        applicationVm.showPopupFacilityList = showPopupFacilityList;
        applicationVm.showPopupEventList = showPopupEventList;
        applicationVm.showPopupEmployeeList = showPopupEmployeeList;
        applicationVm.addressVerification = addressVerification;
        applicationVm.bankAddressVerification = bankAddressVerification;
        applicationVm.changeRegion = changeRegion;
        applicationVm.changePaymentMethod = changePaymentMethod;
        applicationVm.gennerateEmail = gennerateEmail;
        applicationVm.getCashOptionTxt = getCashOptionTxt;
        applicationVm.detechCardType = detechCardType;
        applicationVm.changeState = changeState;

        $scope.close = close;
        $scope.selectFacility = selectFacility;
        $scope.selectPriPlan = _selectPriPlan;
        //===============================================================
        function addressVerification() {
            if (verifyTimeout) $timeout.cancel(verifyTimeout);
            verifyTimeout = $timeout(function () {
                _googleMapVerification(1);
            }, 0);
        }

        function bankAddressVerification() {
            if (verifyTimeout) $timeout.cancel(verifyTimeout);
            verifyTimeout = $timeout(function () {
                _googleMapVerification(2);
            }, 0);
        }

        function showPopupFacilityList(state) {
            if (!state || state === '') {
                applicationVm.initPopup = true;
                return;
            }
            var modalInstance = $uibModal.open({
                templateUrl: 'app/membership/modal/facility-list-popup.tpl.html',
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
                        return applicationVm.appFacilityItems;
                    },
                    facilityId: function () {
                        return applicationVm.model.facilityId;
                    }
                }
            });
            modalInstance.result.then(function () {
                //
            }, function () {
            }).finally(() => {
                $('.add-web-app-modal').show();
            });
        }

        function showPopupEventList(state, facilityId) {
            if (!state || state === '' || !facilityId || facilityId === '') {
                applicationVm.initSeclectEvent = true;
                return;
            }
            var modalInstance = $uibModal.open({
                templateUrl: './app/event/modal/event-list-popup.tpl.html',
                controller: 'EventListPopupCtrl as eventVm',
                size: 'lg',
                scope: $scope,
                backdrop: 'static',
                windowClass: 'select-event-modal',
                resolve: {
                    eventId: function () {
                        return angular.copy(applicationVm.model.eventId || null);
                    },
                    facilities: function () {
                        return applicationVm.appFacilityItems;
                    },
                    states: function () {
                        return applicationVm.appStatelist;
                    },
                    state: function () {
                        return angular.copy(state);
                    },
                    facilityId: function () {
                        return angular.copy(applicationVm.model.facilityId);
                    }
                }
            });

            modalInstance.result.then(function (event) {
                applicationVm.model.eventId = angular.copy(event && event.$id || '');
                applicationVm.eventTxt = applicationVm.model.eventName = angular.copy(event && event.name || '');
                $('.preview-web-app-modal').show();
            }, function () {
                $('.preview-web-app-modal').show();
            });
        }

        function showPopupEmployeeList() {
            var modalInstance = $uibModal.open({
                templateUrl: './app/employee/modal/employee-list-popup.tpl.html',
                controller: 'EmployeeListPopupCtrl as employeeModalVm',
                size: 'lg',
                scope: $scope,
                backdrop: 'static',
                windowClass: 'select-event-modal',
                resolve: {
                    employeeId: function () {
                        return angular.copy(applicationVm.employeeId || '');
                    }
                }
            });

            modalInstance.result.then(function (employee) {
                applicationVm.employeeId = employee.$id || '';
                applicationVm.model.representativeCode = employee.repCode || '';
                applicationVm.model.saleRep = employee ? employee.firstName + ' ' + employee.lastName : '';
                $('.preview-web-app-modal').show();
            }, function () {
                $('.preview-web-app-modal').show();
            });
        }

        function changeRegion($event) {
            applicationVm.initPopup = false;
            applicationVm.initSeclectEvent = false;
            var selectedRegion = _.find(applicationVm.regionGroups[applicationVm.model.state], { id: applicationVm.model.region });
            // set region_code
            var regionCode = selectedRegion.code;
            applicationVm.model.regionCode = regionCode;

            if (selectedRegion) {
                applicationVm.selectedRegionSettings = selectedRegion.settings || {};
            }
            if (applicationVm.selectedRegionSettings) {
                if (applicationVm.selectedRegionSettings.enable_promo_code === false) {
                    applicationVm.model.facilityCode = '';
                }
                if (applicationVm.selectedRegionSettings.enable_waived_setup_fee === false) {
                    applicationVm.model.waivedSetupFee = false;
                }
            }
            if (regionCode !== 'leo') {
                Object.assign(applicationVm.model, {
                    activeRetiredLEO: 'notLEO',
                    officerCard: null,
                    platinumPlus: null,
                    enteredBy: null
                });
            }
            if (regionCode !== 'sec') {
                Object.assign(applicationVm.model, {
                    moneyCollected: null,
                    systemEntered: null,
                    enteredDate: null
                });

            }
            if (regionCode !== 'nfa') {
                if (applicationVm.model.cycle == '3') {
                    applicationVm.model.cycle = null;
                }
            }

            if (regionCode == 'nfa' /*|| regionCode =='sec'*/) {
                Object.assign(applicationVm.model, {
                    cycle: "3",
                    numberOfAdults: "1"
                });
            }
            if (regionCode == 'sec') {
                Object.assign(applicationVm.model, {
                    numberOfAdults: "1"
                });
            }

            _watchPlan();
        }

        function changePaymentMethod() {
            applicationVm.model.processPayment = true;
            //Credit==========================================================
            applicationVm.model.creditCard = {
                name: '',
                creditCardNumber: '',
                month: '',
                year: '',
                cvv: '',
                zipCode: ''
            };

            //Check===========================================================
            applicationVm.model.check = {
                accountNumber: '',
                routingNumber: '',
                type: 'BusinessChecking',
                address: '',
                state: '',
                city: '',
                zipCode: '',
                name: '',
                fullName: ''
            };

            //init bank address
            if (applicationVm.model.paymentMethod && applicationVm.model.paymentMethod === '2') {
                $scope.bankAddressVerification = {
                    show: false,
                    cls: 'gplace',
                    content: $sce.trustAsHtml('<i class="fa fa-spinner font-grey-silver"></i>'),
                    place: {
                        address: '',
                        city: '',
                        state: '',
                        zipCode: ''
                    },
                    getPlace: function (place) { }
                };
                $scope.bankAddressVerification.place = applicationVm.model.check.address;
                _googleMapVerification(2);
                $scope.bankAddressVerification.getPlace = function (addrComp) {
                    var rs = {
                        address: '',
                        city: '',
                        state: '',
                        zipCode: ''
                    };

                    _.forEach(addrComp, function (comp) {
                        if (comp.types[0] === "street_number") rs.address = comp.short_name + " ";
                        if (comp.types[0] === "route") rs.address += comp.short_name;
                        if (comp.types[0] === "locality") rs.city = comp.short_name;
                        if (comp.types[0] === "administrative_area_level_1") rs.state = comp.short_name;
                        if (comp.types[0] === "postal_code") rs.zipCode = comp.short_name;
                    });

                    $scope.$apply(function () {
                        angular.extend(applicationVm.model.check, rs);
                        $scope.bankAddressInvalid = false;
                    });
                };
            }

            //Cash============================================================
            applicationVm.model.cashAmount = applicationVm.model.cashInput = 0;
            if (applicationVm.model.paymentMethod === '1')
                applicationVm.model.cashOption = 'TakeCredit';
            else
                applicationVm.model.cashOption = '';

        }

        function selectFacility(item) {
            applicationVm.notBelongState = false;
            applicationVm.initSeclectEvent = false;
            applicationVm.model.facilityId = item.$id;
            applicationVm.model.facilityCode = item.facility_promo_code || '';

            if (applicationVm.selectedRegionSettings.enable_promo_code === false) {
                applicationVm.model.facilityCode = '';
            }
            applicationVm.facilityTxt = item.address && $.trim(item.address) !== '' ? item.name + ' - ' + item.facility_promo_code + ' (' + item.address + ')' : item.name + ' - ' + item.facility_promo_code;
            if (item.state_code !== applicationVm.model.state) {
                applicationVm.notBelongState = true;
            }
        }

        // var emailPrefix = '@nousls.com';
        function gennerateEmail(email, isSecond) {
            var emailPrefix = appSettings && appSettings.emailPrefixDomain ? '@' + appSettings.emailPrefixDomain : '';
            if (!isSecond)
                applicationVm.memberModel.priMember.email = email + emailPrefix;
            else
                applicationVm.memberModel.secMember.email = email + emailPrefix;
        }

        function close() {
            $uibModalInstance.close();
        }

        function changeState() {
            // applicationVm.initPopup = false;
            // applicationVm.initSeclectEvent = false;
            // _watchPlan();
            // onChange State auto change Region
        }

        //Private Function===============================================================================================
        function _initModal() {
            var reqs = [];
            applicationVm.allStates = appUtils.getAllState();
            if (applicationVm.allStates && applicationVm.allStates.length > 0) {
                var usStates = _.map(applicationVm.allStates, function (s) {
                    return s.value;
                });
                if (usStates && usStates.length > 0) {
                    var stateStr = usStates.join('|');
                    applicationVm.stateRegx = new RegExp('^(' + stateStr + ')$');
                }
            }

            reqs.push(employeeService.getAll().then(function (rs) {
                applicationVm.employees = rs;
            }));

            reqs.push(memberShipPlansService.getAll().then(function (data) {
                applicationVm.planItems = data;
                _.each(data, function (item, stateCode) {
                    var groupByRegion = {};
                    _.each(item, function (plan, planId) {
                        if (!groupByRegion[plan.region_id]) {
                            // groupByRegion[plan.region_id] = [];
                            groupByRegion[plan.region_id] = {};
                        }
                        plan.key = planId;
                        // groupByRegion[plan.region_id].push(plan);
                        groupByRegion[plan.region_id][planId] = plan;
                    });
                    applicationVm.planItemsIndex[stateCode] = groupByRegion;
                });
            }));

            reqs.push(memberShipAddOnsService.getAll().then(function (data) {
                applicationVm.addonItems = data;
                _.each(data, function (item, stateCode) {
                    var groupByRegion = {};
                    _.each(item, function (addOn, addOnId) {
                        if (!groupByRegion[addOn.region_id]) {
                            groupByRegion[addOn.region_id] = {};
                        }
                        groupByRegion[addOn.region_id][addOnId] = addOn;
                    });
                    applicationVm.addonItemsIndex[stateCode] = groupByRegion;
                });

            }));

            reqs.push(memStateService.getAll().then(function (data) {
                applicationVm.appStatelist = data;
            }));

            reqs.push(memRegionService.getAll().then(function (regionGoups) {
                _.each(regionGoups, function (regionGroup, stateCode) {
                    regionGoups[stateCode] = DataUtils.toAFArray(regionGroup);
                });
                applicationVm.regionGroups = regionGoups;
            }));

            reqs.push(memberShipFacilitiesService.itemsLoadOnce().then(function (data) {
                applicationVm.appFacilityItems = data;
            }));

            reqs.push(personTitleService.getPrefixs().then(function (data) {
                applicationVm.prefixList = data;
            }));

            reqs.push(personTitleService.getSuffixs().then(function (data) {
                applicationVm.suffixList = data;
            }));

            _initModel();
            return Promise.all(reqs).then(function () {
                return _loadData();
            }).then(function () {
                appUtils.hideLoading();
                _mapDataModel();
                _watchPlan();
                initModalPreview = true;
            });
        }

        function _initModel(keepState) {
            applicationVm.model = {
                status: 0,
                sourceSeminar: false,
                sourceClass: false,
                sourceGunShow: false,
                sourceOther: true,
                processOnSwiper: 'false',
                startUp: '',
                creditCard: {
                    name: '',
                    creditCardNumber: '',
                    month: '',
                    year: '',
                    cvv: '',
                    zipCode: ''
                },
                physicalFiles: [],
                total: {
                    subTotalAmount: 0,
                    setupFee: 0,
                    totalAmount: 0
                },
                signature: true,
                signatureDate: currenDate.format('MM/DD/YYYY'),
                representativeCode: '',
                saleRep: '',
                facilityCode: '',
                facilityId: '',
                eventId: '',
                eventName: '',
                isVerified: false,
                selectedPlans: {},
                selectedAddOns: {},
                isLocked: false,
                numberOfAdults: '',
                cycle: '',
                stateId: '',
                paymentMethod: '0',
                cashAmount: 0,
                cashInput: 0,
                cashOption: '',
                waivedSetupFee: false,
                processPayment: true,
                check: {
                    accountNumber: '',
                    routingNumber: '',
                    effectiveDate: ''
                }
            };
            applicationVm.facilityTxt = '';
            applicationVm.eventTxt = '';
            if (!keepState) {
                applicationVm.model.state = '';
            }
            var repCode = currentUser.repCode || currentUser.username || '',
                saleRep = currentUser ? currentUser.firstName + ' ' + currentUser.lastName : '';
            applicationVm.model.representativeCode = repCode;
            applicationVm.model.saleRep = saleRep;
            applicationVm.employeeId = currentUser.$id;
            applicationVm.model.method = 3;
            applicationVm.model.status = 1;
            applicationVm.closePupup = true;
            applicationVm.accountSource = '';
            _initMemberModel();
        }

        function _initMemberModel() {
            //Member model
            applicationVm.memberModel = {};
            applicationVm.memberModel.apps = [];

            //Primary member
            applicationVm.memberModel.priMember = {
                memberId: '',
                prefix: '',
                suffix: '',
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
                mailingAddress: {
                    address: '',
                    city: '',
                    state: '',
                    zipCode: ''
                }
            };

            //Secondary member
            applicationVm.memberModel.secMember = {
                memberId: '',
                prefix: '',
                suffix: '',
                firstName: '',
                lastName: '',
                email: '',
                phone: ''
            };
            applicationVm.memberModel.isActive = false;
            applicationVm.memberModel.accountId = '';

            if (applicationVm.memberModel && applicationVm.memberModel.priMember) {
                $scope.addressVerification.place = applicationVm.memberModel.priMember.mailingAddress;
                _googleMapVerification(1);
                $scope.addressVerification.getPlace = function (addrComp) {
                    var rs = {
                        address: '',
                        city: '',
                        state: '',
                        zipCode: ''
                    };

                    _.forEach(addrComp, function (comp) {
                        if (comp.types[0] === "street_number") rs.address = comp.short_name + " ";
                        if (comp.types[0] === "route") rs.address += comp.short_name;
                        if (comp.types[0] === "locality") rs.city = comp.short_name;
                        if (comp.types[0] === "administrative_area_level_1") rs.state = comp.short_name;
                        if (comp.types[0] === "postal_code") rs.zipCode = comp.short_name;
                    });

                    $scope.$apply(function () {
                        applicationVm.memberModel.priMember.mailingAddress = rs;
                        $scope.addressInvalid = false;
                    });
                };
            }
        }

        function _loadData() {
            if (!appId || appId === '') {
                return $q.when();
            }
            var request = memAppService.getWithLoad(appId).then(function (rs) {
                if (!rs) {
                    return $q.when();
                }
                // default cycle & number of adults of security plan
                if (rs.regionCode == 'sec') {
                    if (!rs.numberOfAdults) {
                        rs.numberOfAdults = '1';
                    }
                }
                var request_array = [];
                applicationVm.model = rs;
                if (!applicationVm.model.saleRep) {
                    applicationVm.model.saleRep = '';
                }
                if (!applicationVm.model.managers) {
                    applicationVm.model.managers = [];
                }

                applicationVm.employeeId = '';
                if (applicationVm.model.representativeCode) {
                    var repCodeInfo = _.find(applicationVm.employees, { repCode: applicationVm.model.representativeCode });
                    if (repCodeInfo) {
                        applicationVm.employeeId = repCodeInfo.$id || '';
                        applicationVm.model.saleRep = repCodeInfo.firstName + ' ' + repCodeInfo.lastName;
                    }
                }

                //load Membership
                _loadMembership(rs.membershipId);

                if (applicationVm.model.waivedSetupFee === undefined) {
                    applicationVm.model.waivedSetupFee = false;
                }

                if (applicationVm.model.processPayment === undefined) {
                    applicationVm.model.processPayment = true;
                }

                if (!applicationVm.model.cashInput) {
                    applicationVm.model.cashInput = angular.copy(applicationVm.model.cashAmount || 0);
                }

                //
                if (!applicationVm.model.signatureDate || $.trim(applicationVm.model.signatureDate) === '') {
                    applicationVm.model.signatureDate = moment().format('MM/DD/YYYY');
                }

                if (applicationVm.model.signatureDate && $.trim(applicationVm.model.signatureDate) !== '') {
                    currentSignature = angular.copy(applicationVm.model.signatureDate);
                }

                applicationVm.model.physicalFiles = _.filter(rs.physicalFiles, function (o) { return !o.isDeleted; });

                if (applicationVm.model.facilityId !== '') {
                    var fR = memberShipFacilitiesService.get(applicationVm.model.facilityId).then(function (data) {
                        var facilityTxt = data && data.address && $.trim(data.address) !== '' ? data.name + ' - ' + data.facility_promo_code + ' (' + data.address + ')' : data.name + ' - ' + data.facility_promo_code;
                        applicationVm.facilityTxt = facilityTxt;
                        applicationVm.facilityObj = data;
                        applicationVm.facilityObj.id = data.$id || '';
                    });
                    request_array.push(fR);
                }

                if (!applicationVm.model.eventId) {
                    applicationVm.model.eventId = '';
                }

                if (!applicationVm.model.eventName) {
                    applicationVm.model.eventName = '';
                }

                applicationVm.eventTxt = applicationVm.model.eventName;
                // handle selectedRegion
                if (applicationVm.model.region) {
                    var selectedRegion = _.find(applicationVm.regionGroups[applicationVm.model.state], { id: applicationVm.model.region });
                    if (selectedRegion) {
                        applicationVm.selectedRegionSettings = selectedRegion.settings || {};
                    }
                }
                applicationVm.model.paymentMethod = '0';
                var creditObj = {
                    name: '',
                    creditCardNumber: '',
                    month: '',
                    year: '',
                    cvv: '',
                    zipCode: ''
                };
                applicationVm.model.creditCard = creditObj;

                applicationVm.model.check = {
                    accountNumber: '',
                    routingNumber: '',
                    type: 'BusinessChecking',
                    address: '',
                    state: '',
                    city: '',
                    zipCode: '',
                    name: '',
                    fullName: ''
                };

                applicationVm.model.cashAmount = applicationVm.model.cashInput = 0;
                applicationVm.model.cashOption = '';

                if (request_array.length > 0) {
                    return $q.all(request_array);
                }
                return $q.when();
            });
            // end request
            return request;
        }

        function _loadMembership(membershipId) {
            memberShipService.getWithLoad(membershipId).then(function (memberModel) {
                applicationVm.memberModel = memberModel;
                // Assign data for google verification address
                if (applicationVm.memberModel && applicationVm.memberModel.priMember) {
                    $scope.addressVerification.place = applicationVm.memberModel.priMember.mailingAddress;
                    _googleMapVerification(1);
                    $scope.addressVerification.getPlace = function (addrComp) {
                        var rs = {
                            address: '',
                            city: '',
                            state: '',
                            zipCode: ''
                        };

                        _.forEach(addrComp, function (comp) {
                            if (comp.types[0] === "street_number") rs.address = comp.short_name + " ";
                            if (comp.types[0] === "route") rs.address += comp.short_name;
                            if (comp.types[0] === "locality") rs.city = comp.short_name;
                            if (comp.types[0] === "administrative_area_level_1") rs.state = comp.short_name;
                            if (comp.types[0] === "postal_code") rs.zipCode = comp.short_name;
                        });

                        $scope.$apply(function () {
                            applicationVm.memberModel.priMember.mailingAddress = rs;
                            $scope.addressInvalid = false;
                        });
                    };

                    if (applicationVm.model.creditCard && (!applicationVm.model.creditCard.name || applicationVm.model.creditCard.name === '')) {
                        applicationVm.model.creditCard.name = (applicationVm.memberModel.priMember.firstName + ' ' + applicationVm.memberModel.priMember.lastName).trim();
                    }
                }
            });
        }

        function select() {
            _.forEach(applicationVm.model.physicalFiles, function (file, key) {
                if (file.isSelected) {
                    file.status = 3;
                }
                file.isSelected = false;
            });
            
            _setAccountSource(applicationVm.model);

            if (currentVersion > 0) {
                itemFile = _mapDataFields();
                itemFile.isSelected = true;
                itemFile.status = 3;
                _setAppPlans();
                applicationVm.model.physicalFiles[currentVersion - 1] = itemFile;
            } else {
                toaster.error('Cannot find this version!');
                return;
            }
            //Update data for application from fields of OCR
            _update("Select file and save success!");
        }

        function _update(message) {
            appUtils.showLoading();
            //Update an application
            var stateId = $('[name="appState"]:visible option:selected').attr('data-id');
            applicationVm.model.stateId = !stateId ? '0' : stateId;
            if ($.trim(applicationVm.model.representativeCode) === '') {
                applicationVm.model.representativeCode = currentUser.username ? currentUser.username.toUpperCase() : '';
            }

            applicationVm.model.authorModifier = applicationVm.memberModel.authorModifier = currentUser.email;
            return memberShipFacilitiesService.get(applicationVm.model.facilityId).then(function (data) {
                if (data && data.facility_promo_code) {
                    applicationVm.model.facilityCode = data.facility_promo_code;
                }
                //Application tracking timeline obj
                var appTrackingUpdate = {
                    eventType: appUtils.logEvent.previewApp,
                    status: angular.copy(applicationVm.model.status)
                };
                return memAppService.update(applicationVm.model).then(function (rs) {
                    if (rs.result) {
                        var reqAll = [];
                        //Create tracking update application
                        appTrackingUpdate.message = 'Updated application information.';
                        reqAll.push(memAppTimeLineService.create(appId, appTrackingUpdate));
                        if (applicationVm.model.status === 4 || applicationVm.model.status === 8) {
                            applicationVm.memberModel.isActive = true;
                            //Create application-verify 
                            var reqVerify = memAppVerifyService.create(appId).then(function () {
                                //Create tracking application create membership
                                var appTrackingVerify = {
                                    eventType: appUtils.logEvent.createMember,
                                    status: applicationVm.model.status
                                };
                                memAppTimeLineService.create(app.$id, appTrackingVerify);
                            });

                            reqAll.push(reqVerify);
                        }

                        if (applicationVm.model.numberOfAdults === '1' && applicationVm.memberModel.secMember && applicationVm.memberModel.secMember.memberId) {
                            applicationVm.memberModel.secMember.memberId = '';
                        }

                        var memReq = memberShipService.update(applicationVm.memberModel).then(function (memRs) {
                            if (!memRs.result) {
                                toaster.error('Cannot save membership!');
                            }
                        });
                        reqAll.push(memReq);
                        return $q.all(reqAll).then(function () {
                            appUtils.hideLoading();
                            toaster.success(message);
                            setTimeout(function () {
                                $uibModalInstance.dismiss('close');
                            }, 500);
                        });
                    } else {
                        toaster.error(rs.errorMsg);
                        //Create tracking update application                        
                        appTrackingUpdate.message = rs && rs.errorMsg || 'Update application information has error.';
                        return memAppTimeLineService.create(appId, appTrackingUpdate);
                    }
                }).catch(function (err) {
                    toaster.error(err.message);
                    //Create tracking update application
                    appTrackingUpdate.message = err && err.message || 'Update application information has error.';
                    return memAppTimeLineService.create(appId, appTrackingUpdate);
                });
            });
        }

        function _googleMapVerification(type) {
            var city = '';
            var state = '';
            var zipCode = '';
            if (type === 1 && applicationVm.memberModel.priMember.mailingAddress) {
                address = applicationVm.memberModel.priMember.mailingAddress.address;
                city = applicationVm.memberModel.priMember.mailingAddress.city;
                state = applicationVm.memberModel.priMember.mailingAddress.state;
                zipCode = applicationVm.memberModel.priMember.mailingAddress.zipCode;
            } else {
                address = applicationVm.model.check.address;
                city = applicationVm.model.check.city;
                state = applicationVm.model.check.state;
                zipCode = applicationVm.model.check.zipCode;
            }
            var address = [
                address,
                city,
                state,
                zipCode,
                'US'
            ].join(', ');
            address = address.replace(/ ,/g, '');
            memberShipService.verificationAddress(address).then(function (res) {
                var rs = res.data.results[0];
                var streetNum = { long_name: '', short_name: '' };
                var route = { long_name: '', short_name: '' };
                if (rs) {
                    var keysMap = [0, 1];
                    if (rs.address_components[0] && rs.address_components[0].types[0] === 'premise') keysMap = [1, 2]; // Skip premise
                    if (rs.address_components[keysMap[0]]) streetNum = rs.address_components[keysMap[0]];
                    if (rs.address_components[keysMap[1]]) route = rs.address_components[keysMap[1]];

                    var longAddress = (streetNum.long_name + ' ' + route.long_name).toLowerCase();
                    var shortAddress = (streetNum.short_name + ' ' + route.short_name).toLowerCase();

                    if (type === 1 && $scope.addressVerification.place) {
                        $scope.addressInvalid = !(($scope.addressVerification.place.address || '').toLowerCase() === longAddress || ($scope.addressVerification.place.address || '').toLowerCase() === shortAddress);
                    } else {
                        $scope.bankAddressInvalid = !(($scope.bankAddressVerification.place.address || '').toLowerCase() === longAddress || ($scope.bankAddressVerification.place.address || '').toLowerCase() === shortAddress);
                    }
                }
            });
        }

        function _unCheckAddons() {
            var appForm = $('#preview-web-app');
            var priPlans = appForm.find('.pri-app-plans input[type="checkbox"]');
            _.forEach(priPlans, function (element, key) {
                $(element).attr('checked', false);
            });
            var secPlans = appForm.find('.sec-app-plans input[type="checkbox"]');
            _.forEach(secPlans, function (element, key) {
                $(element).attr('checked', false);
            });
        }

        function _setAppPlans() {
            applicationVm.model.selectedAddOns = {};
            var priPlans = $('#preview-web-app .pri-app-plans input[type="checkbox"]:enabled:visible');
            _.forEach(priPlans, function (element, key) {
                var me = $(element);
                if (me.is(':checked')) {
                    var addon = _.find(applicationVm.stateAddons, function (o) {
                        return o.key == me.val();
                    });

                    if (addon) {
                        applicationVm.model.selectedAddOns[addon.key + ''] = addon;
                    }
                }
            });
        }

        function _mapDataModel() {
            _.forEach(itemFile, function (field, key) {
                if (key === 'priMember' || key === 'secMember') {
                    applicationVm.memberModel[key] = field;
                } else if (key == 'signatureDate') {
                    if (currentSignature === '' && field !== '') {
                        applicationVm.model[key] = field;
                    } else if (currentSignature === '' && field === '') {
                        applicationVm.model[key] = moment(new Date()).format('MM/DD/YYYY');
                    }
                } else if (ignoreKeys.indexOf(key) === -1) {
                    applicationVm.model[key] = field;
                }
            });
            applicationVm.model.status = 1;
            _getAccountSource(applicationVm.model);
            memberShipFacilitiesService.get(applicationVm.model.facilityId).then(function (appFacility) {
                if (appFacility) {
                    selectFacility(appFacility);
                }
            });
        }

        function _mapDataFields() {
            var obj = angular.copy(itemFile);
            _.forEach(itemFile, function (field, key) {
                if (key === 'priMember' || key === 'secMember') {
                    obj[key] = applicationVm.memberModel[key];
                } else if (ignoreKeys.indexOf(key) === -1) {
                    obj[key] = applicationVm.model[key];
                }
            });
            return obj;
        }

        function _selectPriPlan(key, planItem) {
            if (key !== undefined && key !== null) {
                if (planItem === undefined) {
                    planItem = applicationVm.statePlans[key];
                }
                _unCheckAddons();
                if (!applicationVm.model.selectedPlans) {
                    applicationVm.model.selectedPlans = {};
                }

                planItem.key = key;
                applicationVm.model.selectedPlans = _.clone(planItem);
                applicationVm.planSetupPrice = appUtils.formatNumber(planItem.setup_price);
                _loadAppAddons(key, planItem);
                // auto check active/retiring for leo
                if (applicationVm.model.regionCode == 'leo') {
                    applicationVm.model.activeRetiredLEO = planItem.sku.indexOf('retired') > -1 ? 'retired' : 'active';
                }
            }
        }

        function _loadAppAddons(key, planItem) {
            var state = applicationVm.model.state,
                region = applicationVm.model.region,
                numberOfAdults = applicationVm.model.numberOfAdults,
                planNum = applicationVm.model.cycle;
            var stateAddons = state && region && applicationVm.addonItemsIndex[state][region];

            var addonArr = _.filter(stateAddons, function (o, key) {
                var valid = o.cycle_id == planNum;
                if (!valid) {
                    return valid;
                }
                if (numberOfAdults == "1") {
                    var rate_name = o.rate_name && o.rate_name.toLowerCase() || '',
                        sku = o.sku && o.sku.toLowerCase() || '';
                    valid = valid && rate_name.indexOf('spouse') === -1 && rate_name.indexOf('partner') === -1 && sku.indexOf('spouse') === -1 && sku.indexOf('partner') == -1;
                }
                if (valid) {
                    o.key = key;
                }
                return valid;
            });

            applicationVm.stateAddons = addonArr;
            applicationVm.model.total.setupFee = appUtils.formatNumber(planItem.setup_price);

            if (planItem.name.toLowerCase().indexOf('couple') != -1) {
                applicationVm.secPlanKey = key;
            } else {
                applicationVm.secPlanKey = '';
            }

            $timeout(function () {
                _calculateTotal(); //Calculate total amount
                _initAddonCheckboxes(); //Init addon checboxes
            }, 1000);
        }

        function _initAddonCheckboxes() {
            //Set app plans for the members         
            var form = $('#preview-web-app');
            var priPlans = form.find('.pri-app-plans input[type="checkbox"]:enabled:visible');
            _.forEach(priPlans, function (element, key) {
                var me = $(element);
                me.change(function () {
                    _calculateTotal();
                });
            });
        }

        function _calculateTotal() {
            var planItem = applicationVm.model.selectedPlans,
                priPlan = appUtils.formatNumber(planItem.recurring_price),
                setupFee = appUtils.formatNumber(planItem.setup_price),
                discount = 0;

            //Set app plans for the members       
            var appForm = $('#preview-web-app'),
                priPlans = appForm.find('.pri-app-plans input[type="checkbox"]:enabled:visible'),
                priAddons = 0;

            _.forEach(priPlans, function (element, key) {
                var me = $(element);
                if (me.is(':checked')) {
                    var addon = _.find(applicationVm.stateAddons, function (o) {
                        return o.key == me.val();
                    });
                    if (addon) {
                        priAddons += appUtils.formatNumber(addon.recurring_price);
                    }
                }
            });

            var priTotal = (priPlan + priAddons),
                total = priTotal;

            if (!applicationVm.model.waivedSetupFee) {
                total = priTotal + setupFee;
            }

            applicationVm.model.total.subTotalAmount = appUtils.formatCurrency(priTotal);
            applicationVm.model.total.setupFee = appUtils.formatCurrency(setupFee);
            applicationVm.model.total.totalAmount = appUtils.formatCurrency(total);
            $timeout(angular.noop, 500);
        }

        function _watchPlan() {
            applicationVm.secPlanKey = '';
            applicationVm.model.total.setupFee = 0;
            applicationVm.model.total.subTotalAmount = 0;
            applicationVm.model.total.totalAmount = 0;

            var state = applicationVm.model.state,
                region = applicationVm.model.region;

            applicationVm.stateAddons = [];
            applicationVm.memberModel.priMember.memberId = state = applicationVm.model.state;
            applicationVm.memberModel.secMember.memberId = '';
            if (applicationVm.model.numberOfAdults && applicationVm.model.numberOfAdults.toString() == '2') {
                applicationVm.memberModel.secMember.memberId = state;
            }

            var statePlans = state && region && applicationVm.planItemsIndex[state] && applicationVm.planItemsIndex[state][region] || [];

            applicationVm.statePlans = statePlans;

            if (applicationVm.model.total) {
                applicationVm.model.total.startUpFee = '19.95';
            }

            _unCheckAddons();

            var numberOfAdult = _.find(applicationVm.appNumAdultsList, function (o) {
                return o.key == applicationVm.model.numberOfAdults;
            });

            var appPlans = {};
            _.each(statePlans, function (o, key) {
                var valid = true;
                valid = applicationVm.model.cycle && o.cycle_id == applicationVm.model.cycle;
                if (applicationVm.model.regionCode !== 'nfa' && applicationVm.model.regionCode !== 'sec') {
                    if (!numberOfAdult) {
                        valid = false;
                    } else {
                        var sku = o.sku && o.sku.toLowerCase() || '',
                            name = o.name && o.name.toLowerCase() || '';
                        if (numberOfAdult.value == 'Individual') {
                            valid = valid && sku.indexOf('couple') < 0;
                        }
                        if (numberOfAdult.value == 'Couple') {
                            valid = valid && sku.indexOf('couple') > -1;
                        }
                    }
                }

                if (valid) {
                    appPlans[key] = o;
                }
            });
            applicationVm.statePlans = appPlans;
            var appPlan = null,
                appPlanKeys = Object.keys(appPlans);
            if (appPlanKeys.length == 1) {
                appPlan = appPlans[appPlanKeys[0]];
                applicationVm.isEnableSelectPlan = false;
                // _selectPriPlan(appPlan.key, appPlan);

            } else {
                applicationVm.isEnableSelectPlan = true;
                appPlan = applicationVm.model.selectedPlans && appPlans[applicationVm.model.selectedPlans.key] || null;
            }
            if (appPlan) {
                _selectPriPlan(appPlan.key, appPlan);
            }

        }

        function waivedSetupFee(val) {
            var total = 0;
            if (val) {
                total = parseFloat(applicationVm.model.total.totalAmount) - parseFloat(applicationVm.model.total.setupFee);
            } else {
                total = parseFloat(applicationVm.model.total.totalAmount) + parseFloat(applicationVm.model.total.setupFee);
            }

            applicationVm.model.total.totalAmount = appUtils.formatCurrency(total);
        }

        function getCashOptionTxt(application) {
            return appUtils.getCashOptionTxt(application);
        }

        function detechCardType(cardNumber) {
            appUtils.getCardType2(applicationVm.model.creditCard.creditCardNumber).then(function (cardTypeData) {
                applicationVm.model.creditCard.type = cardTypeData;
                return;
            });
        }

        function getState(value) {
            var state = _.find(applicationVm.appStatelist, function (item) {
                return item.iso === value;
            });
            return state && state.name || '';
        }

        function _getAccountSource(model) {
            applicationVm.accountSource = '';
            if (model.sourceSeminar) {
                model.sourceClass = model.sourceGunShow = model.sourceOther = false;
                applicationVm.accountSource = 'Seminar';
            } else if (model.sourceClass) {
                model.sourceSeminar = model.sourceGunShow = model.sourceOther = false;
                applicationVm.accountSource = 'Class';
            } else if (model.sourceGunShow) {
                model.sourceSeminar = model.sourceClass = model.sourceOther = false;
                applicationVm.accountSource = 'Gun Show';
            } else if (model.sourceOther){
                model.sourceSeminar = model.sourceClass = model.sourceGunShow = false;
                applicationVm.accountSource = 'Other';
            }
        }

        function _setAccountSource(model) {
            if(model.regionCode === 'sec'){
                model.sourceOther = model.sourceClass = model.sourceGunShow = model.sourceOther = false;
                return;
            }
            switch (applicationVm.accountSource) {
                case 'Seminar':
                    model.sourceClass = model.sourceGunShow = model.sourceOther = false;
                    model.sourceSeminar = true;
                    break;
                case 'Class':
                    model.sourceSeminar = model.sourceGunShow = model.sourceOther = false;
                    model.sourceClass = true;
                    break;
                case 'Gun Show':
                    model.sourceSeminar = model.sourceClass = model.sourceOther = false;
                    model.sourceGunShow = true;
                    break;
                case 'Other':
                    model.sourceOther = true;
                    model.sourceSeminar = model.sourceClass = model.sourceGunShow = false;
                    break;
            }
        }
    }
})();