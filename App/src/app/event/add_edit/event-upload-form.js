(function () {
    'use strict';

    angular.module('app.event')
        .controller('eventUploadCtrl', eventUploadCtrl);

    /** @ngInject */
    function eventUploadCtrl($scope, authService, $q, $timeout, toaster, appUtils, appEventLogService, pdfProcessQueueService, memAppService, membershipMediaService, memberShipService, $uibModal, memberShipFacilitiesService, eventQueueService, memAppTimeLineService, employeeLogService, memProcessQueueService, firebaseDataRef, eventService, employeeService, eventUploadLogsService) {
        var currentUser = authService.getCurrentUser(), //$rootScope.storage.currentUser,
            logName = '',

            eventCtrlVm = $scope.eventVm,
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
        var eventUploadVm = this; // jshint ignore:line
        eventUploadVm.showInvalid = false;
        eventUploadVm.employeeSelected = {
            employeeId: currentUser.$id || '',
            repCode: currentUser.repCode || currentUser.username,
            saleRep: currentUser ? currentUser.firstName + ' ' + currentUser.lastName : ''
        };

        eventUploadVm.showPopupEmployeeList = showPopupEmployeeList;

        //Common Functions

        //eventUploadVm.initPopup = false;
        //eventUploadVm.initSeclectEvent = false;
        //eventUploadVm.facilityTxt = '';
        //eventUploadVm.eventTxt = '';
        //eventUploadVm.appStatelist = [];
        //eventUploadVm.appFacilityItems = [];

        //eventUploadVm.close = close;
        //eventUploadVm.getState = getState;
        //eventUploadVm.changeState = changeState;
        //eventUploadVm.showPopupFacilityList = showPopupFacilityList;
        //eventUploadVm.showPopupEventList = showPopupEventList;
        //$scope.selectFacility = selectFacility;

        //Init Dropzone
        eventUploadVm.dz = {};
        eventUploadVm.dzOptions = {
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

        eventUploadVm.dzCallbacks = {
            'addedfile': function (file) { },
            'success': function (file, response) {
                var fileLength = eventUploadVm.dz.getAllFiles().length;
                var snapshot = {};
                _.each(response, function (task, key) {
                    snapshot[key] = task.snapshot;
                });
                console.log('===========================');
                console.log(angular.copy(snapshot));
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

                createObj.application.representativeCode = eventUploadVm.employeeSelected.repCode;
                createObj.application.saleRep = eventUploadVm.employeeSelected.saleRep;


                //create flage Image Upload or PDF Upload
                var pdf = false;
                if (metadata.contentType === 'application/pdf') {
                    pdf = true;
                }
                var employeeLog = {
                    status: 'Success',
                    fileInfo: {
                        fileName: metadata.name,
                        originalName: angular.copy(file.name),
                        fileSize: metadata.size,
                        fileType: metadata.contentType,
                        repCode: eventUploadVm.employeeSelected.repCode,
                        state: angular.copy(eventCtrlVm.model.state),
                        region: angular.copy(eventCtrlVm.model.region),
                        regionCode: angular.copy(eventCtrlVm.model.regionCode),
                        facility: eventCtrlVm.facilityObj,
                        eventId: angular.copy(eventCtrlVm.model.$id)
                    },
                    action: pdf ? appUtils.logEmployeeAction.uploadPDF.value : appUtils.logEmployeeAction.uploadImage.value,
                    updateBy: currentUser.email || ''
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
                            if (!eventCtrlVm.model.appCount) {
                                eventCtrlVm.model.appCount = 1;
                                eventCtrlVm.model.modifiedBy = currentUser.email;
                                var appUploaded = null,
                                    iptTotalRevenue = parseFloat(eventCtrlVm.model.iptTotalRevenue),
                                    iptNewMember = parseInt(eventCtrlVm.model.iptNewMember),
                                    appCount = parseInt(eventCtrlVm.model.appCount);
                                if (iptTotalRevenue && iptNewMember && appCount) {
                                    appUploaded = true;
                                } else if (iptTotalRevenue && iptNewMember && !appCount) {
                                    appUploaded = false;
                                }
                                eventCtrlVm.model.appUploaded = appUploaded;
                                req = eventService.updateAppUploaded(eventCtrlVm.model);
                            }
                        } else {
                            //employeeLog.status = "Failed";
                            employeeLog.errorMessage = "Create file media data has erred.";
                            //update status & message app-event-logs if create membership-media has error.
                            req = appEventLogService.update(createObj.logPath, { errorMessage: 'Create file media data has erred.' });
                        }
                        return req;
                    }).then(function () {
                        //create employee-logs
                        return employeeLogService.create(currentUser.$id, employeeLog).then(function (employeeLogRes) {
                            var result = employeeLogRes && employeeLogRes.result || false;
                            if (result) {
                                $scope.$broadcast('refreshEmployeeLogsList');
                                var ePath = angular.copy(employeeLogRes.id) || null;
                                //create listen on value in employee-logs path for show status
                                if (ePath) {
                                    createObj.employeeLogsPath = ePath;
                                    //create linked event upload with employee upload
                                    return eventUploadLogsService.create(angular.copy(eventCtrlVm.model.$id), ePath).then(function () {
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
                        console.log(res);
                        if (res && res.result && res.media) {
                            var delay = fileCount++ * 20;
                            $timeout(function () {
                                return _create(createObj, pdf);
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
                eventLog.message = eventLog.errorMessage = err && err.message || 'Upload file has error.';
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
                        repCode: eventUploadVm.employeeSelected.repCode,
                        state: angular.copy(eventCtrlVm.model.state),
                        region: angular.copy(eventCtrlVm.model.region),
                        regionCode: angular.copy(eventCtrlVm.model.regionCode),
                        facility: eventCtrlVm.facilityObj,
                        eventId: angular.copy(eventCtrlVm.model.$id)
                    }
                };
                employeeLog.message = employeeLog.errorMessage = err && err.message || 'Upload file has error.';
                employeeLog.action = file.type === 'application/pdf' ? appUtils.logEmployeeAction.uploadPDF.value : appUtils.logEmployeeAction.uploadImage.value;
                employeeLog.updateBy = currentUser.email || '';
                //call create employees-logs
                all.push(employeeLogService.create(currentUser.$id, employeeLog).then(function (rs) {
                    return eventUploadLogsService.create(angular.copy(eventCtrlVm.model.$id), rs && rs.id || null);
                }));

                return Promise.all(all);
            }
        };

        initModal();

        //Functions
        function initModal() {
            var reqs = [];
            //reqs.push(_initModel());
            //reqs.push(_getCommonData());
            reqs.push(_getDeviceInfo());
            return $q.all(reqs).then(function () {
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
                        return angular.copy(eventUploadVm.employeeSelected && eventUploadVm.employeeSelected.employeeId || '');
                    }
                }
            });

            return modalInstance.result.then(function (employee) {
                eventUploadVm.employeeSelected.employeeId = employee.$id || '';
                eventUploadVm.employeeSelected.repCode = employee.repCode || '';
                eventUploadVm.employeeSelected.saleRep = employee ? employee.firstName + ' ' + employee.lastName : '';
            });
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

        function _create(createObj, isPDF) {
            var state = _.find(eventCtrlVm.allStates, function (item) {
                return item.iso === eventCtrlVm.model.state;
            });
            createObj.application.stateId = state && state.id || "0";
            createObj.application.priority = 0;
            createObj.application.facilityId = angular.copy(eventCtrlVm.model.facilityId || '');
            createObj.application.eventId = angular.copy(eventCtrlVm.model.$id || '');
            createObj.application.eventName = angular.copy(eventCtrlVm.model.name || '');
            createObj.application.isOffline = false;
            createObj.application.state = angular.copy(eventCtrlVm.model.state || '');
            createObj.application.region = angular.copy(eventCtrlVm.model.region || '');
            createObj.application.regionCode = angular.copy(eventCtrlVm.model.regionCode || '');
            //always get lastest promo code.
            return memberShipFacilitiesService.get(createObj.application.facilityId).then(function (data) {
                if (eventCtrlVm.enablePromoCode !== false && data && data.facility_promo_code) {
                    createObj.application.facilityCode = data.facility_promo_code;
                }
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
                console.log(applicationId);
                var all = [];
                if (!applicationId) {
                    appUtils.hideLoading();
                    //update status & message app-event-logs - create application has error
                    all.push(appEventLogService.update(createObj.logPath, { errorMessage: 'Create application has error.' }));
                    //update status & message employee-logs - create application has error
                    all.push(employeeLogService.update(createObj.employeeLogsPath, { errorMessage: 'Create application has error.' }));
                    return Promise.all(all);
                }

                //Create membership data
                all.push(_createMember(applicationId, createObj.membership, createObj.application.status));

                //update media application Id
                all.push(membershipMediaService.updateApplicationId(createObj.mediaId, applicationId));

                //update event log application Id
                all.push(appEventLogService.update(createObj.logPath, { appId: applicationId }));

                //update employee log 
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
        }

        function _createPDFProcesQueue(pdfObj) {
            var repCode = pdfObj.application.representativeCode || 'null';
            return _getManagersByRepCode(repCode).then(function (managers) {
                pdfObj.application.managers = managers;
                //create pdf queue
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
                    //update event log pdf queue Id
                    reqs.push(appEventLogService.update(pdfObj.logPath, { pdfQueueId: rs.id }));
                    //update employee log pdf queue Id
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

        function _getManagersByRepCode(repCode) {
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

        // function _getCommonData() {
        //     memberShipFacilitiesService.itemsLoadOnce().then(function(data) {
        //         eventUploadVm.appFacilityItems = data;
        //         $timeout(angular.noop, 200);
        //     });

        //     memStateService.getAll().then(function(data) {
        //         eventUploadVm.appStatelist = data;
        //         $timeout(angular.noop, 200);
        //     });
        // }

        // function selectFacility(item) {
        //     eventUploadVm.notBelongState = false;
        //     eventUploadVm.facilityId = item.$id;
        //     eventUploadVm.facilityTxt = item.address && $.trim(item.address) !== '' ? item.name + ' - ' + item.facility_promo_code + ' (' + item.address + ')' : item.name + ' - ' + item.facility_promo_code;
        //     eventUploadVm.facilityObj = item;
        //     eventUploadVm.facilityObj.id = item.$id;
        //     eventUploadVm.initSeclectEvent = false;
        //     if(item.state_code !== eventUploadVm.state){
        //         eventUploadVm.notBelongState = true;
        //     }
        // }

        // function changeState() {
        //     eventUploadVm.initPopup = false;
        //     eventUploadVm.initSeclectEvent = false;
        // }

        // function getState(value) {
        //     var state = _.find(eventUploadVm.appStatelist, function(item) {
        //         return item.iso === value;
        //     });

        //     return state && state.name || '';
        // }

        // function showPopupFacilityList(state) {
        //     if (!state || state === '') {
        //         eventUploadVm.initPopup = true;
        //         return;
        //     }
        //     var modalInstance = $uibModal.open({
        //         templateUrl: './app/membership/modal/facility-list-popup.tpl.html',
        //         controller: 'FacilityListCtrl',
        //         size: 'lg',
        //         scope: $scope,
        //         backdrop: 'static',
        //         windowClass: 'facility-list-modal',
        //         resolve: {
        //             state: function() {
        //                 return state;
        //             },
        //             facilities: function() {
        //                 return eventUploadVm.appFacilityItems;
        //             },
        //             facilityId: function() {
        //                 return eventUploadVm.facilityId;
        //             }
        //         }
        //     });
        // }

        // function showPopupEventList(state, facilityId) {
        //     if (!state || state === '' || !facilityId || facilityId === '') {
        //         eventUploadVm.initSeclectEvent = true;
        //         return;
        //     }
        //     var modalInstance = $uibModal.open({
        //         templateUrl: './app/event/modal/event-list-popup.tpl.html',
        //         controller: 'EventListPopupCtrl as eventUploadVm',
        //         size: 'lg',
        //         scope: $scope,
        //         backdrop: 'static',
        //         windowClass: 'select-event-modal',
        //         resolve: {
        //             eventId: function() {
        //                 return eventUploadVm.eventId;
        //             },
        //             facilities: function() {
        //                 return eventUploadVm.appFacilityItems;
        //             },
        //             regions: function() {
        //                 return eventUploadVm.appStatelist;
        //             },
        //             state: function() {
        //                 return angular.copy(state);
        //             },
        //             facilityId: function() {
        //                 return angular.copy(eventUploadVm.facilityId);
        //             }
        //         }
        //     });

        //     modalInstance.result.then(function(event) {
        //         eventUploadVm.eventId = angular.copy(event && event.$id || '');
        //         eventUploadVm.eventTxt = angular.copy(event && event.name || '');
        //     });
        // }
    }
})();