var mqtt = require('mqtt')

function MqttLock(host, port, retryInterval, clientId) {
    this.host = host;
    this port = port;
    this.retry = retryInterval;
    this.settings = {
        keepalive: 2000,
        protocol: 'MQTT',
        protocolVersion: 4,
        clientid: clientId,
        port: port,
        host: host
    };

}

//TODO: need to update the following to figure out how to deal with closure
MqttLock.prototype.start(callback) {
    this.lockMap = [];
    this.client = mqtt.connect(this.settings);
    this.setInterval(this.checkTimeout, this.retry, client);
    this.client.on('connect', this.handleConnect);
    this.client.on('message', this.handleMessage);

    this.subscribe(lockResponseTopic, {qos:0}, function(err, granted) {
        if(err) {
            console.error('error registering with mqtt: ', err);
            callback(err);
        } 
        else {
            console.info('registered with mqtt: ', granted);
            callback(null);
        }
    });
}


MqttLock.prototype.handleConnect() {
   client.subscribe(lockResponseTopic, {qos:0}, function(err, granted) {
    if(err) console.log('failed to subscribe to topic');
    else {
      sendLock(client);
    }
   });
});


function checkTimeout(client) {

}


setInterval(checkTimeout, 2000, client);

module.exports = mqttClient;


