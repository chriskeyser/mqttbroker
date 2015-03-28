var user = require('./user.js');

var userid = 'auth0|5505dde78708fd88164addd3';
var lockid = 'lock-123';

user.getProfile(userid, function(err, data) {
    console.log('getProfile');
    if(err) console.log('error: ', err);
    else {
        console.log('user profile: ', data);
        user.getAppMetadata(userid, function(err, data) {
           console.log('getAppMetadata');
           if(err) console.log('error: ', err);
           else {
             console.log('app metadata: ', data);
             user.addLock(userid, lockid, function(err, data) {
                console.log('addLock');
                if(err) console.log('error: ', err);
                else console.log('add lock data: ', data);
               
                user.getLockList(userid, function(err, data) {
                    if(err) console.log('failed list: ',err)
                    else console.log('list: ', data);

                    //try to remove as well since add can fail if already there.
                    user.removeLock(userid, lockid, function(err, data) {
                      console.log('removeLock');
                      if(err) console.log('error: ', err);
                      else {
                        console.log('add lock data: ', data);
                        user.getAppMetadata(userid, function(err, data) {
                            console.log('getAppMetadata');
                            if(err) console.log('error: ', err);
                            else console.log('app metadata: ', data);
                        });
                      }
                    });
                  });
             });
          }
        });
    }
});





