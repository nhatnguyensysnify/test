(function () {
	'use strict';
	angular.module('app.notification')
		.factory('notificationService', notificationService);
	/** @ngInject **/
	function notificationService(firebaseDataRef, authService, employeeService, appUtils, errorUtils) {
		var notificationRef = firebaseDataRef.child('notification-entries');
		const identifyEmail = appUtils.identifyEmail;

		var service = {
			create: create,
			notiUpdateProfile: notiUpdateProfile,
			notiCancelShift: notiCancelShift,
			notiAvailableForRep: notiAvailableForRep,
			notiAvailableForManager: notiAvailableForManager,
			notiReassignRep: notiReassignRep,
			notiRepsPending: notiRepsPending,
			notifyCancelEvent: notifyCancelEvent,
			sendNotifyEventConfirmation: sendNotifyEventConfirmation
		};

		function create(data) {
			var key = moment().valueOf();
			return notificationRef.child(key).set(data).then(function (res) {
				return { result: true, data: key };
			}, function (error) {
				return { result: false, msgError: error };
			});
		}

		//Admin & All level manager & Rep can access
		function notiUpdateProfile(id) {
			if (_.isEmpty(id)) {
				return errorUtils.errorPromise(id, errorUtils.ErrorEnum.INVALID);
			}
			/* //get new reference Current user, cause by change user info
			const currentUser = authService.getCurrentUser(); //old info */

			//config
			const action = "update-profile";
			const event = "update-profile";
			const channel = "email";

			let notiObj = {
				event: event,
				action: action,
				channel: channel,
				recipients: null,
				user_id: id,
				manager_id: null,
				timestampCreated: appUtils.getTimestamp(),
			};

			return employeeService.getUser(id).then(user => {
				let o = angular.copy(notiObj);
				const mailOfRep = identifyEmail(user);
				//const mailOfRep = "linh.huynh@sysnify.com";//test
				if (user.managers != null && user.managers[0] != null) {
					//have manager
					return employeeService.getUserByAlias(user.managers[0]).then(manager => {
						const mailOfManager = identifyEmail(manager);
						//const mailOfManager = "daoxiang97@gmail.com";//test

						o.recipients = mailOfRep + ";" + mailOfManager;
						o.manager_id = manager.uid;
						return notificationRef.push(o).then(() => { return o; });
					});
				} else {
					//no manager
					o.recipients = mailOfRep;
					return notificationRef.push(o).then(() => { return o; });
				}
			});
		}

		//only Rep can access
		function notiCancelShift(shiftDetail) {
			const currentUser = authService.getCurrentUser();

			if (shiftDetail == null || shiftDetail.rep == null || shiftDetail.shiftId == null) {
				return errorUtils.errorPromise(shiftDetail, errorUtils.ErrorEnum.MISSING);
			}
			if (currentUser == null || _.isEmpty(currentUser.email)) {
				return errorUtils.errorPromise(shiftDetail, errorUtils.ErrorEnum.MISSING);
			}

			//config
			const action = "cancel";
			const event = "availability-cancel";
			const channel = "email";

			let notiObj = {
				event: event,
				action: action,
				channel: channel,
				recipients: null,
				user_id: shiftDetail.rep,
				shift_id: shiftDetail.shiftId,
				timestampCreated: appUtils.getTimestamp()
			};

			const mailOfRep = identifyEmail(currentUser);
			//const mailOfRep = "linh.huynh@sysnify.com";//test

			return employeeService.getUser(shiftDetail.rep).then(user => {
				let o = angular.copy(notiObj);
				if (user.managers != null && user.managers[0] != null) {
					//have manager
					return employeeService.getUserByAlias(user.managers[0]).then(manager => {
						const mailOfManager = identifyEmail(manager);
						//const mailOfManager = "daoxiang97@gmail.com";//test

						o.recipients = mailOfRep + ";" + mailOfManager;
						return notificationRef.push(o).then(() => { return o; });
					});
				} else {
					//no manager
					o.recipients = mailOfRep;
					return notificationRef.push(o).then(() => { return o; });
				}
			});
		}

		//only Rep can access
		function notiAvailableForRep(shiftDetail) {
			const currentUser = authService.getCurrentUser();

			if (shiftDetail == null || shiftDetail.rep == null || shiftDetail.shiftId == null) {
				return errorUtils.errorPromise(shiftDetail, errorUtils.ErrorEnum.MISSING);
			}
			if (currentUser == null || _.isEmpty(currentUser.email)) {
				return errorUtils.errorPromise(shiftDetail, errorUtils.ErrorEnum.MISSING);
			}

			//config
			const action = "update";
			const event = `availability-${action}`;
			const channel = "email";

			let notiObj = {
				event: event,
				action: action,
				channel: channel,
				recipients: null,
				user_id: shiftDetail.rep,
				shift_id: shiftDetail.shiftId,
				timestampCreated: appUtils.getTimestamp()
			};

			const mailOfRep = identifyEmail(currentUser);
			//const mailOfRep = "linh.huynh@sysnify.com";//test

			return employeeService.getUser(shiftDetail.rep).then(user => {
				let o = angular.copy(notiObj);
				if (user.managers != null && user.managers[0] != null) {
					//have manager
					return employeeService.getUserByAlias(user.managers[0]).then(manager => {
						const mailOfManager = identifyEmail(manager);
						//const mailOfManager = "daoxiang97@gmail.com";//test

						o.recipients = mailOfRep + ";" + mailOfManager;
						return notificationRef.push(o).then(() => { return o; });
					});
				} else {
					//no manager
					o.recipients = mailOfRep;
					return notificationRef.push(o).then(() => { return o; });
				}
			});
		}
		//Admin & All level manager
		function notiAvailableForManager(shiftDetail) {
			const currentUser = authService.getCurrentUser();

			if (shiftDetail == null || (_.isEmpty(shiftDetail.rep) && _.isEmpty(shiftDetail.$id)) || shiftDetail.shiftId == null) {
				return errorUtils.errorPromise(shiftDetail, errorUtils.ErrorEnum.MISSING);
			}
			if (currentUser == null || _.isEmpty(currentUser.email)) {
				return errorUtils.errorPromise(shiftDetail, errorUtils.ErrorEnum.MISSING);
			}

			//config
			const action = "set";
			const event = `availability-${action}`;
			const channel = "email";

			let notiObj = {
				event: event,
				action: action,
				channel: channel,
				recipients: null,
				user_id: shiftDetail.rep || shiftDetail.$id,
				shift_id: shiftDetail.shiftId,
				timestampCreated: appUtils.getTimestamp()
			};

			return employeeService.getUser(shiftDetail.rep || shiftDetail.$id).then(user => {
				let o = angular.copy(notiObj);

				const mailOfRep = identifyEmail(user);
				//const mailOfRep = "linh.huynh@sysnify.com";//test

				const mailOfSource = identifyEmail(currentUser);
				//const mailOfManager = "daoxiang97@gmail.com";//test

				o.recipients = mailOfRep + ";" + mailOfSource;
				return notificationRef.push(o).then(() => { return o; });
			});
		}

		//only Manager of Rep
		function notiReassignRep(rep, shiftId) {
			const currentUser = authService.getCurrentUser();

			if (rep == null || _.isEmpty(rep.email)) {
				return errorUtils.errorPromise(rep, errorUtils.ErrorEnum.MISSING);
			}
			if (_.isEmpty(shiftId)) {
				return errorUtils.errorPromise(shiftId, errorUtils.ErrorEnum.INVALID);
			}
			if (currentUser == null || _.isEmpty(currentUser.email)) {
				return errorUtils.errorPromise(shiftDetail, errorUtils.ErrorEnum.MISSING);
			}

			//config
			const action = "re-assign";
			const event = "availability-reassign";
			const channel = "email";

			let notiObj = {
				event: event,
				action: action,
				channel: channel,
				recipients: null,
				user_id: rep.uid,
				manager_id: currentUser.uid,
				shift_id: shiftId,
				timestampCreated: appUtils.getTimestamp()
			};

			const mailOfNewRep = identifyEmail(rep);
			//const mailOfNewRep = "linh.huynh@sysnify.com";//test
			const mailOfSource = identifyEmail(currentUser);
			//const mailOfManager = "daoxiang97@gmail.com";//test

			let o = angular.copy(notiObj);
			o.recipients = mailOfNewRep + ";" + mailOfSource;

			return notificationRef.push(o).then(() => { return o; });
		}

		function notiRepsPending(reps, mailOf = null) {
			//config
			const action = "remind";
			const event = "availability-reminder";
			const channel = "email";

			let notiObj = {
				event: event,
				action: action,
				channel: channel,
				recipients: null,
				user_id: null,
				timestampCreated: null
			};

			const offSet = appUtils.getOffSet();

			let data = [];
			if (_.isArray(reps)) {
				//Notify all reps
				data = _.map(reps, (rep) => {
					let o = angular.copy(notiObj);
					o.user_id = rep.uid;
					o.recipients = mailOf[rep.uid];
					o.timestampCreated = offSet + (new Date()).getTime();

					return o;
				});
			}
			else {
				//Notify selected reps
				data = _.map(reps, (rep, key) => {
					let o = angular.copy(notiObj);
					o.user_id = key;
					o.recipients = mailOf[key];
					o.timestampCreated = offSet + (new Date()).getTime();

					return o;
				});
			}

			let updateData = {};
			_.forEach(data, o => {
				const key = notificationRef.push().key;
				updateData[key] = o;
			});

			return notificationRef.update(updateData).then(() => { return updateData; });
		}

		function notifyCancelEvent(eventId, campaign_id, run_id, currentUser) {
			if (_.isEmpty(eventId)) {
				return errorUtils.errorPromise(eventId, errorUtils.ErrorEnum.INVALID);
			}
			/* //get new reference Current user, cause by change user info
			const currentUser = authService.getCurrentUser(); //old info */

			//config
			const event = "classes-cancelled";
			const channel = "email";

			let notiObj = {
				event: event,
				channel: channel,
				recipients: "",
				event_id: eventId,
				timestampCreated: appUtils.getTimestamp(),
				run_id: run_id,
				campaign_id: campaign_id,
				user_id: currentUser.uid
			};
			return notificationRef.push(notiObj).then(() => { return notiObj; });
		}

		function sendNotifyEventConfirmation(transaction, run_id, campaign_id, userDetail) {
			if (!run_id || !campaign_id || !userDetail || !transaction) {
				return errorUtils.errorPromise(id, errorUtils.ErrorEnum.INVALID);
			}
			//config
			const event = "classes-confirmation";

			let notiObj = {
				event: event,
				channel: transaction.channel,
				recipients: transaction.channel == 'email' ? (userDetail.notificationEmail || userDetail.email) : userDetail.primaryPhone,
				timestampCreated: appUtils.getTimestamp(),
				run_id: run_id,
				campaign_id: campaign_id,
				transaction_id: transaction.id,
				displayName: userDetail.displayName,
				repCode: userDetail.repCode,
				url: transaction.url,
				dateString: transaction.dateString,
				subject: `Event Confirmation on ${transaction.dateString}`

			};
			return notificationRef.push(notiObj).then(() => { return notiObj; });
		}
		return service;
	}
})();