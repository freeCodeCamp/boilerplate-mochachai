// See [Web Storage](http://dev.w3.org/html5/webstorage/)
'use strict';

var _get = require('babel-runtime/helpers/get')['default'];

var _inherits = require('babel-runtime/helpers/inherits')['default'];

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _slicedToArray = require('babel-runtime/helpers/sliced-to-array')['default'];

var _toConsumableArray = require('babel-runtime/helpers/to-consumable-array')['default'];

var _Map = require('babel-runtime/core-js/map')['default'];

var _getIterator = require('babel-runtime/core-js/get-iterator')['default'];

var _Object$defineProperties = require('babel-runtime/core-js/object/define-properties')['default'];

var DOM = require('./dom');

// Implementation of the StorageEvent.

var StorageEvent = (function (_DOM$Event) {
  _inherits(StorageEvent, _DOM$Event);

  function StorageEvent(storage, url, key, oldValue, newValue) {
    _classCallCheck(this, StorageEvent);

    _get(Object.getPrototypeOf(StorageEvent.prototype), 'constructor', this).call(this, 'storage');
    this._storage = storage;
    this._url = url;
    this._key = key;
    this._oldValue = oldValue;
    this._newValue = newValue;
  }

  // Storage area. The storage area is shared by multiple documents of the same
  // origin. For session storage, they must also share the same browsing context.

  _createClass(StorageEvent, [{
    key: 'url',
    get: function get() {
      return this._url;
    }
  }, {
    key: 'storageArea',
    get: function get() {
      return this._storage;
    }
  }, {
    key: 'key',
    get: function get() {
      return this._key;
    }
  }, {
    key: 'oldValue',
    get: function get() {
      return this._oldValue;
    }
  }, {
    key: 'newValue',
    get: function get() {
      return this._newValue;
    }
  }]);

  return StorageEvent;
})(DOM.Event);

