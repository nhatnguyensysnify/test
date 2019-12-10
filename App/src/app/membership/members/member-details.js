(function () {
    'use strict';

    angular.module('app.membership')
        .controller('MemberDetailsCtrl', MemberDetailsCtrl);

    /** @ngInject */
    function MemberDetailsCtrl($rootScope, $scope, $http, $state, $timeout, $stateParams, $ngBootbox, authService, memStateService, memberShipService, memAppService, appUtils, toaster, memAppTimeLineService, employeeService, permissionService, memberShipFacilitiesService, $q, memRegionService) {
        $rootScope.settings.layout.showSmartphone = false;
        $rootScope.settings.layout.pageSidebarClosed = true;
        $scope.userPermission = $rootScope.storage.statePermission;
        $scope.userPermission.isAccessPermission = $rootScope.can('access', 'ViewApplicationImages');

        var currentUser = authService.getCurrentUser(); //$rootScope.storage.currentUser;
        var appSettings = $rootScope.storage.appSettings;
        //var curUserRoles = currentUser.userRoles;
        var membershipVm = this; //
        //
        $scope.appPaymentMethodList = appUtils.appPaymentMethods;
        $scope.appStatus = appUtils.appStatus;
        $scope.states = [];

        //Form variables
        $scope.showInvalid = true;
        $scope.showInvalidPayment = true;
        $scope.emailRegx = /^[^!'"\/ ]+$/;
        $scope.zipcodeRegx = /(^\d{5}$)|(^\d{5}-\d{4}$)/;
        $scope.nameRegx = /^(a-z|A-Z|0-9)*[^!#$%^&*()'"\/\\;:@=+,?\[\]\/]*$/;
        $scope.addressRegx = /^(a-z|A-Z|0-9)*[^!$%^&*()'"\/\\;:@=+,?\[\]]*$/;
        $scope.monthRegx = /(0[1-9])|(1[012])/;
        $scope.yearRegx = /^(201d|2100)$/;
        membershipVm.dataLetterPic = 'M';

        //Membership Information
        var membershipId = $stateParams.id || '';
        membershipVm.membership = {};
        membershipVm.primaryMember = {
            memberId: '',
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
        membershipVm.secondMember = {
            memberId: '',
            firstName: '',
            lastName: '',
            email: '',
            phone: ''
        };

        //Common Variables
        //$scope.statePlans = {};
        //$scope.secPlanKey = '';
        membershipVm.applicationModel = {};
        membershipVm.currentFiles = null;
        membershipVm.isSeccondMem = false;
        initPage();
        $scope.getState = getState;
        $scope.dowloadApplicationImage = dowloadApplicationImage;
        $scope.refreshStatus = refreshStatus;
        $scope.cancel = cancel;
        $scope.goToApplication = goToApplication;
        $scope.getCashOptionTxt = getCashOptionTxt;
        $scope.cancelAccount = cancelAccount;
        $scope.selectedRegion = {};
        //Functions=============================================================================
        function initPage() {
            memStateService.statesLoadOnce().then(function (data) {
                $scope.states = data;
            });

            if (membershipId !== '') {
                loadMembershipInfo();
            }
        }

        function loadMembershipInfo() {
            appUtils.showLoading();
            memberShipService.getWithLoad(membershipId).then(function (mem) {
                appUtils.hideLoading();
                if (mem) {
                    membershipVm.membership = mem;
                    if (mem.priMember) {
                        membershipVm.primaryMember = angular.extend(membershipVm.primaryMember, mem.priMember);
                        membershipVm.primaryMember.accountId = mem.accountId ? mem.accountId : '';
                        membershipVm.dataLetterPic = mem.priMember.firstName.charAt(0).toUpperCase() + mem.priMember.lastName.charAt(0).toUpperCase();
                    }

                    if (mem.secMember) {
                        membershipVm.secondMember = angular.extend(membershipVm.secondMember, mem.secMember);
                    }

                    if (mem && mem.apps) {
                        var appId = angular.copy(mem.apps[mem.apps.length - 1]);
                        memAppService.getById(appId).then(function (data) {
                            if (data) {
                                membershipVm.applicationModel = data;
                                if (!membershipVm.applicationModel.cashInput) {
                                    membershipVm.applicationModel.cashInput = angular.copy(membershipVm.applicationModel.cashAmount || 0);
                                }
                                membershipVm.isSeccondMem = data.numberOfAdults && data.numberOfAdults == '2';

                                if (membershipVm.applicationModel.processPayment === undefined) {
                                    membershipVm.applicationModel.processPayment = true;
                                }

                                //Get application images OCR
                                if (data.physicalFiles && data.physicalFiles.length > 0) {
                                    var fileData = _.find(data.physicalFiles, function (file) {
                                        return file.isSelected === true && file.processPath && file.processPath !== '';
                                    });

                                    $scope.currentFiles = fileData || null;
                                }

                                membershipVm.saleRep = data.saleRep || '';

                                //Get employee full name
                                employeeService.getUserByRepCode(data.representativeCode).then(function (user) {
                                    if (user) {
                                        if (_.trim(membershipVm.saleRep) === '') {
                                            membershipVm.saleRep = user.firstName + ' ' + user.lastName;
                                        }
                                    }
                                });

                                //Get employee facility name
                                memberShipFacilitiesService.get(data.facilityId).then(function (facility) {
                                    if (facility)
                                        $scope.facilityName = facility.name;
                                });

                                formatPayment(membershipVm.applicationModel);

                                // load Region
                                memRegionService.getRegion(data.state, data.region).then(function(region){
                                    console.log('region', region);

                                    $scope.selectedRegion = region;
                                });
                                $timeout(angular.noop, 400);
                            }

                        });
                    }

                    

                    $timeout(angular.noop, 400);
                }
            });
        }

        function formatPayment(application) {
            if (application.paymentMethod === '0' || parseInt(application.paymentMethod) === 0) { //Credit
                var cvv = application.creditCard.cvv;
                var cardNumber = application.creditCard.creditCardNumber;
                application.creditCard.cvv = cvv.replace(/[^A-Z]/g, '*');
                application.creditCard.creditCardNumber = cardNumber.substring(0, cardNumber.length - 4).replace(/[^A-Z]/g, '*') + cardNumber.substring(cardNumber.length - 4, cardNumber.length);
                if (application.creditCard.name === '') {
                    application.creditCard.name = membershipVm.primaryMember.firstName + ' ' + $scope.primaryMember.lastName;
                }
            } else if (application.paymentMethod == '1' || parseInt(application.paymentMethod) === 1) { //Cash
                $scope.cashChange = parseFloat(application.cashInput - (application.total.totalAmount || 0));
            } else { //Check
                var routingNumber = application.check.routingNumber;
                var accountNumber = application.check.accountNumber;
                application.check.routingNumber = routingNumber.substring(0, routingNumber.length - 4).replace(/[^A-Z]/g, '*') + routingNumber.substring(routingNumber.length - 4, routingNumber.length);
                application.check.accountNumber = accountNumber.substring(0, accountNumber.length - 4).replace(/[^A-Z]/g, '*') + accountNumber.substring(accountNumber.length - 4, accountNumber.length);
                if (!application.check.address)
                    application.check.address = '';
                if (!application.check.city)
                    application.check.city = '';
                if (!application.check.state)
                    application.check.state = '';
                if (!application.check.zipCode)
                    application.check.zipCode = '';
                if (!application.check.type)
                    application.check.type = 'BusinessChecking';
                if (!application.check.name)
                    application.check.name = '';
                if (!application.check.fullName)
                    application.check.fullName = '';
            }
        }

        function getState(key) {
            var state = _.find($scope.states, function (item) {
                return item.iso === key;
            });

            return state ? state.name : 'Unknow';
        }

        function dowloadApplicationImage() {
            var fileData = $scope.currentFiles;
            if (fileData && fileData.processPath && fileData.processPath !== '') {
                var gsReference = firebase.storage().refFromURL(fileData.processPath);
                firebase.storage().ref().child(gsReference.fullPath).getDownloadURL().then(function (url) {
                    $rootScope.downloadImage(url);
                }).catch(function (error) {
                    toaster.error(error.message);
                    return '';
                });
            }
        }

        function cancel() {
            $state.go('membership.members');
        }

        function goToApplication() {
            $state.go('membership.editApplication', { id: membershipVm.applicationModel.$id, 'tab': membershipVm.applicationModel.status, 'keyword': '', 'start': '', 'end': '', 'page': 0, 'author': membershipVm.applicationModel.representativeCode, 'state': membershipVm.applicationModel.state, 'plantype': membershipVm.applicationModel.region,'reportBy': 'timestampCreated', 'sortBy': 'desc' });
        }

        function getCashOptionTxt(application) {
            return appUtils.getCashOptionTxt(application);
        }

        function refreshStatus() {
            appUtils.showLoading();
            var app = membershipVm.applicationModel;
            var memberModel = membershipVm.membership;
            // if (!memberModel || !memberModel.accountId || memberModel.accountId === '') {
            //     appUtils.hideLoading();
            //     return false;
            // }
            var priEmail = memberModel && memberModel.priMember && memberModel.priMember.email,
                hasAccId = memberModel.accountId && _.trim(memberModel.accountId) !== '';
            var data = {
                "action": "getMembershipProfile",
                "data_to_submit[Email]": !hasAccId ? priEmail : "",
                "data_to_submit[Username]": "",
                "data_to_submit[isprimary]": "1",
                "data_to_submit[issecondary]": "",
                "data_to_submit[signupAccountId]": !hasAccId ? "" : memberModel.accountId,
                "data_to_submit[source]": appSettings.TLSAPISource,
                "request": "TLS_API",
                "token": (currentUser && currentUser.tlsApiToken) || 'T3MPC@rdFl1ght666'
            };

            //Application tracking timeline obj
            var appTrackingObjRefresh = {
                eventType: appUtils.logEvent.refreshApp
            };

            $http({
                method: 'POST',
                url: appSettings.TLSAPIUrl,
                data: $.param(data),
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                logParams: {
                    user: currentUser.username,
                    name: 'Web_RefreshStatus'
                }
            }).then(function (result) {
                appUtils.hideLoading();
                if (result && result.data) {
                    if (result.data.code === 401 || result.data.code === 500 || result.data.code === 400) {
                        toaster.error(result.data.message);
                        appTrackingObjRefresh.submitResult = 'Failed';
                        appTrackingObjRefresh.message = result.data.message;
                        $ngBootbox.confirm('Membership status from TLS API is failed. Do you want to update this status in SmartAdmin?').then(function () {
                            appUtils.showLoading();
                            membershipVm.membership.isActive = false;
                            refreshUpdate(membershipVm.membership.isActive, appTrackingObjRefresh);
                        }, function () {
                            appUtils.hideLoading();
                        });
                    } else if (result.data.success && result.data.AccountStatus !== '' && result.data.AccountStatus.toLowerCase() == 'approved') {
                        membershipVm.membership.isActive = true;
                        appTrackingObjRefresh.submitResult = 'Success';
                        refreshUpdate(membershipVm.membership.isActive, appTrackingObjRefresh);
                    } else {
                        appTrackingObjRefresh.submitResult = 'Failed';
                        appTrackingObjRefresh.message = 'This application has not been approved!';
                        $ngBootbox.confirm('Membership status from TLS API is failed. Do you want to update this status in SmartAdmin?').then(function () {
                            appUtils.showLoading();
                            membershipVm.membership.isActive = false;
                            refreshUpdate(membershipVm.membership.isActive, appTrackingObjRefresh);
                        }, function () {
                            appUtils.hideLoading();
                        });
                    }
                } else {
                    toaster.error('Request failed');
                    //Create tracking application refresh membership
                    appTrackingObjRefresh.submitResult = 'Failed';
                    appTrackingObjRefresh.message = 'Request failed';
                    appTrackingObjRefresh.status = membershipVm.applicationModel.status;
                    memAppTimeLineService.create(membershipVm.applicationModel.$id, appTrackingObjRefresh);
                }
            }).catch(function (err) {
                console.log('Refresh application err===================');
                console.log(err);
                var rMsg = 'Request refresh has error.';
                toaster.error(rMsg);
                appTrackingObjRefresh.submitResult = 'Failed';
                appTrackingObjRefresh.message = rMsg;
                $ngBootbox.confirm('Membership status from TLS API is failed. Do you want to update this status in SmartAdmin?').then(function () {
                    appUtils.showLoading();
                    membershipVm.membership.isActive = false;
                    refreshUpdate(membershipVm.membership.isActive, appTrackingObjRefresh);
                }, function () {
                    appUtils.hideLoading();
                });
            });
        }

        function refreshUpdate(isApproved, trackingObj) {
            var status = isApproved ? 4 : 3;
            return memAppService.changeAppStatus(membershipVm.applicationModel.$id, status).then(function (rs) {
                if (rs.result) {
                    membershipVm.applicationModel.status = status;
                    //Create tracking application refresh membership
                    trackingObj.status = status;
                    memAppTimeLineService.create(membershipVm.applicationModel.$id, trackingObj);
                    //
                    memberShipService.activeMember(membershipVm.membership).then(function (memRs) {
                        appUtils.hideLoading();
                        if (!memRs.result) {
                            toaster.error(memRs.errorMsg);
                            return;
                        } else {
                            if (isApproved && isApproved === true) {
                                toaster.success('This member is approved!');
                            } else {
                                toaster.warning('This member is not approved!');
                                $timeout(function () {
                                    $state.go('membership.editApplication', { id: membershipVm.applicationModel.$id, tab: 3 });
                                }, 800);
                            }
                        }
                    });
                } else {
                    toaster.error(rs.errorMsg);
                    appUtils.hideLoading();
                    return;
                }
            });
        }

        function cancelAccount() {
            $ngBootbox.confirm('Are you sure you want to Cancel this account?').then(function () {
                _cancelAccount();
            });
        }

        function _cancelAccount() {
            var request = [];
            membershipVm.applicationModel.status = 6; // Canceled
            membershipVm.applicationModel.authorModifier = currentUser.email;
            var updateApplicationReq = memAppService.update(membershipVm.applicationModel);
            var appTrackingUpdate = {
                eventType: appUtils.logEvent.changeStatus,
                status: membershipVm.applicationModel.status,
                message: 'Change application status success.'
            };
            var addTimelineReq = memAppTimeLineService.create(membershipVm.applicationModel.$id, appTrackingUpdate);

            return $q.all([updateApplicationReq, addTimelineReq]).then(function () {
                $state.go('membership.members');
            });
        }
    }

})();