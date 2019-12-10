(function () {
	'use strict';
	angular.module('app.interceptor', [])
		.factory('TLSHttpInterceptor', TLSHttpInterceptor);
	/** @ngInject **/
	function TLSHttpInterceptor($q, $log, APP_CONFIG, $injector, $rootScope, appEventLogService) {
		return {
			request: function (config) {
				var promise = null;
				try {
					if ($rootScope.storage && $rootScope.storage.appSettings && $rootScope.storage.appSettings.TLSAPIUrl) {
						var TLSAPIUrl = $rootScope.storage.appSettings.TLSAPIUrl;
						if (TLSAPIUrl && config.url.indexOf(TLSAPIUrl) > -1) {

							var p = deparam(config.data);
							// create Log

							var isDebug = $rootScope.storage.appSettings.isDebug;
							if (isDebug) {
								console.log('%c TLSAPI CALL======================================================', 'color: green;');
								console.log('origial:---');
								console.log(config.data);
								console.log('object:----');
								console.log(p);
								console.log('%c END TLSAPI CALL===================================================', 'color: green;');
								// stop submit
								if (p.request == 'submitSignup') {
									config.url = '';
								}
								// config.url = '';
							}
							// start for log
							var logParams = config.logParams;
							if (logParams) {
								var logData = {
									request: p
								};
								config.isTLSApi = true;
								// delete request, token
								// not log password
								var sensitiveFields = ['Password', 'payment_bank_account_num', 'payment_bank_routing_num', 'zuora_cc_cvv', 'zuora_cc_card_number'];
								_.each(sensitiveFields, function (field) {
									if (p.data_to_submit[field]) {
										p.data_to_submit[field] = '************';
									}
								});
								// angular.extend(p, {
								// 	request: null,
								// 	token: null
								// });
								promise = appEventLogService.create(logData, logParams.name || p.action, logParams.user, logParams.appId || null).then(function (data) {
									config.logParams.logId = data.id;
									return config;
								});
							}
							// end log

							// transform response for log
							config.transformResponse = [tls_defaultHttpResponseTransform];

						}
					}
					// console.log(config);

				}
				catch (e) {
					// console.log(p);
					console.log(e);
				}
				return promise || config;
			},
			// requestError: function(rejection){
			// 	try{
			// 		console.log('requestError');
			// 	}
			// 	catch(e){

			// 	}
			// 	return rejection;

			// },
			response: function (response) {
				try {
					if (response.config.isTLSApi) {
						if (response.config.logParams) {
							var logId = response.config.logParams.logId;
							if (logId) {
								appEventLogService.update(logId, { response: response.data });
							}
						}
					}


				} catch (e) {
					// console.log('response error');

				}

				return response || $q.when(response);
			},
			responseError: function (rejection) {

				try {
					if (rejection.config.isTLSApi) {
						if (rejection.config.logParams) {
							var logId = rejection.config.logParams.logId;
							if (logId) {
								appEventLogService.update(logId, { response: rejection.data });
							}
						}
					}
				} catch (e) {

				}
				return $q.reject(rejection);
			}
		};
	}


	// override default transform
	var APPLICATION_JSON = 'application/json';
	var CONTENT_TYPE_APPLICATION_JSON = { 'Content-Type': APPLICATION_JSON + ';charset=utf-8' };
	var JSON_START = /^\[|^\{(?!\{)/;
	var JSON_ENDS = {
		'[': /]$/,
		'{': /}$/
	};
	var JSON_PROTECTION_PREFIX = /^\)]\}',?\n/;
	function tls_defaultHttpResponseTransform(data, headers) {
		if (angular.isString(data)) {
			// Strip json vulnerability protection prefix and trim whitespace
			var tempData = data.replace(JSON_PROTECTION_PREFIX, '').trim();

			if (tempData) {
				var contentType = headers('Content-Type');
				if ((contentType && (contentType.indexOf(APPLICATION_JSON) === 0)) || isJsonLike(tempData)) {
					try {
						data = angular.fromJson(tempData);
					}
					catch (e) {
						return {
							success: false,
							message: data,
							originContent: data,
							errorMessage: e.message
						};
					}
				}
			}
		}

		return data;
	}
	function isJsonLike(str) {
		var jsonStart = str.match(JSON_START);
		return jsonStart && JSON_ENDS[jsonStart[0]].test(str);
	}
	// end override default transform
	// deparams
	function deparam(params, coerce) {
		var obj = {},
			coerce_types = { 'true': !0, 'false': !1, 'null': null };

		// Iterate over all name=value pairs.
		$.each(params.replace(/\+/g, ' ').split('&'), function (j, v) {
			var param = v.split('='),
				key = decodeURIComponent(param[0]),
				val,
				cur = obj,
				i = 0,

				// If key is more complex than 'foo', like 'a[]' or 'a[b][c]', split it
				// into its component parts.
				keys = key.split(']['),
				keys_last = keys.length - 1;

			// If the first keys part contains [ and the last ends with ], then []
			// are correctly balanced.
			if (/\[/.test(keys[0]) && /\]$/.test(keys[keys_last])) {
				// Remove the trailing ] from the last keys part.
				keys[keys_last] = keys[keys_last].replace(/\]$/, '');

				// Split first keys part into two parts on the [ and add them back onto
				// the beginning of the keys array.
				keys = keys.shift().split('[').concat(keys);

				keys_last = keys.length - 1;
			} else {
				// Basic 'foo' style key.
				keys_last = 0;
			}

			// Are we dealing with a name=value pair, or just a name?
			if (param.length === 2) {
				val = decodeURIComponent(param[1]);

				// Coerce values.
				if (coerce) {
					val = val && !isNaN(val) ? +val              // number
						: val === 'undefined' ? undefined         // undefined
							: coerce_types[val] !== undefined ? coerce_types[val] // true, false, null
								: val;                                                // string
				}

				if (keys_last) {
					// Complex key, build deep object structure based on a few rules:
					// * The 'cur' pointer starts at the object top-level.
					// * [] = array push (n is set to array length), [n] = array if n is
					//   numeric, otherwise object.
					// * If at the last keys part, set the value.
					// * For each keys part, if the current level is undefined create an
					//   object or array based on the type of the next keys part.
					// * Move the 'cur' pointer to the next level.
					// * Rinse & repeat.
					for (; i <= keys_last; i++) {
						key = keys[i] === '' ? cur.length : keys[i];
						cur = cur[key] = i < keys_last ? cur[key] || (keys[i + 1] && isNaN(keys[i + 1]) ? {} : []) : val;
					}

				} else {
					// Simple key, even simpler rules, since only scalars and shallow
					// arrays are allowed.

					if ($.isArray(obj[key])) {
						// val is already an array, so push on the next value.
						obj[key].push(val);

					} else if (obj[key] !== undefined) {
						// val isn't an array, but since a second value has been specified,
						// convert val into an array.
						obj[key] = [obj[key], val];

					} else {
						// val is a scalar.
						obj[key] = val;
					}
				}

			} else if (key) {
				// No value was defined, so set something meaningful.
				obj[key] = coerce ? undefined : '';
			}
		});

		return obj;
	}
})();