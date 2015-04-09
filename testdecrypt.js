var crypto = require('crypto');
var lockencrypt = require('./lockencrypt');

var userId = 'auth0-5505dde78708fd88164addd3';
var lockId = 'lock-00AABBCC1E02';

var iv = new Buffer([165,21,45,247,218,212,88,53,159,12,4,35,91,15,206,9]);
var key = new Buffer([5,219,101,83,76,35,34,153,159,12,127,49,123,29,194,139]);
var data= new Buffer([32,74,227,21,233,227,233,226,160,170,169,69,142,81,141,164,147,47,107,230,96,246,96,76,154,123,19,197,224,3,132,136,46,182,35,62,245,27,196,122,30,205,238,175,199,141,192,164,125,149,59,47,105,200,146,16,154,159,182,229,91,47,190,114]);

console.log(key.length);

console.log('buf len:', data.length);
var decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
var encdata = data.slice(0, 32);
var decrypted = [decipher.update(encdata)];
decrypted.push(decipher.final());
var finaldecrypt = Buffer.concat(decrypted);
var decryptlen = finaldecrypt.readUInt8(16);
var decryptdata = finaldecrypt.toString('utf8', 17);
console.log(decryptlen, decryptdata);


