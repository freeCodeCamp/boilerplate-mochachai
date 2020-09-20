// Exports a function for creating/loading new documents.

'use strict';

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _toArray = require('babel-runtime/helpers/to-array')['default'];

var _slicedToArray = require('babel-runtime/helpers/sliced-to-array')['default'];

var _toConsumableArray = require('babel-runtime/helpers/to-consumable-array')['default'];

var _Object$defineProperties = require('babel-runtime/core-js/object/define-properties')['default'];

var _Object$getOwnPropertyDescriptor = require('babel-runtime/core-js/object/get-own-property-descriptor')['default'];

var _getIterator = require('babel-runtime/core-js/get-iterator')['default'];

var _Object$assign = require('babel-runtime/core-js/object/assign')['default'];

var _Map = require('babel-runtime/core-js/map')['default'];

var assert = require('assert');
var browserFeatures = require('jsdom/lib/jsdom/browser/documentfeatures');
var Fetch = require('./fetch');
var DOM = require('./dom');
var EventSource = require('eventsource');
var iconv = require('iconv-lite');
var QS = require('querystring');
var resourceLoader = require('jsdom/lib/jsdom/browser/resource-loader');
var Resources = require('./resources');
var URL = require('url');
var Utils = require('jsdom/lib/jsdom/utils');
var VM = require('vm');
var WebSocket = require('ws');
var Window = require('jsdom/lib/jsdom/browser/Window');
var XMLHttpRequest = require('./xhr');

// File access, not implemented yet

var File = function File() {
  _classCallCheck(this, File);
}

// Screen object provides access to screen dimensions
;

var Screen = (function () {
  function Screen() {
    _classCallCheck(this, Screen);

    this.top = this.left = 0;
    this.width = 1280;
    this.height = 800;
  }

  // DOM implementation of URL class

  _createClass(Screen, [{
    key: 'availLeft',
    get: function get() {
      return 0;
    }
  }, {
    key: 'availTop',
    get: function get() {
      return 0;
    }
  }, {
    key: 'availWidth',
    get: function get() {
      return 1280;
    }
  }, {
    key: 'availHeight',
    get: function get() {
      return 800;
    }
  }, {
    key: 'colorDepth',
    get: function get() {
      return 24;
    }
  }, {
    key: 'pixelDepth',
    get: function get() {
      return 24;
    }
  }]);

  return Screen;
})();

var DOMURL = (function () {
  function DOMURL(url, base) {
    _classCallCheck(this, DOMURL);

    if (url == null) throw new TypeError('Failed to construct \'URL\': Invalid URL');
    if (base) url = Utils.resolveHref(base, url);
    var parsed = URL.parse(url || 'about:blank');
    var origin = parsed.protocol && parsed.hostname && parsed.protocol + '//' + parsed.hostname;
    _Object$defineProperties(this, {
      hash: { value: parsed.hash, enumerable: true },
      host: { value: parsed.host, enumerable: true },
      hostname: { value: parsed.hostname, enumerable: true },
      href: { value: URL.format(parsed), enumerable: true },
      origin: { value: origin, enumerable: true },
      password: { value: parsed.password, enumerable: true },
      pathname: { value: parsed.pathname, enumerable: true },
      port: { value: parsed.port, enumerable: true },
      protocol: { value: parsed.protocol, enumerable: true },
      search: { value: parsed.search, enumerable: true },
      username: { value: parsed.username, enumerable: true }
    });
  }

  _createClass(DOMURL, [{
    key: 'toString',
    value: function toString() {
      return this.href;
    }
  }]);

  return DOMURL;
})();