var StorageArea = (function () {
  function StorageArea() {
    _classCallCheck(this, StorageArea);

    this._items = new _Map();
    this._storages = [];
  }

  // Implementation of the Storage interface, used by local and session storage.

  // Fire a storage event. Fire in all documents that share this storage area,
  // except for the source document.

  _createClass(StorageArea, [{
    key: '_fire',
    value: function _fire(source, key, oldValue, newValue) {
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = _getIterator(this._storages), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var _step$value = _slicedToArray(_step.value, 2);

          var storage = _step$value[0];
          var _window = _step$value[1];

          if (storage === source) continue;
          var _event = new StorageEvent(storage, _window.location.href, key, oldValue, newValue);
          _window.dispatchEvent(_event);
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

    // Return number of key/value pairs.
  }, {
    key: 'key',

    // Get key by ordinal position.
    value: function key(index) {
      var iterator = this._items.keys();
      var next = iterator.next();
      for (var i = 0; i < index; ++i) {
        next = iterator.next();
      }return next.value;
    }

    // Get value from key
  }, {
    key: 'get',
    value: function get(key) {
      return this._items.has(key) ? this._items.get(key) : null;
    }

    // Set the value of a key. We also need the source storage (so we don't send
    // it a storage event).
  }, {
    key: 'set',
    value: function set(source, key, value) {
      var oldValue = this._items.get(key);
      this._items.set(key, value);
      this._fire(source, key, oldValue, value);
    }

    // Remove the value at the key. We also need source storage (see set above).
  }, {
    key: 'remove',
    value: function remove(source, key) {
      var oldValue = this._items.get(key);
      this._items['delete'](key);
      this._fire(source, key, oldValue);
    }

    // Remove all values. We also need source storage (see set above).
  }, {
    key: 'clear',
    value: function clear(source) {
      this._items.clear();
      this._fire(source);
    }
  }, {
    key: 'toString',
    value: function toString() {
      return this._items.toString();
    }

    // Associate local/sessionStorage and window with this storage area. Used when firing events.
  }, {
    key: 'associate',
    value: function associate(storage, window) {
      this._storages.push([storage, window]);
    }
  }, {
    key: 'length',
    get: function get() {
      return this._items.size;
    }
  }, {
    key: 'pairs',
    get: function get() {
      return [].concat(_toConsumableArray(this._items));
    }
  }]);

  return StorageArea;
})();

var Storage = (function () {
  function Storage(area) {
    _classCallCheck(this, Storage);

    this._area = area;
  }

  // Combined local/session storage.

  // ### storage.length => Number
  //
  // Returns the number of key/value pairs in this storage.

  _createClass(Storage, [{
    key: 'key',

    // ### storage.key(index) => String
    //
    // Returns the key at this position.
    value: function key(index) {
      return this._area.key(index);
    }

    // ### storage.getItem(key) => Object
    //
    // Returns item by key.
  }, {
    key: 'getItem',
    value: function getItem(key) {
      return this._area.get(key.toString());
    }

    // ### storage.setItem(key, Object)
    //
    // Add item or change value of existing item.
  }, {
    key: 'setItem',
    value: function setItem(key, value) {
      this._area.set(this, key.toString(), value);
    }

    // ### storage.removeItem(key)
    //
    // Remove item.
  }, {
    key: 'removeItem',
    value: function removeItem(key) {
      this._area.remove(this, key.toString());
    }

    // ### storage.clear()
    //
    // Remove all items.
  }, {
    key: 'clear',
    value: function clear() {
      this._area.clear(this);
    }

    // Dump to a string, useful for debugging.
  }, {
    key: 'dump',
    value: function dump() {
      var output = arguments.length <= 0 || arguments[0] === undefined ? process.stdout : arguments[0];

      return this._area.dump(output);
    }
  }, {
    key: 'length',
    get: function get() {
      return this._area.length;
    }
  }]);

  return Storage;
})();

var Storages = (function () {
  function Storages() {
    _classCallCheck(this, Storages);

    this._locals = new _Map();
    this._sessions = new _Map();
  }

  // Return local Storage based on the document origin (hostname/port).

  _createClass(Storages, [{
    key: 'local',
    value: function local(host) {
      if (!this._locals.has(host)) this._locals.set(host, new StorageArea());
      return new Storage(this._locals.get(host));
    }

    // Return session Storage based on the document origin (hostname/port).
  }, {
    key: 'session',
    value: function session(host) {
      if (!this._sessions.has(host)) this._sessions.set(host, new StorageArea());
      return new Storage(this._sessions.get(host));
    }

    // Extend window with local/session storage support.
  }, {
    key: 'extend',
    value: function extend(window) {
      var storages = this;
      window.StorageEvent = StorageEvent;
      _Object$defineProperties(window, {
        localStorage: {
          get: function get() {
            var document = this.document;

            if (!document._localStorage) document._localStorage = storages.local(document.location.host);
            return document._localStorage;
          }
        },

        sessionStorage: {
          get: function get() {
            var document = this.document;

            if (!document._sessionStorage) document._sessionStorage = storages.session(document.location.host);
            return document._sessionStorage;
          }
        }
      });
    }

    // Used to dump state to console (debuggin)
  }, {
    key: 'dump',
    value: function dump() {
      var output = arguments.length <= 0 || arguments[0] === undefined ? process.stdout : arguments[0];
      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = _getIterator(this._locals), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var _step2$value = _slicedToArray(_step2.value, 2);

          var domain = _step2$value[0];
          var area = _step2$value[1];

          output.write(domain + ' local:\n');
          var _iteratorNormalCompletion4 = true;
          var _didIteratorError4 = false;
          var _iteratorError4 = undefined;

          try {
            for (var _iterator4 = _getIterator(area.pairs), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
              var _step4$value = _slicedToArray(_step4.value, 2);

              var _name = _step4$value[0];
              var value = _step4$value[1];

              output.write('  ' + _name + ' = ' + value + '\n');
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

      var _iteratorNormalCompletion3 = true;
      var _didIteratorError3 = false;
      var _iteratorError3 = undefined;

      try {
        for (var _iterator3 = _getIterator(this._sessions), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
          var _step3$value = _slicedToArray(_step3.value, 2);

          var domain = _step3$value[0];
          var area = _step3$value[1];

          output.push(domain + ' session:\n');
          var _iteratorNormalCompletion5 = true;
          var _didIteratorError5 = false;
          var _iteratorError5 = undefined;

          try {
            for (var _iterator5 = _getIterator(area.pairs), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
              var _step5$value = _slicedToArray(_step5.value, 2);

              var _name2 = _step5$value[0];
              var value = _step5$value[1];

              output.write('  ' + _name2 + ' = ' + value + '\n');
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
    }

    // browser.saveStorage uses this
  }, {
    key: 'save',
    value: function save() {
      var serialized = ['# Saved on ' + new Date().toISOString()];
      var _iteratorNormalCompletion6 = true;
      var _didIteratorError6 = false;
      var _iteratorError6 = undefined;

      try {
        for (var _iterator6 = _getIterator(this._locals), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
          var _step6$value = _slicedToArray(_step6.value, 2);

          var domain = _step6$value[0];
          var area = _step6$value[1];

          var pairs = area.pairs;
          if (pairs.length) {
            serialized.push(domain + ' local:');
            var _iteratorNormalCompletion8 = true;
            var _didIteratorError8 = false;
            var _iteratorError8 = undefined;

            try {
              for (var _iterator8 = _getIterator(area.pairs), _step8; !(_iteratorNormalCompletion8 = (_step8 = _iterator8.next()).done); _iteratorNormalCompletion8 = true) {
                var _step8$value = _slicedToArray(_step8.value, 2);

                var _name3 = _step8$value[0];
                var value = _step8$value[1];

                serialized.push('  ' + escape(_name3) + ' = ' + escape(value));
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
          }
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
        for (var _iterator7 = _getIterator(this._sessions), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
          var _step7$value = _slicedToArray(_step7.value, 2);

          var domain = _step7$value[0];
          var area = _step7$value[1];

          var pairs = area.pairs;
          if (pairs.length) {
            serialized.push(domain + ' session:');
            var _iteratorNormalCompletion9 = true;
            var _didIteratorError9 = false;
            var _iteratorError9 = undefined;

            try {
              for (var _iterator9 = _getIterator(area.pairs), _step9; !(_iteratorNormalCompletion9 = (_step9 = _iterator9.next()).done); _iteratorNormalCompletion9 = true) {
                var _step9$value = _slicedToArray(_step9.value, 2);

                var _name4 = _step9$value[0];
                var value = _step9$value[1];

                serialized.push('  ' + escape(_name4) + ' = ' + escape(value));
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
          }
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

      return serialized.join('\n') + '\n';
    }

    // browser.loadStorage uses this
  }, {
    key: 'load',
    value: function load(serialized) {
      var storage = null;
      var _iteratorNormalCompletion10 = true;
      var _didIteratorError10 = false;
      var _iteratorError10 = undefined;

      try {
        for (var _iterator10 = _getIterator(serialized.split(/\n+/)), _step10; !(_iteratorNormalCompletion10 = (_step10 = _iterator10.next()).done); _iteratorNormalCompletion10 = true) {
          var item = _step10.value;

          if (item[0] === '#' || item === '') continue;
          if (item[0] === ' ') {
            var _item$split = item.split('=');

            var _item$split2 = _slicedToArray(_item$split, 2);

            var key = _item$split2[0];
            var value = _item$split2[1];

            if (storage) storage.setItem(unescape(key.trim()), unescape(value.trim()));else throw new Error('Must specify storage type using local: or session:');
          } else {
            var _item$split3 = item.split(' ');

            var _item$split32 = _slicedToArray(_item$split3, 2);

            var domain = _item$split32[0];
            var type = _item$split32[1];

            if (type === 'local:') storage = this.local(domain);else if (type === 'session:') storage = this.session(domain);else throw new Error('Unkown storage type ' + type);
          }
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
    }
  }]);

  return Storages;
})();

module.exports = Storages;
//# sourceMappingURL=storage.js.map
