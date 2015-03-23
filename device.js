var fs = require('fs');
var crypto = require('crypto');

var AWS = require('aws-sdk');
var key = 'alias/lockservice';
var device = {};

var configOpt =
{
   credentialProvider: new AWS.CredentialProviderChain(),
   region: 'us-east-1'
};

AWS.config  = new AWS.Config(configOpt);

// registers a device by generate a key, saving the device to the user profile, and then
// returning the plaintext of the key to set on the device.
//
device.registerDevice = function(deviceid, userid, callback) {
    AWS.config.getCredentials(function(err, creds) {
     if(err) {
         console.log('failed to load creds: ' + err);
     } else {
        AWS.config.credentials = creds;
        var keyName = userid + '-' + deviceid;
        var kms = new AWS.KMS();

        var keyParams = {
	        KeyId: key,
	        EncryptionContext: { device: keyName },
	        KeySpec: 'AES_128'
        };

        console.log('calling kms.generateDataKey');

        kms.generateDataKey(keyParams, function(err, data) {
            if(err) {
	            console.log('error generating key:' + err);
	            callback(false, null);
            } else {
                var keyFile = './data/keys/' + keyName;
	            fs.writeFile(keyFile, data.CipherTextBlob, function(err)
	            {
                    if(err) {
                        console.log('error saving key: ' + err);
                        callback(false, null);
                    }  else {
                        callback(true, data.Plaintext);
                        data = null;
                    }
	            });
            }
        });
     }});
};

module.exports = device;
