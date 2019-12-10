(function () {
    'use strict';

    angular.module('app.membership')
        .controller('originalImageCtrl', originalImageCtrl);

    /** @ngInject */
    function originalImageCtrl($scope, $uibModalInstance, $http, data, status) {
        $scope.close = function () {
            $uibModalInstance.dismiss('cancel');
        };

        initPage(data);

        //===============================================

        function loadCanvas(dataURL) {
            var canvas = document.getElementById('canvas-original-image');
            var context = canvas.getContext('2d');
            var cw, ch;
            // load image from data url
            var imageObj = new Image();
            imageObj.onload = function () {
                if (imageObj.width > imageObj.height) {
                    canvas.width = 1600;
                    canvas.height = 1200;
                    cw = canvas.width;
                    ch = canvas.height;
                    context.drawImage(imageObj, 0, 0, canvas.width, canvas.height);
                } else {
                    canvas.width = 1200;
                    canvas.height = 1600;
                    cw = canvas.width;
                    ch = canvas.height;
                    context.drawImage(imageObj, 0, 0, canvas.width, canvas.height);
                }

                URL.revokeObjectURL(dataURL);
            };

            imageObj.src = dataURL;

            $scope.rotate = drawRotated;
            var myImage, rotating = false;
            function drawRotated() {
                if (!rotating) {
                    rotating = true;
                    // store current data to an image
                    myImage = new Image();
                    myImage.src = canvas.toDataURL();

                    myImage.onload = function () {
                        // reset the canvas with new dimensions
                        canvas.width = ch;
                        canvas.height = cw;
                        cw = canvas.width;
                        ch = canvas.height;

                        context.save();
                        // translate and rotate
                        context.translate(cw, ch / cw);
                        context.rotate(Math.PI / 2);
                        // draw the previows image, now rotated
                        context.drawImage(myImage, 0, 0);
                        context.restore();

                        // clear the temporary image
                        myImage = null;

                        rotating = false;
                    };
                }
            }

        }

        function downloadImg(url) {
            $http.get(url, { responseType: "blob" }).then(function (res) {
                var urlImg = window.URL.createObjectURL(res.data);
                loadCanvas(urlImg);
            }, function (error) {
                console.log(error);
            });
        }

        function initPage(itemFile) {
            if (itemFile && (parseInt(status) === 1 || parseInt(status) === 7)) {
                downloadImg(itemFile.path);
            } else if (itemFile && itemFile.processPath && parseInt(status) !== 1 && parseInt(status) !== 7) {
                var gsReference = firebase.storage().refFromURL(itemFile.processPath);
                firebase.storage().ref().child(gsReference.fullPath).getDownloadURL().then(function (url) {
                    downloadImg(url);
                }).catch(function (error) {
                    switch (error.code) {
                        case 'storage/object_not_found':
                            // File doesn't exist
                            console.log('File doesnt exist');
                            break;

                        case 'storage/unauthorized':
                            // User doesn't have permission to access the object
                            console.log('User doesnt have permission to access the object');
                            break;

                        case 'storage/canceled':
                            // User canceled the upload
                            console.log('User canceled the upload');
                            break;

                        case 'storage/unknown':
                            // Unknown error occurred, inspect the server response
                            console.log('Unknown error occurred, inspect the server response');
                            break;
                    }
                    return '';
                });
            } else {
                downloadImg(itemFile.path);
            }

        }
    }

})();
