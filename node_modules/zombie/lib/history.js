// Window history.
//
// Each window belongs to a history. Think of history as a timeline, with
// currently active window, and multiple previous and future windows. From that
// window you can navigate backwards and forwards between all other windows that
// belong to the same history.
//
// Each window also has a container: either a browser tab or an iframe. When
// navigating in history, a different window (from the same history), replaces
// the current window within its container.
//
// Containers have access to the currently active window, not the history
// itself, so navigation has to alert the container when there's a change in the
// currently active window.
//
// The history does so by calling a "focus" function. To create the first
// window, the container must first create a new history and supply a focus
// function. The result is another function it can use to create the new window.
//
// From there on, it can navigate in history and add new windows by changing the
// current location (or using assign/replace).
//
// It can be used like this:
//
//   active = null
//   focus = (window)->
//     active = window
//   history = createHistory(browser, focus)
//   window = history(url: url, name: name)

'use strict';

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _slicedToArray = require('babel-runtime/helpers/sliced-to-array')['default'];

var _Object$assign = require('babel-runtime/core-js/object/assign')['default'];

var assert = require('assert');
var loadDocument = require('./document');
var resourceLoader = require('jsdom/lib/jsdom/browser/resource-loader');
var URL = require('url');

var Location = (function () {
  function Location(history, url) {
    _classCallCheck(this, Location);

    this._history = history;
    this._url = url || (history.current ? history.current.url : 'about:blank');
  }

  // Returns true if the hash portion of the URL changed between the history entry
  // (entry) and the new URL we want to inspect (url).

  _createClass(Location, [{
    key: 'assign',
    value: function assign(url) {
      this._history.assign(url);
    }
  }, {
    key: 'replace',
    value: function replace(url) {
      this._history.replace(url);
    }
  }, {
    key: 'reload',
    value: function reload() {
      this._history.reload();
    }
  }, {
    key: 'toString',
    value: function toString() {
      return this._url;
    }
  }, {
    key: 'hostname',
    get: function get() {
      return URL.parse(this._url).hostname;
    },
    set: function set(hostname) {
      var newUrl = URL.parse(this._url);
      if (newUrl.port) newUrl.host = hostname + ':' + newUrl.port;else newUrl.host = hostname;
      this.assign(URL.format(newUrl));
    }
  }, {
    key: 'href',
    get: function get() {
      return this._url;
    },
    set: function set(href) {
      this.assign(URL.format(href));
    }
  }, {
    key: 'origin',
    get: function get() {
      return this.protocol + '//' + this.host;
    }
  }, {
    key: 'hash',
    get: function get() {
      return URL.parse(this._url).hash || '';
    },
    set: function set(value) {
      var url = _Object$assign(URL.parse(this._url), { hash: value });
      this.assign(URL.format(url));
    }
  }, {
    key: 'host',
    get: function get() {
      return URL.parse(this._url).host || '';
    },
    set: function set(value) {
      var url = _Object$assign(URL.parse(this._url), { host: value });
      this.assign(URL.format(url));
    }
  }, {
    key: 'pathname',
    get: function get() {
      return URL.parse(this._url).pathname || '';
    },
    set: function set(value) {
      var url = _Object$assign(URL.parse(this._url), { pathname: value });
      this.assign(URL.format(url));
    }
  }, {
    key: 'port',
    get: function get() {
      return URL.parse(this._url).port || '';
    },
    set: function set(value) {
      var url = _Object$assign(URL.parse(this._url), { port: value });
      this.assign(URL.format(url));
    }
  }, {
    key: 'protocol',
    get: function get() {
      return URL.parse(this._url).protocol || '';
    },
    set: function set(value) {
      var url = _Object$assign(URL.parse(this._url), { protocol: value });
      this.assign(URL.format(url));
    }
  }, {
    key: 'search',
    get: function get() {
      return URL.parse(this._url).search || '';
    },
    set: function set(value) {
      var url = _Object$assign(URL.parse(this._url), { search: value });
      this.assign(URL.format(url));
    }
  }]);

  return Location;
})();

function hashChange(entry, url) {
  if (!entry) return false;

  var _url$split = url.split('#');

  var _url$split2 = _slicedToArray(_url$split, 2);

  var aBase = _url$split2[0];
  var aHash = _url$split2[1];

  var _entry$url$split = entry.url.split('#');

  var _entry$url$split2 = _slicedToArray(_entry$url$split, 2);

  var bBase = _entry$url$split2[0];
  var bHash = _entry$url$split2[1];

  return aBase === bBase && aHash !== bHash;
}

// If window is not the top level window, return parent for creating new child
// window, otherwise returns false.
function parentFrom(window) {
  if (window.parent !== window) return window.parent;
}

// Entry has the following properties:
// window      - Window for this history entry (may be shared with other entries)
// url         - URL for this history entry
// pushState   - Push state state
// next        - Next entry in history
// prev        - Previous entry in history

