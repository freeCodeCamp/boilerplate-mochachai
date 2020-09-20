'use strict';

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _get = require('babel-runtime/helpers/get')['default'];

var _inherits = require('babel-runtime/helpers/inherits')['default'];

var _slicedToArray = require('babel-runtime/helpers/sliced-to-array')['default'];

var _getIterator = require('babel-runtime/core-js/get-iterator')['default'];

var _Symbol$iterator = require('babel-runtime/core-js/symbol/iterator')['default'];

var _Object$create = require('babel-runtime/core-js/object/create')['default'];

var _Promise = require('babel-runtime/core-js/promise')['default'];

var _ = require('lodash');
var HTTP = require('http');
var Stream = require('stream');
var URL = require('url');
var Zlib = require('zlib');

// Decompress stream based on content and transfer encoding headers.
function decompressStream(stream, headers) {
  var transferEncoding = headers.get('Transfer-Encoding');
  var contentEncoding = headers.get('Content-Encoding');
  if (contentEncoding === 'deflate' || transferEncoding === 'deflate') return stream.pipe(Zlib.createInflate());
  if (contentEncoding === 'gzip' || transferEncoding === 'gzip') return stream.pipe(Zlib.createGunzip());
  return stream;
}

// https://fetch.spec.whatwg.org/#headers-class

var Headers = (function () {
  function Headers(init) {
    var _this = this;

    _classCallCheck(this, Headers);

    this._headers = [];
    if (init instanceof Headers || init instanceof Array) {
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = _getIterator(init), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var _step$value = _slicedToArray(_step.value, 2);

          var _name = _step$value[0];
          var value = _step$value[1];

          this.append(_name, value);
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
    } else if (typeof init === "object") _.each(init, function (value, name) {
      _this.append(name, value);
    });
  }

  _createClass(Headers, [{
    key: 'append',
    value: function append(name, value) {
      var caseInsensitive = name.toLowerCase();
      var castValue = String(value).replace(/\r\n/g, '');
      this._headers.push([caseInsensitive, castValue]);
    }
  }, {
    key: 'delete',
    value: function _delete(name) {
      var caseInsensitive = name.toLowerCase();
      this._headers = this._headers.filter(function (header) {
        return header[0] !== caseInsensitive;
      });
    }
  }, {
    key: 'get',
    value: function get(name) {
      var caseInsensitive = name.toLowerCase();
      var namedHeader = _.find(this._headers, function (header) {
        return header[0] === caseInsensitive;
      });
      return namedHeader ? namedHeader[1] : null;
    }
  }, {
    key: 'getAll',
    value: function getAll(name) {
      var caseInsensitive = name.toLowerCase();
      return this._headers.filter(function (header) {
        return header[0] === caseInsensitive;
      }).map(function (header) {
        return header[1];
      });
    }
  }, {
    key: 'has',
    value: function has(name) {
      var caseInsensitive = name.toLowerCase();
      var namedHeader = _.find(this._headers, function (header) {
        return header[0] === caseInsensitive;
      });
      return !!namedHeader;
    }
  }, {
    key: 'set',
    value: function set(name, value) {
      var caseInsensitive = name.toLowerCase();
      var castValue = String(value).replace(/\r\n/g, '');
      var replaced = false;
      this._headers = this._headers.reduce(function (memo, header) {
        if (header[0] !== caseInsensitive) memo.push(header);else if (!replaced) {
          memo.push([header[0], castValue]);
          replaced = true;
        }
        return memo;
      }, []);

      if (!replaced) this.append(name, value);
    }
  }, {
    key: _Symbol$iterator,
    value: function value() {
      return _getIterator(this._headers);
    }
  }, {
    key: 'valueOf',
    value: function valueOf() {
      return this._headers.map(function (_ref) {
        var _ref2 = _slicedToArray(_ref, 2);

        var name = _ref2[0];
        var value = _ref2[1];
        return name + ': ' + value;
      });
    }
  }, {
    key: 'toString',
    value: function toString() {
      return this.valueOf().join('\n');
    }
  }, {
    key: 'toObject',
    value: function toObject() {
      var object = _Object$create(null);
      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = _getIterator(this._headers), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var _step2$value = _slicedToArray(_step2.value, 2);

          var _name2 = _step2$value[0];
          var value = _step2$value[1];

          object[_name2] = value;
        }
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2['return']) {
            _iterator2['return']();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }

      return object;
    }
  }]);

  return Headers;
})();

