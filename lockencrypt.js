var fs = require('fs');
var crypto = require('crypto');
var AWS = require('aws-sdk');

//TODO: move to config.
var key = 'alias/lockservice';

var configOpt =
{
   credentialProvider: new AWS.CredentialProviderChain(),
   region: 'us-east-1'
};

AWS.config  = new AWS.Config(configOpt);
var kms = new AWS.KMS();
var IVSIZE = 16;
var CRYPTO_PAD_SIZE = 16;
var BLOCKSIZE = 16;
var MAXMSGSIZE = (5 * 16) - 1;
var SHA256_LENGTH = 32; 

function DeviceEncrypt(userId, lockId) {
    this.lockId = lockId;
    this.userId = userId;
}

// do not alter this, if the format changes than won't be able to 
// retrieve encryption key, the encrypt context is based on this format.
function getKeyFileName(userId, lockId) {
    var userclean = userId.replace('|', '-');
    console.log(userclean);
    var keyName = userclean + '-' + lockId;
    return keyName;
}

function getKeyFilePath(keyName) {
   return './data/keys/' + keyName;
}

function getCiphers(devEnc, callback) {
   var keyFileName=getKeyFileName(devEnc.userId, devEnc.lockId);
   var keyFile = getKeyFilePath(keyFileName);

   console.log('reading key file:', keyFile);
   fs.readFile(keyFile, function(fileerr, buffer) {
       console.log('read key file returned');

      if(fileerr) {
          console.error('failure to read key file:',keyFile);
          callback({error: 'missing key file'});
      } else {

          var params = {
              EncryptionContext: {device: keyFileName },
              CiphertextBlob: buffer
          };
          console.log('decrypting key with params: ', params);

          kms.decrypt(params, function(decryptErr, data) {
              console.log('returned from key decrypt, error: ', decryptErr);
             var keydata = data.Plaintext;

             if(decryptErr) {
                 console.error('decyrpt key error: ', decryptErr, ' keyFileName: ', keyFileName );
                 callback({error: 'Decrpyt key failure'});
             }else {
                 console.log('got encryption key', keydata);
                 crypto.randomBytes(IVSIZE, function(randerr, iv) {
                     if(randerr) {
                        console.eror('error gen IV: ', randerr );
                        callback({error: 'failed to generate IV'});
                     } else {
                        console.log('creating ciphers');
                        devEnc.keydata = keydata;
                        devEnc.iv = iv;
                        devEnc.cipher = crypto.createCipheriv('aes-128-cbc', keydata, iv);
                        callback(null);
                     }
                 });
             }
         });
      }
   });
}


function encryptStrData(devEncrypt, strData, callback) {
    var encodedStrLen = Buffer.byteLength(strData, 'utf-8');

    if(encodedStrLen > MAXMSGSIZE) {
        callback({error: 'exceeded max msg size'});
    } else {
        var bufLen = encodedStrLen + BLOCKSIZE + 1;
        var cipher = devEncrypt.cipher;
        var data = new Buffer(bufLen);

        //using Explicit Initialization Vector, first block will be garbled.
        data.fill(0,0,BLOCKSIZE);
        data.writeUInt8(encodedStrLen, BLOCKSIZE);
        data.write(strData, BLOCKSIZE+1);
        console.log('buffer size: ', data.length);

        var encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
        console.log('encrypt size; ', encrypted.length);
        var hash = getSignature(devEncrypt.keydata, encrypted);
        
        var encryptAndSign = Buffer.concat([encrypted, hash]);
        callback(null, encryptAndSign);
    }
}

function getSignature(key, databuffer) {
    var hmac= crypto.createHmac("sha256", key);
    hmac.write(databuffer);
    hmac.end();
    var hash = hmac.read();
    return hash; 
}