function setupWindow(window, args) {
  var document = window.document;
  var browser = args.browser;
  var history = args.history;
  var parent = args.parent;
  var opener = args.opener;

  var closed = false;

  // Access to browser
  Object.defineProperty(window, 'browser', {
    value: browser,
    enumerable: true
  });

  window.name = args.name || '';

  // If this was opened from another window
  window.opener = opener && opener._globalProxy;
  // Frames provide their own parent reference
  window._parent = parent || window;
  window._top = (parent || window).top;

  window.console = browser.console;

  // All the resources loaded by this window.
  window.resources = new Resources(window);

  // javaEnabled, present in browsers, not in spec Used by Google Analytics see
  /// https://developer.mozilla.org/en/DOM/window.navigator.javaEnabled
  var emptySet = [];
  emptySet.item = function () {
    return undefined;
  };
  emptySet.namedItem = function () {
    return undefined;
  };
  window.navigator = {
    appName: 'Zombie',
    appVersion: browser.constructor.VERSION,
    cookieEnabled: true,
    javaEnabled: function javaEnabled() {
      return false;
    },
    language: browser.language,
    mimeTypes: emptySet,
    noUI: true,
    platform: process.platform,
    plugins: emptySet,
    userAgent: browser.userAgent,
    vendor: 'Zombie Industries'
  };

  // Add cookies, storage, alerts/confirm, XHR, WebSockets, JSON, Screen, etc
  Object.defineProperty(window, 'cookies', {
    get: function get() {
      return browser.cookies.serialize(this.location.hostname, this.location.pathname);
    }
  });
  browser._storages.extend(window);

  window.File = File;
  window.Event = DOM.Event;
  window.MouseEvent = DOM.MouseEvent;
  window.MutationEvent = DOM.MutationEvent;
  window.UIEvent = DOM.UIEvent;
  window.screen = new Screen();

  // Fetch API
  window.fetch = window.resources._fetch.bind(window.resources);
  window.Request = Fetch.Request;
  window.Response = Fetch.Response;
  window.FormData = Fetch.FormData;

  // Base-64 encoding/decoding
  window.atob = function (string) {
    return new Buffer(string, 'base64').toString('utf8');
  };
  window.btoa = function (string) {
    return new Buffer(string, 'utf8').toString('base64');
  };

  // Constructor for XHLHttpRequest
  window.XMLHttpRequest = function () {
    return new XMLHttpRequest(window);
  };
  window.URL = DOMURL;

  // Web sockets
  window._allWebSockets = [];

  window.WebSocket = function (url, protocol) {
    url = resourceLoader.resolveResourceUrl(document, url);
    var origin = window.location.protocol + '//' + window.location.host;
    var ws = new WebSocket(url, { origin: origin, protocol: protocol });

    // The < 1.x implementations of ws used to allows 'buffer' to be defined
    // as the binary type in node environments. Now, the supported type is
    // 'nodebuffer'. Version of engine.io-client <= 1.6.12 use the 'buffer'
    // type and this is a shim to allow that to keep working unti that version
    // of engine.io-client does not need to be supported anymore
    var origProperty = _Object$getOwnPropertyDescriptor(WebSocket.prototype, 'binaryType');
    Object.defineProperty(ws, 'binaryType', {
      get: function get() {
        return origProperty.get.call(this);
      },
      set: function set(type) {
        if (type === 'buffer') {
          type = 'nodebuffer';
        }
        return origProperty.set.call(this, type);
      }
    });
    window._allWebSockets.push(ws);
    return ws;
  };

  window.Image = function (width, height) {
    var img = new DOM.HTMLImageElement(window.document);
    img.width = width;
    img.height = height;
    return img;
  };

  // DataView: get from globals
  window.DataView = DataView;

  window.resizeTo = function (width, height) {
    window.outerWidth = window.innerWidth = width;
    window.outerHeight = window.innerHeight = height;
  };
  window.resizeBy = function (width, height) {
    window.resizeTo(window.outerWidth + width, window.outerHeight + height);
  };

  // Some libraries (e.g. Backbone) check that this property exists before
  // deciding to use onhashchange, so we need to set it to null.
  window.onhashchange = null;

  // -- JavaScript evaluation

  // Evaluate in context of window. This can be called with a script (String) or a function.
  window._evaluate = function (code, filename) {
    var originalInScope = browser._windowInScope;
    try {
      // The current window, postMessage and window.close need this
      browser._windowInScope = window;
      var result = undefined;
      if (typeof code === 'string' || code instanceof String) result = VM.runInContext(code, window, { filename: filename });else if (code) result = code.call(window);
      browser.emit('evaluated', code, result, filename);
      return result;
    } catch (error) {
      error.filename = error.filename || filename;
      throw error;
    } finally {
      browser._windowInScope = originalInScope;
    }
  };

  // -- Event loop --

  var eventQueue = browser._eventLoop.createEventQueue(window);
  Object.defineProperty(window, '_eventQueue', {
    value: eventQueue
  });
  window.setTimeout = eventQueue.setTimeout.bind(eventQueue);
  window.clearTimeout = eventQueue.clearTimeout.bind(eventQueue);
  window.setInterval = eventQueue.setInterval.bind(eventQueue);
  window.clearInterval = eventQueue.clearInterval.bind(eventQueue);
  window.setImmediate = function (fn) {
    return eventQueue.setTimeout(fn, 0);
  };
  window.clearImmediate = eventQueue.clearTimeout.bind(eventQueue);
  window.requestAnimationFrame = window.setImmediate;

  // Constructor for EventSource, URL is relative to document's.
  window.EventSource = function (url) {
    url = resourceLoader.resolveResourceUrl(document, url);
    var eventSource = new EventSource(url);
    eventQueue.addEventSource(eventSource);
    return eventSource;
  };

  // -- Interaction --

  window.alert = function (message) {
    var handled = browser.emit('alert', message);
    if (!handled) browser.log('Unhandled window.alert("%s")');
    browser.log('alert("%s")', message);
  };

  window.confirm = function (question) {
    var event = { question: question, response: true };
    var handled = browser.emit('confirm', event);
    if (!handled) browser.log('Unhandled window.confirm("%s")');
    var response = !!event.response;
    browser.log('confirm("%s") -> %ss', question, response);
    return response;
  };

  window.prompt = function (question, value) {
    var event = { question: question, response: value || '' };
    var handled = browser.emit('prompt', event);
    if (!handled) browser.log('Unhandled window.prompt("%s")');
    var response = (event.response || '').toString();
    browser.log('prompt("..") -> "%s"', question, response);
    return response;
  };

  // -- Opening and closing --

  // Open one window from another.
  window.open = function (url, name) {
    url = url && resourceLoader.resolveResourceUrl(document, url);
    return browser.tabs.open({ name: name, url: url, opener: window });
  };

  // Indicates if window was closed
  Object.defineProperty(window, 'closed', {
    get: function get() {
      return closed;
    },
    enumerable: true
  });

  // Used by window.close() and also from history.destroy/replace/etc
  // global.
  window._destroy = function () {
    // We call history.destroy which calls destroy on all windows, so need to
    // avoid infinite loop.
    if (closed) return;
    closed = true;

    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = _getIterator(window._allWebSockets), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var ws = _step.value;

        ws.removeAllListeners();
        ws.close();
      }

      // Close all frames first
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

    for (var i = 0; i < window._length; ++i) {
      if (window[i]) window[i].close();
    } // kill event queue, document and window.
    eventQueue.destroy();
    document.close();
  };

  // window.close actually closes the tab, and disposes of all windows in the history.
  // Also used to close iframe.
  window.close = function () {
    if (parent || closed) return;

    // Only opener window can close window; any code that's not running from
    // within a window's context can also close window.
    if (browser._windowInScope === opener || browser._windowInScope === null) {
      browser.tabs._closed(window);
      // Only parent window gets the close event
      browser.emit('closed', window);
      history.destroy(); // do this last to prevent infinite loop
    } else browser.log('Scripts may not close windows that were not opened by script');
  };

  // -- Navigating --

  // Each window maintains its own view of history
  var windowHistory = {
    forward: function forward() {
      windowHistory.go(1);
    },
    back: function back() {
      windowHistory.go(-1);
    },
    go: function go(amount) {
      history.go(amount);
    },
    pushState: function pushState() {
      history.pushState.apply(history, arguments);
    },
    replaceState: function replaceState() {
      history.replaceState.apply(history, arguments);
    },
    dump: function dump(output) {
      history.dump(output);
    }
  };
  _Object$defineProperties(windowHistory, {
    length: {
      get: function get() {
        return history.length;
      },
      enumerable: true
    },
    state: {
      get: function get() {
        return history.state;
      },
      enumerable: true
    }
  });

  // DOM History object
  window.history = windowHistory;
  /// Actual history, see location getter/setter
  window._history = history;

  // Read/write access to window.location
  Object.defineProperty(window, 'location', {
    get: function get() {
      return document.location;
    },
    set: function set(url) {
      history.assign(url);
    }
  });

  // Form submission uses this
  window._submit = function (formArgs) {
    var url = resourceLoader.resolveResourceUrl(document, formArgs.url);
    var target = formArgs.target || '_self';
    browser.emit('submit', url, target);
    // Figure out which history is going to handle this
    var targetWindow = target === '_self' ? window : target === '_parent' ? window.parent : target === '_top' ? window.top : browser.tabs.open({ name: target });
    var modified = _Object$assign({}, formArgs, { url: url, target: target });
    targetWindow._history.submit(modified);
  };

  // JSDOM fires DCL event on document but not on window
  function windowLoaded(event) {
    document.removeEventListener('DOMContentLoaded', windowLoaded);
    window.dispatchEvent(event);
  }
  document.addEventListener('DOMContentLoaded', windowLoaded);

  // Window is now open, next load the document.
  browser.emit('opened', window);
}

