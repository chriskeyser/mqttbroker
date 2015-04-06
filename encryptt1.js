var crypto = require('crypto');
var lockencrypt = require('./lockencrypt');

var userId = 'auth0-5505dde78708fd88164addd3';
var lockId = 'lock-00AABBCC1E02';

var iv = new Buffer([206,229,225,23,158,144,57,167,78,45,5,44,224,241,198,10]);
var key = new Buffer([246,64,40,106,138,16,40,75,147,132,217,186,217,153,226,76]);

var data = '{"locked":false,"devId":"lock-00AABBCC1E02"}';
var encrypted = encrypt(data, key);
var decrypted = decrypt(encrypted, key);
console.log(decrypted);

function encrypt(data, key) {
    if (data === null)
        return null
    else if (typeof data === 'undefined')
        return undefined;
    else if (data === '')
        return '';

    var iv = crypto.randomBytes(16);

    var cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
    var encrypted = [cipher.update(data)];
    encrypted.push(cipher.final());

    return Buffer.concat([iv, Buffer.concat(encrypted)])/*.toString('base64')*/;
}

function decrypt(cipher, key) {
    if (cipher === null)
        return null
    else if (typeof cipher == 'undefined')
        return undefined;
    else if (cipher === '')
        return '';

//    var cipher = new Buffer(cipher, 'base64');
    var iv = cipher.slice(0, 16);
    var ciphertext = cipher.slice(16);

    var decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
    var decrypted = [decipher.update(ciphertext)];
    decrypted.push(decipher.final());

    return Buffer.concat(decrypted).toString('utf8');
}


