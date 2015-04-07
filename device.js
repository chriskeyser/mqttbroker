var crypto = require('crypto');
var AWS = require('aws-sdk');
var user = require('./user');
var mqttLock = require('./mqttlock');
var LockEncrypt = require('./lockencrypt');

var device = {};

// registers a device by generate a key, saving the device to the user profile, and then
// returning the plaintext of the key to set on the device.
device.register = function(userid, deviceid, callback) {
    var lockEncrypt = new LockEncrypt(userid, deviceid);

    lockEncrypt.generateLockKey(function(err, plaintextKey) {
        if(err) {
        } else {
            user.addLock(userid, deviceid, function(updateErr, userdata) {
                if(updateErr) {
                    console.error('Error: registerDevice: ', updateErr);
                    callback(updateErr, null);
                } else {      
                    callback(null, plaintextKey);
                }
            });
        }
    });
};

device.deregister = function(userid, deviceid, callback) {
    var lockEncrypt = new LockEncrypt(userid, deviceid);

    user.removeLock(userid, deviceid, function(updateErr, data) {
        if(updateErr) {
            console.error('error: ', updateErr);
            callback(updateErr, null);
        } else {
            lockEncrypt.removeLockKey( function(removeErr) {
                if(removeErr) {
                    console.warning('failed delete key file: ', userid, ':', deviceid);
                }else{
                    console.log('removed lock key for ',userid, ':', deviceid);
                }
            });

            callback(null, data);
        }
    });
};

device.list = function(userid, callback) {
    user.getLockList(userid, function(err, locks) {
        if(err) {
            console.error('list: error: ', err);
            callback(err, null);
        } else {
            callback(null, locks);
        }
    });
};

function setLockState(userid, deviceid, lockstate, callback) {
    var lockEncrypt = new LockEncrypt(userid, deviceid);

    mqttLock.setlock(deviceid, lockstate, lockEncrypt, function(lockerr, result) {
        if(lockerr) {
            console.error('set lock operation failed: ', lockerr);
            callback(lockerr);
        } else {
            callback(null, result);
        }
    });
}

device.unlock = function(userid, deviceid, callback) {
    setLockState(userid, deviceid, false, callback);
};

device.lock = function(userid, deviceid, callback) {
    setLockState(userid, deviceid, true, callback);
};


module.exports = device;

