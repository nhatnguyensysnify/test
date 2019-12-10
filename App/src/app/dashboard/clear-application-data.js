(function () {
    'use strict';

    angular.module('app.membership')
        .controller('clearApplicationCtrl', clearApplicationCtrl);

    /** @ngInject */
    function clearApplicationCtrl($rootScope, $scope, $timeout, memAppService, appUtils, toaster) {
        $scope.userPermission = $rootScope.storage.statePermission;
        var selectedFiles = {};
        $scope.processFileShowValid = false;
        $scope.fileNotExisted = false;
        $scope.enalbleInputFile = function () {
            $scope.processFileShowValid = false;
            $scope.fileNotExisted = false;
        };

        $scope.handleFileSelect = function (form) {
            appUtils.showLoading();
            $scope.processFileShowValid = true;
            if (!selectedFiles[0]) {
                $scope.fileNotExisted = true;
                appUtils.hideLoading();
                return;
            }

            if (form.$invalid) {
                appUtils.hideLoading();
                return;
            }

            //
            $('#submit-parse').text('Parsing...').attr('disabled', true);
            Papa.parse(selectedFiles[0], {
                header: false,
                worker: true,
                error: function (err, file, inputElem, reason) {
                    toaster.error(err);
                },
                complete: function (rs) {
                    var fileName = $('#files').val() || '';
                    try {
                        var appIds = _.map(rs.data, function (value, key) {
                            return value[0];
                        });
                        if (appIds && appIds.length > 0) {
                            memAppService.clearApplicationDataForTesting(appIds).then(function (rs) {
                                appUtils.hideLoading();
                                if (!rs.result) {
                                    toaster.error(rs.message);
                                    return;
                                } else {
                                    toaster.success('Clear application success.');
                                }
                            });
                        } else {
                            appUtils.hideLoading();
                        }
                    }
                    catch (error) {
                        toaster.error('Process file has error! Please try again later.');
                    }
                    selectedFiles = {};
                    $('#files').val('');
                    $timeout(function () {
                        $scope.$apply();
                        $scope.processFileShowValid = false;
                        $scope.fileNotExisted = false;
                    }, 200);
                    console.log('error');
                    $('#submit-parse').text('Process Data').removeAttr('disabled');
                }
            });

        };

        $(document).ready(function () {
            $("#files").change(function (event) {
                selectedFiles = event.target.files;
            });
        });
    }

})();
