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

app.post('/api/device/register', function (req, res) {
  console.log('add device for user: ' +  req.body.userId + 'device: ' + req.body.deviceId);
  var userclean = req.user.sub.replace('|', '-');
  console.log(userclean);

  device.registerDevice(req.body.deviceId, userclean, function(success, key) {
   if(success) {
      responseMsg = { Key: key };
      res.send(responseMsg);
   }else {
    console.log('register failure');
    res.status(500);
    res.send({message: 'failed to create'});
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
