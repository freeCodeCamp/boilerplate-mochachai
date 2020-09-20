// See [RFC 2109](http://tools.ietf.org/html/rfc2109.html) and
// [document.cookie](http://dev/loper.mozilla.org/en/document.cookie)
'use strict';

var _get = require('babel-runtime/helpers/get')['default'];

var _inherits = require('babel-runtime/helpers/inherits')['default'];

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _getIterator = require('babel-runtime/core-js/get-iterator')['default'];

var DOM = require('./dom');

var _require = require('util');

var isArray = _require.isArray;

var Tough = require('tough-cookie');
var Cookie = Tough.Cookie;

// Lists all available cookies.
module.exports = (function (_Array) {
  _inherits(Cookies, _Array);

  function Cookies() {
    _classCallCheck(this, Cookies);

    _get(Object.getPrototypeOf(Cookies.prototype), 'constructor', this).call(this);
  }

  // Used to dump state to console (debugging)

  _createClass(Cookies, [{
    key: 'dump',
    value: function dump() {
      var output = arguments.length <= 0 || arguments[0] === undefined ? process.stdout : arguments[0];
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = _getIterator(this.sort(Tough.cookieCompare)), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var cookie = _step.value;

          output.write(cookie + '\n');
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

    // Serializes all selected cookies into a single string.  Used to generate a cookies header.
    //
    // domain - Request hostname
    // path   - Request pathname
  }, {
    key: 'serialize',
    value: function serialize(domain, path) {
      return this.select({ domain: domain, path: path }).map(function (cookie) {
        return cookie.cookieString();
      }).join('; ');
    }

    // Returns all cookies that match the identifier (name, domain and path).
    // This is used for retrieving cookies.
  }, {
    key: 'select',
    value: function select(identifier) {
      var cookies = this.filter(function (cookie) {
        return cookie.TTL() > 0;
      }); // eslint-disable-line new-cap
      if (identifier.name) cookies = cookies.filter(function (cookie) {
        return cookie.key === identifier.name;
      });
      if (identifier.path) cookies = cookies.filter(function (cookie) {
        return Tough.pathMatch(identifier.path, cookie.path);
      });
      if (identifier.domain) cookies = cookies.filter(function (cookie) {
        return Tough.domainMatch(identifier.domain, cookie.domain);
      });
      return cookies.sort(function (a, b) {
        return b.domain.length - a.domain.length;
      }).sort(Tough.cookieCompare);
    }

    // Adds a new cookie, updates existing cookie (same name, domain and path), or
    // deletes a cookie (if expires in the past).
  }, {
    key: 'set',
    value: function set(params) {
      var _this = this;

      var cookie = new Cookie({
        key: params.name,
        value: params.value,
        domain: params.domain || 'localhost',
        path: params.path || '/'
      });
      if (params.expires) cookie.setExpires(params.expires);else if (params.hasOwnProperty('max-age')) cookie.setMaxAge(params['max-age']);
      cookie.secure = !!params.secure;
      cookie.httpOnly = !!params.httpOnly;

      // Delete cookie before setting it, so we only store one cookie (per
      // domain/path/name)
      this.filter(function (c) {
        return c.domain === cookie.domain;
      }).filter(function (c) {
        return c.path === cookie.path;
      }).filter(function (c) {
        return c.key === cookie.key;
      }).forEach(function (c) {
        return _this['delete'](c);
      });
      if (cookie.TTL() > 0) // eslint-disable-line new-cap
        this.push(cookie);
    }

    // Delete the specified cookie.
  }, {
    key: 'delete',
    value: function _delete(cookie) {
      var index = this.indexOf(cookie);
      if (~index) this.splice(index, 1);
    }

    // Deletes all cookies.
  }, {
    key: 'deleteAll',
    value: function deleteAll() {
      this.length = 0;
    }

    // Update cookies with HTTP response
    //
    // httpHeader - Value of HTTP Set-Cookie header (string/array)
    // domain     - Set from hostname
    // path       - Set from pathname
  }, {
    key: 'update',
    value: function update(httpHeader, domain, path) {
      var _this2 = this;

      // One Set-Cookie is a string, multiple is an array
      var headers = isArray(httpHeader) ? httpHeader : [httpHeader];
      headers.map(function (cookie) {
        return Cookie.parse(cookie);
      }).filter(function (cookie) {
        return cookie;
      }).forEach(function (cookie) {
        cookie.domain = cookie.domain || domain;
        cookie.path = cookie.path || Tough.defaultPath(path);

        // Delete cookie before setting it, so we only store one cookie (per
        // domain/path/name)
        _this2.filter(function (c) {
          return c.domain === cookie.domain;
        }).filter(function (c) {
          return c.path === cookie.path;
        }).filter(function (c) {
          return c.key === cookie.key;
        }).forEach(function (c) {
          return _this2['delete'](c);
        });
        if (cookie.TTL() > 0) // eslint-disable-line new-cap
          _this2.push(cookie);
      });
    }
  }]);

  return Cookies;
})(Array);

// Returns name=value pairs
DOM.HTMLDocument.prototype.__defineGetter__('cookie', function () {
  var cookies = this.defaultView.browser.cookies;

  return cookies.select({ domain: this.location.hostname, path: this.location.pathname }).filter(function (cookie) {
    return !cookie.httpOnly;
  }).map(function (cookie) {
    return cookie.key + '=' + cookie.value;
  }).join('; ');
});

// Accepts serialized form (same as Set-Cookie header) and updates cookie from
// new values.
DOM.HTMLDocument.prototype.__defineSetter__('cookie', function (cookie) {
  var cookies = this.defaultView.browser.cookies;

  cookies.update(cookie.toString(), this.location.hostname, this.location.pathname);
});
//# sourceMappingURL=cookies.js.map