// Help iframes talking with each other
Window.prototype.postMessage = function (data) {
  // Create the event now, but dispatch asynchronously
  var event = this.document.createEvent('MessageEvent');
  event.initEvent('message', false, false);
  event.data = data;
  // Window A (source) calls B.postMessage, to determine A we need the
  // caller's window.

  // DDOPSON-2012-11-09 - _windowInScope.getGlobal() is used here so that for
  // website code executing inside the sandbox context, event.source ==
  // window. Even though the _windowInScope object is mapped to the sandboxed
  // version of the object returned by getGlobal, they are not the same object
  // ie, _windowInScope.foo == _windowInScope.getGlobal().foo, but
  // _windowInScope != _windowInScope.getGlobal()
  event.source = this.browser._windowInScope || this;
  var origin = event.source.location;
  event.origin = URL.format({ protocol: origin.protocol, host: origin.host });
  this.dispatchEvent(event);
};

// Change location
DOM.Document.prototype.__defineSetter__('location', function (url) {
  this.defaultView.location = url;
});

// Creates an returns a new document attached to the window.
function createDocument(args) {
  var browser = args.browser;

  var features = {
    FetchExternalResources: [],
    ProcessExternalResources: [],
    MutationEvents: '2.0'
  };
  if (args.browser.hasFeature('scripts', true)) {
    features.FetchExternalResources.push('script');
    features.ProcessExternalResources.push('script');
  }
  if (args.browser.hasFeature('css', false)) {
    features.FetchExternalResources.push('css');
    features.FetchExternalResources.push('link');
  }
  if (args.browser.hasFeature('img', false)) features.FetchExternalResources.push('img');
  if (args.browser.hasFeature('iframe', true)) features.FetchExternalResources.push('iframe');

  var window = new Window({
    parsingMode: 'html',
    contentType: 'text/html',
    url: args.url,
    referrer: args.referrer
  });
  var document = window.document;

  browserFeatures.applyDocumentFeatures(document, features);
  setupWindow(window, args);

  // Give event handler chance to register listeners.
  args.browser.emit('loading', document);
  return document;
}

