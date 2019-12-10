(function () {
	'use strict';
	angular.module('app.tlsApiDataCache').factory('factilitiesCacheService', factilitiesCacheService);
	/** @ngInject */
	function factilitiesCacheService($rootScope, APP_CONFIG, firebaseDataRef, DataUtils, tlsApiDataCacheService, authService, notificationService) {
		var facilitiyRef = firebaseDataRef.child('membership-facilities'),
			_facilityRef = firebaseDataRef.child('membership-facilities').orderByKey().limitToLast(500);

		var service = {
			refreshFacilities: refreshFacilities
		};

		return service;


		function refreshFacilities() {
			//Check running status
			var currentUser = authService.getCurrentUser();
			return tlsApiDataCacheService.getStatusCache('tls-api-data-cache/facility').then(function (status) {
				if (!status || status.isProcessing) return false;

				//flag status is running
				return tlsApiDataCacheService.setStatusCache('tls-api-data-cache/facility', true);
			}).then(function (canStart) {
				console.log('refresh Facilities: ' + canStart);
				if (!canStart) return;
				//Start job
				//
				tlsApiDataCacheService.updatedByCache('tls-api-data-cache/facility', currentUser);
				var apiJob = _getFacilitiesTLS();
				var getStatesJob = DataUtils.getListDataFirebaseLoadOnce('membership-states');
				var getFacilitiesJob = _getFacilitiesFirebase({}, null);
				//Await to retrieve data from TLS
				return Promise.all([apiJob, getStatesJob, getFacilitiesJob]).then(function (results) {
					if (!!!results || results.length == 0) return;

					//Handle data
					var facilities = results[0] || {};
					var states = results[1];
					var facilitiesPersisted = _.map(DataUtils.toAFArray(results[2] || []), function (item) {
						var obj = _.clone(item);
						delete obj.$id;
						return {
							key: item.$id,
							value: obj
						};
					});
					console.log('==================Facilities API==================');
					console.log('facilities TLS', Object.keys(facilities).length);
					console.log('facilitiesPersisted', facilitiesPersisted.length);
					var facilities2Ignore = [];
					var facilitiesRequire = ["facility_id", "name", "facility_affiliate_guid", "address", "address_2", "zip_code", "city_name", "state_name", "country_name", "facility_promo_code"];
					//filter facility has update value
					facilities = _.filter(facilities, function (item) {
						var diffKeys = _.difference(facilitiesRequire, _.keys(item));
						if (diffKeys.length == 0) {
							return true;
						} else {
							facilities2Ignore.push(item);
							return false;
						}
					});
					//map new list facilities
					facilities = _.map(facilities, function (value, key) {
						var state = _.find(states, function (sItem) {
							if (sItem && value && sItem.name && value.state_name)
								return sItem.name.toLowerCase() == value.state_name.toLowerCase();
						});
						if (state && value && value.is_facility) {
							// TLS-1246
							value.city_name = value.city_name.replace(/undefined/g, '');
							value.city_name = value.city_name.replace(/Undefined/g, '');
							return {
								facility_id: value.facility_id || "",
								name: value.name || "",
								facility_affiliate_guid: value.facility_affiliate_guid || "",
								address: value.address || "",
								address_2: value.address_2 || "",
								zip_code: value.zip_code || "",
								city_name: value.city_name || "",
								state_name: value.state_name || "",
								country_name: value.country_name || "",
								facility_promo_code: value.facility_promo_code ? value.facility_promo_code.toUpperCase() : "",
								state_code: state ? state.iso : "",
							};
						}
						return null;
					});

					facilities = _.filter(facilities, function (item) {
						return item !== null && item !== undefined;
					});

					var logData = {
						ignored: facilities2Ignore,
						created: {},
						updated: {},
						deleted: {},
						totalIgnoredRecords: facilities2Ignore.length,
					};

					//await to get all data logged
					return _processFacilities(facilities, facilitiesPersisted, logData).then(function () {
						logData.status = 'succeeded';
						var q = [];
						q.push(tlsApiDataCacheService.logDailyTracking(`membership-facilities`, logData).then(function (referenceId) {
							var notiObj = {
								subject: 'Refresh Data TLS Facilities',
								recipients: '',
								event: 'refresh-api-data',
								channel: 'email',
								data: {
									name: 'Facilities',
									referenceId: referenceId,
									ignoredLength: logData.totalIgnoredRecords
								},
								createdDate: new Date()
							};
							return notificationService.create(notiObj);
						}));
						q.push(tlsApiDataCacheService.setStatusCache('tls-api-data-cache/facility', false));
						q.push(tlsApiDataCacheService.updateTLSCacheTimestamp());
						q.push(tlsApiDataCacheService.updateCacheTimestamp('membership-facilities'));
						return Promise.all(q);
					}).then(function () {
						console.log('Refresh Facility Finish');
					});
				});
			});
		}

		function _processFacilities(facilitiesTLS, facilitiesPersisted, logData) {
			if (!facilitiesTLS) {
				return new Promise(function (resolve, reject) {
					console.log('Facilitites API NULL Process');
					resolve(true);
				});
			}
			console.log('Start ProcessFacilities ');
			var fbFactilites = _.clone(facilitiesPersisted);
			fbFactilites = _.filter(fbFactilites, facility => facility.value.isActive != false);
			return tlsApiDataCacheService.fillterToDel(fbFactilites, facilitiesTLS, ['facility_id']).then(function (data2Del) {
				console.log('data2Del', data2Del.length);
				var allRemove = [];
				if (data2Del) {
					allRemove = _.map(data2Del, function (facility) {
						return _removeF(facility.key);
					});
				}
				return Promise.all(allRemove).then(function () {
					logData.deleted = data2Del;
					return facilitiesPersisted;
				});
			}).then(function (facilitiesPersisted) {
				fbFactilites = _.clone(facilitiesPersisted);
				return tlsApiDataCacheService.fillterToAdd(fbFactilites, facilitiesTLS, ['facility_id']).then(function (data2Add) {
					console.log('data2Add', data2Add.length);
					var allAdded = [];
					if (data2Add) {
						allAdded = _.map(data2Add, function (facility) {
							return _createF(facility).then(function (keyFacility) {
								facility.key = keyFacility;
							});
						});

						// var indexAdd = _.map(data2Add, function (facility) {
						// 	return searchService.index(facility.$id, $rootScope.storage.appSettings.elasticSearch.facility);
						// });

						//allAdded = allAdded.concat(indexAdd);
					}
					return Promise.all(allAdded).then(function () {
						logData.created = data2Add;
						return facilitiesPersisted;
					});
				});
			}).then(function (facilitiesPersisted) {
				fbFactilites = _.clone(facilitiesPersisted);
				var facilitiesBackUp = JSON.parse(JSON.stringify(facilitiesPersisted));
				//filter to Update
				return tlsApiDataCacheService.fillterToUpdate(fbFactilites, facilitiesTLS, ['facility_id']).then(function (data2Update) {
					console.log('data2Update', data2Update.length);
					console.log('data2Update', data2Update);
					var allUpdated = [];
					if (data2Update) {
						allUpdated = _.map(data2Update, function (facility) {
							return _updateF(_.clone(facility)).then(function () {
								facility.oldValue = _.find(facilitiesBackUp, function (item) {
									return item.key == facility.key;
								}).value || {};
							});
						});
						// var indexUpdate = _.map(data2Update, function (facility) {
						// 	return searchService.index(facility.$id, $rootScope.storage.appSettings.elasticSearch.facility);
						// });
						//allUpdated = allUpdated.concat(indexUpdate);
					}
					return Promise.all(allUpdated).then(function () {
						logData.updated = data2Update;
					});
				});
			}).then(function () {
				console.log('processFacilities promise done');
			});
		}

		function _getFacilitiesTLS() {
			/* jshint ignore:start */
			//get all config from firebase
			var setting = $rootScope.storage.appSettings;
			var payload = {
				"request": "TLS_API",
				"data_to_submit[source]": "FASmartAdmin",
				"token": "T3MPC%40rdFl1ght666",
				"action": "getListOfFacilities"
			};
			var url = APP_CONFIG.externalUrl;//'https://apiqa.texaslawshield.com/v1/tlsapi.php';
			if (setting) {
				payload["data_to_submit[source]"] = setting.TLSAPISourceForWeb;
				payload["token"] = setting.TLSAPIDefaultToken;
				url = setting.TLSAPIUrl;
				//url = 'https://api.texaslawshield.com/v1/tlsapi.php';
			}

			var opts = {
				method: 'POST',
				url: url,
				data: $.param(payload),
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded'
				}
			};
			/* jshint ignore:end */
			return tlsApiDataCacheService.callApi(opts);
		}

		function _createF(add) {
			var key = facilitiyRef.push().key;
			add.isActive = true;
			return facilitiyRef.child(key).update(add).then(function (result) {
				return { result: true, errorMsg: "", key: key };
			}).catch(function (error) {
				return { result: false, errorMsg: error };
			});
		}

		function _updateF(update) {
			var key = angular.copy(update.key);
			var value = DataUtils.stripDollarPrefixedKeys(update.value);
			value.isActive = true;
			return facilitiyRef.child(key).update(value).then(function () {
				return { result: true, errorMsg: "" };
			}).catch(function (error) {
				return { result: false, errorMsg: error };
			});
		}

		function _removeF(id) {
			// return facilitiyRef.child(id).remove();
			return facilitiyRef.child(id).update({
				isActive: false
			}).then(function () {
				return { result: true, errorMsg: "" };
			}).catch(function (error) {
				return { result: false, errorMsg: error };
			});
		}

		function _paginate(cursor) {
			var paginatedRef = _facilityRef;
			if (cursor) {
				paginatedRef = _facilityRef.endAt(cursor);
			}
			return paginatedRef.once('value').then(snap => snap.val());
		}

		function _getFacilitiesFirebase(list, cursor) {
			return _paginate(cursor).then(values => {
				_.extend(list, values);
				var orderedKeys = Object.keys(values).sort((a, b) => +a > +b);
				if (orderedKeys.length == 500) {
					return _getFacilitiesFirebase(list, orderedKeys[0]);
				}
				return list;
			});
		}
	}
})();
