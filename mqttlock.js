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

    while(q.length > 0 && q[0].timeOut > curTime) {
       var timedOut = q.shift();
       if(mqttClient.pendingOperations[timeout.deviceId]){
          delete mqttClient.pendingOperations[timeout.deviceId];
       }

       if(!timedOut.completed) {
         timedOut.callback({error: 'timeout'});
       }
   }
}


function handleConnect() {
    mqttLock.client.subscribe(lockResponseTopic, {qos:0}, function(err, granted) {
        if(err) console.log('failed to subscribe to topic');
        else {
          console.info('client connected to mqtt server for lock operations');      
        }
   });
}

function handleMessage(topic, message) {
   if(topic === lockResponseTopic) {
       if(message.deviceId) {
            console.info('received message: ', message);
            var op = mqttLock.pendingOperations[message.deviceId];
            if(op) {
                op.completed = true;
                op.callback(null, message.isLocked);           
            } else {
                console.error('no device matched to message: ', message);                
            }
        } else {
           console.error('missing device id, message: ', message);
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
            callback(null);
        }
    });
};


mqttLock.lock = function(deviceId, callback) {
    var self = this;

    if(self.client) {
        var lockcmd = {lock:true};
        var lockCmdStr = JSON.stringify(lockCmd);
        console.info('published: ' + lockCmdStr);

        var queueReq = {
            timeOut: new Date().getTime() + 1000 * self.lockOperationTimeout,
            callback: callback,
            completed: false
        };

        self.pendingOperations[deviceId] = queueReq;
        self.timeoutQueue.push(queueReq);
        client.publish(deviceId, lockCmdStr);
    }else {
        console.error('call to lock before calling start');
        callback({error: 'call to lock and client not initialized'});
    }
};


module.exports = mqttLock;