var FormData = (function () {
  function FormData() {
    _classCallCheck(this, FormData);

    this._entries = [];
  }

  _createClass(FormData, [{
    key: 'append',
    value: function append(name, value /*, filename*/) {
      // TODO add support for files
      this._entries.push([name, value]);
    }
  }, {
    key: 'set',
    value: function set(name, value, filename) {
      this['delete'](name);
      this.append(name, value, filename);
    }
  }, {
    key: 'delete',
    value: function _delete(name) {
      this._entries = this._entries.filter(function (entry) {
        return entry[0] !== name;
      });
    }
  }, {
    key: 'get',
    value: function get(name) {
      var namedEntry = _.find(this._entries, function (entry) {
        return entry[0] === name;
      });
      return namedEntry ? namedEntry[1] : null;
    }
  }, {
    key: 'getAll',
    value: function getAll(name) {
      return this._entries.filter(function (entry) {
        return entry[0] === name;
      }).map(function (entry) {
        return entry[1];
      });
    }
  }, {
    key: 'has',
    value: function has(name) {
      var namedEntry = _.find(this._entries, function (entry) {
        return entry[0] === name;
      });
      return !!namedEntry;
    }
  }, {
    key: _Symbol$iterator,
    value: function value() {
      return _getIterator(this._entries);
    }
  }, {
    key: '_asStream',
    value: function _asStream(boundary) {
      var iterator = _getIterator(this._entries);
      var stream = new Stream.Readable();
      stream._read = function () {
        var next = iterator.next();
        if (next.value) {
          var _next$value = _slicedToArray(next.value, 2);

          var _name3 = _next$value[0];
          var value = _next$value[1];

          this.push('--' + boundary + '\r\n');
          if (value.read) {
            var buffer = value.read();
            this.push('Content-Disposition: form-data; name="' + _name3 + '"; filename="' + value + '"\r\n');
            this.push('Content-Type: ' + (value.mime || 'application/octet-stream') + '\r\n');
            this.push('Content-Length: ' + buffer.length + '\r\n');
            this.push('\r\n');
            this.push(buffer);
          } else {
            var text = value.toString('utf-8');
            this.push('Content-Disposition: form-data; name="' + _name3 + '"\r\n');
            this.push('Content-Type: text/plain; charset=utf8\r\n');
            this.push('Content-Length: ' + text.length + '\r\n');
            this.push('\r\n');
            this.push(text);
          }
          this.push('\r\n');
        }
        if (next.done) {
          this.push('--' + boundary + '--');
          this.push(null);
        }
      };
      return stream;
    }
  }, {
    key: 'length',
    get: function get() {
      return this._entries.length;
    }
  }]);

  return FormData;
})();

var Body = (function () {
  function Body(bodyInit) {
    _classCallCheck(this, Body);

    if (bodyInit instanceof Body) {
      this._stream = bodyInit._stream;
      this._contentType = bodyInit.headers.get('Content-Type');
    } else if (bodyInit instanceof Stream.Readable) {
      // Request + Replay start streaming immediately, so we need this trick to
      // buffer HTTP responses; this is likely a bug in Replay
      this._stream = new Stream.PassThrough();
      this._stream.pause();
      bodyInit.pipe(this._stream);
    } else if (typeof bodyInit === 'string' || bodyInit instanceof String) {
      this._stream = new Stream.Readable();
      this._stream._read = function () {
        this.push(bodyInit);
        this.push(null);
      };
      this._contentType = 'text/plain;charset=UTF-8';
    } else if (bodyInit instanceof FormData && bodyInit.length) {
      var boundary = new Date().getTime() + '.' + Math.random();
      this._contentType = 'multipart/form-data;boundary=' + boundary;
      this._stream = bodyInit._asStream(boundary);
    } else if (bodyInit instanceof FormData) this._contentType = 'text/plain;charset=UTF-8';else if (bodyInit) throw new TypeError('This body type not yet supported');

    this._bodyUsed = false;
    this.body = null;
  }

  // https://fetch.spec.whatwg.org/#request-class

  _createClass(Body, [{
    key: 'arrayBuffer',
    value: function arrayBuffer() {
      var _this2 = this;

      return this._consume().then(function (buffer) {
        _this2.body = buffer;
      }).then(function () {
        var arrayBuffer = new Uint8Array(_this2.body.length);
        for (var i = 0; i < _this2.body.length; ++i) {
          arrayBuffer[i] = _this2.body[i];
        }return arrayBuffer;
      });
    }
  }, {
    key: 'blob',
    value: function blob() {
      throw new Error('Not implemented yet');
    }
  }, {
    key: 'formData',
    value: function formData() {
      var _this3 = this;

      return this._consume().then(function (buffer) {
        _this3.body = buffer;
      }).then(function () {

        var contentType = _this3.headers.get('Content-Type') || '';
        var mimeType = contentType.split(';')[0];
        switch (mimeType) {
          case 'multipart/form-data':
            {
              throw new Error('Not implemented yet');
            }
          case 'application/x-www-form-urlencoded':
            {
              throw new Error('Not implemented yet');
            }
          default:
            {
              throw new TypeError('formData does not support MIME type ' + mimeType);
            }
        }
      });
    }
  }, {
    key: 'json',
    value: function json() {
      var _this4 = this;

      return this._consume().then(function (buffer) {
        _this4.body = buffer.toString('utf-8');
      }).then(function () {
        return JSON.parse(_this4.body);
      });
    }
  }, {
    key: 'text',
    value: function text() {
      var _this5 = this;

      return this._consume().then(function (buffer) {
        _this5.body = buffer.toString();
      }).then(function () {
        return _this5.body;
      });
    }

    // -- Implementation details --

  }, {
    key: '_consume',
    value: function _consume() {
      if (this._bodyUsed) throw new TypeError('Body already consumed');
      this._bodyUsed = true;

      // When Request has no body, _stream is typically null
      if (!this._stream) return null;
      // When Response has no body, we get stream that's no longer readable
      if (!this._stream.readable) return new Buffer('');

      var decompressed = decompressStream(this._stream, this.headers);

      return new _Promise(function (resolve, reject) {
        var buffers = [];
        decompressed.on('data', function (buffer) {
          buffers.push(buffer);
        }).on('end', function () {
          resolve(Buffer.concat(buffers));
        }).on('error', reject).resume();
      });
    }
  }, {
    key: 'bodyUsed',
    get: function get() {
      return this._bodyUsed;
    }
  }]);

  return Body;
})();

