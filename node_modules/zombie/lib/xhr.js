// Implements XMLHttpRequest.
// See http://www.w3.org/TR/XMLHttpRequest/#the-abort()-method

'use strict';

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var DOM = require('./dom');
var Fetch = require('./fetch');
var ms = require('ms');
var URL = require('url');
var Utils = require('jsdom/lib/jsdom/utils');

var DOMException = DOM.DOMException;
var EventTarget = DOM.EventTarget;

var XMLHttpRequest = (function () {
  //class XMLHttpRequest extends EventTarget {

  function XMLHttpRequest(window) {
    _classCallCheck(this, XMLHttpRequest);

    //super();
    EventTarget.call(this);
    for (var method in EventTarget.prototype) {
      this[method] = EventTarget.prototype[method];
    }this._window = window;
    this._browser = window.browser;
    // Pending request
    this._pending = null;
    // Response headers
    this.readyState = XMLHttpRequest.UNSENT;

    this.onreadystatechange = null;
    this.timeout = 0;

    // XHR events need the first to dispatch, the second to propagate up to window
    this._ownerDocument = window.document;
  }

  // Lifecycle states

  // Aborts the request if it has already been sent.

  _createClass(XMLHttpRequest, [{
    key: 'abort',
    value: function abort() {
      var request = this._pending;
      var sent = !!request;
      if (this.readyState === XMLHttpRequest.UNSENT || this.readyState === XMLHttpRequest.OPENED && !sent) {
        this.readyState = XMLHttpRequest.UNSENT;
        return;
      }
      // Tell any pending request it has been aborted.
      request.aborted = true;
      this._response = null;
      this._error = null;
      this._pending = null;
    }

    // Initializes a request.
    //
    // Calling this method an already active request (one for which open()or
    // openRequest()has already been called) is the equivalent of calling abort().
  }, {
    key: 'open',
    value: function open(method, url, useAsync, user, password) {
      // jshint ignore:line
      if (useAsync === false) throw new DOMException(DOMException.NOT_SUPPORTED_ERR, 'Zombie does not support synchronous XHR requests');

      // Abort any pending request.
      this.abort();

      // Check supported HTTP method
      this._method = method.toUpperCase();
      if (/^(CONNECT|TRACE|TRACK)$/.test(this._method)) throw new DOMException(DOMException.SECURITY_ERR, 'Unsupported HTTP method');
      if (!/^(DELETE|GET|HEAD|OPTIONS|POST|PUT)$/.test(this._method)) throw new DOMException(DOMException.SYNTAX_ERR, 'Unsupported HTTP method');

      var headers = new Fetch.Headers();

      // Normalize the URL and check security
      url = URL.parse(Utils.resolveHref(this._window.location.href, url));
      // Don't consider port if they are standard for http and https
      if (url.protocol === 'https:' && url.port === '443' || url.protocol === 'http:' && url.port === '80') delete url.port;

      if (!/^https?:$/i.test(url.protocol)) throw new DOMException(DOMException.NOT_SUPPORTED_ERR, 'Only HTTP/S protocol supported');
      url.hostname = url.hostname || this._window.location.hostname;
      url.host = url.port ? url.hostname + ':' + url.port : url.hostname;
      if (url.host !== this._window.location.host) {
        headers.set('Origin', this._window.location.protocol + '//' + this._window.location.host);
        this._cors = headers.get('Origin');
      }
      url.hash = null;
      if (user) url.auth = user + ':' + password;
      // Used for logging requests
      this._url = URL.format(url);
      this._headers = headers;

      // Reset response status
      this._stateChanged(XMLHttpRequest.OPENED);
    }

    // Sets the value of an HTTP request header.You must call setRequestHeader()
    // after open(), but before send().
  }, {
    key: 'setRequestHeader',
    value: function setRequestHeader(header, value) {
      if (this.readyState !== XMLHttpRequest.OPENED) throw new DOMException(DOMException.INVALID_STATE_ERR, 'Invalid state');
      this._headers.set(header, value);
    }

    // Sends the request. If the request is asynchronous (which is the default),
    // this method returns as soon as the request is sent. If the request is
    // synchronous, this method doesn't return until the response has arrived.
  }, {
    key: 'send',
    value: function send(data) {
      var _this = this;

      // Request must be opened.
      if (this.readyState !== XMLHttpRequest.OPENED) throw new DOMException(DOMException.INVALID_STATE_ERR, 'Invalid state');

      var request = new Fetch.Request(this._url, {
        method: this._method,
        headers: this._headers,
        body: data
      });
      this._pending = request;
      this._fire('loadstart');

      var timeout = setTimeout(function () {
        if (_this._pending === request) _this._pending = null;
        request.timedOut = true;

        _this._stateChanged(XMLHttpRequest.DONE);
        _this._fire('progress');
        _this._error = new DOMException(DOMException.TIMEOUT_ERR, 'The request timed out');
        _this._fire('timeout', _this._error);
        _this._fire('loadend');
        _this._browser.errors.push(_this._error);
      }, this.timeout || ms('2m'));

      this._window._eventQueue.http(request, function (error, response) {
        // Request already timed-out, nothing to do
        if (request.timedOut) return;
        clearTimeout(timeout);

        if (_this._pending === request) _this._pending = null;

        // Request aborted
        if (request.aborted) {
          _this._stateChanged(XMLHttpRequest.DONE);
          _this._fire('progress');
          _this._error = new DOMException(DOMException.ABORT_ERR, 'Request aborted');
          _this._fire('abort', _this._error);
          return;
        }

        // If not aborted, then we look at networking error
        if (error) {
          _this._stateChanged(XMLHttpRequest.DONE);
          _this._fire('progress');
          _this._error = new DOMException(DOMException.NETWORK_ERR);
          _this._fire('error', _this._error);
          _this._fire('loadend');
          _this._browser.errors.push(_this._error);
          return;
        }

        // CORS request, check origin, may lead to new error
        if (_this._cors) {
          var allowedOrigin = response.headers.get('Access-Control-Allow-Origin');
          if (!(allowedOrigin === '*' || allowedOrigin === _this._cors)) {
            _this._error = new DOMException(DOMException.SECURITY_ERR, 'Cannot make request to different domain');
            _this._browser.errors.push(_this._error);
            _this._stateChanged(XMLHttpRequest.DONE);
            _this._fire('progress');
            _this._fire('error', _this._error);
            _this._fire('loadend');
            _this.raise('error', _this._error.message, { exception: _this._error });
            return;
          }
        }

        // Store the response so getters have acess access it
        _this._response = response;
        // We have a one-stop implementation that goes through all the state
        // transitions
        _this._stateChanged(XMLHttpRequest.HEADERS_RECEIVED);
        _this._stateChanged(XMLHttpRequest.LOADING);

        var done = _this._window._eventQueue.waitForCompletion();
        response.text().then(function (text) {
          _this.responseText = text;
          _this._stateChanged(XMLHttpRequest.DONE);

          _this._fire('progress');
          _this._fire('load');
          _this._fire('loadend');
          done();
        });
      });
      request.sent = true;
    }
  }, {
    key: 'getResponseHeader',
    value: function getResponseHeader(name) {
      // Returns the string containing the text of the specified header, or null if
      // either the response has not yet been received or the header doesn't exist in
      // the response.
      return this._response && this._response.headers.get(name) || null;
    }
  }, {
    key: 'getAllResponseHeaders',
    value: function getAllResponseHeaders() {
      // Returns all the response headers as a string, or null if no response has
      // been received. Note: For multipart requests, this returns the headers from
      // the current part of the request, not from the original channel.
      if (this._response)
        // XHR's getAllResponseHeaders, against all reason, returns a multi-line
        // string.  See http://www.w3.org/TR/XMLHttpRequest/#the-getallresponseheaders-method
        return this._response.headers.toString();else return null;
    }

    // Fire onreadystatechange event
  }, {
    key: '_stateChanged',
    value: function _stateChanged(newState) {
      this.readyState = newState;
      this._fire('readystatechange');
    }

    // Fire the named event on this object
  }, {
    key: '_fire',
    value: function _fire(eventName, error) {
      var event = new DOM.Event('xhr');
      event.initEvent(eventName, true, true);
      event.error = error;
      this.dispatchEvent(event);
      this._browser.emit('xhr', eventName, this._url);
    }

    // Raise error coming from jsdom
  }, {
    key: 'raise',
    value: function raise(type, message, data) {
      this._ownerDocument.raise(type, message, data);
    }
  }, {
    key: 'status',
    get: function get() {
      // Status code/headers available immediately, 0 if request errored
      return this._response ? this._response.status : this._error ? 0 : null;
    }
  }, {
    key: 'statusText',
    get: function get() {
      // Status code/headers available immediately, '' if request errored
      return this._response ? this._response.statusText : this._error ? '' : null;
    }
  }, {
    key: 'responseXML',
    get: function get() {
      // Not implemented yet
      return null;
    }
  }]);

  return XMLHttpRequest;
})();

XMLHttpRequest.UNSENT = 0;
XMLHttpRequest.OPENED = 1;
XMLHttpRequest.HEADERS_RECEIVED = 2;
XMLHttpRequest.LOADING = 3;
XMLHttpRequest.DONE = 4;

module.exports = XMLHttpRequest;
//# sourceMappingURL=xhr.js.map
