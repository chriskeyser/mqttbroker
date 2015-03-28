var metadataToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJTOHdpc2NCRVpyWHkzRDRNcUx2ekRPUGhlNUN2ZmtFcyIsInNjb3BlcyI6eyJ1c2VycyI6eyJhY3Rpb25zIjpbInJlYWQiXX0sInVzZXJzX2FwcF9tZXRhZGF0YSI6eyJhY3Rpb25zIjpbInJlYWQiLCJjcmVhdGUiLCJ1cGRhdGUiLCJkZWxldGUiXX19LCJpYXQiOjE0MjczNDAwNTAsImp0aSI6ImYwNWJlYjI4YzUyNWIwMTdiNzliNGMzZjExZTNhOWY4In0.1j6nDOZs7u3KJBvqnUZWjOnjnNa3kTYY81orfgINqPs';

var https = require('https');

var user = {};
var apiv2 = '/api/v2/';

function getRequestOption(path,method) {
   var opt = {
       hostname: 'login.auth0.com',
       path: path,
       method: method,
       headers: {
           'Accept':'application/json',
           'Content-Type': 'application/json',
           'Authorization':'Bearer ' +  metadataToken
       }
   };

   return opt;
}

function get(opt, callback) {
    var req = https.request(opt, function(res) {
        console.log('request result: ', res.statusCode);
        res.setEncoding('utf8');
        if(res.statusCode == 200) {
            res.on('data', function(d) {
               console.info('user:get:',d);
               callback(null, JSON.parse(d));
            });
        } else {
            res.on('data', function(d) {
                console.error('failed on get: ', d);
                callback(res.statusCode, null);
            });
        }
    });
    
    req.end();

    req.on('error', function(e) {
        console.log('request error: ', e);
        callback(e, null);
    }); 
}

function patch(path, opt, patchData, callback) {
    var req = https.request(opt, function(res) {
        console.log('addLock: status: ', res.statusCode);
        res.setEncoding('utf8');
        res.on('data', function(data) {
            callback(null, data);
        });
    });

    req.on('error', function(patchErr) {
        console.log('Error: addLock: ', patchErr);
        callback(e, null);
    });

    req.write(patchData);
    req.end();
}


user.getProfile = function(userid, callback){
    var path = apiv2 + 'users/' + userid;
    var opt = getRequestOption(path, 'GET');
    get(opt, callback);
};

user.getAppMetadata = function(userid, callback) {
    var path = apiv2 + 'users/' + userid + '?fields=app_metadata';
    var opt = getRequestOption(path, 'GET');
    get(opt, callback);
};


user.addLock = function(userid, lockid, callback) {
    user.getAppMetadata(userid, function(errMetadata, data) {
        if(errMetadata) {
            console.log('user.addLock: failed: ', errMetadata);
            callback(errMetadata, data);
        } else {
            var locks = data.app_metadata.locks || [];
            var index = locks.indexOf(lockid);

            if(index === -1) {
            
            locks.push(lockid);
            data.app_metadata.locks = locks;
            var path = apiv2 + 'users/' + userid;
            var opt = getRequestOption(path, 'PATCH');
            var appdata = JSON.stringify(data);
            patch(path, opt, appdata, callback);
            } else {
                callback('lock already added', null);
            }
        }
    });
};

user.removeLock = function(userid, lockid, callback) {
    user.getAppMetadata(userid, function(errMetadata, data) {
        if(errMetadata) {
            console.log('user.removeLock: failed: ', errMetadata);
            callback(errMetadata, data);
        } else {
            console.log('remove lock: current data:', data);

            if(data.app_metadata.locks) {
                var index = data.app_metadata.locks.indexOf(lockid);
                if(index < 0) {
                    callback('Failure: lockid not found', null);
                } else {
                    data.app_metadata.locks.splice(index, 1);
                    var path = apiv2 + 'users/' + userid;
                    var opt = getRequestOption(path, 'PATCH');
                    var appdata = JSON.stringify(data);
                    patch(path, opt, appdata, callback);
                }
            } else {
                callback('Failure: lockid not found', null);
            }
        }
    });
};

user.getLockList = function(userid, callback) {
   user.getAppMetadata(userid, function(err, data) {
    if(err) {
      callback(err, null);
    } else {
        console.log('lockList: ', data);
        console.log('locks', data.app_metadata.locks);
        lockList = data.app_metadata.locks || [];
        callback(null, lockList);
    }
   });
};

module.exports = user;