var Request = (function (_Body) {
  _inherits(Request, _Body);

  function Request(input, init) {
    _classCallCheck(this, Request);

    var method = ((init ? init.method : input.method) || 'GET').toUpperCase();
    var bodyInit = null;

    if (input instanceof Request && input._stream) {
      if (input._bodyUsed) throw new TypeError('Request body already used');
      bodyInit = input;
      input._bodyUsed = true;
    }

    if (init && init.body) {
      if (method === 'GET' || method === 'HEAD') throw new TypeError('Cannot include body with GET/HEAD request');
      bodyInit = init.body;
    }
    _get(Object.getPrototypeOf(Request.prototype), 'constructor', this).call(this, bodyInit);

    if (typeof input === 'string' || input instanceof String) this.url = URL.format(input);else if (input instanceof Request) this.url = input.url;
    if (!this.url) throw new TypeError('Input must be string or another Request');

    this.method = method;
    this.headers = new Headers(init ? init.headers : input.headers);
    if (this._contentType && !this.headers.has('Content-Type')) this.headers.set('Content-Type', this._contentType);

    // Default redirect is follow, also treat manual as follow
    this.redirect = init && init.redirect;
    if (this.redirect !== 'error') this.redirect = 'follow';
    this._redirectCount = 0;
  }

  // https://fetch.spec.whatwg.org/#response-class

  // -- From Request interface --

  _createClass(Request, [{
    key: 'clone',
    value: function clone() {
      if (this._bodyUsed) throw new TypeError('This Request body has already been used');
      throw new Error('Not implemented yet');
    }

    // -- From Body interface --

  }]);

  return Request;
})(Body);

var Response = (function (_Body2) {
  _inherits(Response, _Body2);

  function Response(bodyInit, responseInit) {
    _classCallCheck(this, Response);

    _get(Object.getPrototypeOf(Response.prototype), 'constructor', this).call(this, bodyInit);
    if (responseInit) {
      if (responseInit.status < 200 || responseInit.status > 599) throw new RangeError('Status code ' + responseInit.status + ' not in range');
      var statusText = responseInit.statusText || HTTP.STATUS_CODES[responseInit.status] || 'Unknown';
      if (!/^[^\n\r]+$/.test(statusText)) throw new TypeError('Status text ' + responseInit.statusText + ' not valid format');

      this._url = URL.format(responseInit.url || '');
      this.type = 'default';
      this.status = responseInit.status;
      this.statusText = statusText;
      this.headers = new Headers(responseInit.headers);
    } else {
      this.type = 'error';
      this.status = 0;
      this.statusText = '';
      this.headers = new Headers();
    }
    if (this._contentType && !this.headers.has('Content-Type')) this.headers.set('Content-Type', this._contentType);
  }

  _createClass(Response, [{
    key: 'clone',
    value: function clone() {
      if (this._bodyUsed) throw new TypeError('This Response body has already been used');
      throw new Error('Not implemented yet');
    }
  }, {
    key: 'url',
    get: function get() {
      return (this._url || '').split('#')[0];
    }
  }, {
    key: 'ok',
    get: function get() {
      return this.status >= 200 && this.status <= 299;
    }
  }], [{
    key: 'error',
    value: function error() {
      return new Response();
    }
  }, {
    key: 'redirect',
    value: function redirect(url) {
      var status = arguments.length <= 1 || arguments[1] === undefined ? 302 : arguments[1];

      var parsedURL = URL.parse(url);
      if ([301, 302, 303, 307, 308].indexOf(status) < 0) throw new RangeError('Status code ' + status + ' not valid redirect code');
      var statusText = HTTP.STATUS_CODES[status];
      var response = new Response(null, { status: status, statusText: statusText });
      response.headers.set('Location', URL.format(parsedURL));
      return response;
    }
  }]);

  return Response;
})(Body);

module.exports = {
  Headers: Headers,
  FormData: FormData,
  Request: Request,
  Response: Response
};
//# sourceMappingURL=fetch.js.map
