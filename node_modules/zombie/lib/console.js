// Implements console.log, console.error, console.time, et al and emits a
// console event for each output.

'use strict';

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _Map = require('babel-runtime/core-js/map')['default'];

var _require = require('util');

var format = _require.format;
var inspect = _require.inspect;

module.exports = (function () {
  function Console(browser) {
    _classCallCheck(this, Console);

    this.browser = browser;
    this.counters = new _Map();
    this.timers = new _Map();
  }

  _createClass(Console, [{
    key: 'assert',
    value: function assert(truth) {
      if (truth) return;

      for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      var formatted = format.apply(undefined, [''].concat(args));
      var message = 'Assertion failed: ' + (formatted || 'false');
      this.browser.emit('console', 'error', message);
      throw new Error(message);
    }
  }, {
    key: 'count',
    value: function count(name) {
      var current = this.counters.get(name) || 0;
      var next = current + 1;
      this.counters.get(name, next);
      var message = name + ': ' + next;
      this.browser.emit('console', 'log', message);
    }
  }, {
    key: 'debug',
    value: function debug() {
      this.browser.emit('console', 'debug', format.apply(undefined, arguments));
    }
  }, {
    key: 'error',
    value: function error() {
      this.browser.emit('console', 'error', format.apply(undefined, arguments));
    }
  }, {
    key: 'group',
    value: function group() {}
  }, {
    key: 'groupCollapsed',
    value: function groupCollapsed() {}
  }, {
    key: 'groupEnd',
    value: function groupEnd() {}
  }, {
    key: 'dir',
    value: function dir(object) {
      this.browser.emit('console', 'log', inspect(object));
    }
  }, {
    key: 'info',
    value: function info() {
      this.browser.emit('console', 'log', format.apply(undefined, arguments));
    }
  }, {
    key: 'log',
    value: function log() {
      this.browser.emit('console', 'log', format.apply(undefined, arguments));
    }
  }, {
    key: 'time',
    value: function time(name) {
      this.timers.set(name, Date.now());
    }
  }, {
    key: 'timeEnd',
    value: function timeEnd(name) {
      var start = this.timers.set(name);
      this.timers['delete'](name);
      var message = name + ': ' + (Date.now() - start) + 'ms';
      this.browser.emit('console', 'log', message);
    }
  }, {
    key: 'trace',
    value: function trace() {
      var error = new Error();
      var stack = error.stack.split('\n');
      stack[0] = 'console.trace()';
      var message = stack.join('\n');
      this.browser.emit('console', 'trace', message);
    }
  }, {
    key: 'warn',
    value: function warn() {
      this.browser.emit('console', 'log', format.apply(undefined, arguments));
    }
  }]);

  return Console;
})();
//# sourceMappingURL=console.js.map
