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
       if(!timedOut.completed && mqttClient.pendingOperations[timedOut.deviceId]){
          console.warn('timed out: ', timedOut.deviceId, ' cur time: ', curTime, 'timeout: ', timedOut.timeOut);         
          delete mqttClient.pendingOperations[timedOut.deviceId];
          timedOut.callback({error: 'timeout'}, 'timeout');
       } else if(!timedOut.completed) {
          console.warn('device in pending operation not found: ', timedOut.deviceId);
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

function handleMessage(topic, buffer) {
   if(topic === lockResponseTopic) {
       console.log('handleMessage: rcvd message, buffer:', buffer);
       
       var lockId = (buffer.toString('utf-8', 0,  START_ENCRYPT_DATA-1)).replace(/\0/g, '');

       console.log('handleMessage: lockid:', lockId, ' length: ', lockId.length);

       if(lockId.length > 0) {
            var op = mqttLock.pendingOperations[lockId];
            if(op) {
                op.completed = true;
                console.log("buffer length:", buffer.length);
                var msgbuffer = buffer.slice(START_ENCRYPT_DATA);
                console.log('msg buffer', msgbuffer);

                var decrypted = op.encrypt.decrypt(msgbuffer, function(err, str) {
                    if(err) {
                        console.log('failed decrypting message', err, ' device: ', 
                            lockId, 'data: ', buffer);
                        op.callback({error: 'decryption failed'});

                    }else {
                        var message = JSON.parse(str);
                        if(message.devId===lockId) {
                            op.callback(null, message.locked);
                        }else {
                            console.error('invalid lock response received for lock:',lockId, ' payload for: ', op.devId);
                            op.callback({error: 'response received from invalid lock'});
                        }                        
                    }

                    delete mqttLock.pendingOperations[lockId];
                });
            } else {
                console.error('no lock matched to message: ', lockId );
            }
       } else {
         console.error('bad message, buffer contents: ', buffer);
       }
    } else {
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


mqttLock.setlock = function(deviceId, locked, deviceEncrypt, callback) {
    var self = this;

    if(self.client) {
        var lockcmd = {lock:locked};
        var lockCmdStr = JSON.stringify(lockcmd);
        console.info('publishing: ' + lockCmdStr);

        if(self.pendingOperations[deviceId] === undefined) {
            var queueReq = {
                timeOut: new Date().getTime() + (1000 * self.lockOperationTimeout),
                callback: callback,
                deviceId: deviceId,
                completed: false,
                encrypt: deviceEncrypt
            };

            console.log('locking:', deviceId, ' is locked:', locked, ' expire:', queueReq.timeOut);
            
            deviceEncrypt.encrypt(lockCmdStr, function(encryptErr, buffer) {
                if(encryptErr) {
                    console.log('setlock failed, encrypt error', encryptErr);
                    callback( {error: 'encryption failed'});
                } else {
                    self.pendingOperations[deviceId] = queueReq;
                    self.timeoutQueue.push(queueReq);
                    console.log('sending message buffer: ', buffer);
                    self.client.publish(deviceId, buffer);
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


