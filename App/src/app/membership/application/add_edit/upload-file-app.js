(function () {
    'use strict';

    angular.module('app.membership')
        .controller('AddAppOCRCtrl', AddAppOCRCtrl);

    /** @ngInject */
    function AddAppOCRCtrl($rootScope, $scope, $q, $timeout, toaster, appUtils, DataUtils, authService, appEventLogService, pdfProcessQueueService, memAppService, membershipMediaService, memberShipService, $uibModal, memStateService, memberShipFacilitiesService, eventQueueService, memAppTimeLineService, employeeLogService, memProcessQueueService, employeeService, firebaseDataRef, eventUploadLogsService, memRegionService, memTerritoryService) {
        $rootScope.settings.layout.pageSidebarClosed = true;
        $scope.userPermission = $rootScope.storage.statePermission;
        var currentUser = authService.getCurrentUser(), //$rootScope.storage.currentUser,
            logName = '',
            applicationVm = this,
            deviceInfo = {
                os: '',
                appVersion: '',
                buildVersion: '',
                geoCode: '',
                osVersion: '',
                deviceName: ''
            },
            fileCount = 0,
            eLogs = {};

        if (currentUser && currentUser.username) {
            logName = currentUser.username;
        } else {
            logName = currentUser.email.replace(/[^a-zA-Z0-9]/g, '_');
        }
        //Variable
        applicationVm.showInvalid = false;
        applicationVm.initPopup = false;
        applicationVm.initSeclectEvent = false;
        applicationVm.facilityTxt = '';
        applicationVm.eventTxt = '';
        applicationVm.appStatelist = [];
        applicationVm.appFacilityItems = [];
        applicationVm.regionGroups = {};
        applicationVm.enablePromoCode = true;
        applicationVm.facilityCode = '';
        applicationVm.employeeSelected = {
            employeeId: currentUser.$id || '',
            repCode: currentUser.repCode || '',
            saleRep: currentUser ? currentUser.firstName + ' ' + currentUser.lastName : ''
        };

        //Common Functions
        applicationVm.close = close;
        applicationVm.getState = getState;
        applicationVm.changeRegion = changeRegion;
        applicationVm.changeState = changeState;
        applicationVm.showPopupFacilityList = showPopupFacilityList;
        applicationVm.showPopupEventList = showPopupEventList;
        applicationVm.showPopupEmployeeList = showPopupEmployeeList;
        $scope.selectFacility = selectFacility;
        //Init Dropzone
        applicationVm.dz = {};
        applicationVm.dzOptions = {
            url: 'application/',
            firebaseStorage: true,
            parallelUploads: 100,
            acceptedFiles: 'image/jpeg, images/jpg, image/png, application/pdf'
        };

        $scope.$on('$destroy', function () {
            var offLogs = angular.copy(eLogs);
            _.forEach(offLogs, function (value, key) {
                firebaseDataRef.child(key).off('value');
            });
        });

        $scope.$watch('applicationVm.state', function (newValue, oldValue) {
            // if(newValue && oldValue && _.trim(newValue) !== _.trim(oldValue)){
            //     applicationVm.region = applicationVm.regionCode = "";
            // }
            if (_.trim(newValue) !== _.trim(oldValue)) {
                var autoSelect = applicationVm.regionGroups[newValue];
                if (autoSelect && autoSelect.length === 1) {
                    applicationVm.region = autoSelect[0].id;
                    applicationVm.regionCode = autoSelect[0].code;
                    changeRegion();
                } else {
                    applicationVm.region = applicationVm.regionCode = '';
                }
            }
        });


        applicationVm.dzCallbacks = {
            'addedfile': function (file) { },
            'success': function (file, response) {
                var fileLength = applicationVm.dz.getAllFiles().length;
                appUtils.hideLoading();
                var snapshot = {};
                _.each(response, function (task, key) {
                    snapshot[key] = task.snapshot;
                });

                var metadata = angular.copy(snapshot.ori.metadata);

                var createObj = {
                    downloadUrl: angular.copy(snapshot.ori.downloadURL),
                    application: _initModel(),
                    membership: _initMemberModel(),
                    deviceInfo: deviceInfo,
                    status: 0,
                    logPath: '',
                    mediaId: '',
                    timestampUploaded: moment().format('x')
                };

                createObj.application.representativeCode = applicationVm.employeeSelected.repCode;
                createObj.application.saleRep = applicationVm.employeeSelected.saleRep;

                //create flag Image Upload or PDF Upload
                var pdf = false;
                if (metadata.contentType === 'application/pdf') {
                    pdf = true;
                }
                //create employee-log object
                var employeeLog = {
                    status: 'Success',
                    fileInfo: {
                        fileName: metadata.name,
                        originalName: angular.copy(file.name),
                        fileSize: metadata.size,
                        fileType: metadata.contentType,
                        repCode: currentUser.username || currentUser.repCode,
                        state: applicationVm.state,
                        region: applicationVm.region,
                        regionCode: applicationVm.regionCode,
                        facility: applicationVm.facilityObj,
                        eventId: angular.copy(applicationVm.eventId || '')
                    },
                    action: pdf ? appUtils.logEmployeeAction.uploadPDF.value : appUtils.logEmployeeAction.uploadImage.value,
                    updateBy: currentUser.email || ''
                };
                //create application-media model object
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
                    "appId": '',
                    "storageLocation": 'gs://' + metadata.bucket + '/' + metadata.fullPath,
                    "type": metadata.contentType,
                    "originalName": file.name || ''
                };

                //create app-event-logs object
                var eventLog = {
                    fileName: imgFile.originalName || '',
                    fileType: imgFile.fileType || '',
                    success: true,
                    message: '',
                    appId: '',
                    pdfQueueId: '',
                    filePath: imgFile.storageLocation || '',
                    downloadUrl: imgFile.downloadUrl || '',
                };

                //create app-event-logs
                appUtils.showLoading();
                return appEventLogService.create(eventLog, 'Web_FormsUpload', logName).then(function (appEventRes) {
                    var result = appEventRes && appEventRes.result || false;
                    if (result) {
                        createObj.logPath = appEventRes.id;
                    }
                    return result;
                }).then(function (rs) {
                    if (!rs) {
                        appUtils.hideLoading();
                        return;
                    }
                    //create membership-media
                    return membershipMediaService.addFile(imgFile).then(function (res) {
                        if (!res.result) {
                            return null;
                        }
                        return res.fileKey;
                    }).catch(function (err) {
                        return null;
                    }).then(function (mediaId) {
                        var req = $q.when();
                        if (mediaId) {
                            createObj.mediaId = employeeLog.fileInfo.mediaId = mediaId;
                            //init File Data
                            var imgData = _initFileModel(imgFile, createObj.mediaId);
                            createObj.application.physicalFiles = [];
                            createObj.application.physicalFiles.push(imgData);
                        } else {
                            //employeeLog.status = "Failed";
                            employeeLog.errorMessage = "Create file media data has erred.";
                            //update status & message app-event-logs if create membership-media has error.
                            req = appEventLogService.update(createObj.logPath, {errorMessage: 'Create file media data has erred.' });
                        }
                        return req;
                    }).then(function () {
                        //create employee-logs
                        return employeeLogService.create(currentUser.$id, employeeLog).then(function (employeeLogRes) {
                            var result = employeeLogRes && employeeLogRes.result || false;
                            if (result) {
                                $scope.$broadcast('refreshEmployeeLogsList');
                                var ePath = angular.copy(employeeLogRes.id) || null;
                                if (ePath) {
                                    //create listen on value in employee-logs path for show status
                                    createObj.employeeLogsPath = ePath;
                                    //create linked event upload with employee upload
                                    return eventUploadLogsService.create(angular.copy(applicationVm.eventId), ePath).then(function () {
                                        var path = 'employee-logs/' + ePath;
                                        eLogs[path] = firebaseDataRef.child(path);
                                        eLogs[path].on('value', function (snap) {
                                            var onValue = snap.val();
                                            onValue.timestampCreated = snap.key;
                                            $scope.$broadcast('refreshDetails', onValue);
                                        });
                                        if (!employeeLog.errorMessage || employeeLog.errorMessage !== "Create file media data has erred.") {
                                            return { result: true, media: true };
                                        }
                                        return { result: false };
                                    });
                                }
                            }
                            return { result: false };
                        });
                    }).then(function (res) {
                        if (res && res.result && res.media) {
                            var delay = fileCount++ * 20;
                            $timeout(function () {
                                _create(createObj, pdf);
                            }, delay);
                            // reset file count 
                            if (fileCount == fileLength) {
                                fileCount = 0;
                            }
                        } else {
                            appUtils.hideLoading();
                        }
                    });
                }).catch(function () {
                    appUtils.hideLoading();
                });

                // membershipMediaService.addFile(imgFile).then(function(res) {
                //     if (res.result) {
                //         createObj.mediaId = employeeLog.fileInfo.mediaId = res.fileKey;
                //         appUtils.showLoading();
                //         var eventLog = {
                //             fileName: imgFile.originalName || '',
                //             fileType: imgFile.fileType || '',
                //             success: true,
                //             message: '',
                //             appId: '',
                //             pdfQueueId: '',
                //             filePath: imgFile.storageLocation || '',
                //             downloadUrl: imgFile.downloadUrl || '',
                //         };

                //         appEventLogService.create(eventLog, 'Web_FormsUpload', logName).then(function(eRs) {
                //             if (eRs.result === true) {
                //                 createObj.logPath = eRs.id;
                //             }

                //             //init File Data
                //             var imgData = _initFileModel(imgFile, createObj.mediaId);
                //             createObj.application.physicalFiles = [];
                //             createObj.application.physicalFiles.push(imgData);

                //             //Image Upload
                //             var pdf = false;
                //             if (imgFile.fileType === 'application/pdf') {
                //                 //handle Upload PDF
                //                 pdf = true;
                //             }
                //             employeeLog.action = pdf ? appUtils.logEmployeeAction.uploadPDF.value : appUtils.logEmployeeAction.uploadImage.value;
                //             employeeLog.updateBy = currentUser.email || '';
                //             employeeLogService.create(currentUser.$id, employeeLog).then(function(rs) {
                //                 $scope.$broadcast('refreshEmployeeLogsList');
                //                 createObj.employeeLogsPath = rs && rs.id || null;
                //                 if (applicationVm.eventId) {
                //                     eventUploadLogsService.create(angular.copy(applicationVm.eventId), rs && rs.id || null);
                //                 }
                //                 if (rs && rs.id) {
                //                     var path = 'employee-logs/' + rs.id;
                //                     eLogs[path] = firebaseDataRef.child(path);
                //                     eLogs[path].on('value', function(snap) {
                //                         //console.log('=========snap.val()');
                //                         var onValue = snap.val();
                //                         onValue.timestampCreated = snap.key;
                //                         $scope.$broadcast('refreshDetails', onValue);
                //                     });
                //                 }
                //                 var delay = fileCount++ * 20;
                //                 $timeout(function() {
                //                     _create(createObj, pdf);
                //                 }, delay);
                //                 // reset file count 
                //                 if (fileCount == fileLength) {
                //                     fileCount = 0;
                //                 }
                //             });
                //         });
                //         //console.log('Add File Info To Database Successfully!');
                //     } else {
                //         //console.log('Add File Info To Database: ' + res.errorMsg);
                //     }
                // });
            },
            'error': function (file, err) {
                console.log('upload application has error');
                console.log(err);
                var all = [];
                //create app-event-logs object
                var eventLog = {
                    fileName: file.name,
                    appId: '',
                    success: false,
                    filePath: '',
                    downloadUrl: '',
                };
                eventLog.message = eventLog.errorMessage = err &&  err.message || 'Upload file has error.';
                //call create app-event-logs
                all.push(appEventLogService.create(eventLog, 'Web_FormsUpload', logName));

                //create employees-logs object
                var employeeLog = {
                    status: 'Failed',
                    fileInfo: {
                        fileName: file.name,
                        originalName: file.name,
                        fileSize: file.size,
                        fileType: file.type,
                        repCode: currentUser.username || currentUser.repCode,
                        state: applicationVm.state,
                        region: applicationVm.region,
                        regionCode: applicationVm.regionCode,
                        facility: applicationVm.facilityObj,
                        eventId: angular.copy(applicationVm.eventId || '')
                    }
                };
                
                employeeLog.message = employeeLog.errorMessage = err &&  err.message || 'Upload file has error.';
                employeeLog.action = file.type === 'application/pdf' ? appUtils.logEmployeeAction.uploadPDF.value : appUtils.logEmployeeAction.uploadImage.value;
                employeeLog.updateBy = currentUser.email || '';
                //call create employees-logs
                all.push(employeeLogService.create(currentUser.$id, employeeLog).then(function (rs) {
                    if (applicationVm.eventId) {
                        return eventUploadLogsService.create(angular.copy(applicationVm.eventId), rs && rs.id || null);
                    }
                }));
                return Promise.all(all);
            }
        };

        initModal();
        //Functions
        function initModal() {
            var reqs = [];
            //reqs.push(_initModel());
            reqs.push(_getCommonData());
            reqs.push(_getDeviceInfo());
            $q.all(reqs).then(function () {
                $timeout(angular.noop, 800);
            });
        }

        function _getDeviceInfo() {
            return appUtils.getDeviceInfo().then(function (rs) {
                deviceInfo = {
                    os: rs.os || '',
                    appVersion: rs.appVersion || '',
                    buildVersion: rs.buildVersion || '',
                    geoCode: rs.geoCode || '',
                    osVersion: rs.browser_version || '',
                    deviceName: rs.browser
                };
            });
        }

        function _getCommonData() {
            var reqs = [];
            reqs.push(memberShipFacilitiesService.itemsLoadOnce().then(function (data) {
                applicationVm.appFacilityItems = data;
                $timeout(angular.noop, 200);
            }));

            reqs.push(memStateService.getAll().then(function (data) {
                applicationVm.appStatelist = data;
                $timeout(angular.noop, 200);
            }));

            reqs.push(memTerritoryService.getAllTerritoryLoadOnce().then(function (data) {
                applicationVm.allTerritories = data;
                $timeout(angular.noop, 200);
            }));

            reqs.push(memRegionService.getAll().then(function (regionGroups) {
                _.each(regionGroups, function (regionGroup, stateCode) {
                    regionGroups[stateCode] = DataUtils.toAFArray(regionGroup);
                });
                applicationVm.regionGroups = regionGroups;
                $timeout(angular.noop, 200);
            }));

            return Promise.all(reqs);
        }

        function _initModel() {
            var model = {
                status: 0,
                sourceSeminar: false,
                sourceClass: false,
                sourceGunShow: false,
                sourceOther: false,
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
                signatureDate: moment().format('MM/DD/YYYY'),
                representativeCode: '',
                saleRep: '',
                facilityCode: '',
                facilityId: '',
                eventId: '',
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
                    type: 'BusinessChecking',
                    address: '',
                    state: '',
                    city: '',
                    zipCode: '',
                    name: '',
                    fullName: ''
                }
            };
            model.state = '';
            model.region = '';
            model.regionCode = '';
            //model.representativeCode = '';
            // if (currentUser && currentUser.repCode) {
            //     model.representativeCode = currentUser.repCode;
            // }

            model.method = 1;
            model.uid = currentUser.$id;
            model.authorName = currentUser.email;
            var timestamp = moment(model.signatureDate).startOf('day').valueOf();
            model.timestampSignatured = timestamp;
            return model;
        }

        function _initMemberModel() {
            var memberModel = {};
            memberModel.apps = [];
            memberModel.isActive = false;
            memberModel.accountId = '';

            //Primary member
            memberModel.priMember = {
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

            //Secondary member
            memberModel.secMember = {
                memberId: '',
                firstName: '',
                lastName: '',
                email: '',
                phone: ''
            };

            memberModel.uid = currentUser.$id;
            memberModel.authorName = currentUser.email;

            return memberModel;
        }

        function changeState() {
            applicationVm.initPopup = false;
            applicationVm.initSeclectEvent = false;
        }

        function changeRegion() {
            var region = _.find(applicationVm.regionGroups[applicationVm.state], function (item) {
                return item.id === applicationVm.region;
            });
            applicationVm.regionCode = region && region.code || $('[name="planType"]:visible option:selected').attr('data-code') || '';
            applicationVm.enablePromoCode = region.settings && region.settings.enable_promo_code === false ? false : true;
        }

        function getState(value) {
            var state = _.find(applicationVm.appStatelist, function (item) {
                return item.iso === value;
            });

            return state && state.name || '';
        }

        function showPopupFacilityList(state) {
            if (!state || state === '') {
                applicationVm.initPopup = true;
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
                        return applicationVm.appFacilityItems;
                    },
                    facilityId: function () {
                        return applicationVm.facilityId;
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
                        return applicationVm.eventId;
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
                        return angular.copy(applicationVm.facilityId);
                    }
                }
            });

            modalInstance.result.then(function (event) {
                applicationVm.eventId = angular.copy(event && event.$id || '');
                applicationVm.eventTxt = angular.copy(event && event.name || '');
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
                        return angular.copy(applicationVm.employeeSelected && applicationVm.employeeSelected.employeeId || '');
                    }
                }
            });

            modalInstance.result.then(function (employee) {
                applicationVm.employeeSelected.employeeId = employee.$id || '';
                applicationVm.employeeSelected.repCode = employee.repCode || '';
                applicationVm.employeeSelected.saleRep = employee ? employee.firstName + ' ' + employee.lastName : '';
            });
        }

        function selectFacility(item) {
            applicationVm.notBelongState = false;
            applicationVm.facilityId = item.$id;
            applicationVm.facilityTxt = item.address && $.trim(item.address) !== '' ? item.name + ' - ' + item.facility_promo_code + ' (' + item.address + ')' : item.name + ' - ' + item.facility_promo_code;
            applicationVm.facilityObj = item;
            applicationVm.facilityObj.id = item.$id;
            applicationVm.facilityCode = item.facility_promo_code || '';
            if (applicationVm.enablePromoCode === false) {
                applicationVm.facilityCode = '';
            }
            applicationVm.initSeclectEvent = false;
            if (item.state_code !== applicationVm.state) {
                applicationVm.notBelongState = true;
            }
        }

        function _initFileModel(imgFile, mediaId) {
            //Create physical files
            var ts = appUtils.getTimestamp();
            return {
                id: ts,
                fileName: imgFile.fileName,
                path: imgFile.downloadUrl,
                timestampCreated: ts,
                status: 1,
                isSelected: true,
                processedAt: null,
                mediaId: mediaId
            };
        }

        //var procescing = 0;
        function _create(createObj, isPDF) {
            // setTimeout(function(){
            var stateId = $('[name="appState"]:visible option:selected').attr('data-id');
            createObj.application.stateId = !stateId ? '0' : stateId;
            createObj.application.priority = 0;
            createObj.application.facilityId = angular.copy(applicationVm.facilityId || '');
            createObj.application.eventId = angular.copy(applicationVm.eventId || '');
            createObj.application.eventName = angular.copy(applicationVm.eventTxt || '');
            createObj.application.isOffline = false;
            createObj.application.state = angular.copy(applicationVm.state || '');
            createObj.application.region = angular.copy(applicationVm.region || '');
            createObj.application.regionCode = angular.copy(applicationVm.regionCode || '');

            //always get lastest promo code.
            return memberShipFacilitiesService.get(createObj.application.facilityId).then(function (data) {
                if (applicationVm.enablePromoCode !== false && data && data.facility_promo_code) {
                    applicationVm.facilityCode = data.facility_promo_code;
                }

                createObj.application.facilityCode = applicationVm.facilityCode;
                //
                if (!isPDF) {
                    return _createApplication(createObj);
                }
                return _createPDFProcesQueue(createObj);
            }).catch(function () {
                if (!isPDF) {
                    return _createApplication(createObj);
                }
                return _createPDFProcesQueue(createObj);
            });
        }

        function _createApplication(createObj) {
            return memAppService.create(createObj.application).then(function (rs) {
                if (!rs.result) {
                    toaster.error(rs.errorMsg);
                }
                return rs.id || null;
            }).catch(function (err) {
                toaster.error('Create application has error!');
                return null;
            }).then(function (applicationId) {
                var all = [];
                if (!applicationId) {
                    appUtils.hideLoading();
                    //update status & message app-event-logs - create application has error
                    all.push(appEventLogService.update(createObj.logPath, {errorMessage: 'Create application has error.' }));
                    //update status & message employee-logs - create application has error
                    all.push(employeeLogService.update(createObj.employeeLogsPath, {errorMessage: 'Create application has error.' }));
                    return Promise.all(all);
                }

                //Create membership data
                all.push(_createMember(applicationId, createObj.membership, createObj.application.status));

                //update application-media - appId
                all.push(membershipMediaService.updateApplicationId(createObj.mediaId, applicationId));

                //update app-event-logs - appId
                all.push(appEventLogService.update(createObj.logPath, { appId: applicationId }));

                //update employee-logs - appId
                var applications = {};
                applications[applicationId] = {
                    mediaId: createObj.mediaId,
                    pageIndex: 1
                };
                all.push(employeeLogService.update(createObj.employeeLogsPath + '/fileInfo', { applications: applications }));

                //create application tracking timeline object
                var appTrackingObjUploadImg = {
                    eventType: appUtils.logEvent.uploadImage,
                    status: 'Successful',
                    mediaId: createObj.mediaId
                };

                //Create tracking application upload file success
                all.push(memAppTimeLineService.create(applicationId, appTrackingObjUploadImg, createObj.timestampUploaded).then(function () {
                    var appTrackingObjCreate = {
                        eventType: appUtils.logEvent.createApp,
                        status: createObj.application.status
                    };
                    //Create tracking application created
                    return memAppTimeLineService.create(applicationId, appTrackingObjCreate);
                }));
                //
                return Promise.all(all).then(function () {
                    //create application tracking timeline obj push OCR
                    var appTrackingObjPushORC = {
                        eventType: appUtils.logEvent.pushToOcrQueue,
                        status: createObj.application.status,
                        mediaId: createObj.mediaId
                    };

                    //add OCR service queue
                    return memProcessQueueService.create(applicationId, 0).then(function (createRs) {
                        appTrackingObjPushORC.message = 'Push to OCR queue success.';
                        if (!createRs.result) {
                            appTrackingObjPushORC.message = 'Push to OCR queue has error.';
                            toaster.error('Cannot create process queue!');
                            return false;
                        }
                        return true;
                    }).catch(function () {
                        appTrackingObjPushORC.message = 'Push to OCR queue has error.';
                        return false;
                    }).then(function () {
                        //Create tracking application push to OCR
                        return memAppTimeLineService.create(applicationId, appTrackingObjPushORC);
                    }).then(function () {
                        toaster.success("Save success! please wait a moment to process data.");
                        appUtils.hideLoading();
                        $timeout(angular.noop, 800);
                    });
                });
            });
            // return memAppService.create(createObj.application).then(function (rs) {
            //     appUtils.hideLoading();
            //     if (rs.result) {
            //         var applicationId = rs.id;
            //         //Create membership data
            //         _createMember(applicationId, createObj.membership, createObj.application.status);

            //         //update media application Id
            //         membershipMediaService.updateApplicationId(createObj.mediaId, applicationId);

            //         //Application tracking timeline obj
            //         var appTrackingObjUploadImg = {
            //             eventType: appUtils.logEvent.uploadImage,
            //             status: 'Successful',
            //             mediaId: createObj.mediaId
            //         };

            //         //Create tracking application upload file success
            //         var req = memAppTimeLineService.create(applicationId, appTrackingObjUploadImg, createObj.timestampUploaded).then(function () {
            //             var appTrackingObjCreate = {
            //                 eventType: appUtils.logEvent.createApp,
            //                 status: createObj.application.status
            //             };

            //             //Create tracking application created
            //             return memAppTimeLineService.create(applicationId, appTrackingObjCreate);
            //         });

            //         return req.then(function () {
            //             //Application tracking timeline obj push OCR
            //             var appTrackingObjPushORC = {
            //                 eventType: appUtils.logEvent.pushToOcrQueue,
            //                 status: createObj.application.status,
            //                 mediaId: createObj.mediaId
            //             };
            //             //add OCR service queue
            //             return memProcessQueueService.create(applicationId, 0).then(function (createRs) {
            //                 appTrackingObjPushORC.message = 'Push to OCR queue success.';
            //                 if (!createRs.result) {
            //                     appTrackingObjPushORC.message = 'Push to OCR queue has error.';
            //                     toaster.error('Cannot create process queue!');
            //                     return false;
            //                 }
            //                 return true;
            //             }).catch(function () {
            //                 appTrackingObjPushORC.message = 'Push to OCR queue has error.';
            //                 return false;
            //             }).then(function () {
            //                 //console.log('====Upload Form push to OCR do application tracking=====');
            //                 //Create tracking application push to OCR
            //                 memAppTimeLineService.create(applicationId, appTrackingObjPushORC);
            //                 toaster.success("Save success! please wait a moment to process data.");

            //                 //update event log 
            //                 appEventLogService.update(createObj.logPath, { appId: applicationId });

            //                 //update employee log 
            //                 var applications = {};
            //                 applications[applicationId] = {
            //                     mediaId: createObj.mediaId,
            //                     pageIndex: 1
            //                 };
            //                 employeeLogService.update(createObj.employeeLogsPath + '/fileInfo', { applications: applications });
            //             });
            //         });
            //     } else {
            //         toaster.error(rs.errorMsg);
            //         return false;
            //     }
            //     $timeout(angular.noop, 800);
            // }).catch(function (err) {
            //     console.log(err);
            //     return false;
            // });
        }

        function _createPDFProcesQueue(pdfObj) {
            var repCode = pdfObj.application.representativeCode || 'null';
            return getManagersByRepCode(repCode).then(function (managers) {
                pdfObj.application.managers = managers;
                return pdfProcessQueueService.create(pdfObj).then(function (rs) {
                    if (!rs.result) {
                        appUtils.hideLoading();
                        toaster.error(rs.errorMsg);
                        return;
                    }
                    
                    toaster.success("Save success! please wait a moment to process data.");
                    var reqs = [];
                    if (pdfObj.application.eventId && _.trim(pdfObj.application.eventId) !== '') {
                        reqs.push(eventQueueService.create(pdfObj.application.eventId));
                    }
                    //update app-event-logs - pdfQueueId
                    reqs.push(appEventLogService.update(pdfObj.logPath, { pdfQueueId: rs.id }));
                    //update employee-logs - pdfQueueId
                    reqs.push(employeeLogService.update(pdfObj.employeeLogsPath + '/fileInfo', { pdfQueueId: rs.id }));
                    //
                    return Promise.all(reqs).then(function () {
                        appUtils.hideLoading();
                        $timeout(angular.noop, 800);
                    });
                });
            });
        }

        function _createMember(appId, memberData, appStatus) {
            memberData.apps = [];
            memberData.apps.push(appId);
            return memberShipService.create(memberData).then(function (memRs) {
                if (!memRs.result) {
                    toaster.error('Cannot save membership!');
                } else {
                    //Create application timeline
                    // var appTrackingUpdate = {
                    //     eventType: appUtils.logEvent.editApp,
                    //     status: appStatus
                    // };
                    return memAppService.updateMemberShipId(appId, memRs.id);
                    // .then(function(rs){
                    //     if(rs.result){
                    //         appTrackingUpdate.message =   'Updated application information.';
                    //     }else{
                    //         appTrackingUpdate.message = rs && rs.errorMsg || 'Updated application information has error.';
                    //     }
                    // }).catch(function(err){
                    //     appTrackingUpdate.message = err && err.message || 'Updated application information has error.';
                    // }).then(function(){
                    //     appTrackingUpdate.source = 'upload-file-app.js';
                    //     memAppTimeLineService.create(appId, appTrackingUpdate);
                    // });
                }
            });
        }

        function getManagersByRepCode(repCode) {
            return employeeService.getUserByRepCode(repCode).then(function (user) {
                var managers = [];
                if (user) {
                    if (user.managers && user.managers.length > 0) {
                        managers = user.managers;
                    }
                    if (user.alias) {
                        managers.unshift(user.alias);
                    }
                }
                return managers;
            });
        }
    }
})();