// Get refresh URL from <meta> tag
function getMetaRefreshURL(document) {
  var refresh = document.querySelector('meta[http-equiv="refresh"]');
  if (refresh) {
    var content = refresh.getAttribute('content');
    var match = content.match(/^\s*(\d+)(?:\s*;\s*url\s*=\s*(.*?))?\s*(?:;|$)/i);
    if (match) {
      var refreshTimeout = parseInt(match[1], 10);
      var refreshURL = match[2] || document.location.href;
      if (refreshTimeout >= 0) return refreshURL;
    }
  }
  return null;
}

// Find the charset= value of the meta tag
var MATCH_CHARSET = /<meta(?!\s*(?:name|value)\s*=)[^>]*?charset\s*=[\s"']*([^\s"'\/>]*)/i;

// Extract HTML from response with the proper encoding:
// - If content type header indicates charset use that
// - Otherwise, look for <meta> tag with charset in body
// - Otherwise, browsers default to windows-1252 encoding
function getHTMLFromResponseBody(buffer, contentType) {
  var _contentType$split = contentType.split(/;\s*/);

  var _contentType$split2 = _toArray(_contentType$split);

  var mimeType = _contentType$split2[0];

  var typeOptions = _contentType$split2.slice(1);

  // Pick charset from content type
  if (mimeType) {
    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
      for (var _iterator2 = _getIterator(typeOptions), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
        var typeOption = _step2.value;

        if (/^charset=/i.test(typeOption)) {
          var charset = typeOption.split('=')[1];
          return iconv.decode(buffer, charset);
        }
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
  } // Otherwise, HTML documents only, pick charset from meta tag
  // Otherwise, HTML documents only, default charset in US is windows-1252
  var charsetInMetaTag = buffer.toString().match(MATCH_CHARSET);
  if (charsetInMetaTag) return iconv.decode(buffer, charsetInMetaTag[1]);else return iconv.decode(buffer, 'windows-1252');
}

// Builds and returns a new Request, adding form parameters to URL (GET) or
// request body (POST).
function buildRequest(args) {
  var browser = args.browser;
  var method = args.method;

  var params = args.params || new _Map();
  var site = /^(https?:|file:)/i.test(browser.site) ? browser.site : 'http://' + (browser.site || 'locahost');
  var url = Utils.resolveHref(site, URL.format(args.url));

  var headers = new Fetch.Headers(args.headers);

  // HTTP header Referer, but Document property referrer
  var referrer = args.referrer || browser.referrer || browser.referer || args.history.url;
  if (referrer && !headers.has('Referer')) headers.set('Referer', referrer);
  if (!headers.has('Accept')) headers.set('Accept', 'text/html,*/*');

  if (/^GET|HEAD|DELETE$/i.test(method)) {
    var uri = URL.parse(url, true);
    // These methods use query string parameters instead
    var _iteratorNormalCompletion3 = true;
    var _didIteratorError3 = false;
    var _iteratorError3 = undefined;

    try {
      for (var _iterator3 = _getIterator(params), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
        var _step3$value = _slicedToArray(_step3.value, 2);

        var _name = _step3$value[0];
        var values = _step3$value[1];

        uri.query[_name] = values;
      }
    } catch (err) {
      _didIteratorError3 = true;
      _iteratorError3 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion3 && _iterator3['return']) {
          _iterator3['return']();
        }
      } finally {
        if (_didIteratorError3) {
          throw _iteratorError3;
        }
      }
    }

    return new Fetch.Request(URL.format(uri), { method: method, headers: headers });
  }

  var mimeType = (args.encoding || '').split(';')[0];
  // Default mime type, but can also be specified in form encoding
  if (mimeType === '' || mimeType === 'application/x-www-form-urlencoded') {
    var urlEncoded = [].concat(_toConsumableArray(params)).map(function (_ref) {
      var _ref2 = _slicedToArray(_ref, 2);

      var name = _ref2[0];
      var values = _ref2[1];

      return values.map(function (value) {
        return QS.escape(name) + '=' + QS.escape(value);
      }).join('&');
    }).join('&');

    headers.set('Content-Type', 'application/x-www-form-urlencoded;charset=UTF-8');
    return new Fetch.Request(url, { method: method, headers: headers, body: urlEncoded });
  }

  if (mimeType === 'multipart/form-data') {
    var form = new Fetch.FormData();
    var _iteratorNormalCompletion4 = true;
    var _didIteratorError4 = false;
    var _iteratorError4 = undefined;

    try {
      for (var _iterator4 = _getIterator(params), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
        var _step4$value = _slicedToArray(_step4.value, 2);

        var _name2 = _step4$value[0];
        var values = _step4$value[1];
        var _iteratorNormalCompletion5 = true;
        var _didIteratorError5 = false;
        var _iteratorError5 = undefined;

        try {
          for (var _iterator5 = _getIterator(values), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
            var value = _step5.value;

            form.append(_name2, value);
          }
        } catch (err) {
          _didIteratorError5 = true;
          _iteratorError5 = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion5 && _iterator5['return']) {
              _iterator5['return']();
            }
          } finally {
            if (_didIteratorError5) {
              throw _iteratorError5;
            }
          }
        }
      }
    } catch (err) {
      _didIteratorError4 = true;
      _iteratorError4 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion4 && _iterator4['return']) {
          _iterator4['return']();
        }
      } finally {
        if (_didIteratorError4) {
          throw _iteratorError4;
        }
      }
    }

    return new Fetch.Request(url, { method: method, headers: headers, body: form });
  }

  throw new TypeError('Unsupported content type ' + mimeType);
}

