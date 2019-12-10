(function () {
    'use strict';

    angular.module('app.event')
        .controller('eventTrackingLogCtrl', eventTrackingLogCtrl);
    /** @ngInject */
    function eventTrackingLogCtrl($scope, $uibModalInstance, $timeout, appUtils, eventId, eventTrackingService, employeeService) {
        var eventDetailCtrl = $scope.eventVm;
        var eTrackingVm = this; // jshint ignore:line
        eTrackingVm.eventId = eventId;
        eTrackingVm.dataModel = [];
        eTrackingVm.titleText = {
            createEvent: 'Create Event',
            updateEvent: 'Update Event',
            submitEvent: 'Submitted Event',
            updateSystemData: 'Update System Data',
            updateEventCash: 'Update Event Cash Collected',
            sendNotifyEvent: 'Sent Notify Event',
            revertEventData: 'Refresh Event'
        };
        eTrackingVm.fieldText = {
            sysCloseRate: 'System Closing Rate',
            sysSold: 'Sold By System',
            sysTotalRevenue: 'System Total Revenue',
            sysTotalAnnualMember: 'System Total Annual Members',
            sysTotalMonthlyMember: 'System Total Monthly Members',
            sysMultiState: 'System Multi State Protection',
            sysMinorChildren: 'System Minor Children Protection',
            sysHunterShield: 'System Hunter Shield',
            sysBailBond: 'System Bail Bond/Expert Witness',
            sysGITC: 'System Gunowner Identity Theft Coverage',
            sysCareerShield: 'System Career Shield Protection',
            iptBailBond: 'Bail Bond/Expert Witness',
            iptGITC: 'Gunowner Identity Theft Coverage',
            iptCareerShield: 'Career Shield Protection',
            iptHunterShield: 'Hunter Shield',
            iptMinorChildren: 'Minor Children Protection',
            iptMultiState: 'Multi State Protection',
            iptTotalMonthlyMember: 'Total Monthly Members',
            iptTotalAnnualMember: 'Total Annual Members',
            iptCloseRate: 'Closing Rate',
            iptTotalRevenue: 'Total Revenue',
            iptNewMember: 'New Members',
            iptTotalAttendees: 'Total Potential',
            iptTotalAttendeesRegistered: 'Total Attendees',
            iptAnE: 'Total A&E',
            iptGSW: 'Total GSW',
            estTotalRevenue: 'Est. Revenue',
            estProspectiveMember: 'Prospective Members',
            estAttendees: 'Est. Attendees',
            description: "Description",
            endDate: 'End Date',
            facilityCode: "Facility Code",
            facilityId: "Facility",
            isActive: 'Archive',
            name: "Name",
            state: "State",
            region: "Plan Type",
            regionCode: "Plan Type Code",
            representativeAttended: 'Representative',
            requester: 'Manager',
            areaManager: 'Area Manager',
            startDate: 'Start Date',
            type: "Event Type",
            modifiedBy: 'Modified By',
            territory: 'Territory',
            status: 'Is Publish',
            appUploaded: 'Apps Uploaded',
            appCount: 'Applications',
            dataEntered : 'Data Entered',
            fees: 'Event Fees',
            requesterId: 'Manager Id',
            mailingAddress: 'Address Value',
            'mailingAddress-address': 'Address 1',
            'mailingAddress-address_2': 'Address 2',
            'mailingAddress-city_name': 'City',
            'mailingAddress-state_code': 'State',
            'mailingAddress-zip_code': 'Zip Code',
            verifyStatus: 'Status'
        };

        eTrackingVm.close = function () {
            $uibModalInstance.close();
        };

        eTrackingVm.getFacility = getFacility;
        eTrackingVm.getType = getType;
        eTrackingVm.getTerritory = getTerritory;
        eTrackingVm.getStatus = getStatus;
        eTrackingVm.getRegion = getRegion;
        eTrackingVm.getVerifyStatus = getVerifyStatus;
        eTrackingVm.getState = eventDetailCtrl.getState;
        

        initPage();

        //Functions
        function initPage() {
            return eventTrackingService.get(eventId).then(function (res) {
                eTrackingVm.dataModel = res;
                $timeout(angular.noop, 300);
            });
        }

        function getType(value) {
            var type = _.find(eventDetailCtrl.eventTypes, function (item) {
                return item.value === value;
            });

            return type && type.text || '';
        }

        function getRegion(stateCode, value) {
            var regions = eventDetailCtrl.regionGroups[stateCode];
            var region = _.find(regions, function (item) {
                return item.id === value;
            });

            return region && region.guid || '';
        }

        function getTerritory(value) {
            var territory = _.find(eventDetailCtrl.allTerritories, function (item) {
                return item.$id === value;
            });

            return territory && territory.name || '';
        }

        function getStatus(value) {
            var status = _.find(appUtils.eventStatus, function (item) {
                return item.value === value;
            });

            return status && status.text || '';
        }

        function getVerifyStatus(value) {
            var status = _.find(appUtils.eventListVerifyStatus, function (item) {
                return item.value === value;
            });
            return status && status.text || '';
        }
        function getFacility(value) {
            var facility = _.find(eventDetailCtrl.allFacilities, function (item) {
                return item.$id === value;
            });

            return facility ? facility.facility_promo_code + " - " + facility.name : '';
        }


        $scope.goToEmployee = function (email) {
            employeeService.getUserByEmail(email).then(function (employee) {
                if (employee) {
                    $uibModalInstance.close();
                    window.open('#/employees/edit/' + employee.$id + '/');
                }
            });
        };

        $scope.formatTrackingTime = function (timestamp) {
            timestamp = parseInt(timestamp);
            if (_.isNaN(timestamp)) {
                timestamp = null;
            }
            var time = timestamp ? moment(timestamp) : moment();
            return appUtils.formatDateTimeString(time);
        };

        $scope.getRequesterInfo = function (values) {
            if (angular.isObject(values)) {
                var _newList = [];
                _newList = _.map(values, function (value) {
                    if (value.repCode && _.trim(value.repCode) !== '')
                        return value.displayName + ' (' + value.repCode + ')';
                    else
                        return value.displayName;
                });
                return _newList.join(', ');
            }
            return values;
        };
    }

})();
