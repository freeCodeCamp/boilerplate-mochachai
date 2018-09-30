var analyser = require('./assertion-analyser');
var EventEmitter = require('events').EventEmitter;

var Mocha = require('mocha'),
    fs = require('fs'),
    path = require('path');

var mocha = new Mocha();
var testDir = './tests'


// Add each .js file to the mocha instance
fs.readdirSync(testDir).filter(function(file){
    // Only keep the .js files
    return file.substr(-3) === '.js';

}).forEach(function(file){
    mocha.addFile(
        path.join(testDir, file)
    );
});

var emitter = new EventEmitter();  
emitter.run = function() {

  var tests = [];
  var context = "";
  var separator = ' -> ';
  // Run the tests.
  try {
  var runner = mocha.ui('tdd').run()
    .on('test end', function(test) {
        // remove comments
        var body = test.body.replace(/\/\/.*\n|\/\*.*\*\//g, '');
        // collapse spaces
        body = body.replace(/\s+/g,' ');
        var obj = {
          title: test.title,
          context: context.slice(0, -separator.length),
          state: test.state,
          // body: body,
          assertions: analyser(body)
        };
        tests.push(obj);
    })
    .on('end', function() {
        emitter.report = tests;
        emitter.emit('done', tests)
    })
    .on('suite', function(s) {
      context += (s.title + separator);

    })
    .on('suite end', function(s) {
      context = context.slice(0, -(s.title.length + separator.length))
    })
  } catch(e) {
    throw(e);
  }
};

module.exports = emitter;

/*
 * Mocha.runner Events:
 * can be used to build a better custom report
 *
 *   - `start`  execution started
 *   - `end`  execution complete
 *   - `suite`  (suite) test suite execution started
 *   - `suite end`  (suite) all tests (and sub-suites) have finished
 *   - `test`  (test) test execution started
 *   - `test end`  (test) test completed
 *   - `hook`  (hook) hook execution started
 *   - `hook end`  (hook) hook complete
 *   - `pass`  (test) test passed
 *   - `fail`  (test, err) test failed
 *   - `pending`  (test) test pending
 */