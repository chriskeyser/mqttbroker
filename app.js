var express = require('express');
var mosca = require('mosca');
var path = require('path');
var logger = require('morgan');
var bodyParser = require('body-parser');
var app = express();
var jwt = require('express-jwt');
var device = require('./device.js');


var jwtCheck = jwt({
    secret: new Buffer('1hV9lFfYn-7FQhkGWokKQE3Rt2o6bLj385T8ualKU9GkUktpsGv7Y4Ceo6yMZb2s', 'base64'),
    audience: 'e5qATMYcwzE4uRqCapoO1NDkXZJrfClQ'
});

var mqttSettings = { port: 1883 };

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/api/device/register', jwtCheck);
app.use('/api/device/deregister', jwtCheck);
app.use('/api/device/list', jwtCheck);

app.post('/api/device/register', function (req, res) {
  console.log('add device for user: ' +  req.user.sub + 'device: ' + req.body.deviceId);
  device.registerDevice(req.user.sub, req.body.deviceId, function(success, key) {
   if(success) {
      responseMsg = { Key: key };
      console.log('key: ', responseMsg);
      res.send(responseMsg);
   }else {
    console.log('register failure');
    res.status(500);
    res.send({message: 'failed to create'});
   }
  });
});

app.post('/api/device/deregister', function (req, res) {
  console.log('remove device for user: ' +  req.user.sub + 'device: ' + req.body.deviceId);
  device.deregisterDevice(req.user.sub, req.body.deviceId, function(success, result) {
   if(success) {
      responseMsg = {};
      res.send(responseMsg);
   }else {
    console.log('deregister failure', result);
    res.status(500);
    res.send({message: 'failed to deregister'});
   }
  });
});

app.get('/api/device/list', function(req, res) {
    console.log('list device for user: ' + req.user.sub);

    device.listDevices(req.user.sub, function(success, result) {
        if(success) {
            responseMsg = {Locks: result};
            res.send(responseMsg);
        } else {
            console.log('list failure', result);
            res.status(500);
            res.send({message: 'failed to list'});
        }
    });
});

//Setup the Mosca server
var server = new mosca.Server(mqttSettings);

server.on('ready', setup);

// Fired when the mqtt server is ready
function setup() {
     console.log('Mosca server is up and running');
}

server.on('clientConnected', function (client) {
      console.log('New connection: ', client.id);
});


module.exports = app;
