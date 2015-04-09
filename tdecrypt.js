var crypto = require('crypto');
var lockencrypt = require('./lockencrypt');

var userId = 'auth0-5505dde78708fd88164addd3';
var lockId = 'lock-00AABBCC1E02';

var iv = new Buffer([165,21,45,247,218,212,88,53,159,12,4,35,91,15,206,9]);
var key = new Buffer([5,219,101,83,76,35,34,153,159,12,127,49,123,29,194,139]);
var data= new Buffer([32,74,227,21,233,227,233,226,160,170,169,69,142,81,141,164,147,47,107,230,96,246,96,76,154,123,19,197,224,3,132,136,46,182,35,62,245,27,196,122,30,205,238,175,199,141,192,164,125,149,59,47,105,200,146,16,154,159,182,229,91,47,190,114]);

console.log(key.length);

var data = '{"locked":true}';

var cipher = crypto.createCipheriv('aes-128-cbc', key, iv);

var decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
var decrypted = [decipher.update(idata)];
decrypted.push(decipher.final());
var finaldecrypt = Buffer.concat(decrypted);
var decryptlen = finaldecrypt.readUInt8(16);
var decryptdata = finaldecrypt.toString('utf8', 17);
console.log(decrpytlen, decryptdata);


var encodedStrLen = Buffer.byteLength(data);
var buflen = encodedStrLen + 1 + 16;
var buffer = new Buffer(buflen);
buffer.writeUInt8(encodedStrLen, 16);
buffer.write(data, 17);
var encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);

var sendbuf = Buffer.concat([iv, encrypted]);
console.log('encrypted size:', encrypted.length);
console.log('encrypted:', encrypted);
console.log('key:', key);
console.log('iv:', iv);

var dev = new lockencrypt(userId, lockId);

/*
var decipher = crypto.createDecipher('aes-128-cbc', key, iv);
var decryptBuf = Buffer.concat([decipher.update(encrypted), decipher.final()]);
*/
/*
   var decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
   var decrypted = [decipher.update(encrypted)];
   decrypted.push(decipher.final());
   var finaldecrypt = Buffer.concat(decrypted);
   var decryptlen = finaldecrypt.readUInt8(0);
   var decryptdata = finaldecrypt.toString('utf8', 1);

console.log('decyrpt len: ', decryptlen, ' data: ', decryptdata);
*/

dev.decrypt(encrypted, function(err, data) {
   if(err) console.log(err);
   else console.log(data);
});
