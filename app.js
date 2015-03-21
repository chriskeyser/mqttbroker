var express = require('express');
var mosca = require('mosca');
var path = require('path');
var logger = require('morgan');
var bodyParser = require('body-parser');
var app = express();
var jwt = require('express-jwt');

var jwtCheck = jwt({
    secret: new Buffer('1hV9lFfYn-7FQhkGWokKQE3Rt2o6bLj385T8ualKU9GkUktpsGv7Y4Ceo6yMZb2s', 'base64'),
    audience: 'e5qATMYcwzE4uRqCapoO1NDkXZJrfClQ'
});

var mqttSettings = {
    port: 1883,
};

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/api/device/register', jwtCheck);

app.post('/api/device/register', function (req, res) {
  console.log('add device for user: ' +  req.body.userId + 'device: ' + req.body.deviceId);

  responseMsg = { Key: 'abc' };
  res.send(responseMsg);
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.send({ message: err.message, error: err});
  });
}

// production error handler no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.send({ message: err.message,error: {}});
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
