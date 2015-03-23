var AWS = require('aws-sdk');

var configOpt = 
{
    credentialProvider: new AWS.CredentialProviderChain(),
    region: 'us-east-1'
};

console.log(AWS.config.credentials, AWS.config.credentialProvider);
var chain = new AWS.CredentialProviderChain();

AWS.config  = new AWS.Config(configOpt);

AWS.config.getCredentials(function(err, creds) {
    console.log('AWS creds ', AWS.credentials);

  if(err)  console.log('err resolve: ' + err);
  else {
      console.log('creds: ' + creds.accessKeyId);
      AWS.config.credentials = creds;
      var s3 = new AWS.S3();
      s3.listObjects( {Bucket: 'dmg-art-users'}, function(err, data) {
          if(err) console.log('err listing bucket: ' + err);
          else console.log(data);
      });
      var keyParams = {
         KeyId: 'alias/lockservice',
         EncryptionContext: {keyid: 'dev-1'},
          KeySpec: 'AES_128'
        };  
      var kms = new AWS.KMS();
      kms.generateDataKey(keyParams, function(err, data) {
        if(err) console.log('err: ' + err);
        else console.log('result: ' + data);
      });
  }
});

var kms = new AWS.KMS();
var s3 = new AWS.S3();

var keyParams = {
     KeyId: 'fred',
     EncryptionContext: 'dev-1',
      KeySpec: 'AES_128'
    };

kms.generateDataKey(keyParams, function(err, data) {
    if(err) console.log('err: ' + err);
    else consle.log('result: ' + data);
});

s3.listObjects( {Bucket: 'dmg-art-users'}, function(err, data) {

    if(err) console.log('err listing bucket: ' + err);
    else console.log(data);
});


