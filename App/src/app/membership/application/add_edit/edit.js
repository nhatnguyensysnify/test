(function () {
    'use strict';

    angular.module('app.membership')
        .controller('EditAppCtrl', EditAppCtrl);

    /** @ngInject */
    function EditAppCtrl($rootScope, $scope, $state, $sce, $q, toaster, appUtils, authService, memStateService, applicationMaps, memAppService, membershipMediaService, memberShipService, memAppHisService, memberShipPlansService, memberShipAddOnsService, $uibModal, $ngBootbox, $timeout, employeeService, $stateParams, permissionService, memberShipFacilitiesService, $http, memRegionService, memProcessQueueService, memAppVerifyService, memAppTimeLineService, memAppIndicatorService, firebaseDataRef, employeeLogService, personTitleService, DataUtils) {
        $rootScope.settings.layout.pageSidebarClosed = true;
        $scope.userPermission = $rootScope.storage.statePermission;
        //$rootScope.itemSelected = $stateParams.id;
        var currentUser = authService.getCurrentUser(); //$rootScope.storage.currentUser;
        var appSettings = $rootScope.storage.appSettings;
        var timestampStart = $stateParams.start ? $stateParams.start : '';
        var timestampEnd = $stateParams.end ? $stateParams.end : '';
        var clients = $stateParams.author || currentUser.repCode || currentUser.username || '';
        var alias = $stateParams.alias || currentUser.alias || '';
        var states = $stateParams.state || 'All';
        var plantypes = $stateParams.plantype || null;
        var reportBy = $stateParams.reportBy || 'timestampCreated';
        var sortBy = $stateParams.sortBy || 'asc';
        var countWatch = 0;
        var totalAmountTmp = 0,
            indicatorRef, editRef, physicalFilesRef = {},
            applicationId = angular.copy($stateParams.id),
            indicator = null;
        var initModel = false,
            indicatorCallback = appSettings.indicatorCallback || 5;
        $scope.userPermission.isAccessPermission = $rootScope.can('access', 'ViewApplicationImages');

        //Tracking history application variables=========================
        var modelsDirtied = {};
        var skipKeys = ['fields'];
        var isobject = function (x) {
            return Object.prototype.toString.call(x) === '[object Object]';
        };

        var getkeys = function (obj, prefix) {
            var keys = Object.keys(obj);
            prefix = prefix ? prefix + '.' : '';
            return keys.reduce(function (result, key) {
                if (isobject(obj[key]) && skipKeys.indexOf(key) != -1) {
                    result = result.concat(getkeys(obj[key], prefix + key));
                } else {
                    result.push(prefix + key);
                }
                return result;
            }, []);
        };

        var checkNested = function (obj, key) {
            var splitKey = key.split('.');
            return key.split(".").reduce(function (o, x) {
                if (({}.toString.apply(o[x]) === '[object Function]')) return undefined;
                return o[x];
            }, obj);
        };
        //End Tracking history application variables===================

        var applicationVm = this;
        applicationVm.model = {};
        applicationVm.model.$id = $stateParams.id ? $stateParams.id : '';
        applicationVm.isEnableSelectPlan = false;

        //common
        $scope.toggleImagePnl = false;
        applicationVm.activeFileUploadTab = false;
        applicationVm.currentFiles = null;
        applicationVm.isEnoughtCast = true;
        applicationVm.submitting = false;
        applicationVm.cashChange = 0;
        applicationVm.tabFileId = -1;
        applicationVm.statePlans = {};
        applicationVm.secPlanKey = '';

        applicationVm.planItems = [];
        applicationVm.planItemsIndex = {};
        applicationVm.addonItems = [];
        applicationVm.addonItemsIndex = {};
        applicationVm.employees = [];
        applicationVm.appStatelist = [];
        applicationVm.appFacilityItems = [];
        applicationVm.regionGroups = {};
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
        applicationVm.appStatus = appUtils.appStatus;
        applicationVm.appNumAdultsList = appUtils.appNumAdults;
        applicationVm.appCycleList = appUtils.appCycles;
        applicationVm.appPaymentMethodList = appUtils.appPaymentMethods;
        applicationVm.prefixList = [];
        applicationVm.suffixList = [];

        //Load data
        //  templay hide marker
        // $scope.appMaps = applicationMaps.getFrmSettings('FL');
        // $scope.markers = $scope.appMaps.markers;
        // $scope.mapping = $scope.appMaps.mapping;
        $scope.appMaps = {}; $scope.markers = {}; $scope.mapping = null;

        $scope.fieldsMap = applicationMaps.fieldsMap;

        //Form Variables
        applicationVm.showInvalid = true;
        applicationVm.numberRegx = /^\d+$/;
        applicationVm.year2Regx = /(1[6-9])|([2-9][0-9])/;
        applicationVm.monthRegx = /(0[1-9])|(1[012])/;
        applicationVm.yearRegx = /(20[1-9][9]|20[2-9][0-9]|2100)/;
        applicationVm.zipcodeRegx = /(^\d{5}$)|(^\d{5}-\d{4}$)/;
        applicationVm.nameRegx = /^(a-z|A-Z|0-9)*[^!#$%^&*()'"\/\\;:@=+,?\[\]\/]*$/;
        applicationVm.addressRegx = /^(a-z|A-Z|0-9)*[^!$%^&*()'"\/\\;:@=+,?\[\]]*$/;
        applicationVm.emailRegx = /^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,4})$/;
        // applicationVm.emailRegx = '\\d+';
        applicationVm.currencyRegx = /^\$\d/;
        applicationVm.cvvRegx = /(^\d{3}$)|(^\d{4}$)|^\d+$/;
        applicationVm.memberIDRegx = /^[a-zA-Z0-9]+$/;
        applicationVm.formTitle = 'Add New Application';
        applicationVm.facilityTxt = '';
        applicationVm.eventTxt = '';
        applicationVm.initPopup = false;
        applicationVm.initSeclectEvent = false;
        applicationVm.keyword = '';
        //applicationVm.status = '-1';
        applicationVm.clients = clients;
        applicationVm.reportDate = reportBy;
        applicationVm.sortBy = sortBy;
        applicationVm.getState = getState;

        applicationVm.paging = {
            pageSize: 25,
            currentPage: 0,
            totalPage: 0,
            totalRecord: 0
        };

        applicationVm.selectedRegionSettings = {};

        var itemStatusMap = {
            'New': { icon: 'fa-file' },
            'Processing': { icon: 'fa-spinner' },
            'Verified': { icon: 'fa-check-square-o' },
            'Billing Pending': { icon: 'fa-hourglass-half' },
            'Billing Denied': { icon: 'fa-hourglass-half' },
            'Cancelled': { icon: 'fa  fa-times' },
            'Error': { icon: 'fa fa-exclamation-triangle' },
            'Billing Approved': { icon: 'fa-user' },
            'Billing Required': { icon: 'fa-usd' },
            'Default': { icon: 'fa-file-o' }
        };

        //Google address Variables
        $scope.addressInvalid = true;
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

        //Dropzone Init
        applicationVm.dzOptions = {
            url: 'application/',
            firebaseStorage: true,
            parallelUploads: 10,
            // addRemoveLinks : true,
            // dictRemoveFile : 'Remove',
            // dictResponseError : 'Could not upload this file',
            acceptedFiles: '.png,.jpg,.jpeg, image/jpeg, images/jpg, image/png'
        };

        applicationVm.dzCallbacks = {
            'addedfile': function (file, response) {

            },
            'success': function (file, response) {
                appUtils.hideLoading();
                var snapshot = {};
                _.each(response, function (task, key) {
                    snapshot[key] = task.snapshot;
                });


                var metadata = snapshot.ori.metadata,
                    appId = angular.copy(applicationVm.model.$id);

                //Create employee log for upload application image
                var employeeLog = {
                    action: appUtils.logEmployeeAction.uploadImage.value,
                    status: 'Success',
                    fileInfo: {
                        fileName: metadata.name,
                        originalName: file.name,
                        fileSize: metadata.size,
                        fileType: metadata.contentType,
                        repCode: currentUser.username || currentUser.repCode,
                        state: applicationVm.model.state,
                        region: applicationVm.model.region || '',
                        regionCode: applicationVm.model.regionCode || '',
                        facility: applicationVm.facilityObj,
                        applications: {}
                    }
                };
                employeeLog.fileInfo.applications[applicationVm.model.$id] = {
                    pageIndex: 1
                };
                var imgFile = {
                    "alternativeText": "",
                    "author": currentUser.email,
                    "bucket": metadata.bucket,
                    "caption": "",
                    "description": "",
                    "displayName": metadata.name,
                    "downloadUrl": snapshot.ori.downloadURL,
                    "fileName": metadata.name,
                    "fileSize": metadata.size,
                    "fileType": metadata.contentType,
                    "fullPath": metadata.fullPath,
                    "appId": appId,
                    "storageLocation": 'gs://' + metadata.bucket + '/' + metadata.fullPath,
                    "type": metadata.contentType,
                    "originalName": file.name || ''
                };

                membershipMediaService.addFile(imgFile).then(function (res) {
                    if (res.result) {
                        employeeLog.fileInfo.mediaId = employeeLog.fileInfo.applications[applicationVm.model.$id].mediaId = res.fileKey;
                        employeeLogService.create(currentUser.$id, employeeLog);
                        _initFileModel(imgFile, res.fileKey);
                        //Application tracking timeline obj
                        var appTrackingObjUploadFile = {
                            eventType: appUtils.logEvent.uploadFileApp,
                            status: angular.copy(applicationVm.model.status),
                            mediaId: res.fileKey
                        };
                        return memAppService.updatePhysicalFiles(applicationVm.model).then(function (rs) {
                            if (rs.result) {
                                appTrackingObjUploadFile.message = 'Upload application file success.';
                                toaster.success('Upload file success!');
                                return true;
                            } else {
                                appTrackingObjUploadFile.message = rs && rs.errorMsg || 'Upload application file has error.';
                                toaster.error(rs.errorMsg);
                                return false;
                            }
                        }).catch(function (err) {
                            appTrackingObjUploadFile.message = err && err.message || 'Upload application file has error.';
                            return false;
                        }).then(function () {
                            console.log('====Upload more version file do application tracking=====');
                            //Create tracking application upload more version file
                            memAppTimeLineService.create(appId, appTrackingObjUploadFile);
                        });
                    } else {
                        toaster.error('upload new form has error.');
                    }
                });
            },
            'error': function (file, err) {
                toaster.error('upload new form has error.');
                console.log(err);
                var employeeLog = {
                    action: appUtils.logEmployeeAction.uploadImage.value,
                    status: 'Failed',
                    fileInfo: {
                        fileName: file.name,
                        originalName: file.name,
                        fileSize: file.size,
                        fileType: file.type,
                        repCode: currentUser.username || currentUser.repCode,
                        state: applicationVm.model.state,
                        region: applicationVm.model.region || '',
                        regionCode: applicationVm.model.regionCode || '',
                        facility: applicationVm.facilityObj
                    }
                };
                employeeLog.message = err && err.message || 'Upload has error.';
                employeeLogService.create(currentUser.$id, employeeLog);
            },
            'removedfile': function (file, response) {
                appUtils.hideLoading();
                toaster.error('File removed.');
            }
        };

        var verifyTimeout;
        $scope.selectFacility = function (item) {
            applicationVm.notBelongState = false;
            applicationVm.model.facilityId = item.$id;
            applicationVm.model.facilityCode = item.facility_promo_code || '';
            if (applicationVm.selectedRegionSettings.enable_promo_code === false) {
                applicationVm.model.facilityCode = '';
            }
            applicationVm.facilityTxt = item.address && $.trim(item.address) !== '' ? item.name + ' - ' + item.facility_promo_code + ' (' + item.address + ')' : item.name + ' - ' + item.facility_promo_code;
            applicationVm.facilityObj = item;
            applicationVm.facilityObj.id = item.$id;
            applicationVm.initSeclectEvent = false;
            if (item.state_code !== applicationVm.model.state) {
                applicationVm.notBelongState = true;
            }
        };

        $scope.filesFilter = function (item) {
            return !item.isDeleted || item.isDeleted === false;
        };

        $scope.$watch('applicationVm.model.numberOfAdults', function (val) {
            if (!initModel) {
                return;
            }
            _watchPlan();
        });

        $scope.$watch('applicationVm.model.cashInput', function (val) {
            if (!initModel) {
                return;
            }

            applicationVm.isEnoughtCast = parseFloat(val) >= parseFloat(applicationVm.model.total.totalAmount);
            applicationVm.cashChange = parseFloat(val - (applicationVm.model.total.totalAmount || 0));
        });

        $scope.$watch('applicationVm.model.total.totalAmount', function (val) {
            if (!initModel) {
                return;
            }
            applicationVm.isEnoughtCast = parseFloat(applicationVm.model.cashInput) >= parseFloat(val);
            applicationVm.cashChange = parseFloat(applicationVm.model.cashInput - (val || 0));
        });

        $scope.$watch('applicationVm.model.cycle', function (val) {
            if (!initModel) {
                return;
            }
            _watchPlan();
        });

        $scope.$watch('applicationVm.model.creditCard.month', function (val) {
            if (!initModel) {
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
            if (!initModel) {
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
            if (!initModel) {
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
            if (!initModel) {
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

        $scope.indicatorMsgErr = '';
        $scope.$on('$destroy', function () {
            //on value membership-applications-indicator/
            if (indicatorRef) {
                indicatorRef.off('value', checkIndicator);
            }

            //on value membership-applications/
            if (editRef) {
                editRef.off('value', showMessageUpdateInfo);
            }

            if (physicalFilesRef) {
                _.forEach(physicalFilesRef, function (item, key) {
                    physicalFilesRef[key].on('value', onValuePhysicalFiles);
                });
            }

            //clear interval update timestamp after 5 minutes
            if (indicator !== null) {
                clearInterval(indicator);
            }

            //$scope.$emit('indicatorsLoad', null);
            $scope.indicatorMsgErr = '';
            unCheckIndicator();
            $(window).off('scroll');
        });
        // Make sure DOM is loaded before get elems
        angular.element(document).ready(function () {
            $timeout(function () {
                var appFormEl = angular.element(document.querySelector('#application_form'));
                var appImageEl = angular.element(document.querySelector('#application_image'));
                // var bodyEl = angular.element( document.querySelector('body' ));
                $(window).on('resize', function (event) {
                    $timeout(function () {
                        applicationVm.formW = $('#application_form').width() || 420;
                    }, 800);
                });
                applicationVm.scrolling = false;
                applicationVm.timeoutScrolling = null;
                $(window).on('scroll', function (event) {
                    let windowScrollCount = $(this).scrollTop();
                    let animationFrame = Math.round(windowScrollCount / 100);

                    if (applicationVm.scrolling || animationFrame % 5 !== 0) {
                        return;
                    }
                    clearTimeout(applicationVm.timeoutScrolling);
                    applicationVm.timeoutScrolling = setTimeout(function () {
                        applicationVm.scrolling = true;
                        var element = $('#application_image'),
                            originalY = $('#application-content').offset() ? $('#application-content').offset().top : 600,
                            limit = $(document).height() - $(window).height();
                        element.css('position', 'relative');
                        var scrollTop = $(window).scrollTop(),
                            topVal = 0;
                        if (scrollTop < originalY) {
                            topVal = 0;
                        } else {
                            topVal = scrollTop - originalY + 75;
                            if ($('#application_image').offset() !== undefined) {
                                var compare = $('#application_image').offset().top + $('#application_image').height();
                                var compare2 = $('#application-content').offset().top + $('#application-content').height();
                                if (compare > compare2) {
                                    topVal = $('#application-content').height() - $('#application_image').height();
                                }
                            } else {
                                topVal = 0;
                            }
                        }
                        $('#application_image').stop(false, false).animate({
                            top: topVal
                        }, { duration: 300, complete: function () { applicationVm.scrolling = false; } });
                    }, 200);
                });

                // tempory hide focus
                // $scope.focusMe = function(mapName, isToggle) {
                //     var map = $scope.mapping[mapName];
                //     if (!map) {
                //         return;
                //     }
                //     _clearSelected(); // Clear before show another one
                //     map.selected = isToggle ? !map.selected : true;
                // };
                $scope.focusMe = angular.noop;
            }, 2000);
        });

        _initPage();

        //Functions
        //applicationVm.create = create;
        applicationVm.changeState = changeState;
        applicationVm.changeRegion = changeRegion;
        applicationVm.changePaymentMethod = changePaymentMethod;
        applicationVm.addressVerification = addressVerification;
        applicationVm.bankAddressVerification = bankAddressVerification;
        applicationVm.waivedSetupFee = waivedSetupFee;
        //
        applicationVm.getStaffName = getStaffName;
        applicationVm.clearUploadedFiles = clearUploadedFiles;
        applicationVm.viewMember = viewMember;
        applicationVm.getIconStatus = getIconStatus;
        applicationVm.getAppImage = getAppImage;
        applicationVm.refreshStatus = refreshStatus;
        applicationVm.getMemberName = getMemberName;
        applicationVm.activeFileTab = activeFileTab;
        applicationVm.activeUploadFileTab = activeUploadFileTab;
        applicationVm.checkPriAddon = checkPriAddon;
        applicationVm.popupChangeStatus = popupChangeStatus;
        applicationVm.getFileStatus = getFileStatus;
        applicationVm.getAppStatus = getAppStatus;
        applicationVm.processFile = processFile;
        applicationVm.selectFile = selectFile;
        applicationVm.recycleFile = recycleFile;
        applicationVm.process = process;
        applicationVm.verify = verify;
        applicationVm.justSave = justSave;
        applicationVm.unLock = unLock;
        applicationVm.submit = submit;
        applicationVm.cancel = cancel;
        applicationVm.membershipOverwrite = membershipOverwrite;
        applicationVm.getCashOptionTxt = getCashOptionTxt;
        applicationVm.cancelAccount = cancelAccount;
        //
        applicationVm.showPopupTrackingActivities = showPopupTrackingActivities;
        applicationVm.showPopupEmployeeList = showPopupEmployeeList;
        applicationVm.showPopupOriginalImage = showPopupOriginalImage;
        applicationVm.openPreviewModal = openPreviewModal;
        applicationVm.showPopupFacilityList = showPopupFacilityList;
        applicationVm.detechCardType = detechCardType;
        applicationVm.showPopupEventList = showPopupEventList;
        //
        applicationVm.activeEditApp = function () {
            $rootScope.isEditApp = true;
        };

        $scope.toggleImagePnlFunc = toggleImagePnlFunc;
        $scope.selectPriPlan = _selectPriPlan;

        //===================================================================================================================================
        function _initPage() {
            if (indicatorRef) {
                indicatorRef.off('value', checkIndicator);
            }
            if (editRef) {
                editRef.off('value', showMessageUpdateInfo);
            }
            appUtils.showLoading();
            var reqs = [];
            reqs.push(employeeService.getAll().then(function (rs) {
                applicationVm.employees = rs;
            }));

            reqs.push(memStateService.getAll().then(function (data) {
                applicationVm.appStatelist = data;
            }));

            reqs.push(memRegionService.getAll().then(function (regionGoups) {
                _.each(regionGoups, function (regionGroup, stateCode) {
                    regionGoups[stateCode] = DataUtils.toAFArray(regionGroup);
                });
                applicationVm.regionGroups = regionGoups;

                // console.log(regionGoups);
            }));

            reqs.push(memberShipAddOnsService.getAll().then(function (data) {
                applicationVm.addonItems = data;
                // _.each(data, function (item) {
                //     applicationVm.addonItemsIndex[item.$id] = item;
                // });
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

                // console.log(applicationVm.addonItemsIndex);
            }));

            reqs.push(memberShipFacilitiesService.itemsLoadOnce().then(function (data) {
                applicationVm.appFacilityItems = data;
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

            reqs.push(personTitleService.getPrefixs().then(function (data) {
                applicationVm.prefixList = data;
            }));

            reqs.push(personTitleService.getSuffixs().then(function (data) {
                applicationVm.suffixList = data;
            }));

            if (applicationId !== '') {
                //list update indicator
                indicatorRef = firebaseDataRef.child('membership-applications-indicator/' + applicationId);
                indicatorRef.on('value', checkIndicator);

                //listen update value application
                editRef = firebaseDataRef.child('membership-applications/' + applicationId);
                editRef.on('value', showMessageUpdateInfo);

                //call update timestamp indicator
                var intervalCallback = indicatorCallback * 60000;
                indicator = setInterval(function () {
                    var currentTime = moment().valueOf();
                    if (applicationId) {
                        memAppIndicatorService.get(applicationId).then(function (data) {
                            if (data && data.editingBy) {
                                var uEdited = data.editingBy[currentUser.$id];
                                if (uEdited !== undefined) {
                                    uEdited.timestampEdited = moment().valueOf();
                                    memAppIndicatorService.update(applicationId, data);
                                }
                            }
                        });
                    }
                }, intervalCallback);

                //init check Indicator
                reqs.push(checkIndicator());
            }
            $q.all(reqs).then(function () {
                _loadData().then(function () {
                    _watchPlan();
                    initModel = true;
                    $timeout(function () {
                        applicationVm.formW = $('#application_form').width() || 420;
                    }, 800);
                });
            });
        }

        function _loadData() {
            if (!applicationVm.model.$id || applicationVm.model.$id === '') {
                return $q.when();
            }
            var request = memAppService.getWithLoad(applicationVm.model.$id).then(function (rs) {
                if (!rs) {
                    // initModel = true;
                    appUtils.hideLoading();
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
                applicationVm.errMsg = angular.copy(applicationVm.model.errorMessage || '');
                if (applicationVm.errMsg.length > 200) {
                    applicationVm.errMsg = applicationVm.errMsg.substr(0, 200) + '...';
                }
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


                // if (!$scope.userPermission.isAccessPermission) {
                //     $scope.userPermission.isAccessPermission = applicationVm.model.representativeCode === (currentUser.repCode || currentUser.username);
                // }


                // initModel = true;
                //load Membership
                _loadMembership(rs.membershipId);

                if (applicationVm.model.waivedSetupFee === undefined) {
                    applicationVm.model.waivedSetupFee = false;
                }

                if (applicationVm.model.processPayment === undefined) {
                    applicationVm.model.processPayment = true;
                }

                //Account Source
                _getAccountSource(applicationVm.model);

                if (!applicationVm.model.cashInput) {
                    applicationVm.model.cashInput = angular.copy(applicationVm.model.cashAmount || 0);
                }
                //Files
                applicationVm.model.physicalFiles = _.filter(rs.physicalFiles, function (o) { return !o.isDeleted; });

                if (!applicationVm.model.physicalFiles || (applicationVm.model.physicalFiles && applicationVm.model.physicalFiles.length === 0)) {
                    $scope.toggleImagePnl = true;
                } else {
                    var fileData = _.find(rs.physicalFiles, function (file) {
                        return file.isSelected === true;
                    });

                    applicationVm.currentFiles = fileData || null;
                }
                activeFileTab();
                //
                if (!applicationVm.model.signatureDate || $.trim(applicationVm.model.signatureDate) === '') {
                    applicationVm.model.signatureDate = moment().format('MM/DD/YYYY');
                }

                totalAmountTmp = applicationVm.model.total.totalAmount;

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

                // need reverifyData on Review Screen
                // verify Data: for sure upload lastest info
                if (applicationVm.model.status == 2) {

                    // core plan and add on

                    if (applicationVm.model.state && applicationVm.model.selectedPlans) {

                        // var planInfo = applicationVm.planItemsIndex[applicationVm.model.state] && applicationVm.planItemsIndex[applicationVm.model.state][applicationVm.model.selectedPlans.key];
                        var planInfo = applicationVm.planItemsIndex[applicationVm.model.state] && applicationVm.planItemsIndex[applicationVm.model.state][applicationVm.model.region] && applicationVm.planItemsIndex[applicationVm.model.state][applicationVm.model.region][applicationVm.model.selectedPlans.key];
                        // console.log('planInfo');
                        // console.log(planInfo);
                        if (planInfo) {
                            applicationVm.model.selectedPlans = planInfo;
                        } else {
                            applicationVm.model.selectedPlans = null;
                            applicationVm.model.selectedAddOns = null;
                        }

                    }
                    if (applicationVm.model.selectedAddOns) {
                        var stateAddOns = applicationVm.addonItemsIndex[applicationVm.model.state] && applicationVm.addonItemsIndex[applicationVm.model.state][applicationVm.model.region];
                        if (stateAddOns) {

                            _.each(applicationVm.model.selectedAddOns, function (sAddOn, id) {
                                if (stateAddOns[id]) {
                                    applicationVm.model.selectedAddOns[id] = stateAddOns[id];
                                } else {
                                    applicationVm.model.selectedAddOns[id] = null;
                                }
                            });
                        }
                    }
                    // end verify data
                }

                //templay hide maker
                /*
                $scope.appMaps = applicationMaps.getFrmSettings(rs.state);
                if ($scope.appMaps) {
                    $scope.markers = $scope.appMaps.markers;
                    $scope.mapping = $scope.appMaps.mapping;
                }
                */

                //Payment Method
                if (!rs.paymentMethod || rs.paymentMethod === '') {
                    applicationVm.model.paymentMethod = '0';
                }

                if (applicationVm.model.paymentMethod === '0') {
                    var creditObj = {
                        name: '',
                        creditCardNumber: '',
                        month: '',
                        year: '',
                        cvv: '',
                        zipCode: ''
                    };
                    applicationVm.model.creditCard = angular.extend(creditObj, rs.creditCard);
                } else if (applicationVm.model.paymentMethod === '1') {
                    if (!rs.cashOption || _.trim(rs.cashOption) === '') {
                        applicationVm.model.cashOption = 'TakeCredit';
                    }
                } else {
                    var checkObj = {
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
                    applicationVm.model.check = angular.extend(checkObj, rs.check);
                    _initVerifyAddressPaymentCheck();
                }

                if (applicationVm.model.status.toString() === '4' || applicationVm.model.status.toString() === '8') {
                    if (applicationVm.model.creditCard) {
                        var cvv = applicationVm.model.creditCard.cvv;
                        var cardNumber = applicationVm.model.creditCard.creditCardNumber;
                        applicationVm.model.creditCard.cvv = cvv ? cvv.replace(/[^A-Z]/g, '*') : '';
                        applicationVm.model.creditCard.creditCardNumber = cardNumber ? cardNumber.substring(0, cardNumber.length - 4).replace(/[^A-Z]/g, '*') + cardNumber.substring(cardNumber.length - 4, cardNumber.length) : '';
                    }
                    if (applicationVm.model.check) {
                        var routingNumber = applicationVm.model.check.routingNumber;
                        var accountNumber = applicationVm.model.check.accountNumber;
                        applicationVm.model.check.routingNumber = routingNumber ? routingNumber.substring(0, routingNumber.length - 4).replace(/[^A-Z]/g, '*') + routingNumber.substring(routingNumber.length - 4, routingNumber.length) : '';
                        applicationVm.model.check.accountNumber = accountNumber ? accountNumber.substring(0, accountNumber.length - 4).replace(/[^A-Z]/g, '*') + accountNumber.substring(accountNumber.length - 4, accountNumber.length) : '';
                    }
                } else {
                    //remove * character
                    if (applicationVm.model.creditCard && applicationVm.model.creditCard.creditCardNumber !== '' &&
                        applicationVm.model.creditCard.creditCardNumber.indexOf('*') != -1) {
                        applicationVm.model.creditCard.creditCardNumber = '';
                    }
                    if (applicationVm.model.check && applicationVm.model.check.routingNumber !== '' &&
                        applicationVm.model.check.routingNumber.indexOf('*') != -1) {
                        applicationVm.model.check.routingNumber = '';
                    }
                    if (applicationVm.model.check && applicationVm.model.check.accountNumber !== '' &&
                        applicationVm.model.check.accountNumber.indexOf('*') != -1) {
                        applicationVm.model.check.accountNumber = '';
                    }
                }

                // Init watching dirtied models Tracking history application
                var keys = getkeys(applicationVm.model);
                $timeout(function () {
                    appUtils.hideLoading();
                    _.forEach(keys, function (key, idx) {
                        if (checkNested(applicationVm.model, key) !== undefined) {
                            $scope.$watchCollection('applicationVm.model.' + key, function (newVal, oldVal) {
                                if (modelsDirtied['applicationVm_model_' + key] === undefined && newVal !== oldVal) {
                                    modelsDirtied['applicationVm_model_' + key] = oldVal;
                                    modelsDirtied['applicationVm_model_new_' + key] = newVal;
                                }
                            });
                        }
                    });
                }, 2000);
                // End Init watching dirtied models
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
                        // applicationVm.model.creditCard.name = applicationVm.memberModel.priMember.firstName + ' ' + applicationVm.memberModel.priMember.lastName;
                        applicationVm.model.creditCard.name = (applicationVm.memberModel.priMember.firstName + ' ' + applicationVm.memberModel.priMember.lastName).trim();
                    }
                }
            });
        }

        //Common Functions
        function activeFileTab(itemFile) {
            if (itemFile) {
                applicationVm.tabFileId = itemFile.id;
                applicationVm.activeFileUploadTab = false;
            } else {
                applicationVm.activeFileUploadTab = true;
                $('#application_image ul.nav-tabs li').removeClass('active');
                $('#application_image .tab-content .tab-pane').removeClass('active');
                $('#li-tab-upload-file').addClass('active');
                $('#tab_upload_file').addClass('in');
                $('#tab_upload_file').addClass('active');
                var selectedFiles = _.filter(applicationVm.model.physicalFiles, function (o) { return o.isSelected; });
                if (selectedFiles && selectedFiles.length > 0) {
                    applicationVm.activeFileUploadTab = false;
                    $('#li-tab-upload-file').removeClass('active');
                    $('#tab_upload_file').removeClass('in');
                    $('#tab_upload_file').removeClass('active');
                }
            }
        }

        function activeUploadFileTab() {
            applicationVm.activeFileUploadTab = true;
            applicationVm.tabFileId = -1;
        }

        function getMemberName(member) {
            if (member) {
                if (member.priMember) {
                    return member.priMember.firstName + ' ' + member.priMember.lastName;
                } else if (member.secMember) {
                    return member.secMember.firstName + ' ' + member.secMember.lastName;
                }
            }

            return ' ';
        }

        function toggleImagePnlFunc() {
            $scope.toggleImagePnl = !$scope.toggleImagePnl;
            $timeout(function () {
                applicationVm.formW = $('#application_form').width() || 420;
            }, 800);
        }

        function changeState() {
            // applicationVm.initPopup = false;
            // applicationVm.initSeclectEvent = false;
            // _watchPlan();
            // onChange State auto change Region
        }

        function changeRegion($event) {
            // console.log(applicationVm.selectedRegion);
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
            applicationVm.model.creditCard = {
                name: '',
                creditCardNumber: '',
                month: '',
                year: '',
                cvv: '',
                zipCode: ''
            };

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
            if (applicationVm.model.paymentMethod === '1')
                applicationVm.model.cashOption = 'TakeCredit';
            else
                applicationVm.model.cashOption = '';

            //Assign data for google verification bank address 
            _initVerifyAddressPaymentCheck();
        }

        function getStaffName(item) {
            var keyword = item.authorName;
            if (item.authorModifier) {
                keyword = item.authorModifier;
            }
            var staff = _.find(applicationVm.employees, { email: keyword });
            if (staff) {
                return staff.email;
            }

            return 'Staff';
        }

        function getIconStatus(item) {
            if (item && item.status) {
                var statusObj = _.find(applicationVm.appStatus, { key: parseInt(item.status) });
                if (statusObj) {
                    return itemStatusMap[statusObj.value].icon;
                }
            }
            return itemStatusMap.Default.icon;
        }

        function getAppStatus(key) {
            var rs = _.find(applicationVm.appStatus, { 'key': key });
            return rs !== undefined && rs.value ? rs.value : '';
        }

        function getFileStatus(key, itemFile) {
            var rs = _.find(appUtils.appFileStatus, { 'key': key });
            return rs !== undefined && rs.value ? rs.value : '';
        }

        function viewMember() {
            $rootScope.reProcessSideBar = true;
            $state.go('membership.memberdetails', { id: applicationVm.model.membershipId });
        }

        function addressVerification() {
            if (verifyTimeout) $timeout.cancel(verifyTimeout);
            verifyTimeout = $timeout(function () {
                _googleMapVerification(1);
            }, 250);
        }

        function bankAddressVerification() {
            if (verifyTimeout) $timeout.cancel(verifyTimeout);
            verifyTimeout = $timeout(function () {
                _googleMapVerification(2);
            }, 250);
        }

        function cancel() {
            window.location.reload();
        }

        function checkPriAddon(key) {
            if (!applicationVm.model.selectedAddOns) return false;
            var rs = _.find(applicationVm.model.selectedAddOns, { 'key': key.toString() });
            return rs && rs !== null;
        }

        //End Common Functions

        //Files Functions
        function loadCanvas(dataURL, index) {
            $timeout(function () {
                var canvas = document.getElementById('canvas-img-' + index);
                var context = canvas.getContext('2d');
                // load image from data url
                var imageObj = new Image();
                imageObj.onload = function () {
                    canvas.width = 1200;
                    canvas.height = 1600;
                    context.drawImage(imageObj, 0, 0, imageObj.width, imageObj.height, 0, 0, 1200, 1600);
                    window.URL.revokeObjectURL(dataURL);
                };

                imageObj.src = dataURL;
            }, 800);
        }

        function downloadImg(url, index) {
            $http.get(url, { responseType: "blob" }).then(function (res) {
                var urlImg = window.URL.createObjectURL(res.data);
                loadCanvas(urlImg, index);
            }, function (error, status) {
                console.log(error);
                console.log(status);
            });
        }

        function getAppImage(itemFile, index) {
            if (itemFile && itemFile.processPath) {
                var gsReference = firebase.storage().refFromURL(itemFile.processPath);
                firebase.storage().ref().child(gsReference.fullPath).getDownloadURL().then(function (url) {
                    $timeout(function () {
                        downloadImg(url, index);
                    }, 1000);
                }).catch(function (error) {
                    switch (error.code) {
                        case 'storage/object_not_found':
                            // File doesn't exist
                            console.log('File doesnt exist');
                            break;

                        case 'storage/unauthorized':
                            // User doesn't have permission to access the object
                            console.log('User doesnt have permission to access the object');
                            break;

                        case 'storage/canceled':
                            // User canceled the upload
                            console.log('User canceled the upload');
                            break;

                        case 'storage/unknown':
                            // Unknown error occurred, inspect the server response
                            console.log('Unknown error occurred, inspect the server response');
                            break;
                    }
                    return '';
                });
            } else {
                $timeout(function () {
                    downloadImg(itemFile.path, index);
                }, 1000);
            }

        }

        function clearUploadedFiles() {
            Dropzone.forElement("#tab_upload_file #form-dropzone").removeAllFiles(true);
        }

        function processFile(key, item) {
            appUtils.showLoading();
            if (item) {
                var index = applicationVm.model.physicalFiles.indexOf(item);
                if (index !== -1) {
                    var appId = applicationVm.model.$id;
                    item.status = 1;
                    applicationVm.model.physicalFiles[index] = item;
                    applicationVm.model.status = 1;
                    activeFileTab(item);
                    var updateFields = {
                        status: applicationVm.model.status,
                        physicalFiles: applicationVm.model.physicalFiles
                    };

                    //Application tracking timeline obj
                    var appTrackingObjProcesFile = {
                        eventType: appUtils.logEvent.processFileApp,
                        status: angular.copy(applicationVm.model.status)
                    };

                    //Application tracking timeline obj push OCR
                    var appTrackingObjPushORC = {
                        eventType: appUtils.logEvent.pushToOcrQueue,
                        status: angular.copy(applicationVm.model.status),
                        mediaId: item.mediaId || ''
                    };

                    return memAppService.updateProcessFile(appId, updateFields).then(function (rs) {
                        if (rs.result) {
                            toaster.success("Process success!");
                            appTrackingObjProcesFile.message = 'Start process application file.';
                            appTrackingObjPushORC.message = 'Push to OCR queue success.';
                            appUtils.hideLoading();
                            return memProcessQueueService.create(appId, key).then(function (createRs) {
                                if (!createRs.result) {
                                    appTrackingObjPushORC.message = 'Push to OCR queue has error.';
                                    toaster.error('Cannot create process queue!');
                                    return false;
                                }
                                //listen update value application physicalFiles
                                physicalFilesRef[item.mediaId] = firebaseDataRef.child('membership-applications/' + applicationId + '/physicalFiles/' + key);
                                if (physicalFilesRef[item.mediaId]) {
                                    physicalFilesRef[item.mediaId].on('value', onValuePhysicalFiles);
                                }
                                return true;
                            }).catch(function (err) {
                                appTrackingObjPushORC.message = 'Push to OCR queue has error.';
                                return false;
                            });
                        } else {
                            appTrackingObjProcesFile.message = rs && rs.errorMsg || 'Process application file has error.';
                            toaster.error(rs.errorMsg);
                            appUtils.hideLoading();
                            return false;
                        }
                    }).catch(function (err) {
                        appTrackingObjProcesFile.message = err && err.message || 'Process application file has error.';
                        return false;
                    }).then(function () {
                        //Create tracking application do process application file
                        memAppTimeLineService.create(appId, appTrackingObjProcesFile).then(function () {
                            console.log('=====create tracking push to ocr queue======');
                            //Create tracking application push to OCR
                            memAppTimeLineService.create(appId, appTrackingObjPushORC);
                        });
                    });
                }
            }
        }

        function selectFile(item) {
            var index = applicationVm.model.physicalFiles.indexOf(item);
            _.forEach(applicationVm.model.physicalFiles, function (fileItem, key) {
                fileItem.isSelected = false;
            });
            if (index !== -1) {
                item.isSelected = true;
                applicationVm.model.physicalFiles[index] = item;
            }
            //Update data for application from fields of OCI
            var appTrackingObj = {
                eventType: appUtils.logEvent.editApp,
                message: 'Select File - Updated application information.'
            };

            update("Select file success!", appTrackingObj).then(function () {
                _reloadGoState();
            });
        }

        function recycleFile(key, item) {
            $ngBootbox.confirm('Are you sure want to delete version ' + (key + 1) + '?').then(function () {
                appUtils.showLoading();
                applicationVm.model.physicalFiles.splice(key, 1);
                //init application tracking obj;
                var appTrackingObjRemoveFile = {
                    eventType: appUtils.logEvent.removeFileApp,
                    status: angular.copy(applicationVm.model.status)
                };
                //end init
                return memAppService.recycleFile(applicationVm.model.$id, applicationVm.model.physicalFiles).then(function (rs) {
                    appUtils.hideLoading();
                    if (rs.result) {
                        appTrackingObjRemoveFile.message = 'Remove application file success.';
                        toaster.success("Delete file success!");
                        return true;
                        //applicationVm.cancel();
                    } else {
                        appTrackingObjRemoveFile.message = rs && rs.errorMsg || 'Remove application file has error.';
                        toaster.error(rs.errorMsg);
                        return false;
                    }
                }).catch(function (err) {
                    appTrackingObjRemoveFile.message = err && err.message || 'Remove application file has error.';
                    return false;
                }).then(function () {
                    //create application tracking remove file
                    memAppTimeLineService.create(applicationVm.model.$id, appTrackingObjRemoveFile);
                });
            });
        }

        //End Files Functions
        //Application Functions
        function update(message, applicationTrackingObj) {
            // console.log(message);
            //Update an application
            applicationVm.model.authorModifier = applicationVm.memberModel.authorModifier = currentUser.email;
            var stateId = $('[name="appState"]:visible option:selected').attr('data-id');
            applicationVm.model.stateId = !stateId ? '0' : stateId;

            if ($.trim(applicationVm.model.representativeCode) === '') {
                applicationVm.model.representativeCode = currentUser.username ? currentUser.username.toUpperCase() : '';
            }

            _setAccountSource(applicationVm.model);
            //always get lastest promo code.
            return memberShipFacilitiesService.get(applicationVm.model.facilityId).then(function (data) {
                if (data && data.facility_promo_code) {
                    // applicationVm.model.facilityCode = data.facility_promo_code;
                }
                //
                return _updateApplication(message, applicationTrackingObj);
            }).catch(function () {
                return _updateApplication(message, applicationTrackingObj);
            });
        }

        function _updateApplication(message, applicationTrackingObj) {
            var appId = applicationVm.model.$id;
            return memAppService.update(applicationVm.model).then(function (rs) {
                applicationTrackingObj.status = angular.copy(applicationVm.model.status);
                if (rs.result) {
                    if (message && message !== '') {
                        toaster.success(message);
                    } else {
                        if (applicationTrackingObj && applicationTrackingObj.submitResult === 'Failed') {
                            toaster.error(applicationTrackingObj.message || 'TLS API: Submit failed');
                        }
                    }

                    var callVerify = false;
                    if (applicationVm.model.status === 4 || applicationVm.model.status === 8) {
                        applicationVm.memberModel.isActive = true;
                        //Create application-verify 
                        memAppVerifyService.create(appId);
                        callVerify = true;
                    }

                    var apps = applicationVm.memberModel.apps;
                    if (apps && apps.length > 0 && apps.indexOf(appId) === -1) {
                        apps.push(appId);
                    }

                    if (applicationVm.model.numberOfAdults == '1' && applicationVm.memberModel.secMember && applicationVm.memberModel.secMember.memberId) {
                        applicationVm.memberModel.secMember.memberId = '';
                    }

                    //Create tracking application updated
                    memAppTimeLineService.create(appId, applicationTrackingObj).then(function () {
                        if (callVerify) {
                            var appTrackingVerify = {
                                eventType: appUtils.logEvent.createMember,
                                status: applicationVm.model.status
                            };
                            //Create tracking application create member
                            memAppTimeLineService.create(appId, appTrackingVerify);
                        }
                    });

                    return memberShipService.update(applicationVm.memberModel).then(function (memRs) {
                        appUtils.hideLoading();
                        if (!memRs.result) {
                            toaster.error('Cannot save membership!');
                        }
                        $scope.itemSelected = applicationVm.model.$id;
                    });
                } else {
                    applicationTrackingObj.message = rs && rs.errorMsg || 'Updated application information has error.';
                    //Create tracking application updated
                    memAppTimeLineService.create(appId, applicationTrackingObj);
                    appUtils.hideLoading();
                    toaster.error(rs.errorMsg);
                }
            });
        }

        function process() {
            appUtils.showLoading();
            _setAppPlans();
            applicationVm.model.status = 1;
            var appTrackingObjProcess = {
                eventType: appUtils.logEvent.editApp,
                message: 'Process - Updated application information.'
            };
            update("Process success!", appTrackingObjProcess).then(function () {
                _reloadGoState();
            });
        }

        function verify() {
            appUtils.showLoading();
            _setAppPlans();
            applicationVm.model.isLocked = true;
            applicationVm.model.isVerified = true;
            applicationVm.model.timestampVerified = appUtils.getTimestamp();
            applicationVm.model.status = 2;
            var appTrackingObjVerify = {
                eventType: appUtils.logEvent.verifyApp,
                message: 'Verify - Updated application information.'
            };
            update("Verify success!", appTrackingObjVerify).then(function () {
                memAppHisService.create(modelsDirtied);
                _reloadGoState();
            });
        }

        function justSave() {
            _setAppPlans();
            applicationVm.model.authorModifier = currentUser.email;
            var stateId = $('[name="appState"]:visible option:selected').attr('data-id');
            applicationVm.model.stateId = !stateId ? '0' : stateId;
            //Application tracking timeline obj
            var appTrackingObjSave = {
                eventType: appUtils.logEvent.editApp,
                status: angular.copy(applicationVm.model.status)
            };

            _setAccountSource(applicationVm.model);
            //always get lastest promo code.
            return memberShipFacilitiesService.get(applicationVm.model.facilityId).then(function (data) {
                if (data && data.facility_promo_code) {
                    // applicationVm.model.facilityCode = data.facility_promo_code;
                }
                //
                return memAppService.update(applicationVm.model).then(function (rs) {
                    if (rs && rs.result) {
                        appTrackingObjSave.message = 'Updated application information.';
                        toaster.success('Save Success!');
                        return memberShipService.update(applicationVm.memberModel);
                    } else {
                        appTrackingObjSave.message = rs && rs.errorMsg || 'Updated application information has error.';
                        return false;
                    }
                }).catch(function (error) {
                    appTrackingObjSave.message = error && error.message || 'Updated application information has error.';
                    return false;
                });
            }).catch(function () {
                return memAppService.update(applicationVm.model).then(function (rs) {
                    if (rs && rs.result) {
                        appTrackingObjSave.message = 'Updated application information.';
                        toaster.success('Save Success!');
                        return memberShipService.update(applicationVm.memberModel);
                    } else {
                        appTrackingObjSave.message = rs && rs.errorMsg || 'Updated application information has error.';
                        return false;
                    }
                }).catch(function (error) {
                    appTrackingObjSave.message = error && error.message || 'Updated application information has error.';
                    return false;
                });
            }).then(function () {
                var trackingId = angular.copy(applicationVm.model.$id);
                memAppTimeLineService.create(trackingId, appTrackingObjSave);
            });
        }

        function unLock() {
            appUtils.showLoading();
            applicationVm.model.isLocked = false;
            applicationVm.model.isVerified = false;
            applicationVm.model.status = 1;
            applicationVm.model.submitting = null;
            var appTrackingObjUnlock = {
                eventType: appUtils.logEvent.unlockApp,
                message: 'Unlock - Updated application information.'
            };
            update("Unlock success!", appTrackingObjUnlock).then(function () {
                _reloadGoState();
            });
        }

        function submit() {
            if (applicationVm.submitting) {
                toaster.warning('This application is submitting');
                return;
            } else if (applicationVm.model.submitting) {
                toaster.warning('This application is submitted');
                return;
            }
            applicationVm.submitting = true;
            appUtils.showLoading();
            return memAppService.lockSubmitApp(applicationVm.model.$id).then(function () {
                var defered;
                return memberShipFacilitiesService.get(applicationVm.model.facilityId).then(function (facilityData) {
                    if (applicationVm.model.state !== applicationVm.memberModel.priMember.mailingAddress.state || !facilityData || !facilityData.facility_id) {
                        appUtils.hideLoading();
                        var submitMsg = 'Member address is not in the same state as selected state. Are you sure you want to continue?';
                        if (facilityData.isActive === false) {
                            submitMsg = 'This Facility is inactive. Are you sure you want to continue?';
                        }
                        defered = $ngBootbox.confirm(submitMsg).then(function () {
                            return _doSubmit(facilityData);
                        }, function () {
                            applicationVm.submitting = false;
                            appUtils.hideLoading();
                        });
                    } else {
                        defered = _doSubmit(facilityData);
                    }
                    return defered;
                });
            }).then(function () {
                applicationVm.submitting = false;
                memAppService.unlockSubmitApp(applicationVm.model.$id);
                appUtils.hideLoading();
                _reloadGoState();
                // $timeout(function () {
                //     $state.go('membership.editApplication', { id: applicationVm.model.$id, 'tab': tab, 'keyword': '', 'start': timestampStart, 'end': timestampEnd, 'page': 0, 'author': clients, 'region': regions, 'reportBy': reportBy , 'sortBy': sortBy});
                // }, 800);
            });
        }

        function refreshStatus() {
            appUtils.showLoading();
            var app = applicationVm.model;
            var memberModel = applicationVm.memberModel;
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
            //Application tracking timeline obj for refresh membership
            var appTrackingObjRefresh = {
                eventType: appUtils.logEvent.refreshApp
            };
            $http({
                method: 'POST',
                url: appSettings.TLSAPIUrl,
                data: $.param(data),
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                logParams: {
                    name: 'Web_RefreshStatus',
                    user: currentUser.username
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
                            applicationVm.model.status = appTrackingObjRefresh.status = 3;
                            applicationVm.memberModel.isActive = false;
                            update('', appTrackingObjRefresh).then(function () {
                                appUtils.hideLoading();
                                _reloadGoState();
                            });
                        }, function () {
                            appUtils.hideLoading();
                        });
                    } else if (result.data.success && result.data.AccountStatus !== '' && result.data.AccountStatus.toLowerCase() == 'approved') {
                        appTrackingObjRefresh.submitResult = 'Success';
                        applicationVm.model.status = appTrackingObjRefresh.status = 4;
                        applicationVm.memberModel.isActive = true;
                        update("This application has been approved!", appTrackingObjRefresh).then(function () {
                            _reloadGoState();
                        });
                    } else {
                        appTrackingObjRefresh.submitResult = 'Failed';
                        appTrackingObjRefresh.message = 'This application has not been approved!';
                        $ngBootbox.confirm('Membership status from TLS API is failed. Do you want to update this status in SmartAdmin?').then(function () {
                            appUtils.showLoading();
                            applicationVm.model.status = appTrackingObjRefresh.status = 3;
                            applicationVm.memberModel.isActive = false;
                            update('', appTrackingObjRefresh).then(function () {
                                appUtils.hideLoading();
                                _reloadGoState();
                            });
                        }, function () {
                            appUtils.hideLoading();
                        });
                    }
                } else {
                    appTrackingObjRefresh.submitResult = 'Failed';
                    appTrackingObjRefresh.message = 'Request refresh application failed';
                    toaster.error('Request failed');
                    $ngBootbox.confirm('Membership status from TLS API is failed. Do you want to update this status in SmartAdmin?').then(function () {
                        appUtils.showLoading();
                        applicationVm.model.status = appTrackingObjRefresh.status = 3;
                        applicationVm.memberModel.isActive = false;
                        update('', appTrackingObjRefresh).then(function () {
                            appUtils.hideLoading();
                            _reloadGoState();
                        });
                    }, function () {
                        appUtils.hideLoading();
                    });
                }
            }).catch(function (err) {
                var rMsg = 'Request refresh application has error.';
                appTrackingObjRefresh.submitResult = 'Failed';
                appTrackingObjRefresh.message = rMsg;
                toaster.error(rMsg);
                $ngBootbox.confirm('Membership status from TLS API is failed. Do you want to update this status in SmartAdmin?').then(function () {
                    appUtils.showLoading();
                    applicationVm.model.status = appTrackingObjRefresh.status = 3;
                    applicationVm.memberModel.isActive = false;
                    update('', appTrackingObjRefresh).then(function () {
                        appUtils.hideLoading();
                        _reloadGoState();
                    });
                });
            });

        }

        function checkIndicator() {
            if (!applicationId || _.trim(applicationId) === '') {
                $scope.indicatorMsgErr = '';
                return;
            }
            var editingBy = '';
            memAppIndicatorService.get(applicationId).then(function (data) {
                if (data && data.editingBy) {
                    //add more user in indicator
                    var uEdited = data.editingBy[currentUser.$id];
                    if (uEdited === undefined) {
                        data.editingBy[currentUser.$id] = {
                            email: currentUser.email || '',
                            userName: currentUser.userName || currentUser.username || '',
                            fullName: (currentUser.firstName || '') + ' ' + (currentUser.lastName || ''),
                            timestampEdited: moment().valueOf()
                        };
                        memAppIndicatorService.update(applicationId, data);
                    }
                } else {
                    //add default user in indicator
                    data = {
                        editingBy: {}
                    };

                    data.editingBy[currentUser.$id] = {
                        email: currentUser.email || '',
                        userName: currentUser.userName || currentUser.username || '',
                        fullName: (currentUser.firstName || '') + ' ' + (currentUser.lastName || ''),
                        timestampEdited: moment().valueOf()
                    };

                    memAppIndicatorService.create(applicationId, data);
                }

                editingBy = _.map(data.editingBy, function (edit) {
                    return edit.fullName || edit.email || edit.userName;
                }).join(', ');

                $scope.indicatorMsgErr = 'This application is being edited by ' + editingBy;
                $timeout(angular.noop, 200);
                //$scope.$emit('indicatorsLoad', null);
            });
        }

        function unCheckIndicator() {
            if (!applicationId || _.trim(applicationId) === '') {
                return;
            }
            memAppIndicatorService.get(applicationId).then(function (data) {
                if (data && data.editingBy) {
                    var uEdited = data.editingBy[currentUser.$id];
                    if (uEdited !== undefined) {
                        delete data.editingBy[currentUser.$id];
                        var keys = Object.keys(data.editingBy);
                        if (keys.length === 0)
                            memAppIndicatorService.remove(applicationId);
                        else
                            memAppIndicatorService.update(applicationId, data);
                    }
                }
            });
        }

        //Modal Functions==============================================
        function popupChangeStatus(item) {
            var modalInstance = $uibModal.open({
                templateUrl: 'app/membership/modal/change-status-app.tpl.html',
                controller: 'ApplicationStatusCtrl as applicationSttVm',
                scope: $scope,
                size: 'md',
                resolve: {
                    currentApp: function () {
                        return item;
                    }
                },
                backdrop: 'static'
            });
        }

        function showPopupTrackingActivities() {
            var modalInstance = $uibModal.open({
                templateUrl: 'app/membership/modal/tracking-activities.tpl.html',
                controller: 'TrackingActivitiesCtrl',
                size: 'lg',
                scope: $scope,
                windowClass: 'tracking-activities-modal',
                backdrop: 'static',
                resolve: {
                    appId: function () {
                        return applicationVm.model.$id;
                    },
                    status: function () {
                        return applicationVm.model.status;
                    }
                }
            });
        }
        var isOriginalImageOpenning = false;

        function showPopupOriginalImage(itemFile) {
            console.log(itemFile);
            var now = Date.now();
            if (now - isOriginalImageOpenning < 1000) {
                return;
            }
            isOriginalImageOpenning = now;
            appUtils.showLoading();
            var status = applicationVm.model.status,
                imgUrl, promise;

            if (itemFile && (parseInt(status) === 1 || parseInt(status) === 7)) {
                promise = $q.when(itemFile.path);
            } else if (itemFile && itemFile.processPath && parseInt(status) !== 1 && parseInt(status) !== 7) {
                var gsReference = firebase.storage().refFromURL(itemFile.processPath);
                promise = firebase.storage().ref().child(gsReference.fullPath).getDownloadURL().then(function (url) {
                    // imgUrl = url;
                    return url;
                }).catch(function (error) {
                    switch (error.code) {
                        case 'storage/object_not_found':
                            // File doesn't exist
                            console.log('File doesnt exist');
                            break;

                        case 'storage/unauthorized':
                            // User doesn't have permission to access the object
                            console.log('User doesnt have permission to access the object');
                            break;

                        case 'storage/canceled':
                            // User canceled the upload
                            console.log('User canceled the upload');
                            break;

                        case 'storage/unknown':
                            // Unknown error occurred, inspect the server response
                            console.log('Unknown error occurred, inspect the server response');
                            break;
                    }
                    return '';
                });
            } else {
                promise = $q.when(itemFile.path);
            }
            // downloadUrl
            promise = promise.then(function (url) {

                return $http.get(url, { responseType: "blob" }).then(function (res) {
                    var urlImg = window.URL.createObjectURL(res.data);
                    return urlImg;
                }, function (error) {
                    console.log(error);
                });
            });
            var templateP = $http.get('app/membership/modal/window-original-image.tpl.html');
            $q.all([promise, templateP]).then(function (res) {
                var imageUrl = res[0],
                    template = res[1].data;
                template = template.replace('{{imageUrl}}', imageUrl);
                var popup = window.open("", "", "width=1200, height=1600");
                if (!popup) {
                    $ngBootbox.alert("Please allow popup on this site");
                    return;
                }
                popup.document.write(template);
            }).finally(function () {
                appUtils.hideLoading();
            });
            // var modalInstance = $uibModal.open({
            //     templateUrl: 'app/membership/modal/popup-original-image.tpl.html',
            //     controller: 'originalImageCtrl',
            //     size: 'lg',
            //     windowClass: 'original-image-modal',
            //     scope: $scope,
            //     backdrop: 'static',
            //     resolve: {
            //         data: function () {
            //             return itemFile;
            //         },
            //         status: function () {
            //             return applicationVm.model.status;
            //         }
            //     }
            // });
        }

        function openPreviewModal(itemFile, idx) {
            appUtils.showLoading();
            var modal = $uibModal.open({
                templateUrl: 'app/membership/modal/preview-app.tpl.html',
                controller: 'PreviewAppCtrl as applicationVm',
                scope: $scope,
                size: 'lg',
                resolve: {
                    currentVersion: function () { return idx + 1; },
                    itemFile: function () {
                        return itemFile;
                    }
                },
                backdrop: 'static',
                windowClass: 'preview-web-app-modal'
            });

            modal.result.then(function () { }, function () {
                window.location.reload();
            });
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
            });
        }

        function _doSubmit(appFacility) {
            appUtils.showLoading();
            var paymentMethod = memAppService.getPaymentMethodTxt(applicationVm.model.paymentMethod),
                regionId = "",
                cardType = "",
                bankAddress = "",
                saleRep = "";
            //handle process data sequencial
            // return memRegionService.getIdByState(applicationVm.model.state).then(function (region_id) {
            //     regionId = region_id;
            //     return;
            // })
            regionId = applicationVm.model.region;
            return $q.when().then(function () {
                if (applicationVm.model.paymentMethod === '0') {
                    if (!applicationVm.model.creditCard.type) {
                        return appUtils.getCardType2(applicationVm.model.creditCard.creditCardNumber).then(function (cardTypeData) {
                            cardType = cardTypeData;
                            return;
                        });
                    } else {
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
                if (applicationVm.model.saleRep && _.trim(applicationVm.model.saleRep) !== '') {
                    saleRep = applicationVm.model.saleRep;
                } else {
                    if (applicationVm.model.representativeCode) {
                        return employeeService.getUserByRepCode(applicationVm.model.representativeCode).then(function (user) {
                            saleRep = applicationVm.model.saleRep = user ? user.firstName + ' ' + user.lastName : '';
                            return;
                        });
                    }
                }
                // if (applicationVm.model.uid) {
                //     return employeeService.getUser(applicationVm.model.uid).then(function (user) {
                //         saleRep = user ? user.firstName + ' ' + user.lastName : '';
                //         return;
                //     });
                // }
            }).then(function () {
                var selectedPriAddons = applicationVm.model.selectedAddOns;
                var addonObj = {},
                    addonObjLog = {},
                    index = 0;
                _.forEach(selectedPriAddons, function (addon, key) {
                    addonObj["data_to_submit[plan_addon_addon_id][" + index + "]"] = addon.addon_id;
                    addonObjLog["plan_addon_addon_id_" + index] = addon.addon_id;
                    index++;
                });

                // var addonIds = _.map(selectedPriAddons, function (addon, index ) {
                //     return addon.addon_id;
                // });
                // console.log('addonIds');
                // console.log(addonIds);
                var app = applicationVm.model,
                    memberModel = applicationVm.memberModel,
                    employeeId = currentUser && currentUser.externalId ? currentUser.externalId : '',
                    repCode = $.trim(applicationVm.model.representativeCode) ? applicationVm.model.representativeCode : currentUser.username.toUpperCase(), //currentUser && currentUser.repCode ? currentUser.repCode : '';
                    isDividual = applicationVm.model.numberOfAdults == '1',
                    // promoCode = appFacility && appFacility.facility_promo_code ? appFacility.facility_promo_code : '',
                    promoCode = app.facilityCode || '',
                    facilityGuid = appFacility && appFacility.facility_affiliate_guid ? appFacility.facility_affiliate_guid : '',
                    memberStateId = '';
                //memberStateId = applicationVm.memberModel.priMember.mailingAddress.state || '';

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

                // isDividual == isInvidual
                var memberAddressPhone = memberModel.priMember && memberModel.priMember.phone && appUtils.formatPhoneNumber(memberModel.priMember.phone) || null,
                    secondaryMemberAddressPhone = memberModel.secMember && memberModel.secMember.phone && appUtils.formatPhoneNumber(memberModel.secMember.phone) || null;

                var data = {
                    "request": "submitSignup",
                    //"data_to_submit[plan_addon_addon_id]": addonIds,
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
                    // "data_to_submit[member_address_phone_type]": "mobile",
                    // "data_to_submit[member_address_phone]": !memberModel.priMember || !memberModel.priMember.phone || memberModel.priMember === null ? "" : memberModel.priMember.phone,
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
                            "data_to_submit[zuora_cc_cvv]": '' //ChangeRequest #21 !app.creditCard || !app.creditCard.cvv || app.creditCard === null ? "" : app.creditCard.cvv,
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

                //Application tracking timeline obj for submit
                var appTrackingObjSubmit = {
                    eventType: appUtils.logEvent.submitApp,
                };

                var appId = angular.copy(applicationVm.model.$id),
                    eventLogPath = '';

                //TLS DoSubmit Call
                var tlsCall = $http({
                    method: 'POST',
                    url: appSettings.TLSAPIUrl,
                    data: $.param(target),
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    logParams: {
                        name: 'Web_Edit_DoSubmitTLSParams',
                        user: currentUser.username,
                        appId: appId
                    }
                }).then(function (result) {
                    var submitR = [];
                    if (result.data && result.data.signupAccountId) {
                        applicationVm.memberModel.accountId = result.data.signupAccountId;
                    }

                    if (appSettings.TLSAPITestMode || (result && result.data && result.data.success)) {
                        appTrackingObjSubmit.submitResult = 'Success';
                        applicationVm.model.status = 4; //3
                        var submitMsg = "Submit success!";
                        // applicationVm.model.status = 8;
                        if (result.data.payment_success === false || applicationVm.model.processPayment === false) {
                            // if(result.data.payment_status = "Billing Required"){
                            applicationVm.model.status = 8; // billing required
                            appTrackingObjSubmit.message = submitMsg = "Submitted success, but can’t do billing now.";
                            // }
                        }
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
                        submitR.push(update(submitMsg, appTrackingObjSubmit));
                    } else {
                        var msg = 'Submit failed!';
                        if (result && result.data && result.data.message !== '') {
                            msg = applicationVm.model.errorMessage = 'TLS API: ' + result.data.message;
                            // if (msg.indexOf('INVALID_VALUE') != -1) {
                            //     msg = 'Submit failed! Please verify this application info.';
                            // } else
                            // if (msg.indexOf('Invalid Account Number') != -1) {
                            //     msg = 'Submit failed! Invalid account number.';
                            // } else
                            // if (msg.indexOf('Account Number Does Not Match Payment') != -1) {
                            //     msg = 'Submit failed! Account number does not match payment.';
                            // }
                        }
                        applicationVm.model.status = 3;
                        applicationVm.model.isLocked = true;
                        //
                        appTrackingObjSubmit.submitResult = 'Failed';
                        appTrackingObjSubmit.message = msg;

                        submitR.push(update('', appTrackingObjSubmit));
                    }
                    return $q.all(submitR);
                }).catch(function (err) {
                    console.log('do submit err');
                    console.log(err);
                    var submitR = [];
                    appTrackingObjSubmit.submitResult = 'Failed';
                    var msg = 'Submit failed!';
                    msg = applicationVm.model.errorMessage = appTrackingObjSubmit.message = 'TLS API: ' + msg;
                    applicationVm.model.status = 3;
                    applicationVm.model.isLocked = true;
                    submitR.push(update('', appTrackingObjSubmit));
                    return $q.all(submitR);
                });

                return tlsCall;
                // });
            });
        }

        function _initAddonCheckboxes() {
            //Set app plans for the members         
            var appForm = $('#edit-web-app');
            var priPlans = appForm.find('.pri-app-plans input[type="checkbox"]:visible');
            _.forEach(priPlans, function (element, key) {
                var me = $(element);
                me.change(function () {
                    // countWatch = 5;
                    _calculateTotal();
                });
            });
        }

        function _calculateTotal() {
            var planItem = applicationVm.model.selectedPlans;
            if (planItem) {
                var priPlan = appUtils.formatNumber(planItem.recurring_price),
                    setupFee = appUtils.formatNumber(planItem.setup_price),
                    discount = 0;

                //Set app plans for the members         
                var appForm = $('#edit-web-app');
                var priPlans = appForm.find('.pri-app-plans input[type="checkbox"]:visible');
                var priAddons = 0;
                //var secAddons = 0;
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

                var priTotal = (priPlan + priAddons);
                var total = priTotal;
                if (!applicationVm.model.waivedSetupFee) {
                    total = priTotal + setupFee;
                }
                applicationVm.model.total.subTotalAmount = appUtils.formatCurrency(priTotal);
                applicationVm.model.total.setupFee = appUtils.formatCurrency(setupFee);
                countWatch++;
                // if (countWatch == 2 || countWatch == 4) {
                //     applicationVm.model.total.totalAmount = appUtils.formatCurrency(totalAmountTmp);
                // } else {
                //     applicationVm.model.total.totalAmount = appUtils.formatCurrency(total);
                // }

                applicationVm.model.total.totalAmount = appUtils.formatCurrency(total);

                $timeout(function () {
                    $scope.$apply();
                }, 500);
                // console.log('countWatch------------');
                // console.log(countWatch);
            }
        }

        function _selectPriPlan(key, planItem) {
            if (key !== undefined && key !== null) {
                if (planItem === undefined) {
                    planItem = applicationVm.statePlans[key];
                }
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

        function _watchPlan() {
            applicationVm.secPlanKey = '';
            applicationVm.stateAddons = [];

            if (!applicationVm.model.total) {
                applicationVm.model.total = {};
            }

            applicationVm.model.total.subTotalAmount = 0;
            applicationVm.model.total.totalAmount = 0;

            var state = applicationVm.model.state,
                region = applicationVm.model.region;


            // var statePlans =  _.find(applicationVm.planItems, function (o) {
            //     return o.$id.toString() == state;
            // });
            var statePlans = state && region && applicationVm.planItemsIndex[state] && applicationVm.planItemsIndex[state][region] || [];

            applicationVm.statePlans = statePlans;
            if (applicationVm.model.total) {
                applicationVm.model.total.startUpFee = '19.95';
            }

            if (applicationVm.memberModel) {
                if (applicationVm.memberModel.priMember && (!applicationVm.memberModel.priMember.memberId || applicationVm.memberModel.priMember.memberId === '')) {
                    applicationVm.memberModel.priMember.memberId = state;
                }
                if (applicationVm.model.numberOfAdults == '2' && applicationVm.memberModel.secMember && (!applicationVm.memberModel.secMember.memberId || applicationVm.memberModel.secMember.memberId === '')) {
                    applicationVm.memberModel.secMember.memberId = state;
                }
            }

            var numberOfAdult = _.find(applicationVm.appNumAdultsList, function (o) {
                return o.key == applicationVm.model.numberOfAdults;
            });
            /* jshint ignore:start */
            // var appPlan = _.find(statePlans, function (o, key) {
            //     if (o !== null && !angular.isUndefined(o["cycle_id"]) && o["cycle_id"] == applicationVm.model.cycle && numberOfAdult && ((o["name"] !== '' && o["name"].toLowerCase().indexOf(numberOfAdult.value.toLowerCase()) != -1) || (o["sku"] !== '' && o["sku"].indexOf(numberOfAdult.value.toLowerCase()) != -1))) {
            //         o.key = key;
            //         return true;
            //     } else {
            //         return false;
            //     }
            // });
            /* jshint ignore:end */
            var appPlans = {};
            // console.log('sala--------');
            // console.log(applicationVm.model.cycle);
            // console.log(statePlans);


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
            // var appPlan;
            // 
            // if (!angular.isUndefined(appPlan)) {
            //     _selectPriPlan(appPlan.key, appPlan);
            // }
        }

        function _loadAppAddons(key, planItem) {
            var state = applicationVm.model.state,
                region = applicationVm.model.region,
                regionCode = applicationVm.model.regionCode,
                numberOfAdults = applicationVm.model.numberOfAdults,
                planNum = applicationVm.model.cycle;
            // console.log(applicationVm.addonItemsIndex);
            var stateAddons = state && region && applicationVm.addonItemsIndex[state][region];
            var addonArr = _.filter(stateAddons, function (o, key) {
                // if(regionCode == 'sec'){
                //     return false;
                // }
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
            // console.log('planNum', planNum);
            // console.log('stateAddOns');
            // console.log(stateAddons);
            // console.log('addonArr');
            // console.log(addonArr);
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

            // var stateAddons = _.find(applicationVm.addonItems, function (o) {
            //     return o.$id == applicationVm.model.state;
            // });
            // var planNum = parseInt(applicationVm.model.cycle);
            // var arrAddons = [];
            // _.forEach(stateAddons, function (o, key) {
            //     if (o !== null && o.cycle_id !== null && o.cycle_id == planNum) {
            //         o.key = key;
            //         if (applicationVm.model.numberOfAdults == '1') {
            //             if ((o.rate_name && o.rate_name !== '' && (o.rate_name.toLowerCase().indexOf('spouse') != -1) || o.rate_name.toLowerCase().indexOf('partner') != -1) || (o.sku && o.sku !== '' && (o.sku.toLowerCase().indexOf('spouse') != -1) || o.sku.toLowerCase().indexOf('partner') != -1)) {

            //             } else {
            //                 arrAddons.push(o);
            //             }
            //         } else {
            //             arrAddons.push(o);
            //         }
            //     }
            // });
            // applicationVm.stateAddons = arrAddons;
            // applicationVm.model.total.setupFee = appUtils.formatNumber(planItem.setup_price);
            // if (planItem.name.toLowerCase().indexOf('couple') != -1) {
            //     applicationVm.secPlanKey = key;
            // } else {
            //     applicationVm.secPlanKey = '';
            // }

            // $timeout(function () {
            //     _calculateTotal(); //Calculate total amount
            //     _initAddonCheckboxes(); //Init addon checboxes
            // }, 1000);



        }

        function _setAppPlans() {
            applicationVm.model.selectedAddOns = {};
            var priPlans = $('#edit-web-app .pri-app-plans input[type="checkbox"]:visible');
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

        // Turn off highlight onto image document
        function _clearSelected() {
            for (var key in $scope.mapping) {
                if ($scope.mapping[key]) {
                    $scope.mapping[key].selected = false;
                }
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

        function _initVerifyAddressPaymentCheck() {
            //init bank address
            if (applicationVm.model.paymentMethod && applicationVm.model.paymentMethod === '2') {
                $scope.bankAddressInvalid = true;
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
        }

        function _initFileModel(imgFile, mediaId) {
            //Create physical files
            if (!applicationVm.model.physicalFiles) {
                applicationVm.model.physicalFiles = [];
            }
            applicationVm.fileModel = {};
            applicationVm.fileModel.id = applicationVm.fileModel.timestampCreated = appUtils.getTimestamp();
            applicationVm.fileModel.fileName = imgFile.fileName;
            applicationVm.fileModel.path = imgFile.downloadUrl;
            applicationVm.fileModel.status = 0;
            applicationVm.fileModel.isSelected = false;
            applicationVm.fileModel.processedAt = null;
            applicationVm.fileModel.mediaId = mediaId;
            applicationVm.model.physicalFiles.push(applicationVm.fileModel);
        }

        var messFlag = false;

        function showMessageUpdateInfo(snapshot) {
            var data = snapshot.val() || null;
            // console.log('is Subbmitting ------');
            if (initModel && data !== null && data.authorModifier && data.authorModifier !== currentUser.email && applicationVm.model.timestampModified !== data.timestampModified) {
                var staff = _.find(applicationVm.employees, { email: data.authorModifier });
                if (staff) {
                    var name = staff.firstName !== '' && staff.lastName !== '' ? (staff.firstName + ' ' + staff.lastName) : (staff.username || staff.userName || staff.email);
                    var modifiedTime = moment(data.timestampModified).fromNow();
                    var updateMess = 'This application have been edited by';
                    if (data.submitting) {
                        updateMess = 'This application have been submitted by';
                    }
                    if (!messFlag) {
                        messFlag = true;
                        $ngBootbox.alert(updateMess + ' ' + name + ' ' + modifiedTime).then(function () {
                            messFlag = false;
                            $state.reload();
                        });
                    }
                }
            }
        }

        function onValuePhysicalFiles(snapshot) {
            var data = snapshot.val() || null;
            if (initModel && data) {
                var index = null;
                var processFile = _.find(applicationVm.model.physicalFiles, function (item, key) {
                    index = key;
                    return item.mediaId === data.mediaId;
                });

                if (processFile !== undefined && processFile.status !== data.status) {
                    applicationVm.model.physicalFiles[index] = data;
                    $timeout(angular.noop, 300);
                }

                if (data.status === 3 || processFile === undefined) {
                    physicalFilesRef[data.mediaId].off('value', onValuePhysicalFiles);
                }
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

        function _reloadGoState() {
            var tab = [1, 2, 3, 4, 6].indexOf(applicationVm.model.status) !== -1 ? applicationVm.model.status : -1;
            if ($scope.userPermission.isAdmin || $scope.userPermission.viewAllApplication) {
                alias = null;
            }
            $timeout(function () {
                $state.go('membership.editApplication', { id: applicationVm.model.$id, 'tab': tab, 'keyword': '', 'start': timestampStart, 'end': timestampEnd, 'page': 0, 'author': clients, 'alias': alias, 'state': states, 'plantype': plantypes, 'reportBy': reportBy, 'sortBy': sortBy });
            }, 800);
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

        function membershipOverwrite() {
            $ngBootbox.confirm('Are you sure want to overwrite membership?').then(function () {
                _membershipOverwrite();
            });
        }

        function _membershipOverwrite() {
            //console.log(applicationVm.memberModel);
            var cardType = "";
            applicationVm.model.status = 8; // Billing Required

            var cartTypeR = $q.when();

            if (applicationVm.model.paymentMethod === '0') {
                if (!applicationVm.model.creditCard.cardType) {
                    cartTypeR = appUtils.getCardType2(applicationVm.model.creditCard.creditCardNumber).then(function (cardTypeData) {
                        cardType = cardTypeData;
                        return;
                    });
                } else {
                    cardType = applicationVm.model.creditCard.cardType;
                }
            }
            // suplement data
            return cartTypeR.then(function () {
                if (applicationVm.model.creditCard) {
                    var cvv = applicationVm.model.creditCard.cvv;
                    var cardNumber = applicationVm.model.creditCard.creditCardNumber;
                    applicationVm.model.creditCard.cvv = cvv.replace(/[^A-Z]/g, '*');
                    applicationVm.model.creditCard.creditCardNumber = cardNumber.substring(0, cardNumber.length - 4).replace(/[^A-Z]/g, '*') + cardNumber.substring(cardNumber.length - 4, cardNumber.length);
                    if (cardType) {
                        applicationVm.model.creditCard.cardType = cardType;
                    }
                }
                if (applicationVm.model.check) {
                    var routingNumber = applicationVm.model.check.routingNumber;
                    var accountNumber = applicationVm.model.check.accountNumber;
                    applicationVm.model.check.routingNumber = routingNumber.substring(0, routingNumber.length - 4).replace(/[^A-Z]/g, '*') + routingNumber.substring(routingNumber.length - 4, routingNumber.length);
                    applicationVm.model.check.accountNumber = accountNumber.substring(0, accountNumber.length - 4).replace(/[^A-Z]/g, '*') + accountNumber.substring(accountNumber.length - 4, accountNumber.length);
                }
                // tracking data
                var appTrackingObjSubmit = {
                    eventType: appUtils.logEvent.membershipOverwrite,
                    status: applicationVm.model.status,
                    message: 'Membership Overwrite success'
                };
                applicationVm.memberModel.overwrite = true;
                applicationVm.model.overwrite = true;
                applicationVm.model.isLocked = true;
                // change status;
                // submitR.push(update("Membership Overwrite success!", appTrackingObjSubmit));

                return update("Membership Overwrite success!", appTrackingObjSubmit).then(function () {
                    _reloadGoState();
                });
            });

        } // end membershipOverwrite 

        function cancelAccount() {
            $ngBootbox.confirm('Are you sure you want to Cancel this account?').then(function () {
                _cancelAccount();
            });
        }

        function _cancelAccount() {
            var request = [];
            applicationVm.model.status = 6; // Canceled
            applicationVm.model.authorModifier = currentUser.email;
            var updateApplicationReq = memAppService.update(applicationVm.model);
            var appTrackingUpdate = {
                eventType: appUtils.logEvent.changeStatus,
                status: applicationVm.model.status,
                message: 'Change application status success.'
            };
            var addTimelineReq = memAppTimeLineService.create(applicationVm.model.$id, appTrackingUpdate);

            return $q.all([updateApplicationReq, addTimelineReq]).then(function () {
                _reloadGoState();
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
            } else if (model.sourceOther) {
                model.sourceSeminar = model.sourceClass = model.sourceGunShow = false;
                applicationVm.accountSource = 'Other';
            }
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
        //===================================================================================================================================

        // function create() {
        //     applicationVm.model.priority = false;
        //     var stateId = $('[name="appState"]:visible option:selected').attr('data-id');
        //     applicationVm.model.stateId = !stateId ? '0' : stateId;
        //     //always get lastest promo code.
        //     memberShipFacilitiesService.get(applicationVm.model.facilityId).then(function (data) {
        //         if (data && data.facility_promo_code) {
        //             applicationVm.model.facilityCode = data.facility_promo_code;
        //         }
        //         //
        //         _createApplication();
        //     }).catch(function () {
        //         _createApplication();
        //     });
        // }

        // function _createApplication() {
        //     memAppService.create(applicationVm.model).then(function (rs) {
        //         if (rs.result) {
        //             //Create application timeline
        //             var appTimeline = {
        //                 authorName: currentUser.email,
        //                 eventType: appUtils.logEvent.createApp,
        //                 eventId: '',
        //                 submitResult: '',
        //                 message: '',
        //                 from: 'Admin Site'
        //             };
        //             memAppTimeLineService.create(rs.id, appTimeline);

        //             applicationVm.model.$id = rs.id;
        //             //Create file process queue
        //             var processQueueModel = {};
        //             processQueueModel['0'] = 0;
        //             memProcessQueueService.create(rs.id, processQueueModel).then(function (createRs) {
        //                 if (!createRs.result) {
        //                     toaster.error('Cannot create process queue!');
        //                 }
        //             });
        //             _createMember(rs.id);
        //             toaster.success("Save success! please wait a moment to process data.");
        //             setTimeout(function () {
        //                 $state.go('membership.editApplication', { id: rs.id, tab: -1 });
        //             }, 3500);
        //         } else {
        //             toaster.error(rs.errorMsg);
        //         }
        //     });
        // }

        // function _createMember(appId) {
        //     applicationVm.memberModel.apps = [];
        //     applicationVm.memberModel.apps.push(appId);
        //     applicationVm.memberModel.isActive = false;
        //     memberShipService.create(applicationVm.memberModel).then(function (memRs) {
        //         if (!memRs.result) {
        //             toaster.error('Cannot save membership!');
        //         } else {
        //             applicationVm.model.membershipId = memRs.id;
        //             memAppService.updateMemberShipId(appId, memRs.id).then(function (rs) {
        //                 //Create application timeline
        //                 var appTimeline = {
        //                     authorName: currentUser.email,
        //                     eventType: appUtils.logEvent.editApp,
        //                     eventId: '',
        //                     submitResult: '',
        //                     message: !rs.result ? rs.errorMsg : '',
        //                     from: 'Admin Site'
        //                 };
        //                 memAppTimeLineService.create(appId, appTimeline);
        //             });
        //         }
        //     });
        // }

        // function _createByUploadFile() {
        //     applicationVm.memberModel = {};
        //     applicationVm.model.selectedAddOns = {};
        //     applicationVm.memberModel.secMember = {};
        //     applicationVm.memberModel.priMember = {};

        //     applicationVm.model.uid = currentUser.$id;
        //     applicationVm.model.authorName = currentUser.email;
        //     //
        //     applicationVm.memberModel.uid = currentUser.$id;
        //     applicationVm.memberModel.authorName = currentUser.email;
        //     applicationVm.memberModel.timestampCreated = appUtils.getTimestamp();

        //     //Create new an application
        //     create();
        // }

        // function _initModel() {
        //     applicationVm.model = {
        //         state: '',
        //         status: 0,
        //         sourceSeminar: false,
        //         sourceClass: false,
        //         sourceGunShow: false,
        //         sourceOther: false,
        //         processOnSwiper: 'false',
        //         startUp: '',
        //         creditCard: {
        //             name: '',
        //             creditCardNumber: '',
        //             month: '',
        //             year: '',
        //             cvv: '',
        //             zipCode: ''
        //         },
        //         physicalFiles: [],
        //         total: {
        //             subTotalAmount: 0,
        //             setupFee: 0,
        //             totalAmount: 0
        //         },
        //         signature: false,
        //         signatureDate: '',
        //         representativeCode: '',
        //         facilityCode: '',
        //         facilityId: '',
        //         isVerified: false,
        //         selectedPlans: {},
        //         selectedAddOns: {},
        //         isLocked: false,
        //         numberOfAdults: '',
        //         cycle: '',
        //         stateId: '',
        //         paymentMethod: '0',
        //         cashAmount: 0,
        //         cashOption: '',
        //         check: {
        //             accountNumber: '',
        //             routingNumber: '',
        //             type: 'BusinessChecking',
        //             address: '',
        //             state: '',
        //             city: '',
        //             zipCode: '',
        //             name: '',
        //             fullName: ''
        //         }
        //     };
        //     //Set representativeCode for model   
        //     applicationVm.model.representativeCode = currentUser && currentUser.repCode ? currentUser.repCode : '';
        //     _initMemberModel();
        // }

        // function _initMemberModel() {
        //     //Member model
        //     applicationVm.memberModel = {};
        //     applicationVm.memberModel.apps = [];
        //     //Primary member
        //     applicationVm.memberModel.priMember = {
        //         memberId: '',
        //         firstName: '',
        //         lastName: '',
        //         email: '',
        //         phone: '',
        //         mailingAddress: {
        //             address: '',
        //             city: '',
        //             state: '',
        //             zipCode: ''

        //         }
        //     };

        //     //Secondary member
        //     applicationVm.memberModel.secMember = {
        //         memberId: '',
        //         firstName: '',
        //         lastName: '',
        //         email: '',
        //         phone: ''
        //     };
        //     applicationVm.memberModel.isActive = false;
        //     applicationVm.memberModel.accountId = '';
        // }
        //===================================================================================================================================================================
        // function unCheckAddons() {
        //     var appForm = $('#edit-web-app');
        //     var priPlans = appForm.find('.pri-app-plans input[type="checkbox"]');
        //     _.forEach(priPlans, function(element, key) {
        //         $(element).attr('checked', false);
        //     });
        //     var secPlans = appForm.find('.sec-app-plans input[type="checkbox"]');
        //     _.forEach(secPlans, function(element, key) {
        //         $(element).attr('checked', false);
        //     });
        // }

        // function autoFocus() {
        //     //Implement auto focus
        //     var focusElements = $('[auto-focus]:visible');
        //     _.forEach(focusElements, function(e, key) {
        //         var me = $(e);
        //         var length = me.attr('length');
        //         var toElement = me.attr('to-element');
        //         me.keydown(function(e) {
        //             var str = me.val().replace(/_/g, '');
        //             if (e.keyCode != 35 && e.keyCode != 36 && e.keyCode != 37 && e.keyCode != 38 && e.keyCode != 39 && e.keyCode != 40 && e.keyCode != 8 && e.keyCode != 46 && str.length >= length) {
        //                 $('[name=' + toElement + ']:visible').focus();
        //             }
        //         });
        //     });
        // }

        // function loadCanvas(dataURL,index) {
        //     var canvas = document.getElementById('canvas-img-' + index);
        //     var context = canvas.getContext('2d');
        //     // load image from data url
        //     var imageObj = new Image();
        //     imageObj.onload = function() {
        //         canvas.width=1200;
        //         canvas.height=1600;
        //         context.drawImage(imageObj,0,0,imageObj.width,imageObj.height,0,0,1200,1600);
        //     };

        //     imageObj.src = "data:image/png;base64," + dataURL;
        // }

        // function downloadImg(url,index){
        //     var xhr = new XMLHttpRequest();
        //     xhr.open('GET', url, true);
        //     xhr.responseType = 'arraybuffer';
        //     xhr.onload = function(e) {
        //         if (this.status == 200) {
        //             var uInt8Array = new Uint8Array(this.response);
        //             var i = uInt8Array.length;
        //             var binaryString = new Array(i);
        //             while (i--)
        //             {
        //                 binaryString[i] = String.fromCharCode(uInt8Array[i]);
        //             }
        //             var data = binaryString.join('');

        //             var base64 = window.btoa(data);
        //             loadCanvas(base64,index);
        //         }
        //     };
        //     xhr.send();
        // }
    }
})();