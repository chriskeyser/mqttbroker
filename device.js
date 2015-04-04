
var fs = require('fs');
var crypto = require('crypto');
var AWS = require('aws-sdk');
var user = require('./user');
var mqttLock = require('./mqttlock');

var key = 'alias/lockservice';
var device = {};

var configOpt =
{
   credentialProvider: new AWS.CredentialProviderChain(),
   region: 'us-east-1'
};

AWS.config  = new AWS.Config(configOpt);

function getKeyFileName(userid, deviceid) {
    var userclean = userid.replace('|', '-');
    console.log(userclean);
    var keyName = userid + '-' + deviceid;
    return keyName;
}

function getKeyFilePath(keyName) {
   return './data/keys/' + keyName;
}

// registers a device by generate a key, saving the device to the user profile, and then
// returning the plaintext of the key to set on the device.
//
device.register = function(userid, deviceid, callback) {
    var kms = new AWS.KMS();
    var keyFileName = getKeyFileName(userid, deviceid);

    var keyParams = {
        KeyId: key,
        EncryptionContext: { device: keyFileName },
        KeySpec: 'AES_128'
    };

    console.log('calling kms.generateDataKey');

    kms.generateDataKey(keyParams, function(keyerr, keydata) {
        if(keyerr) {
            console.log('error generating key:' + keyerr);
            console.log('stack: ' + keyerr.stack);
            callback(false, null);
        } else {
            console.info('obtained data key, saving to file');
            var keyFile = getKeyFilePath(keyFileName);
            fs.writeFile(keyFile, keydata.CipherTextBlob, function(fileerr){
                if(fileerr) {
                    console.log('error saving key: ' + fileerr);
                    console.log('stack: ' + fileerr.stack);
                    callback(filerr, null);
                }  else {
                    user.addLock(userid, deviceid, function(updateErr, userdata) {
                        if(updateErr) {
                            console.log('Error: registerDevice: ', updateErr);
                            callback(updateErr, null);
                        } else {      
                            console.log('kms data: ', keydata);
                            callback(null, keydata.Plaintext);
                            //TODO: clean up plain text key?
                        }
                    });
                }
            });
        }
    });
};

device.deregister = function(userid, deviceid, callback) {
    user.removeLock(userid, deviceid, function(updateErr, data) {
        if(updateErr) {
            conole.log('error: ', updateErr);
            callback(updateErr, null);
        } else {
            var keyFileName = getKeyFileName(userid, deviceid);
            var keyFile = getKeyFilePath(keyFileName);
            fs.unlink(keyFile, function(deleteErr) {
                if(deleteErr) console.log('key file deletion error: ', deleteErr);
            });

            callback(null, data);
        }
    });
};

device.list = function(userid, callback) {
    user.getLockList(userid, function(err, locks) {
        if(err) {
            console.log('error: ', err);
            callback(err, null);
        } else {
            callback(null, locks);
        }
    });
};

device.unlock = function(userid, deviceid, callback) {
    //TODO: add code for sending/receiving messages to device
    mqttLock.setlock(deviceid, false, function(err, result) {
        if(err) {
            callback(err);
        } else {
            callback(null, result);
        }
    });
};

device.lock = function(userid, deviceid, callback) {
    mqttLock.setlock(deviceid, true, function(err, result) {
        if(err) {
            callback(err, result);
        } else {
            callback(null, result);
        }
    });
};


module.exports = device;
