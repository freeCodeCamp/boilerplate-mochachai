'use strict';

var _get = require('babel-runtime/helpers/get')['default'];

var _inherits = require('babel-runtime/helpers/inherits')['default'];

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _getIterator = require('babel-runtime/core-js/get-iterator')['default'];

var _Promise = require('babel-runtime/core-js/promise')['default'];

var _ = require('lodash');
var assert = require('assert');
var Bluebird = require('bluebird');
var Fetch = require('./fetch');
var File = require('fs');

var _require = require('./fetch');

var Headers = _require.Headers;

var _require2 = require('util');

var isArray = _require2.isArray;

var Path = require('path');
var Request = require('request');
var resourceLoader = require('jsdom/lib/jsdom/browser/resource-loader');
var URL = require('url');
var Utils = require('jsdom/lib/jsdom/utils');

// Pipeline is sequence of request/response handlers that are used to prepare a
// request, make the request, and process the response.

var Pipeline = (function (_Array) {
  _inherits(Pipeline, _Array);

  function Pipeline(browser) {
    _classCallCheck(this, Pipeline);

    _get(Object.getPrototypeOf(Pipeline.prototype), 'constructor', this).call(this);
    this._browser = browser;
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = _getIterator(Pipeline._default), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var handler = _step.value;

        this.push(handler);
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
  }

  // The default pipeline.  All new pipelines are instantiated with this set of
  // handlers.

  _createClass(Pipeline, [{
    key: '_fetch',
    value: function _fetch(input, init) {
      var request = new Fetch.Request(input, init);
      var browser = this._browser;
      browser.emit('request', request);

      return this._runPipeline(request).then(function (response) {
        response.time = Date.now();
        response.request = request;
        browser.emit('response', request, response);
        return response;
      })['catch'](function (error) {
        browser._debug('Resource error', error.stack);
        throw new TypeError(error.message);
      });
    }
  }, {
    key: '_runPipeline',
    value: function _runPipeline(request) {
      var _this = this;

      return this._getOriginalResponse(request).then(function (response) {
        return _this._prepareResponse(request, response);
      });
    }
  }, {
    key: '_getOriginalResponse',
    value: function _getOriginalResponse(request) {
      var browser = this._browser;
      var requestHandlers = this.filter(function (fn) {
        return fn.length === 2;
      }).concat(Pipeline.makeHTTPRequest);

      return Bluebird.reduce(requestHandlers, function (lastResponse, requestHandler) {
        return lastResponse || requestHandler(browser, request);
      }, null).then(function (response) {
        assert(response && response.hasOwnProperty('statusText'), 'Request handler must return a response');
        return response;
      });
    }
  }, {
    key: '_prepareResponse',
    value: function _prepareResponse(request, originalResponse) {
      var browser = this._browser;
      var responseHandlers = this.filter(function (fn) {
        return fn.length === 3;
      });

      return Bluebird.reduce(responseHandlers, function (lastResponse, responseHandler) {
        return responseHandler(browser, request, lastResponse);
      }, originalResponse).then(function (response) {
        assert(response && response.hasOwnProperty('statusText'), 'Response handler must return a response');
        return response;
      });
    }

    // -- Handlers --

    // Add a request or response handler.  This handler will only be used by this
    // pipeline instance (browser).
  }, {
    key: 'addHandler',
    value: function addHandler(handler) {
      assert(handler.call, 'Handler must be a function');
      assert(handler.length === 2 || handler.length === 3, 'Handler function takes 2 (request handler) or 3 (reponse handler) arguments');
      this.push(handler);
    }

    // Remove a request or response handler.
  }, {
    key: 'removeHandler',
    value: function removeHandler(handler) {
      assert(handler.call, 'Handler must be a function');
      var index = this.indexOf(handler);
      if (index > -1) {
        this.splice(index, 1);
      }
    }

    // Add a request or response handler.  This handler will be used by any new
    // pipeline instance (browser).
  }], [{
    key: 'addHandler',
    value: function addHandler(handler) {
      assert(handler.call, 'Handler must be a function');
      assert(handler.length === 2 || handler.length === 3, 'Handler function takes 2 (request handler) or 3 (response handler) arguments');
      this._default.push(handler);
    }

    // Remove a request or response handler.
  }, {
    key: 'removeHandler',
    value: function removeHandler(handler) {
      assert(handler.call, 'Handler must be a function');
      var index = this._default.indexOf(handler);
      if (index > -1) {
        this._default.splice(index, 1);
      }
    }

    // -- Prepare request --

    // This handler normalizes the request URL.
    //
    // It turns relative URLs into absolute URLs based on the current document URL
    // or base element, or if no document open, based on browser.site property.
  }, {
    key: 'normalizeURL',
    value: function normalizeURL(browser, request) {
      if (browser.document)
        // Resolve URL relative to document URL/base, or for new browser, using
        // Browser.site
        request.url = resourceLoader.resolveResourceUrl(browser.document, request.url);else request.url = Utils.resolveHref(browser.site || 'http://localhost', request.url);
    }

    // This handler mergers request headers.
    //
    // It combines headers provided in the request with custom headers defined by
    // the browser (user agent, authentication, etc).
    //
    // It also normalizes all headers by down-casing the header names.
  }, {
    key: 'mergeHeaders',
    value: function mergeHeaders(browser, request) {
      if (browser.headers) _.each(browser.headers, function (value, name) {
        request.headers.append(name, browser.headers[name]);
      });
      if (!request.headers.has('User-Agent')) request.headers.set('User-Agent', browser.userAgent);

      // Always pass Host: from request URL

      var _URL$parse = URL.parse(request.url);

      var host = _URL$parse.host;

      request.headers.set('Host', host);

      // HTTP Basic authentication
      var authenticate = { host: host, username: null, password: null };
      browser.emit('authenticate', authenticate);
      var username = authenticate.username;
      var password = authenticate.password;

      if (username && password) {
        browser.log('Authenticating as ' + username + ':' + password);
        var base64 = new Buffer(username + ':' + password).toString('base64');
        request.headers.set('authorization', 'Basic ' + base64);
      }
    }

    // -- Retrieve actual resource --

    // Used to perform HTTP request (also supports file: resources).  This is always
    // the last request handler.
  }, {
    key: 'makeHTTPRequest',
    value: function makeHTTPRequest(browser, request) {
      var url = request.url;

      var _URL$parse2 = URL.parse(url);

      var protocol = _URL$parse2.protocol;
      var hostname = _URL$parse2.hostname;
      var pathname = _URL$parse2.pathname;

      if (protocol === 'file:') {

        // If the request is for a file:// descriptor, just open directly from the
        // file system rather than getting node's http (which handles file://
        // poorly) involved.
        if (request.method !== 'GET') return new Fetch.Response('', { url: url, status: 405 });

        var filename = Path.normalize(decodeURI(pathname));
        var exists = File.existsSync(filename);
        if (exists) {
          var stream = File.createReadStream(filename);
          return new Fetch.Response(stream, { url: url, status: 200 });
        } else return new Fetch.Response('', { url: url, status: 404 });
      }

      // We're going to use cookies later when receiving response.
      var cookies = browser.cookies;

      var cookieHeader = cookies.serialize(hostname, pathname);
      if (cookieHeader) request.headers.append('Cookie', cookieHeader);

      var consumeBody = /^POST|PUT/.test(request.method) && request._consume() || _Promise.resolve(null);
      return consumeBody.then(function (body) {

        var httpRequest = new Request({
          method: request.method,
          uri: request.url,
          headers: request.headers.toObject(),
          proxy: browser.proxy,
          body: body,
          jar: false,
          followRedirect: false,
          strictSSL: browser.strictSSL,
          localAddress: browser.localAddress || 0
        });

        return new _Promise(function (resolve, reject) {
          httpRequest.on('response', function (response) {
            // Request returns an object where property name is header name,
            // property value is either header value, or an array if header sent
            // multiple times (e.g. `Set-Cookie`).
            var arrayOfHeaders = _.reduce(response.headers, function (headers, value, name) {
              if (isArray(value)) {
                var _iteratorNormalCompletion2 = true;
                var _didIteratorError2 = false;
                var _iteratorError2 = undefined;

                try {
                  for (var _iterator2 = _getIterator(value), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                    var item = _step2.value;

                    headers.push([name, item]);
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
              } else headers.push([name, value]);
              return headers;
            }, []);

            resolve(new Fetch.Response(response, {
              url: request.url,
              status: response.statusCode,
              headers: new Headers(arrayOfHeaders)
            }));
          }).on('error', reject);
        });
      });
    }

    // -- Handle response --

  }, {
    key: 'handleHeaders',
    value: function handleHeaders(browser, request, response) {
      response.headers = new Headers(response.headers);
      return response;
    }
  }, {
    key: 'handleCookies',
    value: function handleCookies(browser, request, response) {
      // Set cookies from response: call update() with array of headers

      var _URL$parse3 = URL.parse(request.url);

      var hostname = _URL$parse3.hostname;
      var pathname = _URL$parse3.pathname;

      var newCookies = response.headers.getAll('Set-Cookie');
      browser.cookies.update(newCookies, hostname, pathname);
      return response;
    }
  }, {
    key: 'handleRedirect',
    value: function handleRedirect(browser, request, response) {
      var status = response.status;

      if (status === 301 || status === 302 || status === 303 || status === 307 || status === 308) {
        if (request.redirect === 'error') return Fetch.Response.error();

        var _location = response.headers.get('Location');
        if (_location === null) return response;

        if (request._redirectCount >= 20) return Fetch.Response.error();

        browser.emit('redirect', request, response, _location);
        ++request._redirectCount;
        if (status !== 307) {
          request.method = 'GET';
          request.headers['delete']('Content-Type');
          request.headers['delete']('Content-Length');
          request.headers['delete']('Content-Transfer-Encoding');
        }

        // This request is referer for next
        request.headers.set('Referer', request.url);
        request.url = Utils.resolveHref(request.url, _location);
        return browser.pipeline._runPipeline(request);
      } else return response;
    }
  }]);

  return Pipeline;
})(Array);

Pipeline._default = [Pipeline.normalizeURL, Pipeline.mergeHeaders, Pipeline.handleHeaders, Pipeline.handleCookies, Pipeline.handleRedirect];

module.exports = Pipeline;
//# sourceMappingURL=pipeline.js.map
