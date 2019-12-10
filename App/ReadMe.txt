Run CMD: 
npm install
bower install

More details to select version
1. Select 3 for Bootstrap 3.3.7
2. Select 7 for JQuery 1.9.1
3. Select 2 for select2#4.0.3

(*)Required install Java SDK
gulp dev
gulp product // build ko debug
gulp build-product // build

Using gsutil to set CORS
For example, if you just want to allow object downloads from your custom domain, put this data in a file named cors.json (replacing "https://example.com" with your domain):

[
  {
    "origin": ["http://localhost:3000/", "https://smartapp.myhappyshopper.com"],
    "method": ["GET"],
    "maxAgeSeconds": 3600
  }
]
Then, run this command (replacing "exampleproject.appspot.com" with the name of your bucket):

gsutil cors set cors.json gs://smartcare-b7c88.appspot.com