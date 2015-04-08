var crypto = require('crypto');
var lockencrypt = require('./lockencrypt');

var userId = 'auth0-5505dde78708fd88164addd3';
var lockId = 'lock-00AABBCC1E02';

var iv = new Buffer([165,21,45,247,218,212,88,53,159,12,4,35,91,15,206,9]);
var key = new Buffer([246,64,40,106,138,16,40,75,147,132,217,186,217,153,226,76]); 

console.log(key.length);

var data = '{"locked":true}';

var cipher = crypto.createCipheriv('aes-128-cbc', key, iv);

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
