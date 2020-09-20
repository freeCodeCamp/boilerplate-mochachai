'use strict';

var _get = require('babel-runtime/helpers/get')['default'];

var _inherits = require('babel-runtime/helpers/inherits')['default'];

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _toConsumableArray = require('babel-runtime/helpers/to-consumable-array')['default'];

var _slicedToArray = require('babel-runtime/helpers/sliced-to-array')['default'];

var _getIterator = require('babel-runtime/core-js/get-iterator')['default'];

var _Promise = require('babel-runtime/core-js/promise')['default'];

var _Array$from = require('babel-runtime/core-js/array/from')['default'];

var assert = require('assert');
var Assert = require('./assert');
var Bluebird = require('bluebird');
var Tabs = require('./tabs');
var Console = require('./console');
var Cookies = require('./cookies');
var debug = require('debug');
var DOM = require('./dom');

var _require = require('events');

var EventEmitter = _require.EventEmitter;

var EventLoop = require('./eventloop');

var _require2 = require('util');

var format = _require2.format;

var Fetch = require('./fetch');
var File = require('fs');
var Mime = require('mime');
var ms = require('ms');
var Path = require('path');
var Pipeline = require('./pipeline');
var reroute = require('./reroute');
var Storages = require('./storage');
var Tough = require('tough-cookie');
var Cookie = Tough.Cookie;

var URL = require('url');
var Utils = require('jsdom/lib/jsdom/utils');

// Version number.  We get this from package.json.
var VERSION = require(__dirname + '/../package.json').version;

// Browser options you can set when creating new browser, or on browser instance.
var BROWSER_OPTIONS = ['features', 'headers', 'waitDuration', 'proxy', 'referrer', 'silent', 'site', 'strictSSL', 'userAgent', 'language', 'runScripts', 'localAddress'];

// These features are set on/off by default.
// Note that default values are actually prescribed where they are used,
// by calling hasFeature with name and default
var DEFAULT_FEATURES = 'scripts no-css no-img iframe';

var MOUSE_EVENT_NAMES = ['mousedown', 'mousemove', 'mouseup'];

// Use the browser to open up new windows and load documents.
//
// The browser maintains state for cookies and local storage.