var Entry = (function () {
  function Entry(window, url, pushState) {
    _classCallCheck(this, Entry);

    this.window = window;
    this.url = URL.format(url);
    this.pushState = pushState;
    this.prev = null;
    this.next = null;
  }

  // Called to destroy this entry. Used when we destroy the entire history,
  // closing all windows. But also used when we replace one entry with another,
  // and there are two cases to worry about:
  // - The current entry uses the same window as the previous entry, we get rid
  //   of the entry, but must keep the entry intact
  // - The current entry uses the same window as the new entry, also need to
  //   keep window intact
  //
  // keepAlive - Call destroy on every document except this one, since it's
  //             being replaced.

  _createClass(Entry, [{
    key: 'destroy',
    value: function destroy(keepAlive) {
      if (this.next) {
        this.next.destroy(keepAlive || this.window);
        this.next = null;
      }
      // Do not close window if replacing entry with same window
      if (keepAlive === this.window) return;
      // Do not close window if used by previous entry in history
      if (this.prev && this.prev.window === this.window) return;
      this.window._destroy();
    }
  }, {
    key: 'append',
    value: function append(newEntry, keepAlive) {
      if (this.next) this.next.destroy(keepAlive);
      newEntry.prev = this;
      this.next = newEntry;
    }
  }]);

  return Entry;
})();

