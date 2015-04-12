var express = require('express');
var mosca = require('mosca');
var path = require('path');
var logger = require('morgan');
var bodyParser = require('body-parser');
var app = express();
var jwt = require('express-jwt');
var device = require('./device.js');
var mqttLock = require('./mqttlock.js');
var jwtconfig = require('./jwtconfig.js');

//update with your key/audience values for your app...
var jwtCheck = jwt(jwtconfig);

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

function getLockDescription(isLocked) {
   if(isLocked === true) {
     return 'locked';
   } else {
     return 'unlocked';
   }
}

app.put('/api/device/:deviceId/lock', function(req,res) {
    var shouldLock = req.body.lockState;
    var deviceId = req.params.deviceId;

    if(shouldLock === undefined || shouldLock === undefined ) {
        console.error('error, missing parameters or device id: ');
        res.status(404);
        res.send({message: 'missing parameters or device id'});
    }else if(shouldLock === true) {
        device.lock(req.user.sub, req.params.deviceId, function(err, result) {
             if(err) {
               console.log('lock failure', err);
               res.status(500).send(result);
            } else {
              responseMsg = { lock: req.params.deviceId, status: getLockDescription(result) };
              res.send(responseMsg);
            }
        });
    }else if(shouldLock === false) {
        device.unlock(req.user.sub, req.params.deviceId, function(err, result) {
           if(err) {
               console.log('unlock failure');
               res.status(500).send(err);
            } else {
              responseMsg = { lock: deviceId, status: getLockDescription(result)};
              res.send(responseMsg);
            }
        });
    }else {
        console.error('error, message not understood: ', req.body.lockState);
        res.status(404);
        res.send({message: 'missing or invalid lock state'});
    }
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
