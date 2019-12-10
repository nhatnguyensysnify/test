(function () {
	'use strict';
	angular.module('app.event').factory('eventGoalService', eventGoalService);
	/** @ngInject **/
	function eventGoalService(firebaseDataRef, appUtils, DataUtils, searchService, $q) {
		var eventGoalPath = 'event-goal',
			eventGoalRef = firebaseDataRef.child(eventGoalPath);
		var service = {
			setGoal: setGoal,
			getGoal: getGoal,
			search: search,
			remove:remove,
			calGoal: calGoal
		};

		function setGoal(goal){
			var ref = eventGoalRef.child([goal.y,goal.m+'-'+goal.r].join('/')),
				ts = + new Date();
			if(!goal.timestampCreated){
				goal.timestampCreated = ts;
			}
			goal.timestampModifield = ts; 
			goal.timestampString = appUtils.formatDateTimeString(moment(ts));
			goal.mTs = moment().utc().year(goal.y).month(goal.m -1).startOf('month').valueOf()/1000;
			return ref.update(goal);
		}
		function getGoal(y,m,r){
			return DataUtils.firebaseLoadOnce(eventGoalRef.child([y,m,r].join('/')));
		}

		function remove(goal){
			return eventGoalRef.child([goal.y,goal.m+'-'+goal.r].join('/')).set(null);
		}
		/**
			cri {
				fromMonth,
				fromYear,
				toMonth, 
				toYear
				regions: []				
			}
		**/
		function search(cri){
			var years = _.range(cri.fromYear, cri.toYear +1),
				start = moment().utc().year(cri.fromYear).month(cri.fromMonth -1).startOf('month').valueOf()/1000,
				to = moment().utc().year(cri.toYear).month(cri.toMonth -1).startOf('month').valueOf()/1000;

			var ps = _.map(years, function(year){
				return eventGoalRef.child(year).orderByChild('mTs').startAt(start).endAt(to).once('value');
			});
			return $q.all(ps).then(function(res){
				var result = {};
				_.each(res, function(r){

					var yearGoals = r.val();
					_.each(yearGoals, function(goal, key){
						if(cri.regions && cri.regions.length > 0 && cri.regions.indexOf(goal.r) === -1){
							return;
						}
						result[r.key+'/'+key] = goal;
					});
				});				
				return result;
			});
		}

		function calGoal(goal){
			return firebaseDataRef.child('goal-process-queue').child([goal.y, goal.m, goal.r].join('-')).update({'isProcess': false});
		}

		return service;
	}
})();
