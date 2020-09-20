// Tab management.

'use strict';

var _get = require('babel-runtime/helpers/get')['default'];

var _inherits = require('babel-runtime/helpers/inherits')['default'];

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _getIterator = require('babel-runtime/core-js/get-iterator')['default'];

var _ = require('lodash');
var createHistory = require('./history');

module.exports = (function (_Array) {
  _inherits(Tabs, _Array);

  function Tabs(browser) {
    _classCallCheck(this, Tabs);

    _get(Object.getPrototypeOf(Tabs.prototype), 'constructor', this).call(this);
    this._current = null;
    this._browser = browser;
    this.length = 0;
    Object.defineProperty(this, 'length', { enumerable: false, writable: true });
    Object.defineProperty(this, '_browser', { enumerable: false, writable: true });
    Object.defineProperty(this, '_current', { enumerable: false, writable: true });
  }

  // Get the currently open tab

  _createClass(Tabs, [{
    key: 'find',

    // Returns window by index or name. Use this for window names that shadow
    // existing properties (e.g. tabs['open'] is a function, use
    value: function find(nameOrWindow) {
      if (this.propertyIsEnumerable(nameOrWindow)) return this[nameOrWindow];
      var byName = _.find(this, { name: nameOrWindow });
      if (byName) return byName;
      if (this._indexOf(nameOrWindow) >= 0) return nameOrWindow;
      return null;
    }

    // Index of currently selected tab.
  }, {
    key: 'open',

    // Opens and returns a tab.  If an open window by the same name already exists,
    // opens this window in the same tab.  Omit name or use '_blank' to always open
    // a new tab.
    //
    // name    - Window name (optional)
    // opener  - Opening window (window.open call)
    // referer - Referrer
    // url     - Set document location to this URL upon opening
    // html    - Document contents (browser.load)
    value: function open() {
      var _this = this;

      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

      // If name window in open tab, reuse that tab. Otherwise, open new window.
      var named = options.name && this.find(options.name.toString());
      if (named) {
        // Select this as the currently open tab. Changing the location would then
        // select a different window.
        this._current = named;
        if (options.url) this._current.location = options.url;
        return this._current;
      }

      // When window changes we need to change tab slot. We can't keep the index
      // around, since tab order changes, so we look up the currently known
      // active window and switch that around.
      var active = null;
      var open = createHistory(this._browser, function (window) {
        // Focus changes to different window, make it the active window
        if (!Tabs.sameWindow(window, active)) {
          var index = _this._indexOf(active);
          if (index >= 0) _this[index] = window;
          _this.current = active = window;
        }
        if (window) _this._browser._eventLoop.setActiveWindow(window);
      });

      var name = options.name === '_blank' ? '' : options.name || '';
      options.name = name;
      var window = open(options);
      this.push(window);
      if (name && (this.propertyIsEnumerable(name) || !this[name])) this[name] = window;
      // Select this as the currently open tab
      this.current = active = window;
      return window;
    }

    // Close an open tab.
    //
    // With no argument, closes the currently open tab (tabs.current).
    //
    // Argument can be the window, window name or tab position (same as find).
  }, {
    key: 'close',
    value: function close(nameOrWindow) {
      var window = nameOrWindow ? this.find(nameOrWindow) : this._current;
      if (this._indexOf(window) >= 0) window.close();
    }

    // Closes all open tabs/windows.
  }, {
    key: 'closeAll',
    value: function closeAll() {
      var tabs = this.slice();
      this._current = null;
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = _getIterator(tabs), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var tab = _step.value;

          tab.close();
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

    // Dump list of all open tabs to stdout or output stream.
  }, {
    key: 'dump',
    value: function dump() {
      var output = arguments.length <= 0 || arguments[0] === undefined ? process.stdout : arguments[0];

      if (this.length === 0) {
        output.write('No open tabs.\n');
        return;
      }
      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = _getIterator(this), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var tab = _step2.value;

          output.write('Window ' + (tab.name || 'unnamed') + ' open to ' + tab.location.href + '\n');
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

    // Find the position of this window in the tabs array
  }, {
    key: '_indexOf',
    value: function _indexOf(window) {
      if (!window) return -1;
      return this.slice().map(function (tab) {
        return tab._globalProxy;
      }).indexOf(window._globalProxy);
    }

    // Called when window closed to remove it from tabs list.
  }, {
    key: '_closed',
    value: function _closed(window) {
      var index = this._indexOf(window);
      if (index >= 0) {
        this._browser.emit('inactive', window);

        this.splice(index, 1);
        if (this.propertyIsEnumerable(window.name)) delete this[window.name];

        // If we closed the currently open tab, need to select another window.
        if (Tabs.sameWindow(window, this._current)) {
          // Don't emit inactive event for closed window.
          this._current = this[index - 1] || this[0];
          if (this._current) this._browser.emit('active', this._current);
        }
      }
    }

    // Determine if two windows are the same
  }, {
    key: 'current',
    get: function get() {
      return this._current;
    },

    // Sets the currently open tab
    // - Name   - Pick existing window with this name
    // - Number - Pick existing window from tab position
    // - Window - Use this window
    set: function set(nameOrWindow) {
      var window = this.find(nameOrWindow);
      if (this._indexOf(window) < 0) return;
      if (!Tabs.sameWindow(this._current, window)) {
        if (this._current) this._browser.emit('inactive', this._current);
        this._current = window;
        this._browser.emit('active', this._current);
      }
    }
  }, {
    key: 'index',
    get: function get() {
      return this._indexOf(this._current);
    }
  }], [{
    key: 'sameWindow',
    value: function sameWindow(a, b) {
      return a && b && a._globalProxy === b._globalProxy;
    }
  }]);

  return Tabs;
})(Array);
//# sourceMappingURL=tabs.js.map
