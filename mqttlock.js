var mqtt = require('mqtt');
var _ = require('underscore');

var mqttLock = {};
var client = null;
var START_ENCRYPT_DATA = 24;

var lockResponseTopic = 'lockctl';

mqttLock.defaultSettings = {
   keepalive: 2000,
   protocol: 'MQTT',
   protocolVersion: 4,
   clientid: 'lock-broker-client',
   port: 1883,
   host: 'localhost'
};

mqttLock.lockOperationTimeout = 10;  // time in seconds for timeout.

function checkTimeout(mqttClient) {
    var curTime = new Date().getTime();
    var q = mqttClient.timeoutQueue;

    while(q.length > 0 && curTime > q[0].timeOut) {
       var timedOut = q.shift();
       if(!timedOut.completed && mqttClient.pendingOperations[timedOut.lockId]){
          console.warn('timed out: ', timedOut.lockId);         
          delete mqttClient.pendingOperations[timedOut.lockId];
          timedOut.callback({error: 'timeout'}, 'timeout');
       } else if(!timedOut.completed) {
          console.warn('device in pending operation not found: ', timedOut.lockId);
       }else{
           // don't need to do anything, operation completed so no action to take.
       }
   }
}

function handleConnect() {
    mqttLock.client.subscribe(lockResponseTopic, {qos:0}, function(err, granted) {
        if(err) console.warn('failed to subscribe to topic');
        else {
          console.log('client connected to mqtt server for lock operations');      
        }
   });
}

function completeOperation(op, encryptedBuf) {
    op.completed = true;
    console.log("buffer length:", encryptedBuf.length);
    console.log('encrypt buffer', encryptedBuf);

    var decrypted = op.encrypt.decrypt(encryptedBuf, function(err, str) {
        if(err) {
            console.log('decrypting failed ', err, ' device: ', op.lockId);
            op.callback({error: 'decryption failed'});
        }else {
            var message = null;

            try {
                var message = JSON.parse(str);
                op.callback(null, message.locked);
            } catch(err) {
                console.error('failed on message parse:', str);
                op.callback({error: 'invalid JSON in message'});
            }
       }

        delete mqttLock.pendingOperations[op.lockId];
    });
}


function handleMessage(topic, buffer) { 
    if(topic === lockResponseTopic) {
        console.log('handleMessage: rcvd message, buffer:', buffer);
        var endId = START_ENCRYPT_DATA-1;
        var lockId = buffer.toString('utf-8', 0, endId).replace(/\0/g, '');
        console.log('handleMessage: lockid:', lockId, ' length: ', buffer.length);
        var op = mqttLock.pendingOperations[lockId];

        if(op) {
            op.encrypt.validateSig(buffer, function(err, msgBuf) {
                if(err) {
                    console.error('msg sig mismatch');
                    op.callback({error: 'reply signature mismatch'});
                } else {
                    var encBuf = msgBuf.slice(START_ENCRYPT_DATA);
                    completeOperation(op, encBuf);
                }
            });
        } else {
            console.error('no lock matched to message: ', lockId );
        }
    }else {
       console.error('unknown topic: ', topic, ' message: ',buffer);
    }
}

mqttLock.start = function(opt, callback) {
    var self = this;
    self.pendingOperations = {};
    self.timeoutQueue = [];


    var settings = {};
    _.extend(settings, this.defaultSettings, opt);

    self.client = mqtt.connect(settings);
    self.client.on('connect', handleConnect);
    self.client.on('message', handleMessage);

    setInterval(checkTimeout, 2000, self);

    self.client.subscribe(lockResponseTopic, {qos:0}, function(err, granted) {
        if(err) {
            console.error('error registering with mqtt: ', err);
            callback(err);
        } 
        else {
            console.info('registered with mqtt: ', granted);
            callback(null, 'registered');
        }
    });
};


mqttLock.setlock = function(lockId, locked, deviceEncrypt, callback) {
    var self = this;

    if(self.client) {
        var lockcmd = {lock:locked};
        var lockCmdStr = JSON.stringify(lockcmd);
        console.info('publishing: ' + lockCmdStr);

        if(self.pendingOperations[lockId] === undefined) {
            var queueReq = {
                timeOut: new Date().getTime() + (1000 * self.lockOperationTimeout),
                callback: callback,
                lockId: lockId,
                completed: false,
                encrypt: deviceEncrypt
            };

            console.log('locking:', lockId, ' is locked:', locked, ' expire:', queueReq.timeOut);
            
            deviceEncrypt.encryptAndSign(lockCmdStr, function(encryptErr, buffer) {
                if(encryptErr) {
                    console.log('setlock failed, encrypt error', encryptErr);
                    callback( {error: 'encryption failed'});
                } else {
                    self.pendingOperations[lockId] = queueReq;
                    self.timeoutQueue.push(queueReq);
                    console.log('sending message buffer: ', buffer);
                    self.client.publish(lockId, buffer);
                }
            });
        }else {
            callback({error: 'call to lock that has a pending operation'});
        }
        
    }else {
        console.error('call to lock before calling start');
        callback({error: 'call to lock and client not initialized'});
    }
};

mqttLock.locked = true;
mqttLock.unlocked = false;


module.exports = mqttLock;


