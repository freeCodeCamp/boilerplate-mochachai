// History of resources loaded by window.

'use strict';

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _get = require('babel-runtime/helpers/get')['default'];

var _inherits = require('babel-runtime/helpers/inherits')['default'];

var _slicedToArray = require('babel-runtime/helpers/sliced-to-array')['default'];

var _getIterator = require('babel-runtime/core-js/get-iterator')['default'];

var Fetch = require('./fetch');

// Each resource is associated with request, and on completion response or error.

var Resource = (function () {
  function Resource(_ref) {
    var request = _ref.request;

    _classCallCheck(this, Resource);

    this.request = request;
    this.error = null;
    this.response = null;
  }

  // Each window has a resources object that provides the means for retrieving
  // resources and a list of all retrieved resources.
  //
  // The object is an array, and its elements are the resources.

  // The URL of this resource

  _createClass(Resource, [{
    key: 'dump',

    // Dump the resource to output stream/stdout
    value: function dump() {
      var output = arguments.length <= 0 || arguments[0] === undefined ? process.stdout : arguments[0];
      var request = this.request;
      var response = this.response;
      var error = this.error;

      // Write summary request/response header
      if (response) {
        var elapsed = response.time - request.time;
        output.write(request.method + ' ' + this.url + ' - ' + response.status + ' ' + response.statusText + ' - ' + elapsed + 'ms\n');
      } else output.write(request.method + ' ' + this.url + '\n');

      // If response, write out response headers and sample of document entity
      // If error, write out the error message
      // Otherwise, indicate this is a pending request
      if (response) {
        if (response._redirectCount) output.write('  Followed ' + response._redirectCount + ' redirects\n');
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = _getIterator(response.headers), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var _step$value = _slicedToArray(_step.value, 2);

            var _name = _step$value[0];
            var value = _step$value[1];

            output.write('  ' + _name + ': ' + value + '\n');
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator['return']) {
              _iterator['return']();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }

        output.write('\n');
        var sample = response.body.slice(0, 250).toString('utf8').split('\n').map(function (line) {
          return '  ' + line;
        }).join('\n');
        output.write(sample);
      } else if (error) output.write('  Error: ' + error.message + '\n');else output.write('  Pending since ' + new Date(request.time) + '\n');
      // Keep them separated
      output.write('\n\n');
    }
  }, {
    key: 'url',
    get: function get() {
      return this.response && this.response.url || this.request.url;
    }
  }]);

  return Resource;
})();

var Resources = (function (_Array) {
  _inherits(Resources, _Array);

  function Resources(window) {
    _classCallCheck(this, Resources);

    _get(Object.getPrototypeOf(Resources.prototype), 'constructor', this).call(this);
    this._browser = window.browser;
  }

  _createClass(Resources, [{
    key: '_fetch',
    value: function _fetch(input, init) {
      var pipeline = this._browser.pipeline;
      var request = new Fetch.Request(input, init);
      var resource = new Resource({ request: request });
      this.push(resource);

      return pipeline._fetch(request).then(function (response) {
        resource.response = response;
        return response;
      })['catch'](function (error) {
        resource.error = error;
        resource.response = Fetch.Response.error();
        throw error;
      });
    }

    // Human readable resource listing.
    //
    // output - Write to this stream (optional)
  }, {
    key: 'dump',
    value: function dump() {
      var output = arguments.length <= 0 || arguments[0] === undefined ? process.stdout : arguments[0];

      if (this.length === 0) output.write('No resources\n');else this.forEach(function (resource) {
        return resource.dump(output);
      });
    }
  }]);

  return Resources;
})(Array);

module.exports = Resources;
//# sourceMappingURL=resources.js.map
