(function() {
    'use strict';
    angular.module('app.utils').factory('appUtils', appUtils);
    /** @ngInject **/
    function appUtils($rootScope, $q, APP_CONFIG, $filter, $uibModal, deviceDetector, $http) {
        var appSettings = $rootScope.storage && $rootScope.storage.appSettings || null,
            specifyRoles = appSettings && appSettings.specifyPermissionsRoles || null;
        
        var geoCodeUrl = APP_CONFIG.geocodeMapUrl || 'https://maps.googleapis.com/maps/api/geocode/';
        var geoCodeKey = APP_CONFIG.geoCodeKey || 'AIzaSyCTU4vy7rFUTUSbMez8fFfXmUoXfix3xHc';

        var dayOfWeekEnum = {
            monday: 'Monday',
            tuesday: 'Tuesday',
            wednesday: 'Wednesday',
            thursday: 'Thursday',
            friday: 'Friday',
            saturday: 'Saturday',
            sunday: 'Sunday',
        };

        var availabilityEnum = {
            0: 'Unselected',
            1: 'Available',
            2: 'Not Available'
        };

        var statelist = [
            { text: 'Alabama', value: 'AL' },
            { text: 'Alaska', value: 'AK' },
            { text: 'Arizona', value: 'AZ' },
            { text: 'Arkansas', value: 'AR' },
            { text: 'California', value: 'CA' },
            { text: 'Colorado', value: 'CO' },
            { text: 'Connecticut', value: 'CT' },
            { text: 'Delaware', value: 'DE' },
            { text: 'District Of Columbia', value: 'DC' },
            { text: 'Florida', value: 'FL' },
            { text: 'Georgia', value: 'GA' },
            { text: 'Hawaii', value: 'HI' },
            { text: 'Idaho', value: 'ID' },
            { text: 'Illinois', value: 'IL' },
            { text: 'Indiana', value: 'IN' },
            { text: 'Iowa', value: 'IA' },
            { text: 'Kansas', value: 'KS' },
            { text: 'Kentucky', value: 'KY' },
            { text: 'Louisiana', value: 'LA' },
            { text: 'Maine', value: 'ME' },
            { text: 'Maryland', value: 'MD' },
            { text: 'Massachusetts', value: 'MA' },
            { text: 'Michigan', value: 'MI' },
            { text: 'Minnesota', value: 'MN' },
            { text: 'Mississippi', value: 'MS' },
            { text: 'Missouri', value: 'MO' },
            { text: 'Montana', value: 'MT' },
            { text: 'Nebraska', value: 'NE' },
            { text: 'Nevada', value: 'NV' },
            { text: 'New Hampshire', value: 'NH' },
            { text: 'New Jersey', value: 'NJ' },
            { text: 'New Mexico', value: 'NM' },
            { text: 'New York', value: 'NY' },
            { text: 'North Carolina', value: 'NC' },
            { text: 'North Dakota', value: 'ND' },
            { text: 'Ohio', value: 'OH' },
            { text: 'Oklahoma', value: 'OK' },
            { text: 'Oregon', value: 'OR' },
            { text: 'Pennsylvania', value: 'PA' },
            { text: 'Rhode Island', value: 'RI' },
            { text: 'South Carolina', value: 'SC' },
            { text: 'South Dakota', value: 'SD' },
            { text: 'Tennessee', value: 'TN' },
            { text: 'Texas', value: 'TX' },
            { text: 'Utah', value: 'UT' },
            { text: 'Vermont', value: 'VT' },
            { text: 'Virginia', value: 'VA' },
            { text: 'Washington', value: 'WA' },
            { text: 'West Virginia', value: 'WV' },
            { text: 'Wisconsin', value: 'WI' },
            { text: 'Wyoming', value: 'WY' }
        ];

        var licenseStateEnum = {
            AL: 'Alabama',
            AK: 'Alaska',
            AZ: 'Arizona',
            AR: 'Arkansas',
            CA: 'California',
            CO: 'Colorado',
            CT: 'Connecticut',
            DE: 'Delaware',
            DC: 'District Of Columbia',
            FL: 'Florida',
            GA: 'Georgia',
            HI: 'Hawaii',
            ID: 'Idaho',
            IL: 'Illinois',
            IN: 'Indiana',
            IA: 'Iowa',
            KS: 'Kansas',
            KY: 'Kentucky',
            LA: 'Louisiana',
            ME: 'Maine',
            MD: 'Maryland',
            MA: 'Massachusetts',
            MI: 'Michigan',
            MN: 'Minnesota',
            MS: 'Mississippi',
            MO: 'Missouri',
            MT: 'Montana',
            NE: 'Nebraska',
            NV: 'Nevada',
            NH: 'New Hampshire',
            NJ: 'New Jersey',
            NM: 'New Mexico',
            NY: 'New York',
            NC: 'North Carolina',
            ND: 'North Dakota',
            OH: 'Ohio',
            OK: 'Oklahoma',
            OR: 'Oregon',
            PA: 'Pennsylvania',
            RI: 'Rhode Island',
            SC: 'South Carolina',
            SD: 'South Dakota',
            TN: 'Tennessee',
            TX: 'Texas',
            UT: 'Utah',
            VT: 'Vermont',
            VA: 'Virginia',
            WA: 'Washington',
            WV: 'West Virginia',
            WI: 'Wisconsin',
            WY: 'Wyoming'
        };

        var postStatus = [
            { key: '0', value: 'Draff' },
            { key: '1', value: 'Pending' }
        ];

        var postVisibility = [
            { key: '0', value: 'Public', text: 'Public - Stick this post to the front page' },
            { key: '1', value: 'Password Protected', text: 'Password protected' },
            { key: '2', value: 'Private', text: 'Private' }
        ];

        var commentStatus = [
            { key: '0', value: 'Bulk Actions', text: 'Bulk Actions' },
            { key: '1', value: 'Pending', text: 'Pending' },
            { key: '2', value: 'Approve', text: 'Approve' },
            { key: '3', value: 'Mark as Spam', text: 'Mark as Spam' },
            { key: '4', value: 'Move to Trash', text: 'Move to Trash' }
        ];

        var eventRegisStatus = [
            { key: '0', value: 'Approved' },
            { key: '1', value: 'Not Approved' },
            { key: '2', value: 'Pending Payment' },
            { key: '3', value: 'Wait List' }
        ];

        var logEvent = {
            changeStatus: 'changeStatus',
            createMember: 'createMember',
            createApp: 'createApp',
            editApp: 'editApp',
            submitApp: 'submitApp',
            previewApp: 'previewApp',
            refreshApp: 'refreshApp',
            verifyApp: 'verifyApp',
            unlockApp: 'unlockApp',
            processFileApp: 'processFileApp',
            uploadFileApp: 'uploadFileApp',
            removeFileApp: 'removeFileApp',
            uploadImage: 'uploadImage',
            uploadPdf: 'uploadPdf',
            processPdf: 'processPdf',
            pushToOcrQueue: 'pushToOcrQueue',
            membershipOverwrite: 'membershipOverwrite',
        };

        var logEventText = {
            changestatus: 'Change Application Status',
            createmember: 'Create Membership',
            createapp: 'Create Application',
            editapp: 'Update Application',
            submitapp: 'DoSubmit Application',
            previewapp: 'Preview Update Application',
            refreshapp: 'Refresh Application',
            verifyapp: 'Verified Application',
            unclockapp: 'Unlock Application',
            unlockapp: 'Unlock Application',
            processfileapp: 'Process Application File',
            uploadfileapp: 'Upload Application File',
            removefileapp: 'Remove Application File',
            uploadimage: 'Upload Image',
            uploadpdf: 'Upload Pdf',
            processpdf: 'Process Pdf',
            pushtoocrqueue: 'Push To OCR Queue',
            membershipoverwrite: 'Membership Overwrite'
        };

        var logEventStep = {
            1: '(Step 1 of 5 - Upload Successful)',
            2: '(Step 2 of 5 - PDF Processing)',
            3: '(Step 3 of 5 - Application Creation)',
            4: '(Step 4 of 5 - OCR Processing)',
            5: '(Step 5 of 5 - Data Verification)',
        };

        var logEmployeeAction = {
            login: {
                text: 'Login',
                value: 'login'
            },
            logout: {
                text: 'Logout',
                value: 'logout'
            },
            updateProfile: {
                text: 'Update Profile',
                value: 'updateProfile'
            },
            updateprofile: {
                text: 'Update Profile',
                value: 'updateProfile'
            },
            updateCareer: {
                text: 'Update Career',
                value: 'updateCareer'
            },
            updatecareer: {
                text: 'Update Career',
                value: 'updateCareer'
            },
            updateLicense: {
                text: 'Update Licenses',
                value: 'updateLicense'
            },
            updatelicense: {
                text: 'Update Licenses',
                value: 'updateLicense'
            },
            addavailability: {
                text: 'Add Availability',
                value: 'addAvailability'
            },
            addAvailability: {
                text: 'Add Availability',
                value: 'addAvailability'
            },
            cancelAvailability: {
                text: 'Cancel Availability',
                value: 'cancelAvailability'
            },
            cancelavailability: {
                text: 'Cancel Availability',
                value: 'cancelAvailability'
            },
            forgotPassword: {
                text: 'Forgot Password',
                value: 'forgotPassword'
            },
            forgotpassword: {
                text: 'Forgot Password',
                value: 'forgotPassword'
            },
            uploadImage: {
                text: 'Upload Image',
                value: 'uploadImage'
            },
            uploadimage: {
                text: 'Upload Image',
                value: 'uploadImage'
            },
            uploadPDF: {
                text: 'Upload PDF',
                value: 'uploadPDF'
            },
            uploadpdf: {
                text: 'Upload PDF',
                value: 'uploadPDF'
            },
            reassignAvailability: {
                text: 'Reassign Availability',
                value: 'reassignAvailability'
            },
            reassignavailability: {
                text: 'Reassign Availability',
                value: 'reassignAvailability'
            },
            updateAvailability: {
                text: 'Update Availability',
                value: 'updateAvailability'
            },
            updateavailability: {
                text: 'Update Availability',
                value: 'updateAvailability'
            },
            setAvailability: {
                text: 'Set Availability',
                value: 'setAvailability'
            },
            setavailability: {
                text: 'Set Availability',
                value: 'setAvailability'
            }
        };

        var timezoneText = {
            '+07:00': 'ICT',
            '+00:00': 'UTC',
            '-05:00': 'EST',
            '-06:00': 'CST',
            '-07:00': 'MST',
            '-08:00': 'PST',
            '-09:00': 'AKST'
        };

        var dateNow = new Date();
        var lastMonth = new Date(dateNow.getFullYear(), dateNow.getMonth() - 1, dateNow.getDate());
        var last2Month = new Date(dateNow.getFullYear(), dateNow.getMonth() - 2, dateNow.getDate());
        var last3Month = new Date(dateNow.getFullYear(), dateNow.getMonth() - 3, dateNow.getDate());
        var last6Month = new Date(dateNow.getFullYear(), dateNow.getMonth() - 6, dateNow.getDate());
        var thisYear = new Date(dateNow.getFullYear(), 0, 1);
        var lastYear = new Date(dateNow.getFullYear(), dateNow.getMonth() - 12, dateNow.getDate());

        var currentDate = $filter('date')(dateNow, 'MM/dd/yyyy');
        var postFilterDates = [
            { key: 0, value: 'All', text: 'All dates' },
            { key: 1, value: Date.parse(currentDate), text: 'Today' },
            { key: 2, value: Date.parse(lastMonth), text: 'Last 30 days' },
            { key: 3, value: Date.parse(last2Month), text: 'Last 60 days' },
            { key: 4, value: Date.parse(last3Month), text: 'Last 90 days' },
            { key: 5, value: Date.parse(last6Month), text: 'Last 6 months' },
            { key: 6, value: Date.parse(thisYear), text: 'This year' },
            { key: 7, value: Date.parse(lastYear), text: 'Last year' }
        ];

        var appMethods = [
            { key: 0, value: 'App New Application' },
            { key: 1, value: 'Web Form Upload' },
            { key: 2, value: 'App Form Capture' },
            { key: 3, value: 'Web New Application' }
        ];

        var appStatus = [
            { key: -1, value: 'All Status' },
            { key: 0, value: 'New' },
            { key: 1, value: 'Processing' },
            { key: 2, value: 'Verified' },
            { key: 3, value: 'Billing Pending' },
            { key: 4, value: 'Billing Approved' },
            { key: 8, value: 'Billing Required' },
            { key: 5, value: 'Billing Denied' },
            { key: 6, value: 'Cancelled' },
            { key: 7, value: 'Error' }
        ];

        var appFileStatus = [
            { key: 0, value: 'New' },
            { key: 1, value: 'Scheduled' },
            { key: 2, value: 'Processing' },
            { key: 3, value: 'Completed' }
        ];

        var appStatelist = [
            { text: 'Arkansas', value: 'AR' },
            { text: 'Colorado', value: 'CO' },
            { text: 'Florida', value: 'FL' },
            { text: 'Georgia', value: 'GA' },
            { text: 'Kansas', value: 'KS' },
            { text: 'Missouri', value: 'MO' },
            { text: 'New Jersey', value: 'NJ' },
            { text: 'Oklahoma', value: 'OK' },
            { text: 'Pennsylvania', value: 'PA' },
            { text: 'Texas', value: 'TX' }
        ];
        var appFullAddonStates = [
            { text: 'Oklahoma', value: 'OK' },
            { text: 'Texas', value: 'TX' }
        ];
        var appNumAdults = [
            { key: '1', text: 'Individual', value: 'Individual' },
            { key: '2', text: 'Couple', value: 'Couple' }
        ];
        var appCycles = [
            { key: '2', text: 'Monthly', value: 'Monthly' },
            { key: '1', text: 'Annual', value: 'Annual' },
            { key: '3', text: 'One Time', value: 'OneTime' },
        ];
        var appPaymentMethods = [
            { key: '0', text: 'Card', value: 'Credit' },
            { key: '1', text: 'Cash', value: 'Cash' },
            { key: '2', text: 'Check', value: 'Check' }
        ];

        //Recipe
        var nutritionTypes = [
            { key: '0', name: 'Calories', abbrName: 'Calories', unit: '', primary: true, daylyAmount: 3000 },
            { key: '1', name: 'Total Cholesterol', abbrName: 'CHOL', unit: 'mg', primary: true, daylyAmount: 3000 },
            { key: '2', name: 'Total Fat', abbrName: 'FAT', unit: 'g', primary: true, daylyAmount: 3000 },
            { key: '3', name: 'Solidum', abbrName: 'Solidum', unit: 'mg', primary: true, daylyAmount: 3000 },
            { key: '4', name: 'Total Carbohydrate', abbrName: 'CARBS', unit: 'g', primary: true, daylyAmount: 3000 },
            { key: '5', name: 'Dietary Fiber', abbrName: 'FIBER', unit: 'g', primary: false, daylyAmount: 3000 },
            { key: '6', name: 'Vitamin A', abbrName: 'Vitamin A', unit: 'g', primary: false, daylyAmount: 3000 }
        ];

        var imageHandlerConfig = {
            thumbnail: 200,
            lowRes: 780,
            quality: 0.1
        };

        var eventTypes = [
            { text: 'Classes', value: 'classes' },
            { text: 'Gun Shows', value: 'gunshows' },
            { text: 'After Call Sign In', value: 'aftercallsignin' },
            { text: 'Counter Sales', value: 'countersales' },
            { text: 'Miscellaneous', value: 'miscellaneous' }
        ];

        var eventStatus = [{
                value: 1,
                text: 'Publish'
            },
            // {
            //     value: 0,
            //     text: 'UnPublish'
            // },
            {
                value: -1,
                text: 'Archived'
            }
        ];
        var eventVerifyStatus = [{
            value: 1,
            text: 'Confirmed',
            disabled: false
        },
        {
            value: 0,
            text: 'Pending',
            disabled: false
        },
        {
            value: -1,
            text: 'Canceled',
            disabled: true
        }
        ];
        var eventListVerifyStatus = [{
            value: "Empty",
            text: 'Not Send'
        },{
            value: 1,
            text: 'Confirmed'
        },
        {
            value: 0,
            text: 'Pending'
        },
        {
            value: -1,
            text: 'Canceled'
        }
        ];
        var eventListVerifyDashboard = [{
            value: 1,
            text: 'Confirmed'
        },
        {
            value: 0,
            text: 'Pending'
        },
        {
            value: -1,
            text: 'Canceled'
        }
        ];
        const eventVerifyStatusEnum = {
            CANCELED: -1,
            PENDING: 0,
            CONFIRMED: 1,
        };
        var licenseTypes = [{
                value: 1,
                text: 'PACKAGE SALES LICENSE'
            },
            {
                value: 0,
                text: 'Prepaid Legal'
            },
            {
                value: 2,
                text: 'L-LOA'
            }
        ];

        var hireTypes = [{
                value: '1',
                text: 'Contractor'
            },
            {
                value: '0',
                text: 'Employee'
            }
        ];

        const licenseTypeEnum = {
            0: 'Prepaid Legal',
            1: 'Property & Casualty License',
            2: 'L-LOA',
            //3: 'Not Required - Picklist'
        };

        const appointedEnum = {
            0: 'Blank',
            1: 'Yes',
            2: 'No',
            3: 'N/A'
        };

        var summerNoteFontSizes = [
            '8', '9', '10', '11', '12',
            '13', '14', '15', '16', '17',
            '18', '19', '20', '21', '22',
            '23', '24', '25', '26', '27',
            '28', '29', '30'
        ];

        var summerNoteFontStyles = [
            'Arial', 'Arial Black', 'Comic Sans MS', 'Courier New',
            'Helvetica', 'Impact', 'Tahoma', 'Times New Roman',
            'Verdana', 'Roboto', 'Roboto Condensed'
        ];

        var summerNoteOptions = {
            height: 300,
            fontSizes: summerNoteFontSizes,
            fontNames: summerNoteFontStyles,
            toolbar: [
                ['edit', ['undo', 'redo']],
                ['headline', ['style']],
                ['style', ['bold', 'italic', 'underline', 'superscript', 'subscript', 'strikethrough', 'clear']],
                ['fontface', ['fontname']],
                ['textsize', ['fontsize']],
                ['fontclr', ['color']],
                ['alignment', ['ul', 'ol', 'paragraph', 'lineheight']],
                ['height', ['height']],
                ['table', ['table']],
                ['insert', ['link', 'picture', 'video', 'hr']],
                ['view', ['codeview']],
                ['mybutton'],
            ],
            buttons: {
                insertMedia: editorInsertMedia
            }
        };

        var utils = {
            showLoading: showLoading,
            hideLoading: hideLoading,
            getAllState: getAllState,
            getBlankImgProfile: getBlankImgProfile,
            generatePassword: generatePassword,
            generateId: generateId,
            getImageFBUrl: getImageFBUrl,
            formatImgFileName: formatImgFileName,
            checkAllCheckBox: checkAllCheckBox,
            getTreeCategories: getTreeCategories,
            postStatus: postStatus,
            postVisibility: postVisibility,
            getItemByKey: getItemByKey,
            postFilterDates: postFilterDates,
            getTimestamp: getTimestamp,
            getOffSet: getOffSet,
            popupMediaMulti: popupMediaMulti,
            popupMediaSingle: popupMediaSingle,
            commentStatus: commentStatus,
            eventRegisStatus: eventRegisStatus,
            sortArray: sortArray,
            toArray: toArray,
            formatBytesSize: formatBytesSize,
            appMethods: appMethods,
            getMethod: getMethod,
            appStatus: appStatus,
            getStatus: getStatus,
            appFileStatus: appFileStatus,
            appStatelist: appStatelist,
            appFullAddonStates: appFullAddonStates,
            uploadFileDropzone: uploadFileDropzone,
            appNumAdults: appNumAdults,
            appCycles: appCycles,
            getCardType: getCardType,
            transformObject: transformObject,
            appPaymentMethods: appPaymentMethods,
            formatNumber: formatNumber,
            formatCurrency: formatCurrency,
            logEvent: logEvent,
            logEventText: logEventText,
            logEventStep: logEventStep,
            logEmployeeAction: logEmployeeAction,
            imageHandler: imageHandler,
            getLowRes: getLowRes,
            nutritionTypes: nutritionTypes,
            getCardType2: getCardType2,
            getDeviceInfo: getDeviceInfo,
            getCurrentPosition: getCurrentPosition,
            stripDollarPrefixedKeys: stripDollarPrefixedKeys,
            bytesToSize: bytesToSize,
            getFullNameApplication: getFullNameApplication,
            formatDateTimeString: formatDateTimeString,
            getCashOptionTxt: getCashOptionTxt,
            formatPhoneNumber: formatPhoneNumber,
            eventTypes: eventTypes,
            eventStatus: eventStatus,
            eventVerifyStatus: eventVerifyStatus,
            eventVerifyStatusEnum: eventVerifyStatusEnum,
            eventListVerifyStatus: eventListVerifyStatus,
            eventListVerifyDashboard: eventListVerifyDashboard,
            clearSelection: clearSelection,
            checkPermission: checkPermission,
            //checkIsAdmin: checkIsAdmin,
            //checkIsRep: checkIsRep,
            checkSpecifyRole: checkSpecifyRole,
            licenseTypes: licenseTypes,
            availabilityEnum: availabilityEnum,
            dayOfWeekEnum: dayOfWeekEnum,
            licenseStateEnum: licenseStateEnum,
            licenseTypeEnum: licenseTypeEnum,
            appointedEnum: appointedEnum,
            formatDateString: formatDateString,
            toTimeStamp: toTimeStamp,
            hireTypes: hireTypes,
            summerNoteOptions: summerNoteOptions,
            identifyEmail: identifyEmail,
            getLatLonByAddressString: getLatLonByAddressString
        };

        function editorInsertMedia(context) {
            var ui = $.summernote.ui;
            // create button
            var button = ui.button({
                contents: '<i class="fa fa-file-code-o"/>',
                tooltip: 'Insert Media',
                click: function() {
                    // invoke insertText method with 'hello' on editor module.
                    popupMediaMulti().then(function(selectedItems) {
                        _.forEach(selectedItems, function(item) {
                            //console.log(item);
                            if (!item.type) item.type = '';

                            if (item.fileType.toLowerCase().indexOf('image/') > -1 || item.type.toLowerCase().indexOf('image/') > -1) {
                                context.invoke('editor.insertImage', item.downloadUrl, item.displayName);
                            } else if (item.fileType.toLowerCase().indexOf('video/') > -1 || item.type.toLowerCase().indexOf('video/') > -1) {
                                var video = document.createElement("video");
                                video.width = 640;
                                video.height = 360;
                                video.src = item.downloadUrl;
                                video.controls = true;
                                video.type = item.type;
                                context.invoke('editor.insertNode', video);
                            } else if (item.fileType.toLowerCase().indexOf('application/') > -1 || item.type.toLowerCase().indexOf('application/') > -1) {
                                var linkInfo = context.invoke('editor.getLinkInfo');
                                context.invoke('editor.saveRange');
                                _.extend(linkInfo, {
                                    text: item.displayName,
                                    url: item.downloadUrl,
                                    isNewWindow: true
                                });
                                context.invoke('editor.restoreRange');
                                context.invoke('editor.createLink', linkInfo);
                            }
                        }); //End foreach
                    });

                }
            });

            return button.render(); // return button as jquery object
        }

        function showLoading() {
            var el = angular.element(document.querySelectorAll("[ng-spinner-bar]"));
            if (el) el.removeClass('hide');
        }

        function hideLoading() {
            var el = angular.element(document.querySelectorAll("[ng-spinner-bar]"));
            if (el) el.addClass('hide');
        }

        function getAllState() {
            return statelist;
        }

        function getBlankImgProfile() {
            return APP_CONFIG.profileBlankImg;
        }

        function generatePassword() {
            var letterLeng = 10,
                digitLeng = 2,
                text = "",
                letter = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
                digit = "0123456789";

            for (var i = 0; i < letterLeng; i++) {
                text += letter.charAt(Math.floor(Math.random() * letter.length));
            }

            for (var j = 0; j < digitLeng; j++) {
                text += digit.charAt(Math.floor(Math.random() * digit.length));
            }

            return text;
        }

        function generateId() {
            var letterLeng = 15,
                digitLeng = 5,
                text = "",
                letter = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
                digit = "0123456789";

            for (var i = 0; i < letterLeng; i++) {
                text += letter.charAt(Math.floor(Math.random() * letter.length));
            }

            for (var j = 0; j < digitLeng; j++) {
                text += digit.charAt(Math.floor(Math.random() * digit.length));
            }

            return text;
        }

        function getImageFBUrl(imageUri) {
            if (imageUri.startsWith('gs://')) {
                return firebase.storage().refFromURL(imageUri).getMetadata().then(function(metadata) {
                    return $q.when({ imgUrl: metadata.downloadURLs[0] });
                });
            } else {
                return $q.when({ imgUrl: imageUri });
            }
        }

        function formatImgFileName(name, size, isJpeg) {
            var timestamp = +new Date(),
                ts = timestamp.toString(),
                parts = name.split("."),
                type = !isJpeg ? parts[parts.length - 1] : 'jpg';

            size = size !== "" ? "-" + size : "";
            var fullName = parts[0],
                i;
            for (i = 1; i < parts.length - 1; i++) {
                fullName += '.' + parts[i];
            }
            return fullName + "_" + ts + size + "." + type;
        }

        // function formatImgFileName(name, size){
        // 	var timestamp = +new Date(), 
        // 		ts = timestamp.toString(),
        // 		parts = name.split(".");
        // 	size = size !== "" ? "-" + size : "";

        // 	return parts[0] + "_" + ts + size + "." + parts[1];
        // }

        function checkAllCheckBox(controlId, name) {
            var _isChecked = function(Id) {
                return $("#" + Id).is(':checked');
            };

            var check = _isChecked(controlId);
            if (typeof(check) === 'undefined') {
                check = false;
            }
            $('input[name=' + name + ']').attr('checked', check);
        }

        function getTreeCategories(cateItems, checkedItems) {
            var categories = [];
            _.forEach(cateItems, function(value, key) {
                var subCates = _.filter(cateItems, ['parent', value.$id]);
                value.children = [];
                if (subCates.length > 0) {
                    value.children = subCates;
                }

                value.checked = false;
                if (checkedItems && checkedItems.length > 0) {
                    var checkedCates = _.filter(checkedItems, function(o) {
                        if (o == value.$id) {
                            checkedItems.push(value.$id);
                            return true;
                        }
                        return false;
                    });
                    if (checkedCates.length > 0) {
                        value.checked = true;
                    }
                }
                categories.push(value);
            });
            categories = _.find(categories, function(item) { return item.parent === '' || item.parent === 'root'; });
            return categories;
        }

        function getItemByKey(items, keyVal) {
            var rs = _.filter(items, ['key', keyVal]);
            if (rs.length > 0) return rs[0];
            return {};
        }

        function getTimestamp() {
            if (firebase && firebase.database) {
                var offsetRef = firebase.database().ref(".info/serverTimeOffset");
                offsetRef.on("value", function(snap) {
                    var offset = snap.val();
                    var estimatedServerTimeMs = new Date().getTime() + offset;
                    return estimatedServerTimeMs;
                });
                //return firebase.database.ServerValue.TIMESTAMP;
            }
            return +new Date();
        }

        function getOffSet() {
            if (firebase && firebase.database) {
                var offsetRef = firebase.database().ref(".info/serverTimeOffset");
                offsetRef.on("value", function(snap) {
                    return snap.val();
                });
            }
            return +new Date();
        }

        function popupMediaMulti() {
            var modalInstance = $uibModal.open({
                templateUrl: 'app/media/popup/images_gallery.html',
                controller: 'ImagesGalleryCtrl as galleryVm',
                size: 'lg',
                resolve: {
                    isFeatured: function() {
                        return false;
                    }
                }
            });

            return modalInstance.result;
        }

        function popupMediaSingle() {
            var modalInstance = $uibModal.open({
                templateUrl: 'app/media/popup/images_gallery.html',
                controller: 'ImagesGalleryCtrl as galleryVm',
                size: 'lg',
                resolve: {
                    isFeatured: function() {
                        return true;
                    }
                }
            });

            return modalInstance.result;
        }

        function sortArray(arr, sortField) {
            return arr.sort(function(a, b) {
                return b[sortField] - a[sortField];
            });
        }

        function toArray(targetObject) {
            if (!targetObject) { return []; }
            return Object.keys(targetObject).map(
                function(key) {
                    return {
                        key: key,
                        value: targetObject[key]
                    };
                });
        }

        function formatBytesSize(bytes, decimals) {
            if (bytes === 0) return '0 Byte';
            var k = 1000;
            var dm = decimals + 1 || 3;
            var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
            var i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
        }


        //      function getDifferences(oldObj, newObj) {
        //    var diff = {};

        //    for (var k in oldObj) {
        //       if (!(k in newObj))
        //          diff[k] = undefined;  // property gone so explicitly set it undefined
        //       else if (oldObj[k] !== newObj[k]){
        //       	console.log('------------oldObj1');
        //       	console.log(oldObj);
        //       	console.log(oldObj[k]);
        //       	console.log(k);
        //          diff[k] = newObj[k];  // property in both but has changed
        //      	}
        //    }

        //    for (k in newObj) {
        //       if (!(k in oldObj)){
        //       	console.log('------------oldObj2');
        //       	console.log(oldObj);
        //       	console.log(oldObj[k]);
        //       	console.log(k);
        //          diff[k] = newObj[k]; // property is new
        //      	}
        //    }

        //    return diff;
        // }

        function uploadFileDropzone(func, membershipMediaService, currentUser) {
            //Overite submitRequest method of dropzone.js file
            Dropzone.prototype.submitRequest = function(xhr, formData, files) {
                // var formDropzone = $("#form-dropzone:visible");
                $('.dz-upload:visible').css('background', 'green');
                var file = files[0];
                // Create the file metadata
                var metadata = {
                    contentType: file.type
                };
                // Upload file and metadata to the object 'images/mountains.jpg'
                var uploadTask = membershipMediaService.uploadFile('application/', file, metadata); // Listen for state changes, errors, and completion of the upload.
                uploadTask.on(firebase.storage.TaskEvent.STATE_CHANGED, // or 'state_changed'
                    function(snapshot) {
                        // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
                        var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        var dzProgress = $('.dz-progress:visible');
                        dzProgress.find('.dz-upload').css('width', progress + '%');
                        if (progress == 100) {
                            setTimeout(function() {
                                dzProgress.hide();
                            }, 1000);
                        }

                        switch (snapshot.state) {
                            case firebase.storage.TaskState.PAUSED: // or 'paused'
                                break;
                            case firebase.storage.TaskState.RUNNING: // or 'running'
                                break;
                        }
                    },
                    function(error) {
                        switch (error.code) {
                            case 'storage/unauthorized':
                                // User doesn't have permission to access the object
                                break;

                            case 'storage/canceled':
                                // User canceled the upload
                                break;

                            case 'storage/unknown':
                                // Unknown error occurred, inspect error.serverResponse
                                break;
                        }
                    },
                    function() {
                        // Upload completed successfully, now we can get the download URL
                        hideLoading();
                        var downloadURL = uploadTask.snapshot.downloadURL;
                        var imgFile = {
                            fileName: uploadTask.snapshot.metadata.name,
                            fileSize: uploadTask.snapshot.metadata.size,
                            type: uploadTask.snapshot.metadata.contentType,
                            timestampCreated: getTimestamp(),
                            timestampModified: getTimestamp(),
                            storageLocation: 'gs://' + uploadTask.snapshot.metadata.bucket + '/' + uploadTask.snapshot.metadata.fullPath,
                            downloadUrl: uploadTask.snapshot.downloadURL,
                            author: currentUser.email,
                            bucket: uploadTask.snapshot.metadata.bucket,
                            fullPath: uploadTask.snapshot.metadata.fullPath,
                            displayName: file.name.split('.')[0],
                            fileType: file.name.split('.')[1],
                            description: '',
                            alternativeText: '',
                            caption: ''
                        };

                        //Execute function
                        func(imgFile);

                    });

            };
        }

        function getCardType(text) {
            var num, regAmex, regDisc, regMast, regVisa;
            if (!text) {
                return;
            }
            regAmex = new RegExp("^(34|37)");
            regVisa = new RegExp("^4");
            regMast = new RegExp("^5[1-5]");
            regDisc = new RegExp("^60");
            switch (false) {
                case !regAmex.test(text):
                    return 'Amex';
                case !regVisa.test(text):
                    return 'Visa';
                case !regMast.test(text):
                    return 'Master';
                case !regDisc.test(text):
                    return 'Discover';
                default:
                    return "Visa";
            }
        }

        function transformObject(item, update) {
            var attrs = Object.keys(item).length > (Object.keys(update).length + 2) ? item : update;
            for (var attr in attrs) {
                // if(item[attr] && update[attr]){
                item[attr] = update[attr];
                // }
            }
            return item;
        }

        function formatCurrency(value) {
            if (value === null || value === undefined || value === "") return 0;

            return parseFloat(value).toFixed(2);
        }

        function formatNumber(value) {
            if (value === null || value === undefined || value === "") return 0;

            return parseFloat(value);
        }

        // Image handler
        function imageHandler(img, isThumb, mimeType, isJpeg) {
            if (!mimeType || isJpeg) mimeType = 'image/jpeg';

            var canvas = document.createElement('canvas');

            canvas.width = img.width;
            canvas.height = img.height;

            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            if (isThumb) {
                canvas = scaleCanvasWithAlgorithm(canvas, imageHandlerConfig.thumbnail);
                imageHandlerConfig.quality = 1;
            } else {
                canvas = scaleCanvasWithAlgorithm(canvas, img.width);
                imageHandlerConfig.quality = 0.7;
            }
            return {
                width: canvas.width,
                height: canvas.height,
                data: dataURItoBlob(canvas.toDataURL(mimeType, imageHandlerConfig.quality))
            };
        }

        function getLowRes(img, maxWidth, quality, mimeType) {
            if (!mimeType) mimeType = 'image/jpeg';

            var canvas = document.createElement('canvas');

            canvas.width = img.width;
            canvas.height = img.height;

            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);

            canvas = scaleCanvasWithAlgorithm(canvas, maxWidth);
            return {
                width: canvas.width,
                height: canvas.height,
                data: dataURItoBlob(canvas.toDataURL(mimeType, imageHandlerConfig.quality))
            };
        }

        function dataURItoBlob(dataURI) {
            // convert base64/URLEncoded data component to raw binary data held in a string
            var byteString;
            if (dataURI.split(',')[0].indexOf('base64') >= 0)
                byteString = atob(dataURI.split(',')[1]);
            else
                byteString = unescape(dataURI.split(',')[1]);

            // separate out the mime component
            var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

            // write the bytes of the string to a typed array
            var ia = new Uint8Array(byteString.length);
            for (var i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
            }
            return new Blob([ia], { type: mimeString });
        }

        function scaleCanvasWithAlgorithm(canvas, maxWidth) {
            var scaledCanvas = document.createElement('canvas');

            var scale = maxWidth / canvas.width;

            scaledCanvas.width = canvas.width * scale;
            scaledCanvas.height = canvas.height * scale;

            var srcImgData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
            var destImgData = scaledCanvas.getContext('2d').createImageData(scaledCanvas.width, scaledCanvas.height);
            applyBilinearInterpolation(srcImgData, destImgData, scale);

            scaledCanvas.getContext('2d').putImageData(destImgData, 0, 0);

            return scaledCanvas;
        }

        function applyBilinearInterpolation(srcCanvasData, destCanvasData, scale) {
            function inner(f00, f10, f01, f11, x, y) {
                var un_x = 1.0 - x;
                var un_y = 1.0 - y;
                return (f00 * un_x * un_y + f10 * x * un_y + f01 * un_x * y + f11 * x * y);
            }
            var i, j;
            var iyv, iy0, iy1, ixv, ix0, ix1;
            var idxD, idxS00, idxS10, idxS01, idxS11;
            var dx, dy;
            var r, g, b, a;
            for (i = 0; i < destCanvasData.height; ++i) {
                iyv = i / scale;
                iy0 = Math.floor(iyv);
                // Math.ceil can go over bounds
                iy1 = (Math.ceil(iyv) > (srcCanvasData.height - 1) ? (srcCanvasData.height - 1) : Math.ceil(iyv));
                for (j = 0; j < destCanvasData.width; ++j) {
                    ixv = j / scale;
                    ix0 = Math.floor(ixv);
                    // Math.ceil can go over bounds
                    ix1 = (Math.ceil(ixv) > (srcCanvasData.width - 1) ? (srcCanvasData.width - 1) : Math.ceil(ixv));
                    idxD = (j + destCanvasData.width * i) * 4;
                    // matrix to vector indices
                    idxS00 = (ix0 + srcCanvasData.width * iy0) * 4;
                    idxS10 = (ix1 + srcCanvasData.width * iy0) * 4;
                    idxS01 = (ix0 + srcCanvasData.width * iy1) * 4;
                    idxS11 = (ix1 + srcCanvasData.width * iy1) * 4;
                    // overall coordinates to unit square
                    dx = ixv - ix0;
                    dy = iyv - iy0;
                    // I let the r, g, b, a on purpose for debugging
                    r = inner(srcCanvasData.data[idxS00], srcCanvasData.data[idxS10], srcCanvasData.data[idxS01], srcCanvasData.data[idxS11], dx, dy);
                    destCanvasData.data[idxD] = r;

                    g = inner(srcCanvasData.data[idxS00 + 1], srcCanvasData.data[idxS10 + 1], srcCanvasData.data[idxS01 + 1], srcCanvasData.data[idxS11 + 1], dx, dy);
                    destCanvasData.data[idxD + 1] = g;

                    b = inner(srcCanvasData.data[idxS00 + 2], srcCanvasData.data[idxS10 + 2], srcCanvasData.data[idxS01 + 2], srcCanvasData.data[idxS11 + 2], dx, dy);
                    destCanvasData.data[idxD + 2] = b;

                    a = inner(srcCanvasData.data[idxS00 + 3], srcCanvasData.data[idxS10 + 3], srcCanvasData.data[idxS01 + 3], srcCanvasData.data[idxS11 + 3], dx, dy);
                    destCanvasData.data[idxD + 3] = a;
                }
            }
        }

        function getCardType2(number) {
            var deferred = $q.defer();
            if (number === '') {
                deferred.resolve("");
            } else {
                firebase.database().ref("app-options/paymentCardType").once("value", function(snap) {
                    if (snap && snap.val()) {
                        var cardTypes = snap.val();
                        // visa
                        var re = new RegExp("^4");
                        if (number && number.match(re) !== null)
                            deferred.resolve(cardTypes.visa);

                        // Mastercard
                        re = new RegExp("^5[1-5]");
                        if (number && number.match(re) !== null)
                            deferred.resolve(cardTypes.masterCard);

                        // AMEX
                        re = new RegExp("^3[47]");
                        if (number && number.match(re) !== null)
                            deferred.resolve(cardTypes.americanExpress);

                        // Discover
                        re = new RegExp("^(6011|622(12[6-9]|1[3-9][0-9]|[2-8][0-9]{2}|9[0-1][0-9]|92[0-5]|64[4-9])|65)");
                        if (number && number.match(re) !== null)
                            deferred.resolve(cardTypes.discover);

                        // Diners
                        re = new RegExp("^36");
                        if (number && number.match(re) !== null)
                            deferred.resolve(cardTypes.diners);

                        // Diners - Carte Blanche
                        re = new RegExp("^30[0-5]");
                        if (number && number.match(re) !== null)
                            deferred.resolve(cardTypes.dinersCarteBlanche);

                        // JCB
                        re = new RegExp("^35(2[89]|[3-8][0-9])");
                        if (number && number.match(re) !== null)
                            deferred.resolve(cardTypes.jCB);

                        // Visa Electron
                        re = new RegExp("^(4026|417500|4508|4844|491(3|7))");
                        if (number && number.match(re) !== null)
                            deferred.resolve(cardTypes.visaElectron);

                        deferred.resolve("");
                    }
                });
            }

            return deferred.promise;
        }

        function getDeviceInfo() {
            var deviceInfo = null;
            if (deviceDetector) {
                var data = deviceDetector;
                deviceInfo = angular.copy(data);
            }

            // var appVersionSetting = 'androidBuildVersion';
            // if(deviceInfo !== null && deviceInfo.device && deviceInfo.device !== 'android'){
            // 	appVersionSetting = 'iosBuildVersion';
            // }

            // var req_p = getCurrentPosition().then(function(position){
            // 	deviceInfo.geoCode = position;
            // }),

            // req_a = getAppVersion(appVersionSetting).then(function(appVersion){
            // 	deviceInfo.appVersion = appVersion || '';
            // });

            return getCurrentPosition().then(function(position) {
                deviceInfo.geoCode = position;
                deviceInfo.appVersion = APP_CONFIG.appVersion || '';
                deviceInfo.buildVersion = APP_CONFIG.buildVersion || '';
                return deviceInfo;
            });
        }

        function getAppVersion(settingName) {
            var deferred = $q.defer();
            firebase.database().ref("app-options/" + settingName).on("value", function(snap) {
                if (snap && snap.val()) {
                    deferred.resolve(snap.val());
                }
                return deferred.resolve("");
            });

            return deferred.promise;
        }

        function getCurrentPosition() {
            var deferred = $q.defer();
            deferred.resolve('');
            // var onSuccess = function (position) {
            //     deferred.resolve(position.coords.latitude + ',' + position.coords.longitude);
            // };
            // var onFail = function (error) {
            //     console.log(error);
            //     deferred.resolve('');
            // };
            // navigator.geolocation.getCurrentPosition(onSuccess, onFail, { timeout: 10000 });
            return deferred.promise;
        }

        function stripDollarPrefixedKeys(data) {
            if (!angular.isObject(data) || angular.isDate(data)) { return data; }
            var out = angular.isArray(data) ? [] : {};
            angular.forEach(data, function(v, k) {
                if (typeof k !== 'string' || k.charAt(0) !== '$') {
                    out[k] = stripDollarPrefixedKeys(v);
                }
            });
            return out;
        }

        function bytesToSize(bytes) {
            var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
            if (bytes == 0) return '0 Byte';
            var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
            return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
        }

        function getFullNameApplication(item) {
            var name = item.primaryMember || item.seccondMember || 'Unknown';
            if (_.trim(name) === '') {
                name = 'Unknown';
            }
            return name;
        }

        function getStatus(status) {
            var stt = _.find(appStatus, { key: parseInt(status) });
            return stt ? stt.value : ' ';
        }

        function identifyEmail(userObj) {
            return userObj.notificationEmail ? userObj.notificationEmail : userObj.email;
        }

        function getMethod(method) {
            var me = _.find(appMethods, { key: parseInt(method) });
            return me ? me.value : ' ';
        }

        function formatDateTimeString(time) {
            var timezone = time.format('Z');
            return time.format('MM/DD/YYYY hh:mm:ss A') + ' ' + timezoneText[timezone];
        }

        function formatDateString(date) {
            //var timezone = date.format('Z');
            return date.format('MM/DD/YYYY'); // + ' ' + timezoneText[timezone];
        }

        function toTimeStamp(date) {
            return moment.utc(date, 'MM/DD/YYYY').valueOf();
        }

        function getCashOptionTxt(application) {
            var result = 'Take credit ';
            if (application && application.cashOption && application.cashOption === 'TakeCredit') {
                if (parseInt(application.status) === 4) {
                    result = 'Took credit ';
                }
            } else {
                result = 'Change ';
                if (parseInt(application.status) === 4) {
                    result = 'Changed ';
                }
            }
            return result;
        }

        function formatPhoneNumber(s) {
            var s2 = ("" + s).replace(/\D/g, '');
            var m = s2.match(/^(\d{3})(\d{3})(\d{4})$/);
            return (!m) ? s : "(" + m[1] + ") " + m[2] + "-" + m[3];
        }

        function clearSelection() {
            if (window.getSelection) {
                if (window.getSelection().empty) { // Chrome
                    window.getSelection().empty();
                } else if (window.getSelection().removeAllRanges) { // Firefox
                    window.getSelection().removeAllRanges();
                }
            } else if (document.selection) { // IE?
                document.selection.empty();
            }
        }

        function checkPermission(user, action, pAcl) {
            var uRoles = [],
                adminId = (specifyRoles && (specifyRoles.admin || specifyRoles.corp)) || '-KTlccaZaxPCGDaFPSc5' || '-LP-HKNae1mrVBYGWHRJ';
            if (user !== undefined) {
                if (user && user.acl && user.acl.roles) {
                    uRoles = Object.keys(user.acl.roles);
                    var admin = user.acl.roles[adminId]; //is Administrator
                    if (admin) {
                        return true;
                    }
                }
                //no have permission obj
                if (pAcl === undefined || pAcl === null) {
                    return false;
                }

                //all user
                // if (pAcl.all && pAcl.all[action] === true) {
                //     return true;
                // }

                //check users
                if (pAcl.users) {
                    var pUser = _.find(pAcl.users, function(value, key) {
                        return key === (user.$id || user.uid) && value[action];
                    });

                    if (pUser !== undefined) {
                        return true;
                    }
                }

                //check groups
                if (pAcl.groups) {
                    var pGroup = _.find(pAcl.groups, function(value, key) {
                        return uGroups.indexOf(key) > -1 && value[action];
                    });

                    if (pGroup !== undefined) {
                        return true;
                    }
                }

                //check roles
                if (pAcl.roles) {
                    var pRole = _.find(pAcl.roles, function(value, key) {
                        return uRoles.indexOf(key) > -1 && value[action];
                    });

                    if (pRole !== undefined) {
                        return true;
                    }
                }
            }

            return false;
        }

        function checkSpecifyRole(user, type) {
            var roleId = null;
            if (!user || !user.acl || !user.acl.roles) {
                return false;
            }

            switch (type) {
                case 'admin':{
                    var adminRoleId = specifyRoles && specifyRoles.admin || '-KTlccaZaxPCGDaFPSc5';
                    var corpRoleId = specifyRoles && specifyRoles.corp || '-LP-HKNae1mrVBYGWHRJ';
                    return (user.acl.roles[adminRoleId] !== undefined) || user.acl.roles[corpRoleId] !== undefined; 
                }break;
                case 'regional':
                    roleId = specifyRoles && specifyRoles.regional || '-LP-HEFPYwwqQoS4hSCn';
                    break;
                case 'district':
                    roleId = specifyRoles && specifyRoles.district || '-LP-HHPCsHQiOv5lfxsz';
                    break;
                case 'area':
                    roleId = specifyRoles && specifyRoles.area || '-LP-HKNae1mrVBYGWHRH';
                    break;
                case 'rep':
                    roleId = specifyRoles && specifyRoles.rep || '-KTqlt0WbRBekRyP6pYN';
                    break;
            }

            return user.acl.roles[roleId] !== undefined;
        }

        // function getLatLonByAddressString(data) {
        //     return new Promise(function (resolve, reject){
        //         // var address = data.address + ", " + data.city + ", " + data.state + ", " + data.zipCode + ", US";
        //         let geocoder = new google.maps.Geocoder;
        //         geocoder.geocode({'address': data+ ", US"}, function(results) {
        //             console.log(results, data);
        //             let location = results && results[0];
        //             resolve(location);
        //         },function(error){
        //             reject(error);
        //         });
        //     });
        // }

        function getLatLonByAddressString(addressStr) {
            let address = angular.copy(addressStr);
            // var address = data.address + ", " + data.city + ", " + data.state + ", " + data.zipCode + ", US";
            address = address.replace(/undefined/g, '');
            address = address.replace(/Undefined/g, '');
            address = address.replace(/#/g, '');
            return $http.get(geoCodeUrl + 'xml?sensor=false&address=' + address + "" + '&key=' + geoCodeKey).then(function(res) {
                // console.log('===============Utils GetLatLonByAddress==================');
                // console.log('Address: ' + address);
                // console.log(res);
                if (res.statusText !== 'OK' && res.status != 200) {
                    return [];
                }
                var xml = res.data;
                var parser = new DOMParser();
                var xmlDoc = parser.parseFromString(xml, "application/xml");
                var locationNodes = xmlDoc.getElementsByTagName("location");
                if (locationNodes.length === 0) {
                    return [];
                }
                // console.log(locationNodes);
                return _.map(locationNodes, function(location) {
                    if (location.children) {
                        var latNode = location.children[0].innerHTML;
                        var lngNode = location.children[1].innerHTML;
                        if (latNode && lngNode) {
                            return {
                                lat: latNode,
                                lng: lngNode
                            };
                        }
                    }
                    return [];
                });
            }, function(error) {
                console.log('error', error);
                return [];
            });
        }

        // function checkIsAdmin(user) {
        //     var adminId = specifyRoles && specifyRoles.admin || '-KTlccaZaxPCGDaFPSc5';
        //     if (user && user.acl && user.acl.roles) {
        //         return user.acl.roles[adminId] !== undefined;
        //     }

        //     return false;
        // }

        // function checkIsRep(user) {
        //     var repId = specifyRoles && specifyRoles.default || '-KTqlt0WbRBekRyP6pYN',
        //         repAppId = specifyRoles && specifyRoles.applicationRep || '-LGWaJzNKPom0hpiOuZ9';
        //     //
        //     if (user && user.acl && user.acl.roles) {
        //         return user.acl.roles[repId] !== undefined || user.acl.roles[repAppId] !== undefined;
        //     }

        //     return false;
        // }

        return utils;
    }
})();