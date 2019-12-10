(function () {
	'use strict';
	angular.module('app.tlsApiDataCache').factory('tlsApiDataCacheService', tlsApiDataCacheService);
	/** @ngInject */
	function tlsApiDataCacheService($q, $http, firebaseDataRef, appUtils, DataUtils) {
		var cacheRef = firebaseDataRef.child('tls-api-data-cache');

		var service = {
			cacheRef: cacheRef,
			get: get,
			getAll: getAll,
			update: update,
			updateCacheAll: updateCacheAll,
			callApi: callApi,
			getStatusCache: getStatusCache,
			setStatusCache: setStatusCache,
			updatedByCache: updatedByCache,
			updateCacheTimestamp: updateCacheTimestamp,
			updateTLSCacheTimestamp: updateTLSCacheTimestamp,
			logDailyTracking: logDailyTracking,
			fillterToDel: fillterToDel,
			fillterToAdd: fillterToAdd,
			fillterToUpdate: fillterToUpdate,
			toArray: toArray,
			refreshEventCache: refreshEventCache
		};

		return service;

		function get(key) {
			var ref = cacheRef.child(key);
			return DataUtils.getDataFirebaseLoadOnce(ref, true).then(function (rs) {
				return rs || null;
			});
		}

		function getAll() {
			return DataUtils.getDataFirebaseLoadOnce(cacheRef, true).then(function (data) {
				var result = _.map(data, function (item, key) {
					item.key = key;
					return item;
				});
				return result || [];
			});
		}

		function update(key) {
			var timestamp = appUtils.getTimestamp();
			return cacheRef.child(key + '/timestampModified').set(timestamp).then(function (result) {
				return { result: true, key: key, timestampModified: timestamp };
			}).catch(function (error) {
				return { result: false, errorMsg: error };
			});
		}

		function updateCacheAll(items) {
			var timestamp = appUtils.getTimestamp();
			var reqs = [];
			reqs.push(cacheRef.child('timestampModified').set(timestamp));
			_.forEach(items, function (item) {
				reqs.push(cacheRef.child(item.$id + '/timestampModified').set(timestamp));
			});
			return $q.all(reqs).then(function (result) {
				return { result: true, timestampModified: timestamp };
			}).catch(function (error) {
				return { result: false, errorMsg: error };
			});
		}

		function callApi(opts) {
			return $http(opts).then(function (result) {
				if (result && result.data) {
					return result.data;
				}
				return null;
			}).catch(function (err) {
				console.log('Call Api has catch error: ');
				console.log(err);
				return null;
			});
		}

		function getStatusCache(path) {
			var ref = firebaseDataRef.child(path);
			return DataUtils.getDataFirebaseLoadOnce(ref);
		}

		function setStatusCache(path, status) {
			var ref = firebaseDataRef.child(path),
				ts = appUtils.getTimestamp();
			return ref.update({
				isProcessing: status,
				timestampModified: ts
			}).then(function () {
				return true;
			});
		}

		function updatedByCache(path, currentUser) {
			var ref = firebaseDataRef.child(path),
				ts = appUtils.getTimestamp();
			return ref.update({
				lastUpdatedBy: currentUser.email || '',
				timestampModified: ts
			}).then(function () {
				return true;
			});
		}

		function updateCacheTimestamp(path) {
			var ref = firebaseDataRef.child(path),
				ts = appUtils.getTimestamp();
			return ref.update({
				timestampModified: ts
			}).then(function () {
				return true;
			});
		}

		function updateTLSCacheTimestamp() {
			var timestamp = appUtils.getTimestamp();
			return firebaseDataRef.child('app-options').update({
				timestampModified: timestamp,
				TLSCacheTimestamp: timestamp
			});
		}

		function logDailyTracking(fieldName, plansData) {
			var timestampModified = appUtils.getTimestamp();
			var day = new Date(parseInt(timestampModified));
			var ref = `/data-refresh-logs/${day.getFullYear()}/${day.getMonth() + 1}/${day.getDate()}/${fieldName}/${timestampModified}`;
			plansData.timestampModified = timestampModified;
			plansData.timestampCreated = timestampModified;
			plansData.timestampString = day.toString();
			plansData = DataUtils.stripDollarPrefixedKeys(plansData);
			return firebaseDataRef.child(ref).update(plansData).then(() => {
				console.log("logDailyTracking complete: " + fieldName);
				return timestampModified;
			});
		}

		function fillterToDel(dataPersisted, dataTLS, primaryKeys) {
			console.log('fillterToDel start');
			return new Promise((resolve, reject) => {
				var data = _.filter(dataPersisted, dataItemPersisted => {
					let findRes = _.find(dataTLS, dataItemTLS => {
						let isEqual = true;
						_.forEach(primaryKeys, primaryKey => {
							if (!dataItemTLS) {
								console.log(dataItemTLS);
							}
							if (dataItemPersisted.value[primaryKey] != dataItemTLS[primaryKey]) {
								isEqual = false;
							}
						});

						return isEqual;
					});
					return !findRes;
				});
				resolve(data);
			});

		}

		function fillterToAdd(dataPersisted, dataTLS, primaryKeys) {
			console.log('fillterToAdd start');
			return new Promise((resolve, reject) => {
				var data = _.filter(dataTLS, dataItemTLS => {
					let findRes = _.find(dataPersisted, dataItemPersisted => {
						let isEqual = true;
						_.forEach(primaryKeys, primaryKey => {
							if (dataItemPersisted.value[primaryKey] != dataItemTLS[primaryKey]) {
								isEqual = false;
							}
						});
						return isEqual;
					});
					return !findRes;
				});
				resolve(data);
			});
		}

		function fillterToUpdate(dataPersisted, dataTLS, primaryKeys) {
			console.log('fillterToUpdate start');
			return new Promise((resolve, reject) => {
				var data2Update = _.filter(dataPersisted, dataItemPersisted => {
					let findRes = _.find(dataTLS, dataItemTLS => {
						let isDifferent = false;
						let canCompare = true;
						_.forEach(primaryKeys, primaryKey => {
							if (dataItemPersisted.value[primaryKey] != dataItemTLS[primaryKey]) {
								canCompare = false;
							}
						});
						if (canCompare) {
							Object.keys(dataItemTLS).forEach(
								function (key) {
									//skip primaryKey
									if (!_.find(primaryKeys, (primaryKey) => {
										return key == primaryKey;
									}) && dataItemPersisted.value[key] != dataItemTLS[key]) {
										isDifferent = true;
									}
								}
							);
							if (_.find(primaryKeys, i => i === 'facility_id') && dataItemPersisted.value.isActive == false) {
								// if data is facility && facility is unactive
								isDifferent = true;
							}
						}
						return isDifferent == true && canCompare == true;
					});
					if (findRes) {
						dataItemPersisted.value = findRes;
					}
					return findRes;
				});
				resolve(data2Update);
			});
		}

		function toArray(targetObject) {
			if (!targetObject) {
				return [];
			}
			var arr = [];
			Object.keys(targetObject).forEach(
				function (key) {
					//skip timestampCreated/Modified
					if (key !== 'timestampCreated' && key != 'timestampModified') {
						arr.push({
							key: key,
							value: targetObject[key]
						});
					}
				}
			);

			return arr;
		}

		function refreshEventCache(eventType, isReplace) {
			let path = `tls-api-data-cache/${eventType}`;
			console.log('path', path);
			
			return getStatusCache(path).then(status => {
				if (!status || status.isProcessing) return false;
				let ref = firebaseDataRef.child(path),
					ts = appUtils.getTimestamp();
				let _update = {
					timestampModified: ts
				};
				if (isReplace) {
					_update.handleReplace = true;
				} else {
					_update.handleRefesh = true;
				}
				return ref.update(_update).then(function () {
					return true;
				});
			});
		}
	}
})();
