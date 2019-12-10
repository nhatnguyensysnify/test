(function() {
    'use strict';

    angular.module('app.eTemplate')
        .controller('eTemplateDetailsCtrl', eTemplateDetailsCtrl);
    /** @ngInject */
    function eTemplateDetailsCtrl($rootScope, $scope, $q, $stateParams, $state, $timeout, $ngBootbox, toaster, appUtils, eTemplateService, authService) {
        $rootScope.settings.layout.showBreadcrumb = true;
        $rootScope.breadcrumb = {
            name: 'Notification Template',
            link: '#/notification-template/list'
        };
        var currentUser = authService.getCurrentUser();
        var tplVm = this; // jshint ignore:line
        var id = $stateParams.id;
        var channel = $stateParams.channel;
        var oldShortName = '';
        tplVm.e_msges = {};
        tplVm.showInvalid = true;
        $scope.isEdit = false;
        tplVm.nameRegx = /^(a-z|A-Z|0-9)*[^!^*()\/\\;:@=+\[\]\/]*$/;
        tplVm.model = {
            name: '',
            content: '',
            shortName: '',
            authorName: '',
            editorName: '',
            channel: 'email',
            timestampCreated: '',
            timestampModified: '',
            note: '',
            subject: '',
            displayName: ''
        };

        tplVm.channels = [{
            name: 'Email',
            value: 'email'
        }, {
            name: 'SMS',
            value: 'sms'
        }];

        $scope.options = appUtils.summerNoteOptions;
        $timeout(function() {
            $scope.initEditor = true;
        }, 1000);
        angular.element(document).ready(function() {
            appUtils.clearSelection();
        });

        tplVm.saveEdit = saveEdit;
        tplVm.cancel = cancel;
        tplVm.enalbleShortNameForm = enalbleShortNameForm;
        initPage();
        //===============================================
        //Functions
        function initPage() {
            appUtils.showLoading();
            if (id && channel) {
                $scope.isEdit = true;
                eTemplateService.get(id, channel).$loaded().then(function(result) {
                    if (result) {
                        appUtils.hideLoading();
                        tplVm.model = result;
                        tplVm.model.$id = id;
                        tplVm.model.note = result.note || '';
                        tplVm.model.displayName = result.displayName || '';
                        tplVm.model.subject = result.subject || '';
                        oldShortName = result.shortName || '';
                        return;
                    }
                });
            } else {
                appUtils.hideLoading();
                $scope.isEdit = false;
                tplVm.showInvalid = false;
            }

        }

        function saveEdit(form) {
            if ($scope.isEdit) {
                update(form);
            } else {
                create(form);
            }
        }

        function create(form) {
            appUtils.showLoading();
            tplVm.showInvalid = true;
            if (form.$invalid) {
                appUtils.hideLoading();
                return;
            }

            eTemplateService.checkUniqueName(tplVm.model).then(function(res) {
                if (res && res !== null) {
                    appUtils.hideLoading();
                    form.shortname.$setValidity('server', false);
                    tplVm.e_msges.shortname = "ShortName already exists. Please enter another.";
                    return;
                }
                tplVm.model.authorName = currentUser.email;
                tplVm.model.editorName = currentUser.email;
                eTemplateService.create(tplVm.model).then(function(res) {
                    appUtils.hideLoading();
                    if (!res.result) {
                        $ngBootbox.alert(res.errorMsg);
                        return;
                    }
                    toaster.pop('success', 'Success', "Created Success.");
                    $state.go('eTemplate.list');
                }, function(res) {
                    $ngBootbox.alert(res.errorMsg);
                    appUtils.hideLoading();
                    return;
                });
            });
        }

        function update(form) {
            appUtils.showLoading();
            tplVm.showInvalid = true;
            if (form.$invalid) {
                appUtils.hideLoading();
                return;
            }
            checkShortNameUnique(form).then(function(resCheck) {
                if (!resCheck.result) {
                    if (oldShortName !== '' && oldShortName != tplVm.model.shortName) {
                        var objCreate = {
                            name: tplVm.model.name,
                            content: tplVm.model.content,
                            shortName: tplVm.model.shortName,
                            authorName: currentUser.email,
                            editorName: currentUser.email,
                            channel: tplVm.model.channel,
                            displayName: tplVm.model.displayName,
                            note: tplVm.model.note,
                            subject: tplVm.model.subject,
                            timestampCreated: '',
                            timestampModified: ''
                        };
                        eTemplateService.create(objCreate).then(function(res) {
                            if (!res.result) {
                                toaster.pop('error', 'Error', "Updated Error.");
                                return;
                            }
                            toaster.pop('success', 'Success', "Updated Success.");
                            oldShortName = tplVm.model.shortName;
                            appUtils.hideLoading();
                        }, function(res) {
                            toaster.pop('error', 'Error', "Updated Error.");
                            appUtils.hideLoading();
                            return;
                        });
                        var objRemove = {
                            channel: tplVm.model.channel,
                            $id: oldShortName
                        };
                        eTemplateService.remove(objRemove).then(function(rs) {
                            $state.go('eTemplate.details', { id: objCreate.shortName, channel: objCreate.channel });
                        });
                    } else {
                        tplVm.model.editorName = currentUser.email;
                        eTemplateService.update(tplVm.model).then(function(res) {
                            if (res.result) {
                                console.log('res');
                                console.log(res);
                                $state.go('eTemplate.list');
                                //appUtils.hideLoading();
                                //toaster.pop('success','Success', "Updated Success.");
                                oldShortName = tplVm.model.shortName;
                            } else {
                                console.log('res g');
                                appUtils.hideLoading();
                                $ngBootbox.alert(res.errorMsg);
                            }

                        });
                    }
                }
            });

        }

        function cancel() {
            $state.go('eTemplate.list');
        }

        function checkShortNameUnique(form) {
            /* jshint ignore:start */
            var deferred = $q.defer();
            var req = eTemplateService.checkUniqueName(tplVm.model);
            req.then(function(res) {
                appUtils.hideLoading();
                if (res && res !== null) {
                    if (oldShortName !== '' && oldShortName != tplVm.model.shortName) {
                        form.shortname.$setValidity('server', false);
                        tplVm.e_msges['shortname'] = "ShortName already exists. Please enter another.";
                        deferred.resolve({ result: true });
                        return deferred.promise;
                    }
                } //Phone exists.
                deferred.resolve({ result: false });
                return deferred.promise;
            }, function(res) {
                // show not found error
                form.shortname.$setValidity('server', false);
                tplVm.e_msges['shortname'] = "ShortName already exists. Please enter another.";
                deferred.resolve({ result: true });
            });
            /* jshint ignore:end */
            return deferred.promise;
        }

        function enalbleShortNameForm(form) {
            /* jshint ignore:start */
            form.shortname.$setValidity('server', true);
            tplVm.e_msges['shortname'] = "";
            /* jshint ignore:end */
        }
    }
})();