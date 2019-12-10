(function() {
    angular.module('app.employee')
        .factory('BaseEmployeLogClass', BaseEmployeLogClass);

    /** @ngInject **/
    function BaseEmployeLogClass($q, $timeout, appUtils, DataUtils, roleService, departmentSevice, employeeLogService, membershipMediaService, memAppService, memberShipFacilitiesService) {
        var cls = Class.extend({
            uid: null,
            filteredItems: [],
            pagedItems: [],
            paging: {
                pageSize: 10,
                currentPage: 0,
                totalPage: 0,
                totalRecord: 0
            },
            timestampStart: null,
            timestampEnd: null,
            action: 'All',
            facility: 'All',
            eventId: 'All',
            select2Options: {
                AllowClear: true,
                //minimumInputLength: 3,
                ajax: {
                    dataType: 'json',
                    delay: 250,
                    transport: function(params, success, failure) {
                        var $request = memberShipFacilitiesService.search(params.data);
                        $request.then(success, failure);
                        return $request;
                    },
                    data: function(params) {
                        return params && params.term || '';
                    },
                    processResults: function(data) {
                        var result = _.map(data, function(item) {
                            var text = [],
                                name = _.trim(item.name),
                                promoCode = _.trim(item.facility_promo_code);
                            if (name) {
                                text.push(name);
                            }
                            if (promoCode) {
                                text.push('(' + promoCode + ')');
                            }
                            return {
                                id: item['$id'], // jshint ignore:line
                                text: text.join(' ')
                            };
                        });
                        return {
                            results: result
                        };
                    }
                }
            },
            fieldText: {
                firstName: 'First Name',
                lastName: 'Last Name',
                displayName: 'Display Name',
                acl: 'Roles',
                address: 'Address',
                city: 'City',
                state: 'State',
                zipCode: 'Zip Code',
                managers: 'Managers',
                repCode: 'Representative Code',
                isActive: 'Active',
                primaryPhone: 'Phone Number',
                availability: 'Availability',
                workingStates: 'Working States',
                workingTerritories: 'Working Territories',
                typeOfHire: 'Type Of Hire',
                dateOfHire: 'Date Of Hire',
                licenses: 'Licenses',
                notificationEmail: 'Notification Email'
            },
            initPage: function() {
                var vm = this;
                appUtils.showLoading();
                return employeeLogService.get({
                    uid: vm.uid,
                    timestampStart: vm.timestampStart,
                    timestampEnd: vm.timestampEnd,
                    action: vm.action,
                    facility: vm.facility,
                    eventId: vm.eventId
                }).then(function(result) {
                    appUtils.hideLoading();
                    vm.filteredItems = result.items || [];
                    vm.paging.totalRecord = result.totalRecords;
                    vm.paging.currentPage = 0;
                    //group by pages
                    vm.groupToPages();
                }).then(function() {
                    vm.loadRoles();
                });
            },
            loadRoles: function() {
                /* jshint ignore:start */
                var vm = this; //jslint: ignore
                return roleService.itemsObj().then(function(roles) {
                    vm.roles = roles;
                });
                /* jshint ignore:end */
            },
            groupToPages: function() {
                var vm = this;
                vm.pagedItems = [];
                for (var i = 0; i < vm.filteredItems.length; i++) {
                    if (i % vm.paging.pageSize === 0) {
                        vm.pagedItems[Math.floor(i / vm.paging.pageSize)] = [vm.filteredItems[i]];
                    } else {
                        vm.pagedItems[Math.floor(i / vm.paging.pageSize)].push(vm.filteredItems[i]);
                    }
                }
                if (vm.filteredItems.length % vm.paging.pageSize === 0) {
                    vm.paging.totalPage = vm.filteredItems.length / vm.paging.pageSize;
                } else {
                    vm.paging.totalPage = Math.floor(vm.filteredItems.length / vm.paging.pageSize) + 1;
                }
            },
            getAction: function(action) {
                action = action.toLowerCase();
                return appUtils.logEmployeeAction[action] && appUtils.logEmployeeAction[action].text || '';
            },
            getFacilityTxt: function(item) {
                var facility = item && item.fileInfo && item.fileInfo.facility;
                if (facility) {
                    return facility.name + ' (<strong>' + facility.facility_promo_code + '</strong>)';
                }
                return '';
            },
            isErrorMessage: function(message) {
                if (!message) {
                    return true;
                }
                var regex = /(error|failed|Error|Failed|not|Not)/;
                return message.match(regex);
            },
            initMedia: function(mediaId) {
                return membershipMediaService.get(mediaId).then(function(media) {
                    if (media) {
                        return {
                            downloadUrl: media.downloadUrl,
                            fileName: media.fileName || ''
                        };
                    }
                    return null;
                });
            },
            loadApplications: function(apps) {
                var reqs = [],
                    vm = this;
                _.forEach(apps, function(app) {
                    var req = memAppService.getApplicationSnapshot(app.appId).then(function(application) {
                        return vm.initMedia(app.mediaId).then(function(media) {
                            if (application && media) {
                                angular.extend(application, media);
                            }
                            return application;
                        });
                    });
                    reqs.push(req);
                });
                return $q.all(reqs).then(function(rs) {
                    if (rs) {
                        return _.filter(rs, function(item) {
                            return item !== null;
                        });
                    }
                    return [];
                });
            },
            refresh: function(key) {
                return employeeLogService.getSingleLog(this.uid, key);
            },
            getTerritoryTxt: function(allTerritories, values) {
                if (_.isString(values)) {
                    values = [values];
                } else if (_.isObject(values) && !_.isArray(values)) {
                    values = Object.keys(values);
                }
                var text = [];
                _.forEach(values, function(value) {
                    var territory = _.find(allTerritories, function(item) {
                        return item.$id === value;
                    });
                    if (territory && territory.name) {
                        text.push(territory.name);
                    }
                });
                return text.join(', ');
            },
            getStateTxt: function(allStates, values) {
                if (_.isString(values)) {
                    values = [values];
                } else if (_.isObject(values) && !_.isArray(values)) {
                    values = Object.keys(values);
                }
                var text = [];
                _.forEach(values, function(value) {
                    var state = _.find(allStates, function(item) {
                        return item.iso === value;
                    });
                    if (state && state.name) {
                        text.push(state.name);
                    }
                });
                return text.join(', ');
            },
            getHireType: function(value) {
                var type = _.find(appUtils.hireTypes, function(item) {
                    return item.value === value;
                });
                return type && type.text;
            },
            getRoleTxt: function(value) {
                if (!value) {
                    return '';
                }
                return this.roles[value] && this.roles[value].name;
            },
            getManagerInfo: function(managers) {
                var reqs = [];
                _.forEach(managers, function(alias) {
                    var req = departmentSevice.get(alias).then(function(data) {
                        //console.log(data);
                        var manager = data && data.manager || {},
                            text = [];
                        if (manager.alias) {
                            var arr = manager.alias.split("_");
                            if (arr && arr.length > 0) {
                                text.push('<strong>' + arr[0] + '</strong>');
                            }
                        }
                        if (manager.name) {
                            text.push(manager.name);
                        }
                        return text.length > 0 && text.join(': ') || null;
                    });

                    reqs.push(req);
                });
                return $q.all(reqs).then(function(rs) {
                    rs = _.filter(rs, function(i) {
                        return i !== null;
                    });
                    return (rs.length > 0 && rs.join(' -> ')) || '';
                });
            }
        });

        return cls;
    }

})();