(function () {
    'use strict';

    angular.module('app.membership')
        .controller('ApplicationStatusCtrl', ApplicationStatusCtrl);
    /** @ngInject */
    function ApplicationStatusCtrl($scope, $state, $q, $ngBootbox, $timeout, $uibModalInstance, appUtils, authService, currentApp, toaster, memAppService, memAppVerifyService, memAppTimeLineService) {

        var applicationSttVm = this;
        applicationSttVm.status = appUtils.appStatus;
        applicationSttVm.currentApp = currentApp;
        applicationSttVm.newStatus = currentApp.status + '';
        var currentUser = authService.getCurrentUser(); //$rootScope.storage.currentUser;  
        applicationSttVm.close = function () {
            $uibModalInstance.close();
        };
        applicationSttVm.changeStatus = function () {
            appUtils.showLoading();
            memAppService.getWithLoad(currentApp.$id).then(function (app) {
                if (app) {
                    //assingn authorModifier to application
                    app.authorModifier = currentUser.email;
                    if (!app.total) {
                        app.total = {
                            subTotalAmount: 0,
                            totalAmount: 0
                        };
                    } else {
                        if (!app.total.subTotalAmount)
                            app.total.subTotalAmount = 0;
                        if (!app.total.totalAmount)
                            app.total.totalAmount = 0;
                    }

                    if (!app.creditCard) {
                        app.creditCard = {
                            name: '',
                            creditCardNumber: '',
                            month: '',
                            year: '',
                            cvv: '',
                            zipCode: ''
                        };
                    } else {
                        if (!app.creditCard.name)
                            app.creditCard.name = '';
                        if (!app.creditCard.creditCardNumber)
                            app.creditCard.creditCardNumber = '';
                        if (!app.creditCard.month)
                            app.creditCard.month = '';
                        if (!app.creditCard.year)
                            app.creditCard.year = '';
                        if (!app.creditCard.cvv)
                            app.creditCard.cvv = '';
                        if (!app.creditCard.zipCode)
                            app.creditCard.zipCode = '';
                    }

                    if (!app.check) {
                        app.check = {
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
                    } else {
                        if (!app.check.accountNumber)
                            app.check.accountNumber = '';
                        if (!app.check.routingNumber)
                            app.check.routingNumber = '';
                        if (!app.check.address)
                            app.check.address = '';
                        if (!app.check.city)
                            app.check.city = '';
                        if (!app.check.state)
                            app.check.state = '';
                        if (!app.check.zipCode)
                            app.check.zipCode = '';
                        if (!app.check.type)
                            app.check.type = 'BusinessChecking';
                        if (!app.check.name)
                            app.check.name = '';
                        if (!app.check.fullName)
                            app.check.fullName = '';

                    }

                    var checkedItem = _.find(appUtils.appStatus, { key: parseInt(applicationSttVm.newStatus) });
                    app.status = checkedItem.key;
                    if (checkedItem.key === 0 || checkedItem.key === 1 || checkedItem.key === 7) {
                        app.isLocked = false;
                        app.isVerified = false;
                    }
                    /* jshint ignore:start */
                    else if (checkedItem.key === 2 || checkedItem.key === 3 || checkedItem.key === 4
                        || checkedItem.key === 5 || checkedItem.key === 6) {
                        app.isLocked = true;
                        app.isVerified = true;
                    }
                    /* jshint ignore:end */

                    if (checkedItem.key === 4 || checkedItem.value === 'Billing Approved') {
                        if (app.creditCard) {
                            var cvv = app.creditCard.cvv;
                            var cardNumber = app.creditCard.creditCardNumber;
                            app.creditCard.cvv = cvv.replace(/[^A-Z]/g, '*');
                            app.creditCard.creditCardNumber = cardNumber.substring(0, cardNumber.length - 4).replace(/[^A-Z]/g, '*') + cardNumber.substring(cardNumber.length - 4, cardNumber.length);
                        }
                        if (app.check) {
                            var routingNumber = app.check.routingNumber;
                            var accountNumber = app.check.accountNumber;
                            if (!angular.isUndefined(routingNumber) && !angular.isUndefined(accountNumber)) {
                                app.check.routingNumber = routingNumber.substring(0, routingNumber.length - 4).replace(/[^A-Z]/g, '*') + routingNumber.substring(routingNumber.length - 4, routingNumber.length);
                                app.check.accountNumber = accountNumber.substring(0, accountNumber.length - 4).replace(/[^A-Z]/g, '*') + accountNumber.substring(accountNumber.length - 4, accountNumber.length);
                            }
                        }
                    }
                    //Application tracking timeline obj
                    var appTrackingUpdate = {
                        eventType: appUtils.logEvent.changeStatus
                    };

                    var req = memAppService.update(app);
                    return req.then(function (res) {
                        if (!res.result) {
                            $ngBootbox.alert(res.errorMsg);
                            //Create tracking application change status                            
                            appTrackingUpdate.message = res && res.errorMsg || 'Change application status has error.';
                            appTrackingUpdate.status = angular.copy(app.status);
                            return memAppTimeLineService.create(app.$id, appTrackingUpdate);
                        } else {
                            var reqAll = [];

                            //Create tracking application change status 
                            appTrackingUpdate.message = 'Change application status success.';
                            appTrackingUpdate.status = angular.copy(app.status);
                            reqAll.push(memAppTimeLineService.create(app.$id, appTrackingUpdate));
                            if (checkedItem.key === 4 || checkedItem.value === 'Billing Approved' || checkedItem.key === 8 || checkedItem.value === 'Billing Required') {
                                //Create application-verify 
                                var reqVerify = memAppVerifyService.create(app.$id).then(function () {
                                    //Create tracking application create membership
                                    var appTrackingVerify = {
                                        eventType: appUtils.logEvent.createMember,
                                        status: app.status
                                    };
                                    memAppTimeLineService.create(app.$id, appTrackingVerify);
                                });
                                reqAll.push(reqVerify);
                            } else {
                                //Remove application-verify 
                                reqAll.push(memAppVerifyService.remove(app.$id));
                            }

                            return $q.all(reqAll).then(function () {
                                toaster.pop('success', 'Success', "Change Application Status Successfully!");
                                $uibModalInstance.close();
                                var status = parseInt(app.status), tab = status === 0 ? -1 : status;
                                $timeout(function () {
                                    if ($scope.$parent) {
                                        $scope.$parent.itemSelected = app.$id;
                                    }
                                    $state.go('membership.editApplication', { id: app.$id, 'tab': tab });
                                }, 800);
                            });
                        }
                    }).catch(function (err) {
                        console.log(err);
                        //Create tracking application change status 
                        appTrackingUpdate.status = angular.copy(app.status);
                        appTrackingUpdate.message = err && err.message || 'Change application status has error.';
                        $ngBootbox.alert(appTrackingUpdate.message);
                        return memAppTimeLineService.create(app.$id, appTrackingUpdate);
                    });
                }
            });

        };
    }
})();