var History = (function () {
  function History(browser, focus) {
    _classCallCheck(this, History);

    this.browser = browser;
    this.focus = focus;
    this.first = null;
    this.current = null;
  }

  // Creates and returns a new history.
  //
  // browser - The browser object
  // focus   - The focus method, called when a new window is in focus
  //
  // Returns a function for opening a new window, which accepts:
  // name      - Window name (optional)
  // opener    - Opening window (window.open call)
  // parent    - Parent window (for frames)
  // url       - Set document location to this URL upon opening

  // Opens the first window and returns it.

  _createClass(History, [{
    key: 'open',
    value: function open(args) {
      args.browser = this.browser;
      args.history = this;
      var document = loadDocument(args);
      var window = document.defaultView;
      this.addEntry(window, args.url);
      return window;
    }

    // Dispose of all windows in history
  }, {
    key: 'destroy',
    value: function destroy() {
      this.focus(null);
      // Re-entrant
      var first = this.first;
      this.first = null;
      this.current = null;
      if (first) first.destroy();
    }

    // Add a new entry.  When a window opens it call this to add itself to history.
  }, {
    key: 'addEntry',
    value: function addEntry(window) {
      var url = arguments.length <= 1 || arguments[1] === undefined ? window.location.href : arguments[1];
      var pushState = arguments.length <= 2 || arguments[2] === undefined ? undefined : arguments[2];
      return (function () {
        var entry = new Entry(window, url, pushState);
        if (this.current) {
          this.current.append(entry);
          this.current = entry;
        } else {
          this.first = entry;
          this.current = entry;
        }
        this.focus(window);
      }).apply(this, arguments);
    }

    // Replace current entry with a new one.
  }, {
    key: 'replaceEntry',
    value: function replaceEntry(window) {
      var url = arguments.length <= 1 || arguments[1] === undefined ? window.location.href : arguments[1];
      var pushState = arguments.length <= 2 || arguments[2] === undefined ? undefined : arguments[2];
      return (function () {
        var entry = new Entry(window, url, pushState);
        if (this.current === this.first) {
          if (this.current) this.current.destroy(window);
          this.first = entry;
          this.current = entry;
        } else {
          this.current.prev.append(entry, window);
          this.current = entry;
        }
        this.focus(window);
      }).apply(this, arguments);
    }

    // Call with two argument to update window.location and current.url to new URL
  }, {
    key: 'updateLocation',
    value: function updateLocation(window, url) {
      if (window === this.current) this.current.url = url;
      window.document._URL = url;
      window.document._location = new Location(this, url);
    }

    // Returns window.location
  }, {
    key: 'submit',

    // Form submission
    value: function submit(args) {
      args.browser = this.browser;
      args.history = this;
      var window = this.current.window;

      if (window) {
        args.name = window.name;
        args.parent = parentFrom(window);
        args.referrer = window.location.href;
      }
      var document = loadDocument(args);
      this.addEntry(document.defaultView, document.location.href);
    }

    // Returns current URL.
  }, {
    key: 'assign',

    // -- Implementation of window.history --

    // This method is available from Location, used to navigate to a new page.
    value: function assign(url) {
      var _this = this;

      var name = '';
      var parent = null;

      if (this.current) {
        url = resourceLoader.resolveResourceUrl(this.current.window.document, url);
        name = this.current.window.name;
        parent = parentFrom(this.current.window);
      }
      if (this.current && this.current.url === url) {
        this.replace(url);
        return;
      }

      if (hashChange(this.current, url)) {
        (function () {
          var window = _this.current.window;

          _this.updateLocation(window, url);
          _this.addEntry(window, url); // Reuse window with new URL
          var event = window.document.createEvent('HTMLEvents');
          event.initEvent('hashchange', true, false);
          window._eventQueue.enqueue(function () {
            window.dispatchEvent(event);
          });
        })();
      } else {
        var args = {
          browser: this.browser,
          history: this,
          name: name,
          url: url,
          parent: parent,
          referrer: this.current && this.current.window.document.referrer
        };
        var _document = loadDocument(args);
        this.addEntry(_document.defaultView, url);
      }
    }

    // This method is available from Location, used to navigate to a new page.
  }, {
    key: 'replace',
    value: function replace(url) {
      var _this2 = this;

      url = URL.format(url);
      var name = '';

      if (this.current) {
        url = resourceLoader.resolveResourceUrl(this.current.window.document, url);
        name = this.current.window.name;
      }

      if (hashChange(this.current, url)) {
        (function () {
          var window = _this2.current.window;

          _this2.replaceEntry(window, url); // Reuse window with new URL
          var event = window.document.createEvent('HTMLEvents');
          event.initEvent('hashchange', true, false);
          window._eventQueue.enqueue(function () {
            window.dispatchEvent(event);
          });
        })();
      } else {
        var args = {
          browser: this.browser,
          history: this,
          name: name,
          url: url,
          parent: parentFrom(this.current.window)
        };
        var _document2 = loadDocument(args);
        this.replaceEntry(_document2.defaultView, url);
      }
    }
  }, {
    key: 'reload',
    value: function reload() {
      var window = this.current.window;

      if (window) {
        var url = window.location.href;
        var args = {
          browser: this.browser,
          history: this,
          name: window.name,
          url: url,
          parent: parentFrom(window),
          referrer: window.document.referrer
        };
        var _document3 = loadDocument(args);
        this.replaceEntry(_document3.defaultView, url);
      }
    }

    // This method is available from Location.
  }, {
    key: 'go',
    value: function go(amount) {
      var _this3 = this;

      var was = this.current;
      while (amount > 0) {
        if (this.current.next) this.current = this.current.next;
        --amount;
      }
      while (amount < 0) {
        if (this.current.prev) this.current = this.current.prev;
        ++amount;
      }

      // If moving from one page to another
      if (this.current && was && this.current !== was) {
        (function () {
          var window = _this3.current.window;

          _this3.updateLocation(window, _this3.current.url);
          _this3.focus(window);

          if (_this3.current.pushState || was.pushState) {
            // Created with pushState/replaceState, send popstate event if navigating
            // within same host.
            var oldHost = URL.parse(was.url).host;
            var newHost = URL.parse(_this3.current.url).host;
            if (oldHost === newHost) {
              (function () {
                var popstate = window.document.createEvent('HTMLEvents');
                popstate.initEvent('popstate', false, false);
                popstate.state = _this3.current.pushState;
                window._eventQueue.enqueue(function () {
                  window.dispatchEvent(popstate);
                });
              })();
            }
          } else if (hashChange(was, _this3.current.url)) {
            (function () {
              var hashchange = window.document.createEvent('HTMLEvents');
              hashchange.initEvent('hashchange', true, false);
              window._eventQueue.enqueue(function () {
                window.dispatchEvent(hashchange);
              });
            })();
          }
        })();
      }
    }

    // This method is available from Location.
  }, {
    key: 'pushState',

    // This method is available from Location.
    value: function pushState(state, title) {
      var url = arguments.length <= 2 || arguments[2] === undefined ? this.url : arguments[2];

      url = resourceLoader.resolveResourceUrl(this.current.window.document, url);
      // TODO: check same origin
      this.addEntry(this.current.window, url, state || {});
      this.updateLocation(this.current.window, url);
    }

    // This method is available from Location.
  }, {
    key: 'replaceState',
    value: function replaceState(state, title) {
      var url = arguments.length <= 2 || arguments[2] === undefined ? this.url : arguments[2];

      url = resourceLoader.resolveResourceUrl(this.current.window.document, url);
      // TODO: check same origin
      this.replaceEntry(this.current.window, url, state || {});
      this.updateLocation(this.current.window, url);
    }

    // This method is available from Location.
  }, {
    key: 'dump',
    value: function dump() {
      var output = arguments.length <= 0 || arguments[0] === undefined ? process.stdout : arguments[0];

      for (var entry = this.first, i = 1; entry; entry = entry.next, ++i) {
        output.write(i + ': ' + URL.format(entry.url) + '\n');
      }
    }
  }, {
    key: 'location',
    get: function get() {
      return new Location(this);
    }
  }, {
    key: 'url',
    get: function get() {
      return this.current && this.current.url;
    }
  }, {
    key: 'length',
    get: function get() {
      var entry = this.first;
      var length = 0;
      while (entry) {
        ++length;
        entry = entry.next;
      }
      return length;
    }
  }, {
    key: 'state',
    get: function get() {
      return this.current.pushState;
    }
  }]);

  return History;
})();

module.exports = function createHistory(browser, focus) {
  assert(browser && browser.visit, 'Missing parameter browser');
  assert(focus && focus.call, 'Missing parameter focus or not a function');
  var history = new History(browser, focus);
  return history.open.bind(history);
};
//# sourceMappingURL=history.js.map
