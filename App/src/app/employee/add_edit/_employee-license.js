(function () {
    'use strict';

    angular.module('app.employee')
        .controller('employeeLicenseController', employeeLicenseController);

    /** @ngInject */
    function employeeLicenseController($scope, $q, $timeout, $state, dialogService, appUtils, employeeService, memStateService, memTerritoryService, employeeLicenseService) {
        var employeeLicenseVm = this; // jshint ignore:line
        employeeLicenseVm.loading = false;

        //console.log('employeeLicenseController');

        $scope.isAdmin = $scope.$parent.userPermission.isAdmin;

        employeeLicenseVm.initPage = initPage;
        $scope.saveExtraInfo = saveExtraInfo;

        //#region availability
        $scope.dayOfWeek = appUtils.dayOfWeekEnum;
        $scope.avails = appUtils.availabilityEnum;
        $scope.hireTypes = appUtils.hireTypes;

        // employeeLicenseVm.avails = {};
        // for (var key in $scope.dayOfWeek)
        //     employeeLicenseVm.avails[key] = 0;

        //
        employeeLicenseVm.selectedStates = null;
        employeeLicenseVm.selectedTerritories = null;
        employeeLicenseVm.loadedStates = [];
        employeeLicenseVm.loadedTerritories = [];
        employeeLicenseVm.career = {
            selectedStates: [],
            selectedTerritories: [],
            typeOfHire: "",
            dateOfHire: ''
        };

        //#region license
        employeeLicenseVm.lics = [];
        employeeLicenseVm.licsView = [];

        $scope.licenseState = appUtils.licenseStateEnum;
        $scope.licenseType = appUtils.licenseTypeEnum;
        $scope.appointed = appUtils.appointedEnum;
        $scope.editIndex = null;
        $scope.editModel = null;
        $scope.err = employeeLicenseService.err;

        employeeLicenseVm.add = add;
        employeeLicenseVm.edit = edit;
        employeeLicenseVm.cancel = cancel;
        employeeLicenseVm.remove = remove;
        employeeLicenseVm.save = save;


        //Init State Select 2
        /* $scope.select2Cri = {
            keyword: '',
            size: 25,
            from: 0,
            isAuthorized: true,
            role: null
        }; */

        /* $scope.select2OptionsTerritory = {
            AllowClear: true
        }; */

        // $scope.select2OptionsFacilities = {
        //     AllowClear: true,
        //     //minimumInputLength: 3,
        //     tags: true,
        //     maximumSelectionLength: 1,
        //     ajax: {
        //         dataType: 'json',
        //         delay: 250,
        //         transport: function (params, success, failure) {
        //             var $request = memberShipFacilitiesService.search(params.data);
        //             $request.then(success, failure);
        //             return $request;
        //         },
        //         data: function (params) {
        //             return params.term || '';
        //         },
        //         processResults: function (data) {
        //             var result = _.map(data, function (item) {
        //                 return _composeFacilitySelectBoxText(item);
        //             });
        //             return {
        //                 results: result
        //             };
        //         }
        //     }
        // };

        $scope.$on('$loadEmployeeLicense', function (data) {
            initPage();
            //load state data
            _loadStates();
            _loadTerritories();
        });

        $scope.goToEmployee = function (email) {
            employeeService.getUserByEmail(email).then(function (employee) {
                if (employee) {
                    // $state.go('employee.edit', { id: employee.$id});
                    window.open('#/employees/edit/' + employee.$id + '/');
                }
            });
        };

        //Functions
        function initPage() {
            //console.log('initpage license');

            $scope.editIndex = null;
            let userFull = $scope.$parent.user; //ref user info from parent
            //console.log(userFull);
            if (!!userFull) {
                //if (!!userFull.availability) employeeLicenseVm.avails = userFull.availability;
                getEmployeeLicenses();

                employeeLicenseVm.career.typeOfHire = userFull.typeOfHire ? userFull.typeOfHire : "";
                employeeLicenseVm.career.selectedStates = userFull.workingStates ? Object.keys(userFull.workingStates) : [];
                employeeLicenseVm.career.selectedTerritories = userFull.workingTerritories ? Object.keys(userFull.workingTerritories) : [];
                if (!!userFull.dateOfHire) {
                    var ts = parseInt(_.clone(userFull.dateOfHire));
                    employeeLicenseVm.career.dateOfHire = moment.utc(ts).format('MM/DD/YYYY');
                }
            }
            //console.log(employeeLicenseVm.career);
        }

        //Employee license
        function getEmployeeLicenses() {
            employeeLicenseService.all().then(
                function (res) {
                    employeeLicenseVm.lics = res;

                    employeeLicenseVm.licsView = [];
                    for (var i = 0; i < res.length; i++)
                        employeeLicenseVm.licsView.push(employeeLicenseService.viewObj(res[i]));

                    //console.log("All = " + JSON.stringify(employeeLicenseVm.licsView));
                });
        }

        function add() {
            $scope.submitted = false;
            //default issueState = user.state
            $scope.editModel = _.clone(employeeLicenseService.obj($scope.$parent.user.state));
            $scope.editIndex = -1;
        }

        function edit(index) {
            $scope.submitted = false;

            $scope.editIndex = index;
            $scope.editModel = _.clone(employeeLicenseVm.lics[index]);

            $scope.editModel.issueDate = employeeLicenseVm.licsView[index].issueDate;
            $scope.editModel.expirationDate = employeeLicenseVm.licsView[index].expirationDate;
            //$scope.editModel.timestampCreated = employeeLicenseVm.licsView[index].timestampCreated;
            $scope.editModel.timestampModified = employeeLicenseVm.licsView[index].timestampModified;
        }

        function cancel() {
            $scope.editIndex = null;
            /* Object.assign(item, item.origin);
            delete item.origin; */
        }

        function remove(index) {
            let obj = employeeLicenseVm.lics[index];
            //console.log("DEL =" + JSON.stringify(obj));
            return dialogService.confirm('Delete ' + obj[employeeLicenseService.logField] + ' ?')
                .then(function () {
                    //console.log("del = " + obj.id);
                    employeeLicenseService.del(obj);
                    for (var i = index; i < employeeLicenseVm.lics.length; i++) {
                        employeeLicenseVm.lics[i] = employeeLicenseVm.lics[i + 1];
                        employeeLicenseVm.licsView[i] = employeeLicenseVm.licsView[i + 1];
                    }
                    employeeLicenseVm.licsView.pop();
                    return employeeLicenseVm.lics.pop();
                }, function () {
                    //console.log('Confirm dismissed!');
                });
        }

        function save(err) {
            $scope.submitted = true;
            if (err) return;

            appUtils.showLoading();
            if ($scope.editIndex === -1) {
                employeeLicenseService.add($scope.editModel).then(function (res) {
                    employeeLicenseVm.lics.unshift(res);
                    employeeLicenseVm.licsView.unshift(employeeLicenseService.viewObj(res));
                    //console.log("Add = " + JSON.stringify(res));
                    $scope.editIndex = null;
                })
                    .finally(function () {
                        appUtils.hideLoading();
                        $timeout(angular.noop, 0);
                    });
            } else {
                employeeLicenseService.upd($scope.editModel.id, $scope.editModel).then(function (res) {
                    //console.log("upd = " + JSON.stringify(res));
                    employeeLicenseVm.lics[$scope.editIndex] = res;
                    employeeLicenseVm.licsView[$scope.editIndex] = employeeLicenseService.viewObj(res);
                    $scope.editIndex = null;
                })
                    .finally(function () {
                        appUtils.hideLoading();
                        $timeout(angular.noop, 0);
                    });
            }
        }

        //
        function _composeFacilitySelectBoxText(data, roles) {
            return {
                id: data.$id,
                text: data.name + ' (' + data.facility_promo_code + ')'
            };
        }

        function _loadStates() {
            memStateService.getAll().then(function (data) {
                employeeLicenseVm.loadedStates = data;
                $timeout(angular.noop, 200);
            });
        }

        function _loadTerritories() {
            return memTerritoryService.getAllTerritoryLoadOnce().then(function (data) {
                employeeLicenseVm.loadedTerritories = data || [];
                $timeout(angular.noop, 200);
            });
        }

        function saveExtraInfo() {
            let userFull = $scope.$parent.user;
            if (employeeLicenseVm.career.selectedStates.length > 0) {
                userFull.workingStates = _.reduce(employeeLicenseVm.career.selectedStates, function (result, value, key) {
                    result[value] = true;
                    return result;
                }, {});
            }
            if (employeeLicenseVm.career.selectedTerritories.length > 0) {
                userFull.workingTerritories = _.reduce(employeeLicenseVm.career.selectedTerritories, function (result, value, key) {
                    result[value] = true;
                    return result;
                }, {});
            }
            userFull.typeOfHire = angular.copy(employeeLicenseVm.career.typeOfHire);
            // userFull.dateOfHire = angular.copy(employeeLicenseVm.career.typeOfHire);
            if (!angular.isUndefined(employeeLicenseVm.career.dateOfHire) && employeeLicenseVm.career.dateOfHire !== "") {
                userFull.dateOfHire = moment.utc(angular.copy(employeeLicenseVm.career.dateOfHire)).startOf('day').valueOf();
            }

            //if (!!employeeLicenseVm.avails) userFull.availability = employeeLicenseVm.avails;

            // call function update user on parent
            $scope.$parent.updateUser(true);
        }
    }

    function goTo(item) {
        var tab = status === 0 ? -1 : status;
        $state.go('membership.editApplication', { id: item.appId, 'tab': tab, 'keyword': '', 'page': 0 });
    }
})();