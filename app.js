var express = require('express');
var mosca = require('mosca');
var path = require('path');
var logger = require('morgan');
var bodyParser = require('body-parser');
var app = express();
var jwt = require('express-jwt');
var device = require('./device.js');
var mqttLock = require('./mqttlock.js');


var jwtCheck = jwt({
    secret: new Buffer('1hV9lFfYn-7FQhkGWokKQE3Rt2o6bLj385T8ualKU9GkUktpsGv7Y4Ceo6yMZb2s', 'base64'),
    audience: 'e5qATMYcwzE4uRqCapoO1NDkXZJrfClQ'
});

var mqttSettings = { port: 1883 };

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/api/device/*', jwtCheck);

app.post('/api/device/register', function (req, res) {
  console.log('add device for user: ' +  req.user.sub + 'device: ' + req.body.deviceId);
  device.register(req.user.sub, req.body.deviceId, function(err, key) {
   if(err) {
     console.log('register failure');
     res.status(500);
     res.send({message: 'failed to create'});
  }else {
     responseMsg = { Key: key };
     console.log('key: ', responseMsg);
     res.send(responseMsg); 
   }
  });
});

app.post('/api/device/deregister', function (req, res) {
  console.log('remove device for user: ' +  req.user.sub + 'device: ' + req.body.deviceId);
  device.deregister(req.user.sub, req.body.deviceId, function(err, result) {
   if(err) {
      console.log('deregister failure', result);
      res.status(500);
      res.send({message: 'failed to deregister'});
  }else {
      responseMsg = {};
      res.send(responseMsg);
   }
  });
});

app.get('/api/device/list', function(req, res) {
    console.log('list device for user: ' + req.user.sub);

    device.list(req.user.sub, function(err, result) {
       if(err) {
            console.log('list failure');
            res.status(500);
            res.send({message: 'failed to list'});
        
       } else {
           responseMsg = {Locks: result};
            res.send(responseMsg); 
        }
    });
});

app.post('/api/device/:deviceId/lock', function(req,res) {

    device.lock(req.user.sub, request.params.deviceId, function(err, result) {
         if(err) {
           console.log('lock failure');
           res.status(result.status).send(result.message);
        } else {
          responseMsg = { lock: deviceId, status: 'locked' };
          res.send(responseMsg);
        }
    });
});

app.post('/api/device/:deviceId/unlock', function(req, res) {  
    device.unlock(req.user.sub, request.params.deviceId, function(err, result) {
       if(err) {
           console.log('unlock failure');
           res.status(result.status).send(result.message);
        } else {
          responseMsg = { lock: deviceId, status: 'unlocked' };
          res.send(responseMsg);
        }
    });
});


//Setup the Mosca server
var server = new mosca.Server(mqttSettings);

server.on('ready', setup);

// Fired when the mqtt server is ready
function setup() {
     console.log('Mosca server is up and running');
     // start the client side to listen for messages...
     mqttLock.start({}, function(err) {
         if(err) {
             console.log('failed on starting mqtt client');
         } else {
             console.log('started mqtt client');
         }
     });
}

server.on('clientConnected', function (client) {
      console.log('New connection: ', client.id);
});



module.exports = app;
