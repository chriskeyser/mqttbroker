/*eslint-disable no-console*/

'use strict';

var AWS = require('aws-sdk');

var configOpt = {
  region: 'us-east-1'
};

AWS.config = new AWS.Config(configOpt);

var kms = new AWS.KMS();
var s3 = new AWS.S3();

var keyParams = {
     KeyId: 'alias/lockservice',
     EncryptionContext: {key:'dev-1'},
      KeySpec: 'AES_128'
    };

var opt = process.argv[2];

if (opt === '1') {
  kms.generateDataKey(keyParams, function(kmserr, kmsdata) {
    if (kmserr) console.log('err: ', kmserr);
    else console.log('result: ', kmsdata);
  });
  s3.listObjects( {Bucket: 'dmg-art-users'}, function(s3err, s3data) {

   if (s3err) console.log('err listing bucket: ', s3err);
    else console.log(s3data);
  });
} else if (opt === '2') {
  s3.listObjects( {Bucket: 'dmg-art-users'}, function(s3err, s3data) {

    if (s3err) console.log('err listing bucket: ', s3err);
    else {
      console.log(s3data);
      kms.generateDataKey(keyParams, function(kmserr, kmsdata) {
        if (kmserr) console.log('err: ', kmserr);
        else console.log('result: ', kmsdata);
      });
    }
  });
}else {
  AWS.config.getCredentials(function(credserr, creds) {
    console.log('AWS creds ', AWS.credentials);

    if (credserr) console.log('err resolve: ' + credserr);
    else {
      console.log('creds: ' + creds.accessKeyId);
      AWS.config.credentials = creds;
      s3.listObjects( {Bucket: 'dmg-art-users'}, function(s3err, s3data) {
        if (s3err) console.log('err listing bucket: ' + s3err);
        else console.log(s3data);
      });
      kms.generateDataKey(keyParams, function(kmserr, kmsdata) {
        if (kmserr) console.log('err: ' + kmserr);
        else console.log('key: ' + kmsdata.Plaintext);
      });
    }
  });
}

