(function () {
    'use strict';

    angular.module('app.event')
        .controller('EventListPopupCtrl', EventListPopupCtrl);

    /** @ngInject */
    function EventListPopupCtrl($rootScope, $scope, $uibModalInstance, appUtils, $timeout, authService, eventService, eventId, facilityId, facilities, states, state) {
        var currentUser = authService.getCurrentUser(); //$rootScope.storage.currentUser,
        var isAdmin = appUtils.checkSpecifyRole(currentUser, 'admin'),
            isRep = appUtils.checkSpecifyRole(currentUser, 'rep');
        
        var eventVm = this;
        eventVm.eventId = angular.copy(eventId);
        eventVm.allFacilities = angular.copy(facilities);
        eventVm.allStates = angular.copy(states);
        eventVm.selectedState = angular.copy(state);
        //eventVm.showValid = false;
        eventVm.eventTypes = [];
        eventVm.getType = getType;
        eventVm.getState = getState;
        eventVm.getDateTime = getDateTime;
        eventVm.getRequester = getRequester;
        eventVm.getFacility = getFacility;
        eventVm.search = search;
        eventVm.changePage = changePage;
        eventVm.checkEvent = checkEvent;
        eventVm.selectEvent = selectEvent;
        eventVm.removeSelectEvent = removeSelectEvent;
        eventVm.events = [];
        eventVm.cri = {
            keyword: '',
            type: 'All',
            requester: '',
            size: 10,
            from: 0,
            status: 1,
            facility: facilityId
        };


        $('.add-web-app-modal').hide();
        $('.preview-web-app-modal').hide();

        eventVm.groupedItems = [];
        eventVm.filteredItems = [];
        eventVm.pagedItems = [];
        eventVm.paging = {
            pageSize: 10,
            currentPage: 0,
            totalPage: 0,
            totalRecord: 0
        };


        if ($.trim(eventVm.eventId) !== '') {
            eventService.get(eventVm.eventId).then(function (event) {
                eventVm.eventSelected = event;
                $timeout(angular.noop, 200);
            });
        }

        _loadEventTypes().then(function () {
            eventVm.cri.requester = !isRep ? 'All' : currentUser.$id;
            eventVm.cri.alias = !isAdmin ? currentUser.alias : null;
            search();
        });

        function _loadEventTypes() {
            return eventService.getEventTypes().then(function (types) {
                eventVm.eventTypes = types || [];
            });
        }

        function changePage() {
            eventVm.cri.from = eventVm.paging.currentPage * eventVm.cri.size;
            _search();
            //_groupToPages();
        }


        function search() {
            appUtils.showLoading();
            $timeout(function () {
                eventVm.cri.from = 0;
                _search();
            }, 200);
        }

        function _search() {
            eventService.search(eventVm.cri).then(function (result) {
                appUtils.hideLoading();
                eventVm.events = result.items;
                //===================
                // eventVm.paging.totalRecord = result.items.length;
                // eventVm.paging.currentDate = 0;
                // _groupToPages();

                angular.extend(eventVm.paging, {
                    totalRecord: result.totalRecords,
                    totalPage: result.pages
                });
            });
        }

        function getType(value) {
            var type = _.find(eventVm.eventTypes, function (item) {
                return item.value === value;
            });

            return type && type.text || '';
        }

        function getDateTime(value) {
            var time = parseInt(value);
            if (isNaN(time)) {
                return '';
            }
            return moment(time).utc().format('MM/DD/YYYY');
        }

        function getState(value) {
            var state = _.find(eventVm.allStates, function (item) {
                return item.iso === value;
            });

            return state && state.name || '';
        }

        function getFacility(value) {
            var facility = _.find(eventVm.allFacilities, function (item) {
                return item.$id === value;
            });

            return facility ? facility.facility_promo_code + "<br>" + facility.name : '';
        }

        function getRequester(uid) {
            var requester = _.find(eventVm.allEmployees, function (item) {
                return item.$id === uid;
            });

            return requester ? requester.firstName + ' ' + requester.lastName : '';
        }

        function checkEvent(item) {
            //eventVm.showValid = false;
            eventVm.eventId = item.$id;
            $('input[name=select-event]').each(function () {
                $(this).prop('checked', false);
            });
            $('input[value=' + item.$id + ']').prop('checked', true);
            eventVm.eventSelected = item;
        }

        function selectEvent() {
            // if(eventVm.eventSelected === undefined){
            //     eventVm.showValid = true;
            //     return;
            // }
            $uibModalInstance.close(eventVm.eventSelected);
        }

        function removeSelectEvent() {
            eventVm.eventSelected = null;
            eventVm.eventId = '';
            //eventVm.showValid = false;
        }

        function moveOnTop(a, fn) {
            var non_matches = [];
            var matches = a.filter(function (e, i, a) {
                var match = fn(e, i, a);
                if (!match) non_matches.push(e);
                return match;
            });
            return matches.concat(non_matches);
        }

        function _groupToPages() {
            eventVm.pagedItems = [];
            for (var i = 0; i < eventVm.filteredItems.length; i++) {
                if (i % eventVm.paging.pageSize === 0) {
                    eventVm.pagedItems[Math.floor(i / eventVm.paging.pageSize)] = [eventVm.filteredItems[i]];
                } else {
                    eventVm.pagedItems[Math.floor(i / eventVm.paging.pageSize)].push(eventVm.filteredItems[i]);
                }
            }
            if (eventVm.filteredItems.length % eventVm.paging.pageSize === 0) {
                eventVm.paging.totalPage = eventVm.filteredItems.length / eventVm.paging.pageSize;
            } else {
                eventVm.paging.totalPage = Math.floor(eventVm.filteredItems.length / eventVm.paging.pageSize) + 1;
            }

        }

        //Functions
        eventVm.close = function () {
            $uibModalInstance.dismiss('cancel');
        };
    }
})();
