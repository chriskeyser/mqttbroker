var mqtt = require('mqtt');
var _ = require('underscore');

var mqttLock = {};
var client = null;

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
       if(mqttClient.pendingOperations[timedOut.deviceId]){
          console.warn('timed out: ', timedOut.deviceId, ' cur time: ', curTime, 'timeout: ', timedOut.timeOut);         
          delete mqttClient.pendingOperations[timedOut.deviceId];
       } else if(!timedOut.completed) {
          console.warn('could not find uncompleted op for device in pending operations: ', timedOut.deviceId);
       }

       if(!timedOut.completed) {
         timedOut.callback({error: 'timeout'}, 'timeout');
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
       var data = buffer.toString();
       console.log('handleMessage: utf8 string: ', data);

       if(data && data.length > 0) {
           var message = JSON.parse(data);
           console.log('mqtt json message: ', message);

           if(message.deviceId) {
                console.log('received message: ', message);
                var op = mqttLock.pendingOperations[message.deviceId];
                if(op) {
                    op.completed = true;
                    op.callback(null, message.isLocked);          
                    delete mqttLock.pendingOperations[message.deviceId];
                } else {
                    console.error('no device matched to message: ', message);                
                }
            } else {
               console.error('missing device id, message: ', message);
            } 
       } else {
         console.error('bad message, buffer contents: ', buffer);
       }
    } else {
       console.error('unknown topic: ', topic, ' message: ', message);
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


mqttLock.setlock = function(deviceId, locked, callback) {
    var self = this;

    if(self.client) {
        var lockcmd = {lock:locked};
        var lockCmdStr = JSON.stringify(lockcmd);
        console.info('published: ' + lockCmdStr);

        if(self.pendingOperations[deviceId] === undefined) {
            var queueReq = {
                timeOut: new Date().getTime() + (1000 * self.lockOperationTimeout),
                callback: callback,
                deviceId: deviceId,
                completed: false
            };

            console.log('locking: ', deviceId, ' desired lock state: ', locked, ' timeout: ', queueReq.timeOut);
            
            self.pendingOperations[deviceId] = queueReq;
            self.timeoutQueue.push(queueReq);
            self.client.publish(deviceId, lockCmdStr);
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