function checkSignature(key, databuffer, signature) {
    var hash = getSignature(key, databuffer);

    if(hash.length == signature.length) {
        for(var i = 0; i < hash.length; i++) {
           if(hash[i] != signature[i]) {
               console.log('signatures do not match');
               console.log('msg:', signature, ' calc:', hash, ' buf len:', databuffer.length);
               return false;
           }
        }
    } else {
        console.log('signature mismatch, hash len: ', hash.length, ' sig len: ', signature.length);
        return false;
    }

    console.log('signatures match');

    return true;
}

function validateMsgSig(key, buffer, callback) {
    var signdatalen = buffer.length - SHA256_LENGTH;
    var cipher = buffer.slice(0, signdatalen);
    var sig = buffer.slice(signdatalen);

    if(checkSignature(key, cipher, sig)) {                   
        callback(null, cipher);
    } else {
        callback({error: "signature validation failed"});
    } 
}


function decryptBuffer(devEncrypt, ciphertext, callback) {

    // using Explicit Initialization Vector, first block will be garbled, don't need to pass iv.
    // use random iv.

    /*try {       */
      var decipher = crypto.createDecipheriv('aes-128-cbc', devEncrypt.keydata, devEncrypt.iv);
      var decrypted = [decipher.update(ciphertext)];
      decrypted.push(decipher.final());
      var finaldecrypt = Buffer.concat(decrypted);
      var plaintextLen = finaldecrypt.readUInt8(BLOCKSIZE);
      var plaintext  = finaldecrypt.toString('utf8', BLOCKSIZE+1);
      console.log('decrypt size:', plaintextLen, ' decrypt text:', plaintext);
      callback(null, plaintext);
/*    } catch(err) {
      console.error('exception on decrypt:', err);
      callback(err);
    }     */

}


DeviceEncrypt.prototype.encryptAndSign = function(string, callback) {
    var self = this;
    
    if(self.cipher === undefined) {
        console.log('getting ciphers');

        getCiphers(self, function(cipherErr) {
            if(cipherErr) {
                console.error('err getting cipher', cipherErr);
                callback(cipherErr);
            }else{
                console.log('got cipher, encrypting');
                encryptStrData(self,string, callback);
            }
        });
   }else {
       encryptStrData(string, callback);
   }
};

DeviceEncrypt.prototype.decrypt = function(buffer, callback) {
    var self = this;
    
    if(self.keydata === undefined) {
        getCiphers(self, function(cipherErr) {
            if(cipherErr) {
                callback(cipherErr);
            }else{
                decryptBuffer(self, buffer, callback);
            }
        });
   }else {
       decryptBuffer(self, buffer, callback);
   }
};

DeviceEncrypt.prototype.validateSig = function (buffer, callback) {
    var self = this;

    if(self.keydata === undefined) {
        getCiphers(self, function(cipherErr) {
            if(cipherError) {
                callback(cipherErr);
            } else{
                validateMsgSig(self.keydata, buffer, callback);     
            }
        });
    } else {
        validateMsgSig(self.keydata, buffer, callback);
    }
};

DeviceEncrypt.prototype.generateLockKey = function(callback) {
    var self = this;

     var keyFileName = getKeyFileName(self.userId, self.lockId);

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
            console.info('obtained data key, saving to file:', keydata);
            var keyFile = getKeyFilePath(keyFileName);
            fs.writeFile(keyFile, keydata.CiphertextBlob, function(fileerr){
                if(fileerr) {
                    console.log('error saving key: ' + fileerr);
                    console.log('stack: ' + fileerr.stack);
                    callback(filerr);
                } else {
                    callback(null, keydata.Plaintext);
                }
            });
        }
    });
};

DeviceEncrypt.prototype.removeLockKey = function(callback) {
    var self = this;
    var keyFileName = getKeyFileName(self.userId, self.lockId);
    var keyFile = getKeyFilePath(keyFileName);
    fs.unlink(keyFile, function(deleteErr) {
       if(deleteErr) console.log('key file deletion error: ', deleteErr);
    });
};

module.exports = DeviceEncrypt;