var Browser = (function (_EventEmitter) {
  _inherits(Browser, _EventEmitter);

  function Browser() {
    var _this = this;

    var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, Browser);

    _get(Object.getPrototypeOf(Browser.prototype), 'constructor', this).call(this);
    // Used for assertions
    this.assert = new Assert(this);
    this.cookies = new Cookies();
    // Shared by all windows.
    this.console = new Console(this);
    // Start with no this referrer.
    this.referrer = null;
    // Open tabs.
    this.tabs = new Tabs(this);
    // New pipeline for this browser.
    this.pipeline = new Pipeline(this);

    // The browser event loop.
    this._eventLoop = new EventLoop(this);

    // Returns all errors reported while loading this window.
    this.errors = [];

    this._storages = new Storages();

    // The window that is currently in scope, some JS functions need this, e.g.
    // when closing a window, you need to determine whether caller (window in
    // scope) is same as window.opener
    this._windowInScope = null;

    this._debug = Browser._debug;

    // Message written to window.console.  Level is log, info, error, etc.
    //
    // All output goes to stdout, except when browser.silent = true and output
    // only shown when debugging (DEBUG=zombie).
    this.on('console', function (level, message) {
      if (_this.silent) _this._debug('>> ' + message);else console.log(message);
    }).on('log', function () {
      // Message written to browser.log.
      _this._debug(format.apply(undefined, arguments));
    });

    // Logging resources
    this.on('request', function (request) {
      return request;
    }).on('response', function (request, response) {
      _this._debug('%s %s => %s', request.method, response.url, response.status);
    }).on('redirect', function (request, response) {
      _this._debug('%s %s => %s %s', request.method, request.url, response.status, response.headers.get('Location'));
    }).on('loaded', function (document) {
      _this._debug('Loaded document %s', document.location.href);
    }).on('xhr', function (eventName, url) {
      _this._debug('XHR %s %s', eventName, url);
    });

    // Logging windows/tabs/navigation
    this.on('opened', function (window) {
      _this._debug('Opened window %s %s', window.location.href, window.name || '');
    }).on('closed', function (window) {
      _this._debug('Closed window %s %s', window.location.href, window.name || '');
    });

    // Switching tabs/windows fires blur/focus event on active window/element
    this.on('active', function (window) {
      // Window becomes inactive
      var winFocus = window.document.createEvent('HTMLEvents');
      winFocus.initEvent('focus', false, false);
      window.dispatchEvent(winFocus);

      if (window.document.activeElement) {
        var elemFocus = window.document.createEvent('HTMLEvents');
        elemFocus.initEvent('focus', false, false);
        window.document.activeElement.dispatchEvent(elemFocus);
      }
    }).on('inactive', function (window) {
      // Window becomes inactive
      if (window.document.activeElement) {
        var elemBlur = window.document.createEvent('HTMLEvents');
        elemBlur.initEvent('blur', false, false);
        window.document.activeElement.dispatchEvent(elemBlur);
      }
      var winBlur = window.document.createEvent('HTMLEvents');
      winBlur.initEvent('blur', false, false);
      window.dispatchEvent(winBlur);
    });

    // Logging navigation
    this.on('link', function (url) {
      _this._debug('Follow link to %s', url);
    }).on('submit', function (url) {
      _this._debug('Submit form to %s', url);
    });

    // Logging event loop
    this._eventLoop.on('setTimeout', function (fn, delay) {
      _this._debug('Fired setTimeout after %dms delay', delay);
      _this.emit('setTimeout', fn, delay);
    }).on('setInterval', function (fn, interval) {
      _this._debug('Fired setInterval every %dms', interval);
      _this.emit('setInterval', fn, interval);
    }).on('serverEvent', function () {
      _this._debug('Server initiated event');
      _this.emit('serverEvent');
    }).on('idle', function (timedOut) {
      if (timedOut) _this._debug('Event loop timed out');else _this._debug('Event loop is empty');
      _this.emit('idle');
    }).on('error', function (error) {
      _this.emit('error', error);
    });

    // Make sure we don't blow up Node when we get a JS error, but dump error to console.  Also, catch any errors
    // reported while processing resources/JavaScript.
    this.on('error', function (error) {
      _this.errors.push(error);
      _this._debug(error.stack);
    });

    // Sets the browser options.
    options = options || {};
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = _getIterator(BROWSER_OPTIONS), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var _name = _step.value;

        this[_name] = options.hasOwnProperty(_name) ? options[_name] : Browser[_name] || null;
      }

      // Last, run all extensions in order.
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

    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
      for (var _iterator2 = _getIterator(Browser._extensions), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
        var extension = _step2.value;

        extension(this);
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
  }

  // Returns true if the given feature is enabled.
  //
  // If the feature is listed, then it is enabled.  If the feature is listed
  // with "no-" prefix, then it is disabled.  If the feature is missing, return
  // the default value.

  _createClass(Browser, [{
    key: 'hasFeature',
    value: function hasFeature(name) {
      var defaultValue = arguments.length <= 1 || arguments[1] === undefined ? true : arguments[1];

      var features = (this.features || '').split(/\s+/);
      return ~features.indexOf(name) ? true : ~features.indexOf('no-' + name) ? false : defaultValue;
    }

    // Return a new browser with a snapshot of this browser's state.
    // Any changes to the forked browser's state do not affect this browser.
  }, {
    key: 'fork',
    value: function fork() {
      throw new Error('Not implemented');
    }

    // Windows
    // -------

    // Returns the currently open window
  }, {
    key: 'open',

    // Open new browser window.
    value: function open() {
      var _ref = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      var url = _ref.url;
      var name = _ref.name;
      var referrer = _ref.referrer;

      return this.tabs.open({ url: url, name: name, referrer: referrer });
    }

    // browser.error => Error
    //
    // Returns the last error reported while loading this window.
  }, {
    key: 'wait',

    // Events
    // ------

    // Waits for the browser to complete loading resources and processing JavaScript events.
    //
    // Accepts two parameters, both optional:
    // options   - Options that determine how long to wait (see below)
    // callback  - Called with error or null and browser
    //
    // To determine how long to wait:
    // duration  - Do not wait more than this duration (milliseconds or string of
    //             the form "5s"). Defaults to "5s" (see Browser.waitDuration).
    // element   - Stop when this element(s) appear in the DOM.
    // function  - Stop when function returns true; this function is called with
    //             the active window and expected time to the next event (0 to
    //             Infinity).
    //
    // As a convenience you can also pass the duration directly.
    //
    // Without a callback, this method returns a promise.
    value: function wait(options, callback) {
      assert(this.window, new Error('No window open'));
      if (arguments.length === 1 && typeof options === 'function') {
        ;
        var _ref2 = [options, null];
        callback = _ref2[0];
        options = _ref2[1];
      }assert(!callback || typeof callback === 'function', 'Second argument expected to be a callback function or null');

      // Support all sort of shortcuts for options. Unofficial.
      var duration = typeof options === 'number' ? options : typeof options === 'string' ? options : options && options.duration || this.waitDuration || '5s';
      // Support 500 (ms) as well as "5s"
      var waitDuration = ms(duration.toString());

      function completionFromElement(element) {
        return function (window) {
          return !!window.document.querySelector(element);
        };
      }

      var completionFunction = typeof options === 'function' ? options : options && options.element ? completionFromElement(options.element) : options && options['function'];

      var _eventLoop = this._eventLoop;

      if (callback) _eventLoop.wait(waitDuration, completionFunction, callback);else return Bluebird.promisify(_eventLoop.wait.bind(_eventLoop))(waitDuration, completionFunction);
    }

    // Waits for the browser to get a single event from any EventSource,
    // then completes loading resources and processing JavaScript events.
    //
    // Accepts an optional callback which is called with error or nothing
    //
    // Without a callback, this method returns a promise.
  }, {
    key: 'waitForServer',
    value: function waitForServer(options, callback) {
      var _this2 = this;

      assert(this.window, new Error('No window open'));
      if (arguments.length === 1 && typeof options === 'function') {
        ;

        var _ref3 = [options, null];
        callback = _ref3[0];
        options = _ref3[1];
      }if (callback) {
        this._eventLoop.once('serverEvent', function () {
          _this2.wait(options, callback);
        });
        return null;
      }

      return new _Promise(function (resolve) {
        _this2._eventLoop.once('serverEvent', function () {
          resolve(_this2.wait(options, null));
        });
      });
    }

    // Various methods use this with a callback, or return a lazy promise (e.g.
    // visit, click, fire)
  }, {
    key: '_wait',
    value: function _wait(options, callback) {
      var _this3 = this;

      if (callback) {
        this.wait(options, callback);
        return null;
      }

      var promise = null;
      var lazyResolve = function lazyResolve() {
        if (!promise) promise = _this3.wait(options, null);
        return promise;
      };
      // Returns equivalent of a promise that only starts evaluating when you
      // call then() or catch() on it.
      return {
        then: function then(resolved, rejected) {
          return lazyResolve().then(resolved, rejected);
        },
        'catch': function _catch(rejected) {
          return lazyResolve().then(null, rejected);
        }
      };
    }

    // Fire a DOM event.  You can use this to simulate a DOM event, e.g. clicking
    // a link.  These events will bubble up and can be cancelled.  Like `wait`
    // this method takes an optional callback and returns a promise.
    //
    // name - Even name (e.g `click`)
    // target - Target element (e.g a link)
    // callback - Called with error or nothing
    //
    // If called without callback, returns a promise
  }, {
    key: 'fire',
    value: function fire(selector, eventName, callback) {
      assert(this.window, 'No window open');
      var target = this.query(selector);
      assert(target && target.dispatchEvent, 'No target element (note: call with selector/element, event name and callback)');

      var eventType = ~MOUSE_EVENT_NAMES.indexOf(eventName) ? 'MouseEvents' : 'HTMLEvents';
      var event = this.document.createEvent(eventType);
      event.initEvent(eventName, true, true);
      target.dispatchEvent(event);
      return this._wait(null, callback);
    }

    // Click on the element and returns a promise.
    //
    // selector - Element or CSS selector
    // callback - Called with error or nothing
    //
    // If called without callback, returns a promise
  }, {
    key: 'click',
    value: function click(selector, callback) {
      return this.fire(selector, 'click', callback);
    }

    // Dispatch asynchronously.  Returns true if preventDefault was set.
  }, {
    key: 'dispatchEvent',
    value: function dispatchEvent(selector, event) {
      assert(this.window, 'No window open');
      var target = this.query(selector);
      return target.dispatchEvent(event);
    }

    // Accessors
    // ---------

    // browser.queryAll(selector, context?) => Array
    //
    // Evaluates the CSS selector against the document (or context node) and return array of nodes.
    // (Unlike `document.querySelectorAll` that returns a node list).
  }, {
    key: 'queryAll',
    value: function queryAll() {
      var selector = arguments.length <= 0 || arguments[0] === undefined ? 'html' : arguments[0];
      var context = arguments.length <= 1 || arguments[1] === undefined ? this.document : arguments[1];

      assert(this.document && this.document.documentElement, 'No open window with an HTML document');

      if (Array.isArray(selector)) return selector;
      if (selector instanceof DOM.Element) return [selector];
      if (selector) {
        var elements = context.querySelectorAll(selector);
        return _Array$from(elements);
      } else return [];
    }

    // browser.query(selector, context?) => Element
    //
    // Evaluates the CSS selector against the document (or context node) and return an element.
  }, {
    key: 'query',
    value: function query() {
      var selector = arguments.length <= 0 || arguments[0] === undefined ? 'html' : arguments[0];
      var context = arguments.length <= 1 || arguments[1] === undefined ? this.document : arguments[1];

      assert(this.document && this.document.documentElement, 'No open window with an HTML document');

      if (selector instanceof DOM.Element) return selector;
      return selector ? context.querySelector(selector) : context;
    }

    // WebKit offers this.
  }, {
    key: '$$',
    value: function $$(selector, context) {
      return this.query(selector, context);
    }

    // browser.querySelector(selector) => Element
    //
    // Select a single element (first match) and return it.
    //
    // selector - CSS selector
    //
    // Returns an Element or null
  }, {
    key: 'querySelector',
    value: function querySelector(selector) {
      assert(this.document && this.document.documentElement, 'No open window with an HTML document');
      return this.document.querySelector(selector);
    }

    // browser.querySelectorAll(selector) => NodeList
    //
    // Select multiple elements and return a static node list.
    //
    // selector - CSS selector
    //
    // Returns a NodeList or null
  }, {
    key: 'querySelectorAll',
    value: function querySelectorAll(selector) {
      assert(this.document && this.document.documentElement, 'No open window with an HTML document');
      return this.document.querySelectorAll(selector);
    }

    // browser.text(selector, context?) => String
    //
    // Returns the text contents of the selected elements.
    //
    // selector - CSS selector (if missing, entire document)
    // context - Context element (if missing, uses document)
    //
    // Returns a string
  }, {
    key: 'text',
    value: function text() {
      var selector = arguments.length <= 0 || arguments[0] === undefined ? 'html' : arguments[0];
      var context = arguments.length <= 1 || arguments[1] === undefined ? this.document : arguments[1];

      assert(this.document, 'No window open');

      if (this.document.documentElement) return this.queryAll(selector, context).map(function (elem) {
        return elem.textContent;
      }).join('').trim().replace(/\s+/g, ' ');else return this.source ? this.source.toString : '';
    }

    // browser.html(selector?, context?) => String
    //
    // Returns the HTML contents of the selected elements.
    //
    // selector - CSS selector (if missing, entire document)
    // context - Context element (if missing, uses document)
    //
    // Returns a string
  }, {
    key: 'html',
    value: function html() {
      var selector = arguments.length <= 0 || arguments[0] === undefined ? 'html' : arguments[0];
      var context = arguments.length <= 1 || arguments[1] === undefined ? this.document : arguments[1];

      assert(this.document, 'No window open');

      if (this.document.documentElement) return this.queryAll(selector, context).map(function (elem) {
        return elem.outerHTML.trim();
      }).join('');else return this.source ? this.source.toString : '';
    }

    // browser.xpath(expression, context?) => XPathResult
    //
    // Evaluates the XPath expression against the document (or context node) and return the XPath result.  Shortcut for
    // `document.evaluate`.
  }, {
    key: 'xpath',
    value: function xpath(expression) {
      var context = arguments.length <= 1 || arguments[1] === undefined ? null : arguments[1];

      return this.document.evaluate(expression, context || this.document.documentElement, null, DOM.XPathResult.ANY_TYPE);
    }

    // browser.document => Document
    //
    // Returns the main window's document. Only valid after opening a document (see `browser.open`).
  }, {
    key: 'destroy',

    // Close all windows, clean state, etc.  This doesn't do anything the garbage
    // collector doesn't already do, so you don't need to call this.
    //
    // But because it destroys the browser state, it's quite useful for detecting
    // weird behavior bugs, e.g. an event loop that keeps running.  That's why
    // the test suite uses this method.
    value: function destroy() {
      if (this.tabs) {
        this.tabs.closeAll();
        this.tabs = null;
      }
    }

    // Navigation
    // ----------

    // browser.visit(url, callback?)
    //
    // Loads document from the specified URL, processes events and calls the callback, or returns a promise.
  }, {
    key: 'visit',
    value: function visit(url, options, callback) {
      if (arguments.length < 3 && typeof options === 'function') {
        ;

        var _ref4 = [{}, options];
        options = _ref4[0];
        callback = _ref4[1];
      }var site = /^(https?:|file:)/i.test(this.site) ? this.site : 'http://' + (this.site || 'localhost') + '/';
      url = Utils.resolveHref(site, URL.format(url));

      if (this.window) this.tabs.close(this.window);
      this.errors = [];
      this.tabs.open({ url: url, referrer: this.referrer });
      return this._wait(options, callback);
    }

    // browser.load(html, callback)
    //
    // Loads the HTML, processes events and calls the callback.
    //
    // Without a callback, returns a promise.
  }, {
    key: 'load',
    value: function load(html, callback) {
      if (this.window) this.tabs.close(this.window);
      this.errors = [];
      this.tabs.open({ html: html });
      return this._wait(null, callback);
    }

    // browser.location => Location
    //
    // Return the location of the current document (same as `window.location`).
  }, {
    key: 'link',

    // browser.link(selector) : Element
    //
    // Finds and returns a link by its text content or selector.
    value: function link(selector) {
      assert(this.document && this.document.documentElement, 'No open window with an HTML document');
      // If the link has already been queried, return itself
      if (selector instanceof DOM.Element) return selector;

      try {
        var link = this.querySelector(selector);
        if (link && link.tagName === 'A') return link;
      } catch (error) {
        /* eslint no-empty:0 */
      }
      var _iteratorNormalCompletion3 = true;
      var _didIteratorError3 = false;
      var _iteratorError3 = undefined;

      try {
        for (var _iterator3 = _getIterator(_Array$from(this.querySelectorAll('body a'))), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
          var elem = _step3.value;

          if (elem.textContent.trim() === selector) return elem;
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

      return null;
    }

    // browser.clickLink(selector, callback)
    //
    // Clicks on a link. Clicking on a link can trigger other events, load new page, etc: use a callback to be notified of
    // completion.  Finds link by text content or selector.
    //
    // selector - CSS selector or link text
    // callback - Called with two arguments: error and browser
  }, {
    key: 'clickLink',
    value: function clickLink(selector, callback) {
      var link = this.link(selector);
      assert(link, 'No link matching \'' + selector + '\'');
      return this.click(link, callback);
    }

    // Return the history object.
  }, {
    key: 'back',

    // Navigate back in history.
    value: function back(callback) {
      this.window.history.back();
      return this._wait(null, callback);
    }

    // Reloads current page.
  }, {
    key: 'reload',
    value: function reload(callback) {
      this.window.location.reload();
      return this._wait(null, callback);
    }

    // browser.saveHistory() => String
    //
    // Save history to a text string.  You can use this to load the data later on using `browser.loadHistory`.
  }, {
    key: 'saveHistory',
    value: function saveHistory() {
      return this.window.history.save();
    }

    // browser.loadHistory(String)
    //
    // Load history from a text string (e.g. previously created using `browser.saveHistory`.
  }, {
    key: 'loadHistory',
    value: function loadHistory(serialized) {
      this.window.history.load(serialized);
    }

    // Forms
    // -----

    // browser.field(selector) : Element
    //
    // Find and return an input field (`INPUT`, `TEXTAREA` or `SELECT`) based on a CSS selector, field name (its `name`
    // attribute) or the text value of a label associated with that field (case sensitive, but ignores leading/trailing
    // spaces).
  }, {
    key: 'field',
    value: function field(selector) {
      assert(this.document && this.document.documentElement, 'No open window with an HTML document');
      // If the field has already been queried, return itself
      if (selector instanceof DOM.Element) return selector;

      try {
        // Try more specific selector first.
        var field = this.query(selector);
        if (field && (field.tagName === 'INPUT' || field.tagName === 'TEXTAREA' || field.tagName === 'SELECT')) return field;
      } catch (error) {}
      // Invalid selector, but may be valid field name

      // Use field name (case sensitive).
      var _iteratorNormalCompletion4 = true;
      var _didIteratorError4 = false;
      var _iteratorError4 = undefined;

      try {
        for (var _iterator4 = _getIterator(this.queryAll('input[name],textarea[name],select[name]')), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
          var elem = _step4.value;

          if (elem.getAttribute('name') === selector) return elem;
        }

        // Try finding field from label.
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

      var _iteratorNormalCompletion5 = true;
      var _didIteratorError5 = false;
      var _iteratorError5 = undefined;

      try {
        for (var _iterator5 = _getIterator(this.queryAll('label')), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
          var label = _step5.value;

          if (label.textContent.trim() === selector) {
            // nLabel can either reference field or enclose it
            var forAttr = label.getAttribute('for');
            return forAttr ? this.document.getElementById(forAttr) : label.querySelector('input,textarea,select');
          }
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

      return null;
    }

    // browser.focus(selector) : Element
    //
    // Turns focus to the selected input field.  Shortcut for calling `field(selector).focus()`.
  }, {
    key: 'focus',
    value: function focus(selector) {
      var field = this.field(selector) || this.query(selector);
      assert(field, 'No form field matching \'' + selector + '\'');
      field.focus();
      return this;
    }

    // browser.fill(selector, value) => this
    //
    // Fill in a field: input field or text area.
    //
    // selector - CSS selector, field name or text of the field label
    // value - Field value
    //
    // Returns this.
  }, {
    key: 'fill',
    value: function fill(selector, value) {
      var field = this.field(selector);
      assert(field && (field.tagName === 'TEXTAREA' || field.tagName === 'INPUT'), 'No INPUT matching \'' + selector + '\'');
      assert(!field.disabled, 'This INPUT field is disabled');
      assert(!field.readonly, 'This INPUT field is readonly');

      // Switch focus to field, change value and emit the input event (HTML5)
      field.focus();
      field.value = value;
      this.fire(field, 'input', false);
      // Switch focus out of field, if value changed, this will emit change event
      field.blur();
      return this;
    }
  }, {
    key: '_setCheckbox',
    value: function _setCheckbox(selector, value) {
      var field = this.field(selector);
      assert(field && field.tagName === 'INPUT' && field.type === 'checkbox', 'No checkbox INPUT matching \'' + selector + '\'');
      assert(!field.disabled, 'This INPUT field is disabled');
      assert(!field.readonly, 'This INPUT field is readonly');

      if (field.checked ^ value) field.click();
      return this;
    }

    // browser.check(selector) => this
    //
    // Checks a checkbox.
    //
    // selector - CSS selector, field name or text of the field label
    //
    // Returns this.
  }, {
    key: 'check',
    value: function check(selector) {
      return this._setCheckbox(selector, true);
    }

    // browser.uncheck(selector) => this
    //
    // Unchecks a checkbox.
    //
    // selector - CSS selector, field name or text of the field label
    //
    // Returns this.
  }, {
    key: 'uncheck',
    value: function uncheck(selector) {
      return this._setCheckbox(selector, false);
    }

    // browser.choose(selector) => this
    //
    // Selects a radio box option.
    //
    // selector - CSS selector, field value or text of the field label
    //
    // Returns this.
  }, {
    key: 'choose',
    value: function choose(selector) {
      var field = this.field(selector) || this.field('input[type=radio][value=\'' + escape(selector) + '\']');
      assert(field && field.tagName === 'INPUT' && field.type === 'radio', 'No radio INPUT matching \'' + selector + '\'');

      field.click();
      return this;
    }
  }, {
    key: '_findOption',
    value: function _findOption(selector, value) {
      var field = this.field(selector);
      assert(field && field.tagName === 'SELECT', 'No SELECT matching \'' + selector + '\'');
      assert(!field.disabled, 'This SELECT field is disabled');
      assert(!field.readonly, 'This SELECT field is readonly');

      var options = _Array$from(field.options);
      var _iteratorNormalCompletion6 = true;
      var _didIteratorError6 = false;
      var _iteratorError6 = undefined;

      try {
        for (var _iterator6 = _getIterator(options), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
          var option = _step6.value;

          if (option.value === value) return option;
        }
      } catch (err) {
        _didIteratorError6 = true;
        _iteratorError6 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion6 && _iterator6['return']) {
            _iterator6['return']();
          }
        } finally {
          if (_didIteratorError6) {
            throw _iteratorError6;
          }
        }
      }

      var _iteratorNormalCompletion7 = true;
      var _didIteratorError7 = false;
      var _iteratorError7 = undefined;

      try {
        for (var _iterator7 = _getIterator(options), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
          var option = _step7.value;

          if (option.label === value) return option;
        }
      } catch (err) {
        _didIteratorError7 = true;
        _iteratorError7 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion7 && _iterator7['return']) {
            _iterator7['return']();
          }
        } finally {
          if (_didIteratorError7) {
            throw _iteratorError7;
          }
        }
      }

      var _iteratorNormalCompletion8 = true;
      var _didIteratorError8 = false;
      var _iteratorError8 = undefined;

      try {
        for (var _iterator8 = _getIterator(options), _step8; !(_iteratorNormalCompletion8 = (_step8 = _iterator8.next()).done); _iteratorNormalCompletion8 = true) {
          var option = _step8.value;

          if (option.textContent.trim() === value) return option;
        }
      } catch (err) {
        _didIteratorError8 = true;
        _iteratorError8 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion8 && _iterator8['return']) {
            _iterator8['return']();
          }
        } finally {
          if (_didIteratorError8) {
            throw _iteratorError8;
          }
        }
      }

      throw new Error('No OPTION \'' + value + '\'');
    }

    // browser.select(selector, value) => this
    //
    // Selects an option.
    //
    // selector - CSS selector, field name or text of the field label
    // value - Value (or label) or option to select
    //
    // Returns this.
  }, {
    key: 'select',
    value: function select(selector, value) {
      var option = this._findOption(selector, value);
      this.selectOption(option);
      return this;
    }

    // browser.selectOption(option) => this
    //
    // Selects an option.
    //
    // option - option to select
    //
    // Returns this.
  }, {
    key: 'selectOption',
    value: function selectOption(selector) {
      var option = this.query(selector);
      if (option && !option.selected) {
        var select = this.xpath('./ancestor::select', option).iterateNext();
        option.selected = true;
        select.focus();
        this.fire(select, 'change', false);
      }
      return this;
    }

    // browser.unselect(selector, value) => this
    //
    // Unselects an option.
    //
    // selector - CSS selector, field name or text of the field label
    // value - Value (or label) or option to unselect
    //
    // Returns this.
  }, {
    key: 'unselect',
    value: function unselect(selector, value) {
      var option = this._findOption(selector, value);
      this.unselectOption(option);
      return this;
    }

    // browser.unselectOption(option) => this
    //
    // Unselects an option.
    //
    // selector - selector or option to unselect
    //
    // Returns this.
  }, {
    key: 'unselectOption',
    value: function unselectOption(selector) {
      var option = this.query(selector);
      if (option && option.selected) {
        var select = this.xpath('./ancestor::select', option).iterateNext();
        assert(select.multiple, 'Cannot unselect in single select');
        option.selected = false;
        select.focus();
        this.fire(select, 'change', false);
      }
      return this;
    }

    // browser.attach(selector, filename) => this
    //
    // Attaches a file to the specified input field.  The second argument is the file name.
    //
    // Returns this.
  }, {
    key: 'attach',
    value: function attach(selector, filename) {
      var field = this.field(selector);
      assert(field && field.tagName === 'INPUT' && field.type === 'file', 'No file INPUT matching \'' + selector + '\'');

      if (filename) {
        var stat = File.statSync(filename);
        var file = new this.window.File();
        file.name = Path.basename(filename);
        file.type = Mime.lookup(filename);
        file.size = stat.size;

        field.value = filename;
        field.files = field.files || [];
        field.files.push(file);
      }
      field.focus();
      this.fire(field, 'change', false);
      return this;
    }

    // browser.button(selector) : Element
    //
    // Finds a button using CSS selector, button name or button text (`BUTTON` or `INPUT` element).
    //
    // selector - CSS selector, button name or text of BUTTON element
  }, {
    key: 'button',
    value: function button(selector) {
      assert(this.document && this.document.documentElement, 'No open window with an HTML document');
      // If the button has already been queried, return itself
      if (selector instanceof DOM.Element) return selector;

      try {
        var button = this.querySelector(selector);
        if (button && (button.tagName === 'BUTTON' || button.tagName === 'INPUT')) return button;
      } catch (error) {}
      var _iteratorNormalCompletion9 = true;
      var _didIteratorError9 = false;
      var _iteratorError9 = undefined;

      try {
        for (var _iterator9 = _getIterator(_Array$from(this.querySelectorAll('button'))), _step9; !(_iteratorNormalCompletion9 = (_step9 = _iterator9.next()).done); _iteratorNormalCompletion9 = true) {
          var elem = _step9.value;

          if (elem.textContent.trim() === selector) return elem;
        }
      } catch (err) {
        _didIteratorError9 = true;
        _iteratorError9 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion9 && _iterator9['return']) {
            _iterator9['return']();
          }
        } finally {
          if (_didIteratorError9) {
            throw _iteratorError9;
          }
        }
      }

      var inputs = _Array$from(this.querySelectorAll('input[type=submit],button'));
      var _iteratorNormalCompletion10 = true;
      var _didIteratorError10 = false;
      var _iteratorError10 = undefined;

      try {
        for (var _iterator10 = _getIterator(inputs), _step10; !(_iteratorNormalCompletion10 = (_step10 = _iterator10.next()).done); _iteratorNormalCompletion10 = true) {
          var input = _step10.value;

          if (input.name === selector) return input;
        }
      } catch (err) {
        _didIteratorError10 = true;
        _iteratorError10 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion10 && _iterator10['return']) {
            _iterator10['return']();
          }
        } finally {
          if (_didIteratorError10) {
            throw _iteratorError10;
          }
        }
      }

      var _iteratorNormalCompletion11 = true;
      var _didIteratorError11 = false;
      var _iteratorError11 = undefined;

      try {
        for (var _iterator11 = _getIterator(inputs), _step11; !(_iteratorNormalCompletion11 = (_step11 = _iterator11.next()).done); _iteratorNormalCompletion11 = true) {
          var input = _step11.value;

          if (input.value === selector) return input;
        }
      } catch (err) {
        _didIteratorError11 = true;
        _iteratorError11 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion11 && _iterator11['return']) {
            _iterator11['return']();
          }
        } finally {
          if (_didIteratorError11) {
            throw _iteratorError11;
          }
        }
      }

      return null;
    }

    // browser.pressButton(selector, callback)
    //
    // Press a button (button element or input of type `submit`).  Typically this will submit the form.  Use the callback
    // to wait for the from submission, page to load and all events run their course.
    //
    // selector - CSS selector, button name or text of BUTTON element
    // callback - Called with two arguments: null and browser
  }, {
    key: 'pressButton',
    value: function pressButton(selector, callback) {
      var button = this.button(selector);
      assert(button, 'No BUTTON \'' + selector + '\'');
      assert(!button.disabled, 'This button is disabled');
      button.focus();
      return this.fire(button, 'click', callback);
    }

    // -- Cookies --

    // Returns cookie that best matches the identifier.
    //
    // identifier - Identifies which cookie to return
    // allProperties - If true, return all cookie properties, other just the value
    //
    // Identifier is either the cookie name, in which case the cookie domain is
    // determined from the currently open Web page, and the cookie path is "/".
    //
    // Or the identifier can be an object specifying:
    // name   - The cookie name
    // domain - The cookie domain (defaults to hostname of currently open page)
    // path   - The cookie path (defaults to "/")
    //
    // Returns cookie value, or cookie object (see setCookie).
  }, {
    key: 'getCookie',
    value: function getCookie(identifier, allProperties) {
      identifier = this._cookieIdentifier(identifier);
      assert(identifier.name, 'Missing cookie name');
      assert(identifier.domain, 'No domain specified and no open page');

      var cookie = this.cookies.select(identifier)[0];
      return cookie ? allProperties ? this._cookieProperties(cookie) : cookie.value : null;
    }

    // Deletes cookie that best matches the identifier.
    //
    // identifier - Identifies which cookie to return
    //
    // Identifier is either the cookie name, in which case the cookie domain is
    // determined from the currently open Web page, and the cookie path is "/".
    //
    // Or the identifier can be an object specifying:
    // name   - The cookie name
    // domain - The cookie domain (defaults to hostname of currently open page)
    // path   - The cookie path (defaults to "/")
    //
    // Returns true if cookie delete.
  }, {
    key: 'deleteCookie',
    value: function deleteCookie(identifier) {
      identifier = this._cookieIdentifier(identifier);
      assert(identifier.name, 'Missing cookie name');
      assert(identifier.domain, 'No domain specified and no open page');

      var cookie = this.cookies.select(identifier)[0];
      if (cookie) this.cookies['delete'](cookie);
      return !!cookie;
    }

    // Sets a cookie.
    //
    // You can call this function with two arguments to set a session cookie: the
    // cookie value and cookie name.  The domain is determined from the current
    // page URL, and the path is always "/".
    //
    // Or you can call it with a single argument, with all cookie options:
    // name     - Name of the cookie
    // value    - Value of the cookie
    // domain   - The cookie domain (e.g example.com, .example.com)
    // path     - The cookie path
    // expires  - Time when cookie expires
    // maxAge   - How long before cookie expires
    // secure   - True for HTTPS only cookie
    // httpOnly - True if cookie not accessible from JS
  }, {
    key: 'setCookie',
    value: function setCookie(nameOrOptions, value) {
      var domain = this.location && this.location.hostname;
      if (typeof nameOrOptions === 'string') this.cookies.set({
        name: nameOrOptions,
        value: value || '',
        domain: domain,
        path: '/',
        secure: false,
        httpOnly: false
      });else {
        assert(nameOrOptions.name, 'Missing cookie name');
        this.cookies.set({
          name: nameOrOptions.name,
          value: nameOrOptions.value || value || '',
          domain: nameOrOptions.domain || domain,
          path: nameOrOptions.path || '/',
          secure: !!nameOrOptions.secure,
          httpOnly: !!nameOrOptions.httpOnly,
          expires: nameOrOptions.expires,
          'max-age': nameOrOptions['max-age']
        });
      }
    }

    // Deletes all cookies.
  }, {
    key: 'deleteCookies',
    value: function deleteCookies() {
      this.cookies.deleteAll();
    }

    // Save cookies to a text string.  You can use this to load them back
    // later on using `Browser.loadCookies`.
  }, {
    key: 'saveCookies',
    value: function saveCookies() {
      var serialized = ['# Saved on ' + new Date().toISOString()];
      var _iteratorNormalCompletion12 = true;
      var _didIteratorError12 = false;
      var _iteratorError12 = undefined;

      try {
        for (var _iterator12 = _getIterator(this.cookies.sort(Tough.cookieCompare)), _step12; !(_iteratorNormalCompletion12 = (_step12 = _iterator12.next()).done); _iteratorNormalCompletion12 = true) {
          var cookie = _step12.value;

          serialized.push(cookie.toString());
        }
      } catch (err) {
        _didIteratorError12 = true;
        _iteratorError12 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion12 && _iterator12['return']) {
            _iterator12['return']();
          }
        } finally {
          if (_didIteratorError12) {
            throw _iteratorError12;
          }
        }
      }

      return serialized.join('\n') + '\n';
    }

    // Load cookies from a text string (e.g. previously created using
    // `Browser.saveCookies`.
  }, {
    key: 'loadCookies',
    value: function loadCookies(serialized) {
      var _iteratorNormalCompletion13 = true;
      var _didIteratorError13 = false;
      var _iteratorError13 = undefined;

      try {
        for (var _iterator13 = _getIterator(serialized.split(/\n+/)), _step13; !(_iteratorNormalCompletion13 = (_step13 = _iterator13.next()).done); _iteratorNormalCompletion13 = true) {
          var line = _step13.value;

          line = line.trim();
          if (line && line[0] !== '#') this.cookies.push(Cookie.parse(line));
        }
      } catch (err) {
        _didIteratorError13 = true;
        _iteratorError13 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion13 && _iterator13['return']) {
            _iterator13['return']();
          }
        } finally {
          if (_didIteratorError13) {
            throw _iteratorError13;
          }
        }
      }
    }

    // Converts Tough Cookie object into Zombie cookie representation.
  }, {
    key: '_cookieProperties',
    value: function _cookieProperties(cookie) {
      var properties = {
        name: cookie.key,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path
      };
      if (cookie.secure) properties.secure = true;
      if (cookie.httpOnly) properties.httpOnly = true;
      if (cookie.expires && cookie.expires < Infinity) properties.expires = cookie.expires;
      return properties;
    }

    // Converts cookie name/identifier into an identifier object.
  }, {
    key: '_cookieIdentifier',
    value: function _cookieIdentifier(identifier) {
      var location = this.location;
      var domain = location && location.hostname;
      var path = location && location.pathname || '/';
      return {
        name: identifier.name || identifier,
        domain: identifier.domain || domain,
        path: identifier.path || path
      };
    }

    // -- Local/Session Storage --

    // Returns local Storage based on the document origin (hostname/port). This is the same storage area you can access
    // from any document of that origin.
  }, {
    key: 'localStorage',
    value: function localStorage(host) {
      return this._storages.local(host);
    }

    // Returns session Storage based on the document origin (hostname/port). This is the same storage area you can access
    // from any document of that origin.
  }, {
    key: 'sessionStorage',
    value: function sessionStorage(host) {
      return this._storages.session(host);
    }

    // Save local/session storage to a text string.  You can use this to load the data later on using
    // `browser.loadStorage`.
  }, {
    key: 'saveStorage',
    value: function saveStorage() {
      return this._storages.save();
    }

    // Load local/session storage from a text string (e.g. previously created using `browser.saveStorage`.
  }, {
    key: 'loadStorage',
    value: function loadStorage(serialized) {
      this._storages.load(serialized);
    }

    // Scripts
    // -------

    // Evaluates a JavaScript expression in the context of the current window and returns the result.  When evaluating
    // external script, also include filename.
    //
    // You can also use this to evaluate a function in the context of the window: for timers and asynchronous callbacks
    // (e.g. XHR).
  }, {
    key: 'evaluate',
    value: function evaluate(code, filename) {
      if (!this.window) this.open();
      return this.window._evaluate(code, filename);
    }

    // Resources
    // ---------

  }, {
    key: 'fetch',
    value: function fetch(input, init) {
      return this.pipeline._fetch(input, init);
    }

    // Returns all resources loaded by currently open window.
  }, {
    key: 'debug',

    // Debugging
    // ---------

    // Enable debugging.  You can do this in code instead of setting DEBUG environment variable.
    value: function debug() {
      this._debug = Browser._enableDebugging();
    }

    // Zombie can spit out messages to help you figure out what's going on as your code executes.
    //
    // To spit a message to the console when running in debug mode, call this method with one or more values (same as
    // `console.log`).  You can also call it with a function that will be evaluated only when running in debug mode.
    //
    // For example:
    //     browser.log('Opening page:', url);
    //     browser.log(function() { return 'Opening page: ' + url });
  }, {
    key: 'log',
    value: function log() {
      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      if (typeof args[0] === 'function') args = [args[0]()];
      this.emit('log', format.apply(undefined, _toConsumableArray(args)));
    }

    // Dump information to the console: Zombie version, current URL, history, cookies, event loop, etc.  Useful for
    // debugging and submitting error reports.
  }, {
    key: 'dump',
    value: function dump() {
      var output = arguments.length <= 0 || arguments[0] === undefined ? process.stdout : arguments[0];

      function indent(lines) {
        return lines.map(function (line) {
          return '  ' + line + '\n';
        }).join('');
      }
      output.write('Zombie: ' + Browser.VERSION + '\n');
      output.write('URL:    ' + this.window.location.href + '\n');
      output.write('\nHistory:\n');
      this.history.dump(output);
      output.write('\nCookies:\n');
      this.cookies.dump(output);
      output.write('\nStorage:\n');

      if (this.document) {
        var html = this.html();
        var slice = html.length > 497 ? html.slice(0, 497) + '...' : html;
        output.write('Document:\n' + indent(slice.split('\n')) + '\n');
      } else output.write('No document\n');

      output.write('\n');
      this._eventLoop.dump(output);
    }

    // -- Static methods ---

    // ### zombie.visit(url, callback)
    // ### zombie.visit(url, options? callback)
    //
    // Creates a new Browser, opens window to the URL and calls the callback when
    // done processing all events.
    //
    // * url -- URL of page to open
    // * callback -- Called with error, browser
  }, {
    key: 'window',
    get: function get() {
      return this.tabs.current;
    }
  }, {
    key: 'error',
    get: function get() {
      return this.errors[this.errors.length - 1];
    }
  }, {
    key: 'document',
    get: function get() {
      return this.window && this.window.document;
    }

    // browser.body => Element
    //
    // Returns the body Element of the current document.
  }, {
    key: 'body',
    get: function get() {
      return this.querySelector('body');
    }

    // Element that has the current focus.
  }, {
    key: 'activeElement',
    get: function get() {
      return this.document && this.document.activeElement;
    }
  }, {
    key: 'location',
    get: function get() {
      return this.window && this.window.location;
    },

    // browser.location = url
    //
    // Changes document location, loads new document if necessary (same as setting `window.location`).
    set: function set(url) {
      if (this.window) this.window.location = url;else this.open({ url: url });
    }

    // browser.url => String
    //
    // Return the URL of the current document (same as `document.URL`).
  }, {
    key: 'url',
    get: function get() {
      return this.window && this.window.location.href;
    }
  }, {
    key: 'history',
    get: function get() {
      if (!this.window) this.open();
      return this.window.history;
    }
  }, {
    key: 'resources',
    get: function get() {
      return this.window && this.window.resources;
    }

    // Get Request associated with currently open window
  }, {
    key: 'request',
    get: function get() {
      return this.window && this.window._request || null;
    }

    // Get Response associated with currently open window
  }, {
    key: 'response',
    get: function get() {
      return this.window && this.window._response || null;
    }

    // Get the status code of the response associated with this window
  }, {
    key: 'status',
    get: function get() {
      var response = this.response;

      return response ? response.status : 0;
    }
  }, {
    key: 'statusCode',
    get: function get() {
      return this.status;
    }

    // Return true if last response had status code 200 .. 299
  }, {
    key: 'success',
    get: function get() {
      var status = this.status;

      return status >= 200 && status < 300;
    }

    // Returns true if the last response followed a redirect
  }, {
    key: 'redirected',
    get: function get() {
      var request = this.request;

      return request ? request._redirectCount > 0 : false;
    }

    // Get the source HTML for the last response
  }, {
    key: 'source',
    get: function get() {
      var response = this.response;

      return response ? response.body : null;
    }
  }], [{
    key: 'visit',
    value: function visit(url, options, callback) {
      if (arguments.length === 2 && typeof options === 'function') {
        ;
        var _ref5 = [null, options];
        options = _ref5[0];
        callback = _ref5[1];
      }var browser = new Browser(options);
      if (callback) browser.visit(url, function (error) {
        return callback(error, browser);
      });else return browser.visit(url).then(function () {
        return browser;
      });
    }

    // Allows you to make requests against a named domain and HTTP/S port, and
    // will route it to the test server running on localhost and unprivileged
    // port.
  }, {
    key: 'localhost',
    value: function localhost(source, target) {
      reroute(source, target);
      if (!this.site) {
        var _source$split = source.split(':');

        var _source$split2 = _slicedToArray(_source$split, 1);

        var hostname = _source$split2[0];

        this.site = hostname.replace(/^\*\./, '');
      }
    }

    // Register a browser extension.
    //
    // Browser extensions are called for each newly created browser object, and
    // can be used to change browser options, register listeners, add methods,
    // etc.
  }, {
    key: 'extend',
    value: function extend(extension) {
      this._extensions.push(extension);
    }

    // Call this to return a debug() instance with debugging enabled.
  }, {
    key: '_enableDebugging',
    value: function _enableDebugging() {
      // With debugging enabled, every time we call debug('zombie') we get a new
      // instance which outputs with a different color.  This can be confusing, so
      // if debugging is already enabled (DEBUG=zombie) we want to use the current
      // instance.  Otherwise, we want to create a new instance (_debugEnabled)
      // and reuse it every time someone calls browser.debug().
      if (this._debug.enabled) return this._debug.enabled;

      if (!this._debugEnabled) {
        debug.enable('zombie');
        this._debugEnabled = debug('zombie');
      }
      return this._debugEnabled;
    }

    // -- Static properties --

  }, {
    key: 'VERSION',
    value: VERSION,
    enumerable: true
  }, {
    key: 'Assert',
    value: Assert,
    enumerable: true
  }, {
    key: 'Pipeline',
    value: Pipeline,
    enumerable: true
  }, {
    key: 'Headers',
    value: Fetch.Headers,
    enumerable: true
  }, {
    key: 'Request',
    value: Fetch.Request,
    enumerable: true
  }, {
    key: 'Response',
    value: Fetch.Response,

    // -- These defaults are used in any new browser instance --

    // Which features are enabled.
    enumerable: true
  }, {
    key: 'features',
    value: DEFAULT_FEATURES,

    // Proxy URL.
    //
    // Example
    //   Browser.proxy = 'http://myproxy:8080'
    enumerable: true
  }, {
    key: 'proxy',
    value: null,

    // If true, suppress `console.log` output from scripts (ignored when DEBUG=zombie)
    enumerable: true
  }, {
    key: 'silent',
    value: false,

    // You can use visit with a path, and it will make a request relative to this host/URL.
    enumerable: true
  }, {
    key: 'site',
    value: null,

    // Check SSL certificates against CA.  False by default since you're likely
    // testing with a self-signed certificate.
    enumerable: true
  }, {
    key: 'strictSSL',
    value: false,

    // Sets the outgoing IP address in case there is more than on available.
    // Defaults to 0.0.0.0 which should select default interface
    enumerable: true
  }, {
    key: 'localAddress',
    value: '0.0.0.0',

    // User agent string sent to server.
    enumerable: true
  }, {
    key: 'userAgent',
    value: 'Mozilla/5.0 Chrome/10.0.613.0 Safari/534.15 Zombie.js/' + VERSION,

    // Navigator language code
    enumerable: true
  }, {
    key: 'language',
    value: 'en-US',

    // Default time to wait (visit, wait, etc).
    enumerable: true
  }, {
    key: 'waitDuration',
    value: '5s',

    // Indicates whether or not to validate and execute JavaScript, default true.
    enumerable: true
  }, {
    key: 'runScripts',
    value: true,

    // -- Internal properties --

    // Debug instance.  Create new instance when enabling debugging with Zombie.debug
    enumerable: true
  }, {
    key: '_debug',
    value: debug('zombie'),

    // Set after calling _enableDebugging
    enumerable: true
  }, {
    key: '_debugEnabled',
    value: null,

    // Browser extensions;
    enumerable: true
  }, {
    key: '_extensions',
    value: [],
    enumerable: true
  }]);

  return Browser;
})(EventEmitter);

module.exports = Browser;
//# sourceMappingURL=index.js.map
