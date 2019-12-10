(function () {
    'use strict';
    angular.module('app.utils').factory('errorUtils', errorUtils);
    /** @ngInject **/
    function errorUtils() {
        var utils = {
            //ErrorEnum: ErrorEnum,

            errorPromise: errorPromise
        };

        function getFunctionName(stackIndex) {
            var stack = new Error().stack,
                caller = stack.split('\n')[stackIndex].trim();

            return caller;
        }

        const ErrorEnum = {
            'ERROR': 1,
            'MISSING': 101,
            'INVALID': 102,



            //toString
            1: 'Error',
            101: 'Missing properties',
            102: 'Invalid value',
        };
        utils.ErrorEnum = ErrorEnum;

        function ErrorDetail(statusCode = null, causeBy = getFunctionName(4), mess = null) {
            const _statusCode = statusCode == null ? ErrorEnum.Error : statusCode;

            return {
                statusCode: _statusCode,
                mess: mess == null ? ErrorEnum[_statusCode] : mess,
                causeBy: causeBy
            };
        }

        //keep data transfer when Promise is error
        //error = Error.
        function errorPromise(data, error = null, appendError = false) {
            var errorDetail = ErrorDetail(error);
            //prevent update firebase by add $ to error
            var dataWithError = { ERROR: { data: data, $error: errorDetail } };
            console.log(dataWithError);

            return new Promise(function(res, rej) {
                if (appendError) {
                    res(dataWithError);
                }
                else {
                    res(data);
                }
            });
        }

        return utils;
    }
})();