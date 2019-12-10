(function () {
    'use strict';

    angular.module('app.tlsApiDataCache')
        .controller('tlsDataCacheCtrl', tlsDataCacheCtrl);

    /** @ngInject */
    function tlsDataCacheCtrl($rootScope, $scope, $q, $http, $timeout, appUtils, toaster, tlsApiDataCacheService, appSettingService, factilitiesCacheService, regionsCacheService, plansCacheService, addonsCacheService, $uibModal) {
        $scope.userPermission = $rootScope.storage.statePermission;

        var vm = this; // jshint ignore:line
        vm.lastedCacheTimeTxt = moment().format('LLL');
        vm.caches = [];
        vm.urlRefreshAll = '';
        vm.isProcessingRefreshAll = '';

        //Functions
        vm.refreshCache = refreshCache;
        vm.refreshAllCache = refreshAllCache;

        $scope.$on('$destroy', function () {
            if (tlsApiDataCacheService.cacheRef) {
                tlsApiDataCacheService.cacheRef.off('value');
            }
        });

        //Load Data
        initPage();
        //========================================================
        function initPage() {
            return tlsApiDataCacheService.cacheRef.on('value', function (snap) {
                var data = snap && snap.val();
                vm.caches = _.filter(data, function (item) {
                    return _.isObject(item) && item.name !== 'State';
                });
                vm.caches = _.sortBy(vm.caches, 'order');
                if (data.timestampModified) {
                    vm.lastedCacheTimeTxt = moment(_.clone(data.timestampModified)).format('LLL');
                }
                if (data.url) {
                    vm.urlRefreshAll = _.clone(data.url);
                }
                if (data.isProcessing) {
                    vm.isProcessingRefreshAll = data.isProcessing;
                }
                $timeout(angular.noop, 200);
            });
        }
        function refreshCache(item) {
            console.log(item);
            if (!item.isProcessing) {
                appUtils.showLoading();
                var req = $q.when(), msg = 'Refresh data TLS done!';
                if (item.name === 'Facility') {
                    item.isProcessing = true;
                    req = factilitiesCacheService.refreshFacilities();
                    msg = 'Refresh data TLS Facilities done!';
                }
                if (item.name === 'Region') {
                    item.isProcessing = true;
                    req = regionsCacheService.refreshRegions();
                    msg = 'Refresh data TLS Regions done!';
                }
                if (item.name === 'Plan') {
                    item.isProcessing = true;
                    req = plansCacheService.refreshPlans();
                    msg = 'Refresh data TLS Plans done!';
                }
                if (item.name === 'Add On') {
                    item.isProcessing = true;
                    req = addonsCacheService.refreshAddons();
                    msg = 'Refresh data TLS Addons done!';
                }
                if (item.name === 'GSW' || item.name === 'Counter Sales') {
                    req = showPopupSendNotification(item);
                    msg = `Refresh data ${item.name} done!`;
                }
                return req.then(function (response) {
                    console.log(response);
                    if (response && response.ignoreMsg) {
                        return response;
                    }
                    appUtils.hideLoading();
                    return appSettingService.refreshCacheSetting();

                }).then(function (response) {
                    if (response && response.ignoreMsg) {
                        return response;
                    }
                    $timeout(function () {
                        toaster.success(msg);
                    }, 500);
                });
            }
        }

        function refreshAllCache() {
            //console.log('All Single Cache');
            //call $http update all then update in firebase Data
            _.forEach(vm.caches, function (cache) {
                cache.isProcessing = true;
            });
            appUtils.showLoading();
            return $http.post(vm.urlRefreshAll, {}).then(function (response) {
                //console.log(response);
                if (response && response.data) {
                    return factilitiesCacheService.refreshFacilities();
                }
                return false;
            }).then(function () {
                appUtils.hideLoading();
                return appSettingService.refreshCacheSetting();
            });
        }
        function showPopupSendNotification(eventItem) {
            appUtils.hideLoading();
            console.log(eventItem);

            var modalInstance = $uibModal.open({
                templateUrl: './app/tlsAPIdatacache/modal/event-popup.tpl.html',
                controller: 'EventSyncDataPopupCtrl as vm',
                size: 'm',
                scope: $scope,
                windowClass: '',
                backdrop: 'static',
                resolve: {
                    eventTypeName: function () {
                        return angular.copy(eventItem.name);
                    }
                }
            });
            return modalInstance.result.then(function (rs) {
                console.log(rs);

                if (rs) {
                    eventItem.isProcessing = true;
                    let isReplace = !!rs.valueSelected;
                    return tlsApiDataCacheService.refreshEventCache(eventItem.key, isReplace);
                    // toaster.pop('success', 'Success', "Sent notify successfully.");
                    // setTimeout(() => {
                    //     $state.reload();
                    // }, 1000);
                }
                // return { ignoreMsg: true }; 

            }, function (error) {
                console.log('error', error);
                return { ignoreMsg: true };

            });
        }
    }
})();