// Parse HTML response and setup document
function parseResponse(_ref3) {
  var browser = _ref3.browser;
  var history = _ref3.history;
  var document = _ref3.document;
  var response = _ref3.response;

  var window = document.defaultView;
  window._request = response.request;
  window._response = response;
  history.updateLocation(window, response._url);

  var done = window._eventQueue.waitForCompletion();
  response._consume().then(function (body) {

    var contentType = response.headers.get('Content-Type') || '';
    var html = getHTMLFromResponseBody(body, contentType);
    response.body = html;
    document.write(html || '<html></html>');
    document.close();

    browser.emit('loaded', document);
    if (response.status >= 400) throw new Error('Server returned status code ' + response.status + ' from ' + response.url);
    if (!document.documentElement) throw new Error('Could not parse document at ' + response.url);
  }).then(function () {

    // Handle meta refresh.  Automatically reloads new location and counts
    // as a redirect.
    //
    // If you need to check the page before refresh takes place, use this:
    //   browser.wait({
    //     function: function() {
    //       return browser.query('meta[http-equiv="refresh"]');
    //     }
    //   });
    var refreshURL = getMetaRefreshURL(document);
    if (refreshURL)
      // Allow completion function to run
      window._eventQueue.enqueue(function () {
        window._eventQueue.enqueue(function () {
          // Count a meta-refresh in the redirects count.
          history.replace(refreshURL || document.location.href);
          // This results in a new window getting loaded
          var newWindow = history.current.window;
          newWindow.addEventListener('load', function () {
            ++newWindow._request._redirectCount;
          });
        });
      });
  })['catch'](function (error) {
    browser.emit('error', error);
  }).then(done);
}

