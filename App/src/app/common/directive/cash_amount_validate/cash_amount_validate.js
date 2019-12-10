(function(){
	'use strict';
	angular.module('app.Directive.CashAmountValidate',[]).directive('cashValidate',function(){
        return {
            restrict: 'A',
            require: 'ngModel',
            link: function (scope, elem, attr, ctrl) {
                scope.$watch(attr.cashValidate, function () {
                    ctrl.$setViewValue(ctrl.$viewValue);
                });
                var cashValidator = function (value) {
                    var totalAmount = parseFloat(attr.cashValidate) || 0;
                    if (!isEmpty(value) && value < totalAmount) {
                        ctrl.$setValidity('match', false);
                        return undefined;
                    } else {
                        ctrl.$setValidity('match', true);
                        return value;
                    }
                };

                ctrl.$parsers.push(cashValidator);
                ctrl.$formatters.push(cashValidator);

                function isEmpty(value) {
                    return angular.isUndefined(value) || value ==='' || value === null || value !== value;
                }
            }
        };
    });
})();