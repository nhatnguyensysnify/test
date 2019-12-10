(function() {
    'use strict';
    angular.module('app.event')
        .controller('EventGoalModalCtrl', EventGoalModalCtrl);
    /** @ngInject */
    function EventGoalModalCtrl($scope, $state, $uibModalInstance, appUtils, memStateService, eventGoalService, toaster, $timeout, authService, goalData) {
        var egmVm = this,
            updated = false,
            currentUser = authService.getCurrentUser();
        Object.assign(egmVm, {
            model: {
                m: null,
                y: null,
                r: null,
                plan: null
            },
            close: close,
            states: [],
            months: _.range(1, 13).map(function(i, index) { return { text: moment().month(i - 1).format('MMMM'), val: i }; }),
            save: save,
            isEdit: !!goalData,
            selec2Cfg: {
                disabled: !!goalData
            }
        });
        init();

        function init() {
            if (goalData) {
                Object.assign(egmVm.model, {
                    m: goalData.m,
                    y: goalData.y,
                    r: goalData.r,
                    plan: goalData.plan
                });
            } else {
                var n = moment().startOf('month').add(1, 'month');
                Object.assign(egmVm.model, {
                    m: n.get('month') + 1,
                    y: n.get('year'),
                    r: null,
                    plan: null
                });
            }
            loadRegion();
        }

        function loadRegion() {
            return memStateService.statesLoadOnce().then(function(r) {
                // console.log('loadRegion');
                // console.log(r);
                egmVm.states = r;
                // egmVm.states.unshift
                $timeout(angular.noop, 100);
            });
        }

        function close() {
            $uibModalInstance.close(updated);
        }

        function save(f, addMore) {
            if (f.$invalid) {
                if (!f.$submitted) {
                    console.log('setSubmitted');
                    f.$setSubmitted(true);
                }
                return;
            }
            appUtils.showLoading();
            egmVm.model.modifiedBy = {
                email: currentUser.email,
                repCode: currentUser.repCode,
                display: (currentUser.displayName || (currentUser.firstName + ' ' + currentUser.lastName)) + ' (' + currentUser.repCode + ')'
            };
            if (goalData) {
                var isChangeKey = goalData.y !== egmVm.model.y || goalData.m !== egmVm.model.m || goalData.r !== egmVm.model.r;
            }

            eventGoalService.setGoal(egmVm.model).then(function() {
                if (!egmVm.isEdit) {
                    eventGoalService.calGoal(egmVm.model);
                }
                updated = true;
                toaster.pop('success', 'Success', "Set Goal Success");
                if (addMore) {
                    var n = moment().startOf('month').add(1, 'month');
                    Object.assign(egmVm.model, {
                        m: n.get('month') + 1,
                        y: n.get('year'),
                        r: null,
                        plan: null
                    });
                    f.$setPristine();
                    $timeout(function() {
                        //console.log(egmVm.model);
                        $('#egmVmMonthSelect').val('number:' + egmVm.model.m).trigger('change');
                        $('#egmVmStateSelect').val(egmVm.model.r).trigger('change');
                    }, 100);
                } else {
                    // $uibModalInstance.close(true);
                    close();
                }
                appUtils.hideLoading();
            }, function() {
                appUtils.hideLoading();
            });

        }
    }
})();