// Load/create a new document.
//
// Named arguments:
// browser   - The browser (required)
// history   - Window history (required)
// url       - URL of document to open (defaults to "about:blank")
// method    - HTTP method (defaults to "GET")
// encoding  - Request content type (forms use this)
// params    - Additional request parameters (Map)
// html      - Create document with this content instead of loading from URL
// name      - Window name
// referrer  - HTTP referer header
// parent    - Parent document (for frames)
// opener    - Opening window (for window.open)
// target    - Target window name (for form.submit)
//
// Returns a new document with a new window.  The document contents is loaded
// asynchronously, and will trigger a loaded/error event.
module.exports = function loadDocument(args) {
  var browser = args.browser;
  var history = args.history;
  var html = args.html;
  var url = args.url;

  assert(browser && browser.visit, 'Missing parameter browser');
  assert(history && history.reload, 'Missing parameter history');

  var document = createDocument(_Object$assign({ url: url }, args));
  var window = document.defaultView;

  if (html) {
    window._eventQueue.enqueue(function () {
      document.write(html);
      document.close();
      browser.emit('loaded', document);
    });
    return document;
  }

  // Let's handle the specifics of each protocol
  if (!url || /^about:/.test(url)) {
    window._eventQueue.enqueue(function () {
      document.close();
      browser.emit('loaded', document);
    });
    return document;
  }

  if (/^javascript:/.test(url)) {
    window._eventQueue.enqueue(function () {
      document.close();
      try {
        window._evaluate(url.slice(11), 'javascript:');
        browser.emit('loaded', document);
      } catch (error) {
        browser.emit('error', error);
      }
    });
    return document;
  }

  var request = buildRequest(args);
  window._eventQueue.http(request, function (error, response) {
    if (error) {
      document.write('<html><body>' + error.message + '</body></html>');
      document.close();
      browser.emit('error', error);
    } else parseResponse({ browser: browser, history: history, document: document, response: response });
  });
  return document;
};
//# sourceMappingURL=document.js.map
