(function () {
    'use strict';

    angular.module('app.membership')
        .controller('AddAppCtrl', AddAppCtrl);

    /** @ngInject */
    function AddAppCtrl($rootScope, $scope, $state, $uibModalInstance, $timeout, toaster, appUtils, authService, memAppService, memberShipService, memberShipPlansService, memberShipAddOnsService, $uibModal, $sce, $ngBootbox, memStateService, memberShipFacilitiesService, memRegionService, $http, memAppTimeLineService, personTitleService, memAppVerifyService, $q, DataUtils) {
        var appSettings = $rootScope.storage.appSettings;
        var appTrackingObjSubmit = null;
        var currentUser = authService.getCurrentUser(); //$rootScope.storage.currentUser;
        var currenDate = moment(new Date());
        var verifyTimeout/*, eventLog = null*/;

        //
        var applicationVm = this;
        //Form
        applicationVm.showInvalid = false;
        applicationVm.submitting = false;
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
            _watchPlan();
        });

        $scope.$watch('applicationVm.model.cycle', function (val) {
            _watchPlan();
        });

        $scope.$watch('applicationVm.model.cashInput', function (val) {
            applicationVm.isEnoughtCast = parseFloat(val) >= parseFloat(applicationVm.model.total.totalAmount);
            applicationVm.cashChange = parseFloat(val - (applicationVm.model.total.totalAmount || 0));
        });

        $scope.$watch('applicationVm.model.total.totalAmount', function (val) {
            applicationVm.isEnoughtCast = parseFloat(applicationVm.model.cashInput) >= parseFloat(val);
            applicationVm.cashChange = parseFloat(applicationVm.model.cashInput - (val || 0));
        });

        $scope.$watch('applicationVm.model.creditCard.month', function (val) {
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

            if (_.trim(newValue) !== _.trim(oldValue)) {
                var autoSelect = applicationVm.regionGroups[newValue];
                if (autoSelect && autoSelect.length === 1) {
                    applicationVm.model.region = autoSelect[0].id;
                    applicationVm.model.regionCode = autoSelect[0].code;
                    changeRegion();
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
        applicationVm.changeState = changeState;
        applicationVm.changeRegion = changeRegion;
        applicationVm.changePaymentMethod = changePaymentMethod;
        applicationVm.gennerateEmail = gennerateEmail;
        applicationVm.submit = submit;
        applicationVm.saveAndClose = saveAndClose;
        applicationVm.getCashOptionTxt = getCashOptionTxt;
        applicationVm.detechCardType = detechCardType;

        $scope.close = close;
        $scope.selectFacility = selectFacility;
        $scope.selectPriPlan = _selectPriPlan;
        //===============================================================
        //Functions
        function submit(form) {
            appUtils.showLoading();
            applicationVm.showInvalid = true;
            if (form.$invalid) {
                appUtils.hideLoading();
                return;
            }

            if (applicationVm.submitting) {
                toaster.warning('This application is submitting');
                return;
            }

            applicationVm.submitting = true;
            return memberShipFacilitiesService.get(applicationVm.model.facilityId).then(function (fal) {
                if (applicationVm.model.state !== applicationVm.memberModel.priMember.mailingAddress.state || !fal || !fal.facility_id || fal.isActive === false) {
                    appUtils.hideLoading();
                    var submitMsg = 'Member address is not in the same state as selected region. Are you sure you want to continue?';
                    if (fal.isActive === false) {
                        submitMsg = 'This Facility is inactive. Are you sure you want to continue?';
                    }
                    $ngBootbox.confirm(submitMsg).then(function () {
                        return _doSubmit(fal);
                    }, function () {
                        applicationVm.submitting = false;
                        appUtils.hideLoading();
                    });
                } else {
                    return _doSubmit(fal);
                }
            });
        }

        function saveAndClose(form) {
            appUtils.showLoading();
            applicationVm.showInvalid = true;
            if (form.$invalid) {
                appUtils.hideLoading();
                return;
            }
            applicationVm.model.status = 1;
            //Create new an application
            _create(1, true, true);
        }

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
                $('.add-web-app-modal').show();
            }, function () {
                $('.add-web-app-modal').show();
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
                $('.add-web-app-modal').show();
            }, function () {
                $('.add-web-app-modal').show();
            });
        }

        function changeState() {
            // applicationVm.initPopup = false;
            // applicationVm.initSeclectEvent = false;
            // _watchPlan();
            // onChange State auto change Region
        }
        function changeRegion($event) {
            applicationVm.initPopup = false;
            applicationVm.initSeclectEvent = false;
            // set region_code
            var selectedRegion = _.find(applicationVm.regionGroups[applicationVm.model.state], { id: applicationVm.model.region });
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

        //Private Function===============================================================================================
        function _initModal() {
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

            memberShipPlansService.getAll().then(function (data) {
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
            });

            memberShipAddOnsService.getAll().then(function (data) {
                applicationVm.addonItems = data;
                _.each(data, function (item, stateCode) {
                    var groupByRegion = {};
                    _.each(item, function (addOn, addOnId) {
                        if (!groupByRegion[addOn.region_id]) {
                            // groupByRegion[plan.region_id] = [];
                            groupByRegion[addOn.region_id] = {};
                        }
                        // addOn.key = addOnId;
                        // groupByRegion[plan.region_id].push(plan);
                        groupByRegion[addOn.region_id][addOnId] = addOn;
                    });
                    applicationVm.addonItemsIndex[stateCode] = groupByRegion;
                });

            });

            memStateService.getAll().then(function (data) {
                applicationVm.appStatelist = data;
            });

            memRegionService.getAll().then(function (regionGoups) {
                _.each(regionGoups, function (regionGroup, stateCode) {
                    regionGoups[stateCode] = DataUtils.toAFArray(regionGroup);
                });
                applicationVm.regionGroups = regionGoups;

                // console.log(regionGoups);
            });

            memberShipFacilitiesService.itemsLoadOnce().then(function (data) {
                applicationVm.appFacilityItems = data;
            });

            personTitleService.getPrefixs().then(function (data) {
                applicationVm.prefixList = data;
            });

            personTitleService.getSuffixs().then(function (data) {
                applicationVm.suffixList = data;
            });

            _initModel();
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
            applicationVm.showInvalid = false;
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

        function _saveForSubmit(tabStateParam) {
            _create(tabStateParam, false);
        }

        function _create(tabStateParam, redirect, closePupup) {
            //Set app plans for the members
            _setAppPlans();
            if (applicationVm.memberModel) {
                if (!applicationVm.memberModel.secMember) {
                    applicationVm.memberModel.secMember = {};
                }
                if (!applicationVm.memberModel.priMember) {
                    applicationVm.memberModel.priMember = {};
                }
            }

            var stateId = $($('[name="appState"]:visible option:selected')[1]).attr('data-id');
            applicationVm.model.stateId = !stateId ? '0' : stateId;
            applicationVm.model.method = 3;
            applicationVm.model.uid = applicationVm.memberModel.uid = currentUser.$id;
            applicationVm.model.authorName = applicationVm.memberModel.authorName = currentUser.email;
            applicationVm.model.processOnSwiper = 'false';
            applicationVm.model.priority = false;
            applicationVm.model.isVerified = true;
            applicationVm.model.timestampVerified = appUtils.getTimestamp();
            _setAccountSource(applicationVm.model);

            // if($.trim(applicationVm.model.representativeCode) === ''){
            //     applicationVm.model.representativeCode = currentUser.username ? currentUser.username.toUpperCase() : '';
            // }

            //always get lastest promo code.
            memberShipFacilitiesService.get(applicationVm.model.facilityId).then(function (data) {
                if (data && data.facility_promo_code) {
                    // applicationVm.model.facilityCode = data.facility_promo_code;
                }
                //
                _createApp(redirect, tabStateParam);
                if (closePupup) {
                    close();
                }
            }).catch(function () {
                _createApp(redirect, tabStateParam);
                if (closePupup) {
                    close();
                }
            });
        }

        function _createApp(redirect, tabStateParam) {
            appUtils.showLoading();
            memAppService.create(applicationVm.model).then(function (rs) {
                // if(redirect){
                //     $('.modal-backdrop').remove();
                // }
                if (rs.result) {
                    var status = angular.copy(applicationVm.model.status);
                    if (appTrackingObjSubmit !== null) {
                        if (status === 4) {
                            toaster.success("Submit success!");
                        } else {
                            var errMsg = angular.copy(appTrackingObjSubmit.message || '');
                            if (errMsg.length > 200) {
                                errMsg = errMsg.substr(0, 200) + '...';
                            }
                            if (status === 8) {
                                toaster.success(errMsg);
                            } else {
                                toaster.error(errMsg);
                            }
                        }
                    } else {
                        toaster.success("Create new application success!");
                    }
                    //Create membership
                    _createMember(rs.id);
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

                    $scope.addressInvalid = false;
                    $scope.bankAddressInvalid = false;

                    //init model
                    _initModel(true);

                    //Application tracking timeline obj
                    var appTrackingObjCreate = {
                        eventType: appUtils.logEvent.createApp,
                        status: 1
                    };

                    //Create tracking application created 
                    memAppTimeLineService.create(rs.id, appTrackingObjCreate).then(function () {
                        //Create tracking application submitted
                        if (appTrackingObjSubmit !== null) {
                            memAppTimeLineService.create(rs.id, appTrackingObjSubmit).then(function () {
                                if (status === 4) {
                                    memAppVerifyService.create(rs.id).then(function () {
                                        //Create tracking application create membership
                                        var appTrackingVerify = {
                                            eventType: appUtils.logEvent.createMember,
                                            status: status
                                        };

                                        memAppTimeLineService.create(rs.id, appTrackingVerify);
                                    });
                                }
                            });
                        }
                    });
                    //End Create application timeline.

                    if (!tabStateParam) {
                        tabStateParam = -1;
                    }

                    if (redirect) {
                        setTimeout(function () {
                            if ($scope.$parent) {
                                $scope.$parent.itemSelected = rs.$id;
                            }
                            $state.go('membership.editApplication', { id: rs.id, tab: tabStateParam });
                        }, 800);
                    } else {
                        applicationVm.submitting = false;
                        appUtils.hideLoading();
                    }
                } else {
                    appUtils.hideLoading();
                    toaster.error(rs.errorMsg);
                }
            });
        }

        function _createMember(appId) {
            if (!applicationVm.memberModel.apps) {
                applicationVm.memberModel.apps = [];
            }

            applicationVm.memberModel.apps.push(appId);
            applicationVm.memberModel.isActive = applicationVm.model.status === 4 || applicationVm.model.status === 8 ? true : false;
            if (applicationVm.model.numberOfAdults === '1' && applicationVm.memberModel.secMember && applicationVm.memberModel.secMember.memberId) {
                applicationVm.memberModel.secMember.memberId = '';
            }

            memberShipService.create(applicationVm.memberModel).then(function (memRs) {
                if (!memRs.result) {
                    toaster.error('Cannot save membership!');
                } else {
                    //Create application timeline
                    // var appTrackingUpdate = {
                    //     eventType: appUtils.logEvent.editApp,
                    //     status: angular.copy(applicationVm.model.status)
                    // };
                    memAppService.updateMemberShipId(appId, memRs.id);
                    // .then(function(rs){
                    //     if(rs.result){
                    //         appTrackingUpdate.message =   'Updated application information.';
                    //     }else{
                    //         appTrackingUpdate.message = rs && rs.errorMsg || 'Updated application information has error.';
                    //     }
                    // }).catch(function(err){
                    //     appTrackingUpdate.message = err && err.message || 'Updated application information has error.';
                    // }).then(function(){
                    //     appTrackingUpdate.source = 'add.js';
                    //     memAppTimeLineService.create(appId, appTrackingUpdate);
                    // });
                }
            });
        }

        function _doSubmit(appFacility) {
            appUtils.showLoading();
            if (applicationVm.model) {
                var regionId = "", cardType = "", bankAddress = '',
                    paymentMethod = memAppService.getPaymentMethodTxt(applicationVm.model.paymentMethod);
                //
                _setAppPlans();
                regionId = applicationVm.model.region;
                // memRegionService.getIdByState(applicationVm.model.state).then(function (region_id) {
                //     regionId = region_id;
                //     return;
                // })
                $q.when().then(function () {
                    if (applicationVm.model.paymentMethod === '0') {
                        if (!applicationVm.model.creditCard.type) {
                            return appUtils.getCardType2(applicationVm.model.creditCard.creditCardNumber).then(function (cardTypeData) {
                                cardType = cardTypeData;
                                return;
                            });
                        }
                        else {
                            cardType = applicationVm.model.creditCard.type;
                            return $q.when();
                        }
                    } else if (applicationVm.model.paymentMethod === '2' && !_.isEmpty(_.trim(applicationVm.model.check.address))) {
                        bankAddress = applicationVm.model.check.address;
                        if (!_.isEmpty(_.trim(applicationVm.model.check.city))) {
                            bankAddress += ', ' + applicationVm.model.check.city;
                        }

                        if (!_.isEmpty(_.trim(applicationVm.model.check.state))) {
                            bankAddress += ', ' + applicationVm.model.check.state;
                        }

                        if (!_.isEmpty(_.trim(applicationVm.model.check.zipCode))) {
                            bankAddress += ' ' + applicationVm.model.check.zipCode;
                        }
                    }
                }).then(function () {
                    var app = applicationVm.model,
                        memberModel = applicationVm.memberModel,
                        selectedPriAddons = applicationVm.model.selectedAddOns,
                        addonObj = {},
                        addonObjLog = {},
                        index = 0,
                        memberStateId = '';

                    //Get Addons
                    _.forEach(selectedPriAddons, function (addon, key) {
                        addonObj["data_to_submit[plan_addon_addon_id][" + index + "]"] = addon.addon_id;
                        addonObjLog["plan_addon_addon_id_" + index] = addon.addon_id;
                        index++;
                    });

                    //Get stateid
                    var memberState = _.find(applicationVm.appStatelist, function (o) {
                        if (o && o.iso && o.iso == applicationVm.memberModel.priMember.mailingAddress.state) {
                            return true;
                        }
                        return false;
                    });

                    if (memberState && memberState !== null) {
                        memberStateId = memberState.id;
                    }

                    if (app.waivedSetupFee === undefined) {
                        app.waivedSetupFee = false;
                    }

                    var employeeId = currentUser && currentUser.externalId ? currentUser.externalId : '',
                        repCode = $.trim(applicationVm.model.representativeCode) ? applicationVm.model.representativeCode : currentUser.username.toUpperCase(),
                        saleRep = applicationVm.model.saleRep, //currentUser ? currentUser.firstName + ' ' + currentUser.lastName : '',
                        isDividual = applicationVm.model.numberOfAdults == '1',
                        // promoCode = appFacility && appFacility.facility_promo_code ? appFacility.facility_promo_code : '',
                        promoCode = app.facilityCode || '',
                        facilityGuid = appFacility && appFacility.facility_affiliate_guid ? appFacility.facility_affiliate_guid : '';

                    var memberAddressPhone = memberModel.priMember && memberModel.priMember.phone && appUtils.formatPhoneNumber(memberModel.priMember.phone) || null,
                        secondaryMemberAddressPhone = memberModel.secMember && memberModel.secMember.phone && appUtils.formatPhoneNumber(memberModel.secMember.phone) || null;

                    var data = {
                        "request": "submitSignup",
                        //"data_to_submit[plan_addon_addon_id]" : addonIds,
                        "data_to_submit[process_payments]": applicationVm.model.processPayment ? '1' : '0', //appSettings.TLSAPIProcessPayments,
                        "data_to_submit[account_region_id]": regionId,
                        "data_to_submit[number_of_adults]": app.numberOfAdults,
                        "data_to_submit[account_cycle_id]": app.cycle,
                        "data_to_submit[plan_type]": app.regionCode == 'sec' ? 'security' : app.regionCode,
                        // "data_to_submit[plan_provider_id]": app.selectedPlans.plan_id,
                        // "data_to_submit[plan_provider_id]": app.selectedPlans.plan_provider_id,
                        "data_to_submit[active_retired_leo]": app.regionCode !== 'leo' ? appSettings.activeRetiredLEO : app.activeRetiredLEO,
                        "data_to_submit[member_shadow_name_prefix]": memberModel && memberModel.priMember && memberModel.priMember.prefix || "",
                        "data_to_submit[member_shadow_name_suffix]": memberModel && memberModel.priMember && memberModel.priMember.suffix || "",
                        "data_to_submit[member_shadow_firstname]": !memberModel.priMember || !memberModel.priMember.firstName || memberModel.priMember === null ? "" : memberModel.priMember.firstName,
                        "data_to_submit[member_shadow_lastname]": !memberModel.priMember || !memberModel.priMember.lastName || memberModel.priMember === null ? "" : memberModel.priMember.lastName,
                        "data_to_submit[member_shadow_email]": !memberModel.priMember || !memberModel.priMember.email || memberModel.priMember === null ? "" : memberModel.priMember.email,
                        // "data_to_submit[member_address_phone_type]":"mobile",
                        // "data_to_submit[member_address_phone]":!memberModel.priMember || !memberModel.priMember.phone || memberModel.priMember === null ? "" : memberModel.priMember.phone,
                        // "data_to_submit[member_address_phone]": memberAddressPhone,
                        "data_to_submit[member_address_phone_mobile]": memberAddressPhone,
                        "data_to_submit[member_address_phone_home]": "",
                        "data_to_submit[member_address_phone_work]": "",
                        "data_to_submit[member_address_street_1]": !memberModel.priMember || !memberModel.priMember.mailingAddress || !memberModel.priMember.mailingAddress.address || memberModel.priMember === null ? "" : memberModel.priMember.mailingAddress.address,
                        "data_to_submit[member_address_street_2]": "",
                        "data_to_submit[member_address_country_id]": 223,
                        "data_to_submit[member_address_city_name]": !memberModel.priMember || !memberModel.priMember.mailingAddress || !memberModel.priMember.mailingAddress.city || memberModel.priMember === null ? "" : memberModel.priMember.mailingAddress.city,
                        "data_to_submit[member_address_state_id]": memberStateId || '',
                        "data_to_submit[member_address_postcode]": !memberModel.priMember || !memberModel.priMember.mailingAddress || !memberModel.priMember.mailingAddress.zipCode || memberModel.priMember === null ? "" : memberModel.priMember.mailingAddress.zipCode,
                        "data_to_submit[secondary_member_shadow_name_prefix]": !isDividual && memberModel && memberModel.secMember && memberModel.secMember.prefix || "",
                        "data_to_submit[secondary_member_shadow_name_suffix]": !isDividual && memberModel && memberModel.secMember && memberModel.secMember.suffix || "",
                        "data_to_submit[secondary_member_shadow_firstname]": isDividual || !memberModel.secMember || !memberModel.secMember.firstName || memberModel.secMember === null ? "" : memberModel.secMember.firstName,
                        "data_to_submit[secondary_member_shadow_lastname]": isDividual || !memberModel.secMember || !memberModel.secMember.lastName || memberModel.secMember === null ? "" : memberModel.secMember.lastName,
                        "data_to_submit[secondary_member_shadow_email]": isDividual || !memberModel.secMember || !memberModel.secMember.email || memberModel.secMember === null ? "" : memberModel.secMember.email,
                        "data_to_submit[secondary_member_address_phone_mobile]": secondaryMemberAddressPhone,
                        "data_to_submit[secondary_member_address_phone_home]": "",
                        "data_to_submit[secondary_member_address_phone_work]": "",
                        "data_to_submit[promo_code]": promoCode || '',
                        "data_to_submit[account_order_domain]": "https://www.texaslawshield.com",
                        "data_to_submit[facility_affiliate_guid]": facilityGuid,
                        "data_to_submit[account_affiliate_campaign]": "",
                        "data_to_submit[account_affiliate_banner_id]": "",
                        "data_to_submit[link]": "",
                        "data_to_submit[refid]": "",
                        "data_to_submit[payment_select_ccOrcheck]": paymentMethod,
                        "data_to_submit[employee_id]": employeeId,
                        "data_to_submit[primary_member_number]": !memberModel.priMember || memberModel.priMember === null || !memberModel.priMember.memberId ? "" : memberModel.priMember.memberId,
                        "data_to_submit[secondary_member_number]": isDividual || !memberModel.secMember || memberModel.secMember === null || !memberModel.secMember.memberId ? "" : memberModel.secMember.memberId,
                        "data_to_submit[source]": appSettings.TLSAPISourceForWeb,
                        "data_to_submit[test_mode]": appSettings.TLSAPITestMode ? "On" : "Off",
                        "data_to_submit[rep_code]": repCode,
                        "data_to_submit[sales_rep]": saleRep,
                        "data_to_submit[apply_setup_fee]": app.waivedSetupFee ? '0' : '1',
                        "data_to_submit[force_billing_required]": applicationVm.model.paymentOverwrite ? '1' : '0',
                        "data_to_submit[signature_date]": applicationVm.model.signatureDate,
                        "token": (currentUser && currentUser.tlsApiToken) || 'T3MPC@rdFl1ght666',
                        "data_to_submit[account_profile_department]": app.regionCode == 'leo' && app.agencyName || '',
                        "data_to_submit[account_source]": app.regionCode !== 'sec' && applicationVm.accountSource || ''
                    };

                    if (paymentMethod === 'Cash') {
                        applicationVm.model.cashAmount = applicationVm.model.cashOption === 'TakeCredit' ? applicationVm.model.cashInput || 0 : applicationVm.model.total.totalAmount || 0;
                        var cashAmount = angular.copy(applicationVm.model.cashAmount);
                        var dataCash = {
                            "data_to_submit[zuora_cc_name]": "",
                            "data_to_submit[zuora_cc_billing_address]": !memberModel.priMember || !memberModel.priMember.mailingAddress || !memberModel.priMember.mailingAddress.address || memberModel.priMember === null ? "" : memberModel.priMember.mailingAddress.address,
                            "data_to_submit[zuora_cc_billing_city]": !memberModel.priMember || !memberModel.priMember.mailingAddress || !memberModel.priMember.mailingAddress.city || memberModel.priMember === null ? "" : memberModel.priMember.mailingAddress.city,
                            "data_to_submit[zuora_cc_billing_state]": memberStateId || '',
                            "data_to_submit[zuora_cc_billing_zip]": !memberModel.priMember || !memberModel.priMember.mailingAddress || !memberModel.priMember.mailingAddress.zipCode || memberModel.priMember === null ? "" : memberModel.priMember.mailingAddress.zipCode,
                            "data_to_submit[zuora_cc_card_number]": "",
                            "data_to_submit[zuora_cc_type]": "",
                            "data_to_submit[zuora_cc_exp_month]": "",
                            "data_to_submit[zuora_cc_exp_year]": "",
                            "data_to_submit[zuora_cc_cvv]": "",
                            "data_to_submit[payment_bank_routing_num]": "",
                            "data_to_submit[payment_bank_account_num]": "",
                            "data_to_submit[payment_bank_address]": "",
                            "data_to_submit[payment_bank_name]": "",
                            "data_to_submit[payment_bank_type]": "",
                            "data_to_submit[payment_bank_full_name]": "",
                            "data_to_submit[cash_amount]": cashAmount
                        };
                        angular.extend(data, dataCash);
                    } else if (paymentMethod === "Credit") {
                        var dataCard = {
                            "data_to_submit[zuora_cc_name]": "",
                            "data_to_submit[zuora_cc_billing_address]": "",
                            "data_to_submit[zuora_cc_billing_city]": "",
                            "data_to_submit[zuora_cc_billing_state]": "",
                            "data_to_submit[zuora_cc_billing_zip]": "",
                            "data_to_submit[zuora_cc_card_number]": "",
                            "data_to_submit[zuora_cc_type]": "",
                            "data_to_submit[zuora_cc_exp_month]": "",
                            "data_to_submit[zuora_cc_exp_year]": "",
                            "data_to_submit[zuora_cc_cvv]": "",
                            "data_to_submit[payment_bank_routing_num]": "",
                            "data_to_submit[payment_bank_account_num]": "",
                            "data_to_submit[payment_bank_address]": "",
                            "data_to_submit[payment_bank_name]": "",
                            "data_to_submit[payment_bank_type]": "",
                            "data_to_submit[payment_bank_full_name]": "",
                        };
                        // var dataCard = {
                        //     "data_to_submit[zuora_cc_name]": (app.creditCard.name && app.creditCard.name !== '') ? app.creditCard.name : (memberModel.priMember === null ? "" : memberModel.priMember.firstName) + " " + (memberModel.priMember === null ? "" : memberModel.priMember.lastName),
                        //     "data_to_submit[zuora_cc_billing_address]": !memberModel.priMember || !memberModel.priMember.mailingAddress || !memberModel.priMember.mailingAddress.address || memberModel.priMember === null ? "" : memberModel.priMember.mailingAddress.address,
                        //     "data_to_submit[zuora_cc_billing_city]": !memberModel.priMember || !memberModel.priMember.mailingAddress || !memberModel.priMember.mailingAddress.city || memberModel.priMember === null ? "" : memberModel.priMember.mailingAddress.city,
                        //     "data_to_submit[zuora_cc_billing_state]": memberStateId || '',
                        //     "data_to_submit[zuora_cc_billing_zip]": !memberModel.priMember || !memberModel.priMember.mailingAddress || !memberModel.priMember.mailingAddress.zipCode || memberModel.priMember === null ? "" : memberModel.priMember.mailingAddress.zipCode,
                        //     "data_to_submit[zuora_cc_card_number]": !app.creditCard || !app.creditCard.creditCardNumber || app.creditCard === null ? "" : app.creditCard.creditCardNumber,
                        //     "data_to_submit[zuora_cc_type]": cardType,
                        //     "data_to_submit[zuora_cc_exp_month]": !app.creditCard || !app.creditCard.month || app.creditCard === null ? "" : app.creditCard.month,
                        //     "data_to_submit[zuora_cc_exp_year]": !app.creditCard || !app.creditCard.year || app.creditCard === null ? "" : app.creditCard.year,
                        //     "data_to_submit[zuora_cc_cvv]": !app.creditCard || !app.creditCard.cvv || app.creditCard === null ? "" : app.creditCard.cvv,
                        //     "data_to_submit[payment_bank_routing_num]": "",
                        //     "data_to_submit[payment_bank_account_num]": "",
                        //     "data_to_submit[payment_bank_address]": "",
                        //     "data_to_submit[payment_bank_name]": "",
                        //     "data_to_submit[payment_bank_type]": "",
                        //     "data_to_submit[payment_bank_full_name]": "",
                        // };

                        if (applicationVm.model.processPayment) {
                            angular.extend(dataCard, {
                                "data_to_submit[zuora_cc_name]": (app.creditCard.name && app.creditCard.name !== '') ? app.creditCard.name : (memberModel.priMember === null ? "" : memberModel.priMember.firstName) + " " + (memberModel.priMember === null ? "" : memberModel.priMember.lastName),
                                "data_to_submit[zuora_cc_billing_address]": !memberModel.priMember || !memberModel.priMember.mailingAddress || !memberModel.priMember.mailingAddress.address || memberModel.priMember === null ? "" : memberModel.priMember.mailingAddress.address,
                                "data_to_submit[zuora_cc_billing_city]": !memberModel.priMember || !memberModel.priMember.mailingAddress || !memberModel.priMember.mailingAddress.city || memberModel.priMember === null ? "" : memberModel.priMember.mailingAddress.city,
                                "data_to_submit[zuora_cc_billing_state]": memberStateId || '',
                                "data_to_submit[zuora_cc_billing_zip]": !memberModel.priMember || !memberModel.priMember.mailingAddress || !memberModel.priMember.mailingAddress.zipCode || memberModel.priMember === null ? "" : memberModel.priMember.mailingAddress.zipCode,
                                "data_to_submit[zuora_cc_card_number]": !app.creditCard || !app.creditCard.creditCardNumber || app.creditCard === null ? "" : app.creditCard.creditCardNumber,
                                "data_to_submit[zuora_cc_type]": cardType,
                                "data_to_submit[zuora_cc_exp_month]": !app.creditCard || !app.creditCard.month || app.creditCard === null ? "" : app.creditCard.month,
                                "data_to_submit[zuora_cc_exp_year]": !app.creditCard || !app.creditCard.year || app.creditCard === null ? "" : app.creditCard.year,
                                "data_to_submit[zuora_cc_cvv]": '' //Change Request #21 !app.creditCard || !app.creditCard.cvv || app.creditCard === null ? "" : app.creditCard.cvv,
                            });
                        }

                        angular.extend(data, dataCard);
                    } else {
                        var dataCheck = {
                            "data_to_submit[zuora_cc_name]": "",
                            "data_to_submit[zuora_cc_billing_address]": "",
                            "data_to_submit[zuora_cc_billing_city]": "",
                            "data_to_submit[zuora_cc_billing_state]": "",
                            "data_to_submit[zuora_cc_billing_zip]": "",
                            "data_to_submit[zuora_cc_card_number]": "",
                            "data_to_submit[zuora_cc_type]": "",
                            "data_to_submit[zuora_cc_exp_month]": "",
                            "data_to_submit[zuora_cc_exp_year]": "",
                            "data_to_submit[zuora_cc_cvv]": "",
                            "data_to_submit[payment_bank_routing_num]": "",
                            "data_to_submit[payment_bank_account_num]": "",
                            "data_to_submit[payment_bank_address]": "",
                            "data_to_submit[payment_bank_name]": "",
                            "data_to_submit[payment_bank_type]": "",
                            "data_to_submit[payment_bank_full_name]": "",
                        };
                        // var dataCheck = {
                        //     "data_to_submit[zuora_cc_name]": !memberModel.priMember || !memberModel.priMember.firstName || !memberModel.priMember.lastName || memberModel.priMember === null ? "" : memberModel.priMember.firstName + " " + memberModel.priMember.lastName,
                        //     "data_to_submit[zuora_cc_billing_address]": !memberModel.priMember || !memberModel.priMember.mailingAddress || !memberModel.priMember.mailingAddress.address || memberModel.priMember === null ? "" : memberModel.priMember.mailingAddress.address,
                        //     "data_to_submit[zuora_cc_billing_city]": !memberModel.priMember || !memberModel.priMember.mailingAddress || !memberModel.priMember.mailingAddress.city || memberModel.priMember === null ? "" : memberModel.priMember.mailingAddress.city,
                        //     "data_to_submit[zuora_cc_billing_state]": memberStateId || '',
                        //     "data_to_submit[zuora_cc_billing_zip]": !memberModel.priMember || !memberModel.priMember.mailingAddress || !memberModel.priMember.mailingAddress.zipCode || memberModel.priMember === null ? "" : memberModel.priMember.mailingAddress.zipCode,
                        //     "data_to_submit[zuora_cc_card_number]": "",
                        //     "data_to_submit[zuora_cc_type]": "",
                        //     "data_to_submit[zuora_cc_exp_month]": "",
                        //     "data_to_submit[zuora_cc_exp_year]": "",
                        //     "data_to_submit[zuora_cc_cvv]": "",
                        //     "data_to_submit[payment_bank_routing_num]": !app.check || !app.check.routingNumber || app.check === null ? "" : app.check.routingNumber,
                        //     "data_to_submit[payment_bank_account_num]": !app.check || !app.check.accountNumber || app.check === null ? "" : app.check.accountNumber,
                        //     "data_to_submit[payment_bank_address]": bankAddress,
                        //     "data_to_submit[payment_bank_name]": !app.check || !app.check.name || app.check === null ? "" : app.check.name,
                        //     "data_to_submit[payment_bank_type]": !app.check || !app.check.type || app.check === null ? "" : app.check.type,
                        //     "data_to_submit[payment_bank_full_name]": !app.check || !app.check.fullName || app.check === null ? "" : app.check.fullName
                        // };

                        if (applicationVm.model.processPayment) {
                            angular.extend(dataCheck, {
                                "data_to_submit[zuora_cc_name]": !memberModel.priMember || !memberModel.priMember.firstName || !memberModel.priMember.lastName || memberModel.priMember === null ? "" : memberModel.priMember.firstName + " " + memberModel.priMember.lastName,
                                "data_to_submit[zuora_cc_billing_address]": !memberModel.priMember || !memberModel.priMember.mailingAddress || !memberModel.priMember.mailingAddress.address || memberModel.priMember === null ? "" : memberModel.priMember.mailingAddress.address,
                                "data_to_submit[zuora_cc_billing_city]": !memberModel.priMember || !memberModel.priMember.mailingAddress || !memberModel.priMember.mailingAddress.city || memberModel.priMember === null ? "" : memberModel.priMember.mailingAddress.city,
                                "data_to_submit[zuora_cc_billing_state]": memberStateId || '',
                                "data_to_submit[zuora_cc_billing_zip]": !memberModel.priMember || !memberModel.priMember.mailingAddress || !memberModel.priMember.mailingAddress.zipCode || memberModel.priMember === null ? "" : memberModel.priMember.mailingAddress.zipCode,
                                "data_to_submit[payment_bank_routing_num]": !app.check || !app.check.routingNumber || app.check === null ? "" : app.check.routingNumber,
                                "data_to_submit[payment_bank_account_num]": !app.check || !app.check.accountNumber || app.check === null ? "" : app.check.accountNumber,
                                "data_to_submit[payment_bank_address]": bankAddress,
                                "data_to_submit[payment_bank_name]": !app.check || !app.check.name || app.check === null ? "" : app.check.name,
                                "data_to_submit[payment_bank_type]": !app.check || !app.check.type || app.check === null ? "" : app.check.type,
                                "data_to_submit[payment_bank_full_name]": !app.check || !app.check.fullName || app.check === null ? "" : app.check.fullName
                            });
                        }

                        angular.extend(data, dataCheck);
                    }

                    var target = _.extend(addonObj, data);

                    applicationVm.model.errorMessage = '';

                    //Application tracking timeline obj
                    appTrackingObjSubmit = {
                        eventType: appUtils.logEvent.submitApp
                    };

                    $http({
                        method: 'POST',
                        url: appSettings.TLSAPIUrl,
                        data: $.param(target),
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        logParams: {
                            name: 'Web_Create_DoSubmitTLSParams',
                            user: currentUser.username
                        }
                    }).then(function (result) {
                        var isDividual = applicationVm.model.numberOfAdults == '1';
                        if (appSettings.TLSAPITestMode || (result && result.data && result.data.success)) {
                            applicationVm.model.status = 4;
                            if (result.data.payment_success === false || applicationVm.model.processPayment === false) {
                                // if(result.data.payment_status = "Billing Required"){
                                applicationVm.model.status = 8;// billing required
                                appTrackingObjSubmit.message = "Submitted success, but can’t do billing now.";
                                // }
                            }

                            //Application tracking timeline obj
                            appTrackingObjSubmit.status = applicationVm.model.status;
                            appTrackingObjSubmit.submitResult = 'Success';

                            if (applicationVm.model.creditCard) {
                                var cvv = applicationVm.model.creditCard.cvv;
                                var cardNumber = applicationVm.model.creditCard.creditCardNumber;
                                applicationVm.model.creditCard.cvv = cvv.replace(/[^A-Z]/g, '*');
                                applicationVm.model.creditCard.creditCardNumber = cardNumber.substring(0, cardNumber.length - 4).replace(/[^A-Z]/g, '*') + cardNumber.substring(cardNumber.length - 4, cardNumber.length);
                                if (cardType) {
                                    applicationVm.model.creditCard.type = cardType;
                                }
                            }

                            if (applicationVm.model.check) {
                                var routingNumber = applicationVm.model.check.routingNumber;
                                var accountNumber = applicationVm.model.check.accountNumber;
                                applicationVm.model.check.routingNumber = routingNumber.substring(0, routingNumber.length - 4).replace(/[^A-Z]/g, '*') + routingNumber.substring(routingNumber.length - 4, routingNumber.length);
                                applicationVm.model.check.accountNumber = accountNumber.substring(0, accountNumber.length - 4).replace(/[^A-Z]/g, '*') + accountNumber.substring(accountNumber.length - 4, accountNumber.length);
                            }

                            if (result.data.signupAccountId) {
                                applicationVm.memberModel.accountId = result.data.signupAccountId;
                            }

                            applicationVm.model.isLocked = true;
                            _saveForSubmit(4);
                        } else {
                            appUtils.hideLoading();
                            var msg = 'Submit failed!';
                            if (result && result.data && result.data.message !== '') {
                                msg = applicationVm.model.errorMessage = 'TLS API: ' + result.data.message;
                                // if(msg.indexOf('INVALID_VALUE') != -1){
                                //     msg = 'Submit failed! Please verify this application info.';
                                // }else
                                // if(msg.indexOf('Invalid Account Number') != -1){
                                //     msg = 'Submit failed! Invalid account number.';
                                // }else
                                // if(msg.indexOf('Account Number Does Not Match Payment') != -1){
                                //     msg = 'Submit failed! Account number does not match payment.';
                                // }
                            }
                            applicationVm.model.status = appTrackingObjSubmit.status = 3;
                            applicationVm.model.isLocked = true;

                            ///Application tracking timeline obj
                            appTrackingObjSubmit.submitResult = 'Failed';
                            appTrackingObjSubmit.message = msg;

                            $ngBootbox.alert(msg).then(function () {
                                _saveForSubmit(3);
                            });
                        }
                    }).catch(function (err) {
                        console.log('do submit err');
                        console.log(err);
                        appUtils.hideLoading();
                        var msg = 'Submit failed!';
                        msg = applicationVm.model.errorMessage = appTrackingObjSubmit.message = 'TLS API: ' + msg;
                        applicationVm.model.status = appTrackingObjSubmit.status = 3;
                        applicationVm.model.isLocked = true;

                        //Application tracking timeline obj
                        appTrackingObjSubmit.submitResult = 'Failed';

                        $ngBootbox.alert(msg).then(function () {
                            _saveForSubmit(3);
                        });
                    });
                });
            }
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
            var appForm = $('#add-web-app');
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
            var priPlans = $('#add-web-app .pri-app-plans input[type="checkbox"]:enabled:visible');
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

                // var stateAddons = _.find(applicationVm.addonItems, function (o) {
                //     return o.$id == applicationVm.model.state;
                // });
                // var planNum = parseInt(applicationVm.model.cycle);
                // var arrAddons = [];
                // _.forEach(stateAddons, function (o, key) {
                //     /* jshint ignore:start */
                //     if (o !== null && o.cycle_id !== null && o.cycle_id == planNum) {
                //         o.key = key;
                //         if (applicationVm.model.numberOfAdults == '1') {
                //             if ((o.rate_name && o.rate_name !== '' &&
                //                 (o.rate_name.toLowerCase().indexOf('spouse') != -1) || o.rate_name.toLowerCase().indexOf('partner') != -1) || (o.sku && o.sku !== '' &&
                //                     (o.sku.toLowerCase().indexOf('spouse') != -1) || o.sku.toLowerCase().indexOf('partner') != -1)) {

                //             } else {
                //                 arrAddons.push(o);
                //             }
                //         } else {
                //             arrAddons.push(o);
                //         }
                //     }
                //     /* jshint ignore:end */
                // });
                // applicationVm.stateAddons = arrAddons;
                // applicationVm.model.total.setupFee = appUtils.formatNumber(planItem.setup_price);
                // if (planItem.name.toLowerCase().indexOf('couple') != -1) {
                //     applicationVm.secPlanKey = key;
                // } else {
                //     applicationVm.secPlanKey = '';
                // }

                // _calculateTotal();//Calculate total amount
                // setTimeout(function () {
                //     _initAddonCheckboxes();//Init addon checboxes
                // }, 1000);
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
            var form = $('#add-web-app');
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
            var appForm = $('#add-web-app'),
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

            /* jshint ignore:start */
            // var appPlan = _.find(statePlans, function (o, key) {
            //     if (o !== null && !angular.isUndefined(o["cycle_id"]) && o["cycle_id"] == applicationVm.model.cycle && numberOfAdult &&
            //         (
            //             (o["name"] !== '' && o["name"].toLowerCase().indexOf(numberOfAdult.value.toLowerCase()) != -1) ||
            //             (o["sku"] !== '' && o["sku"].indexOf(numberOfAdult.value.toLowerCase()) != -1)
            //         )) {
            //         o.key = key;
            //         return true;
            //     } else {
            //         return false;
            //     }
            // });

            // if (!angular.isUndefined(appPlan)) {
            //     applicationVm.coreplan = appPlan.key;
            //     _selectPriPlan(appPlan.key, appPlan);
            // }
            /* jshint ignore:end */
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

        function _setAccountSource(model) {
            if (model.regionCode === 'sec') {
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

        // applicationVm.selectFacility = function(item){
        //     if(item){
        //         applicationVm.facilityKeyWord = item.name;
        //         applicationVm.model.facilityCode = item.$id;
        //         applicationVm.searchedFacilities = [];
        //     }else{
        //         setTimeout(function() {
        //             applicationVm.searchedFacilities = [];
        //         }, 500);
        //     }
        // };
    }
})();