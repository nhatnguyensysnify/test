(function () {
    'use strict';
    angular.module('app.event').controller('eventCalendarEmployeesModalCtrl', eventCalendarEmployeesModalCtrl);
    /** @ngInject */
    function eventCalendarEmployeesModalCtrl($scope, $uibModal, $uibModalInstance, firebaseDataRef, $q, $timeout,
        eventService, authService, employeeService, shiftsService, appUtils, usersData, titleParams, currentDay,
        typeModal, toaster, employeeLogService, notificationService, currentUser, $ngBootbox, shiftUtils, employeeExportService, DataUtils) {

        var eventCalendarCtrl = $scope.eventVm,
            eventModalVm = this; // jshint ignore:line

        if (usersData) {
            eventModalVm.employees = angular.copy(usersData);
            eventModalVm.titleParams = angular.copy(titleParams);

        } else {
            eventModalVm.employees = [];
        }
        eventModalVm.typeModal = angular.copy(typeModal);
        $scope.emp = [];

        eventModalVm.cri = angular.copy(eventCalendarCtrl.cri);
        eventModalVm.getRoleText = $scope.$parent.getRoleText;

        eventModalVm.type = 1;
        eventModalVm.title = '';
        eventModalVm.result = [];
        eventModalVm.sort = {
            field: 'type',
            desc: true
        };
        eventModalVm.cri = {
            keyword: "",
            from: 0,
            size: 12,
            sort: 'timestampCreated',
            employeeId: '',
            isAuthorized: true
        };
        eventModalVm.paging = {
            pageSize: 12,
            currentPage: 0,
            totalPage: 0,
            totalRecord: 0
        };

        eventModalVm.getType = eventCalendarCtrl.getType;
        eventModalVm.parseToNumber = eventCalendarCtrl.parseToNumber;
        eventModalVm.changePage = changePage;
        eventModalVm.search = search;

        eventModalVm.close = close;
        eventModalVm.editShift = editShift;
        eventModalVm.reassign = reassign;
        eventModalVm.addAvailability = addAvailability;
        eventModalVm.showConfirmAddAvailability = showConfirmAddAvailability;
        eventModalVm.exportRepsUnavailable = exportRepsUnavailable;
        eventModalVm.isReassigned = false;
        //<--rep's pending region
        $scope.repsNotify = {};
        $scope.canNotify = false;

        var mailOf = {};
        for (let i = 0; i < usersData.length; i++) {
            mailOf[usersData[i].uid] = usersData[i].notificationEmail ? usersData[i].notificationEmail : usersData[i].email;
        }
        //rep's pending region-->

        initPage();
        //===============================================================
        function initPage() {
            //
            if(currentDay){
                eventModalVm.title = `<span class="caption-subject font-blue-steel bold ">${titleParams} - ${moment.utc(currentDay).format('LL')}</span>`;
            }else{
                eventModalVm.title = `<span class="caption-subject font-blue-steel bold ">${titleParams}</span>`;
            }

            if (eventModalVm.employees && eventModalVm.employees.length > 0) {
                // not search
                appUtils.showLoading();
                _.map(eventModalVm.employees, employee => {
                    employee.sourceTxt = (employee.shiftDetail && (employee.shiftDetail.status == shiftUtils.StatusEnum.CONFIRMED || employee.shiftDetail.status == shiftUtils.StatusEnum.APPROVED)) ? 'Rep' : 'System';
                    return employee;
                });
                $scope.$parent._getManagerText(eventModalVm.employees).then(function () {
                    $timeout(angular.noop, 200);
                }).then(() => {
                    _search();
                    appUtils.hideLoading();
                    // if (eventModalVm.typeModal == 'reps_pending' || eventModalVm.typeModal == 'reps_unavailable') {
                    //     _search();
                    // } else {
                    //     //other typeModal
                    //     $scope.emp = eventModalVm.employees;
                    //     console.log('emp', $scope.emp);

                    //     appUtils.hideLoading();
                    // }
                });
            }
        }

        function changePage() {
            eventModalVm.cri.from = eventModalVm.paging.currentPage * eventModalVm.cri.size;
            _search();
        }

        function search() {
            eventModalVm.cri.from = eventModalVm.paging.currentPage = 0;
            _search();
        }

        function _search() {
            appUtils.showLoading();

            const curPage = eventModalVm.paging.currentPage;
            const pageSize = eventModalVm.paging.pageSize;
            const objs = eventModalVm.employees;

            const emp = _.filter(objs, o => {
                return (o.displayName && o.displayName.toLowerCase().includes(eventModalVm.cri.keyword.toLowerCase())) ||
                    (o.repCode && o.repCode.toLowerCase().includes(eventModalVm.cri.keyword.toLowerCase())) ||
                    (o.email && o.email.toLowerCase().includes(eventModalVm.cri.keyword.toLowerCase()));
            });

            const totalPage = Math.ceil(emp.length / pageSize);

            angular.extend(eventModalVm.paging, {
                totalPage: totalPage,
                totalRecord: objs.length
            });

            $scope.emp = _.chunk(emp, pageSize)[curPage];

            appUtils.hideLoading();
        }
        //-->



        function close() {
            $uibModalInstance.dismiss(eventModalVm.isReassigned);
        }

        function editShift() {
            close();
            setTimeout(() => {
                eventCalendarCtrl.editShift();
            }, 200);
        }

        function showConfirmAddAvailability(employee) {

            let dateStr = moment(currentDay).utc().format('MM/DD/YYYY');
            $ngBootbox.confirm(`Do you want to set Availability on ${dateStr} is Available for ${employee.displayName}(${employee.repCode}) ?`).then(function () {
                appUtils.showLoading();
                eventModalVm.isReassigned = true;
                let promise = null;
                if (employee.shiftDetail) {
                    promise = setStatusAvailableShift(employee);
                } else {
                    promise = addAvailability(employee);
                }
                promise.then((rs) => {
                    _.remove($scope.emp, e => e.uid == employee.uid);
                    _.remove(eventModalVm.employees, e => e.uid == employee.uid);
                    appUtils.hideLoading();
                    toaster.success("Add availability " + employee.displayName + " Successfully!");
                    $timeout(angular.noop, 0);
                });
            }, () => {
            });
        }

        function setStatusAvailableShift(employee) {
            //aggregate data
            employee.shiftDetail.repFullName = employee.displayName;
            employee.shiftDetail.rep = employee.uid;
            employee.shiftDetail.dateStr = moment(currentDay).utc().format('MM/DD/YYYY');
            employee.shiftDetail.repCode = employee.repCode;

            return shiftsService.setStatusAvailableShift(employee.shiftDetail, shiftUtils.StatusEnum.APPROVED).then(res => {
                // toaster.success("Add availability " + employee.displayName + " Successfully!");
                return true;
            });

        }

        function addAvailability(employee) {
            eventModalVm.isReassigned = true;

            let shiftAdd = {
                availability: true,
                date: currentDay,
                startTime: currentDay,
                endTime: currentDay,
                startDate: currentDay,
                endDate: moment(currentDay).utc().endOf('day').valueOf(),
                title: `${employee.displayName} - ${moment(currentDay).utc().format('dddd - LL')}`,
                managers: employee.managers || [],
                alias: employee.alias,
                rep: employee.uid || employee.$id,
                description: '',
                status: shiftUtils.StatusEnum.APPROVED,

                //addition
                dateString: moment(currentDay).utc().format("MM/DD/YYYY"),

                //readonly
                timestampCreated: appUtils.getTimestamp(),
                timestampModified: appUtils.getTimestamp(),
                createdBy: eventCalendarCtrl.currentUid,
                modifiedBy: eventCalendarCtrl.currentUid
            };
            return shiftsService.addShifts([shiftAdd], employee);
        }

        function reassign(employee, index) {
            $(".dashboard-info-modal")[0].style.display = "none";

            let modalInstance = $uibModal.open({
                templateUrl: 'app/event/calendar/modal/reassign-modal.tpl.html',
                controller: 'eventCalendarReassignModalCtrl as reassignModalVm',
                size: 'lg',
                scope: $scope.$parent,
                windowClass: 'reassign-modal',
                backdrop: 'static',
                resolve: {
                    employee: function () {
                        return angular.copy(employee);
                    }
                }
            });

            modalInstance.result.then(function (res) {
                if (!res || !res.events || !res.rep) {
                    return -1;
                }
                appUtils.showLoading();
                eventModalVm.isReassigned = true;

                // reassign 1 rep
                const rep = res.rep;
                const events = res.events;
                let tasks = [];
                let dateStr = moment(currentDay).utc().format('MM/DD/YYYY');

                //send email to new rep & new rep's managers
                tasks.push(
                    notificationService.notiReassignRep(rep, employee.shiftId));

                //update shift
                tasks.push(
                    shiftsService.reassign(employee.shiftId, rep));

                //update events
                events.forEach(event => {
                    tasks.push(
                        eventService.reassign(event, rep, employee));
                });

                //update log to track activity
                const employeeLog = {
                    action: appUtils.logEmployeeAction.reassignAvailability.value,
                    message: `${currentUser.displayName} already reassigned activities at ${dateStr} to ${rep.displayName}(${rep.repCode})`,
                    updateBy: currentUser.email || '',
                    status: 'Reassigned',
                    shiftId: employee.shiftId
                };
                tasks.push(
                    employeeLogService.create(currentUser.uid, employeeLog));

                //update to UI
                $q.all(tasks)
                    .then(() => {
                        eventModalVm.employees[index].repAssigned = {};
                        eventModalVm.employees[index].repAssigned[rep.uid] = {
                            displayName: rep.displayName,
                            email: rep.email,
                            repCode: rep.repCode
                        };

                        toaster.success("Re-assign " + employee.displayName + " to " + rep.displayName + " Successfully!");
                    })
                    .finally(() => {
                        appUtils.hideLoading();
                    });
            }, function (res) {
                // can't assign
            }).finally(() => {
                $(".dashboard-info-modal")[0].style.display = "block";
            });
        }



        $scope.onCheckRep = function (rep) {
            if ($scope.repsNotify[rep.uid] === false) {
                delete $scope.repsNotify[rep.uid];
            }
            $scope.canNotify = !_.isEmpty($scope.repsNotify);

        };

        function notifyRepsPending(reps, mailOf) {
            appUtils.showLoading();
            return notificationService.notiRepsPending(reps, mailOf)
                .then((updateData) => {
                    const total = _.size(updateData);
                    toaster.success("Notify email will be sent to " + total + " user" + (total > 1 ? "s" : ""));
                })
                .finally(() => {
                    appUtils.hideLoading();
                    close();
                });
        }

        $scope.notify = function () {
            const reps = $scope.repsNotify;
            notifyRepsPending(reps, mailOf);
        };

        $scope.notifyAll = function () {
            $ngBootbox.confirm(`Do you want to send notifications to all reps unavailable?`).then(function () {
                const reps = eventModalVm.employees;
                notifyRepsPending(reps, mailOf);
            }, () => {
            });

        };
        function exportRepsUnavailable() {
            let eventVm = eventCalendarCtrl;
            console.log('eventVm', eventVm);
            
            var cri = angular.copy(eventVm.cri);
            cri.size = 5000;
            appUtils.showLoading();

            var exportFileName = "Employees_Unavailable_Export" + '_' + moment.utc(currentDay).format('MM_DD_YYYY');
            var opts = {
                states: DataUtils.array2ObjectIndex(eventVm.allStates, 'iso'),
                // eventTypes: DataUtils.array2ObjectIndex(eventVm.eventTypes, '$id'),
                // facilities: DataUtils.array2ObjectIndex(eventVm.allFacilities, '$id'),
                territories: DataUtils.array2ObjectIndex(eventVm.allTerritories, '$id'),
                // regions: DataUtils.array2ObjectIndex(eventVm.allRegions, 'id'),
                roles: eventVm.roles,
                fileName: exportFileName,
                rawData: angular.copy(eventModalVm.employees)
            };
            return employeeExportService.exportEmployeeUnavailable(cri, opts).then(function () {
                appUtils.hideLoading();
            });
        }
    }
})();