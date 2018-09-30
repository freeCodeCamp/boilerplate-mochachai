'use strict'
var express = require('express');
var app = express();

var cors = require('cors');
var runner = require('./test-runner');

var bodyParser = require('body-parser');
app.use(bodyParser.json());

app.get('/', function(req, res){
  res.sendFile(__dirname + '/views/index.html');
})

app.use(express.static(__dirname + '/public'));

app.get('/hello', function(req, res){
  var name = req.query.name || 'Guest';
  res.type('txt').send('hello ' + name);
})

var travellers = function(req, res){
  var data = {};
  if(req.body && req.body.surname) {
    switch(req.body.surname.toLowerCase()) {
      case 'polo' :
        data = {
          name: 'Marco',
          surname: 'Polo',
          dates: '1254 - 1324'
        };
        break;
      case 'colombo' :
        data = {
          name: 'Cristoforo',
          surname: 'Colombo',
          dates: '1451 - 1506'
        };
        break;
      case 'vespucci' :
        data = {
          name: 'Amerigo',
          surname: 'Vespucci',
          dates: '1454 - 1512'
        };
        break;
      case 'da verrazzano':
      case 'verrazzano':
        data = {
          name: 'Giovanni',
          surname: 'da Verrazzano',
          dates: '1485 - 1528'
        };
        break;
      default:
        data = {
          name: 'unknown'
        }
    }
  }
  res.json(data);
};


app.route('/travellers')
  .put(travellers);

var error;
app.get('/_api/get-tests', cors(), function(req, res, next){
  if(error || process.env.SKIP_TESTS) 
    return res.json({status: 'unavailable'});
  next();
},
function(req, res, next){
  if(!runner.report) return next();
  res.json(testFilter(runner.report, req.query.type, req.query.n));
},
function(req, res){
  runner.on('done', function(report){
    process.nextTick(() =>  res.json(testFilter(runner.report, req.query.type, req.query.n)));
  });
});


app.listen(process.env.PORT || 3000, function() {
  console.log("Listening on port " + process.env.PORT);
  if(!process.env.SKIP_TESTS) {
    console.log('Running Tests...');
    setTimeout(function () {
      try {
        runner.run();
      } catch(e) {
        error = e;
          console.log('Tests are not valid:');
          console.log(error);
      }
    }, 1500);
  }
});


module.exports = app; // for testing

function testFilter(tests, type, n) {
  var out;
  switch (type) {
    case 'unit' :
      out = tests.filter(t => t.context.match('Unit Tests'));
      break;
    case 'functional':
      out = tests.filter(t => t.context.match('Functional Tests') && !t.title.match('#example'));
      break;
    default:
      out = tests;
  }
  if(n !== undefined) {
    return out[n] || out;
  }
  return out;
}
