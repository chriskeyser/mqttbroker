var AWS = require('aws-sdk');

var configOpt = 
{
    region: 'us-east-1'
};

AWS.config  = new AWS.Config(configOpt);

var kms = new AWS.KMS();
var s3 = new AWS.S3();

var keyParams = {
     KeyId: 'fred',
     EncryptionContext: 'dev-1',
      KeySpec: 'AES_128'
    };

var opt = process.argv[2];

function logError(err) {
 console.log('err: ' + err);
 console.log(err.stack);
}

if(opt === '1') {
     kms.generateDataKey(keyParams, function(err, data) {
         console.log('>>>> kms');
        if(err) logError(err);
        else consle.log('result: ' + data);
    });
   s3.listObjects( {Bucket: 'dmg-art-users'}, function(err, data) {
        console.log('>>>> s3');
        if(err) logError(err);
        else console.log(data);
    });

} else if (opt === '2') {
        s3.listObjects( {Bucket: 'dmg-art-users'}, function(err, data) {
            console.log('>>>> s3');
            if(err) logError(err); 
            else {
                console.log(data);
                kms.generateDataKey(keyParams, function(err, data) {
                    console.log('>>>> KMS');
                    if(err) logError(err);
                    else console.log('result: ' + data);
                });
            }
       });
}else {
    AWS.config.getCredentials(function(err, creds) {
        console.log('AWS creds ', AWS.credentials);

        console.log('>>>>>> getCredentials');
      if(err) logError(err);
      else {
          console.log('creds: ' + creds.accessKeyId);
          AWS.config.credentials = creds;
          var s3 = new AWS.S3();
          s3.listObjects( {Bucket: 'dmg-art-users'}, function(err, data) {
              console.log('>>>>> s3');
              if(err) logEror(err);
              else console.log(data);
          });
          var keyParams = {
             KeyId: 'alias/lockservice',
             EncryptionContext: {keyid: 'dev-1'},
              KeySpec: 'AES_128'
            };  
          var kms = new AWS.KMS();
          kms.generateDataKey(keyParams, function(err, data) {
            console.log('>>>>> kms');
            if(err) logError(err);
            else console.log('key: ' + data.Plaintext);
          });
      }
    });
}

