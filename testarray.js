var lock = [];
lock.push('fred');
console.log(lock);
var lockid = 'lock-123';

            var appMetadata = {};

            if(appMetadata.locks) {
                appMetadata.locks.push(lockid);
            } else{
                appMetadata.locks = [lockid];
            }

console.log(appMetadata);
