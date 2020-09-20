// Browser assertions convenience.

'use strict';

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _getIterator = require('babel-runtime/core-js/get-iterator')['default'];

var _Number$isInteger = require('babel-runtime/core-js/number/is-integer')['default'];

var assert = require('assert');

var _require = require('util');

var isRegExp = _require.isRegExp;

var URL = require('url');
var Utils = require('jsdom/lib/jsdom/utils');

// Used to assert that actual matches expected value, where expected may be a function or a string.
function assertMatch(actual, expected, message) {
  if (isRegExp(expected)) assert(expected.test(actual), message || 'Expected "' + actual + '" to match "' + expected + '"');else if (typeof expected === 'function') assert(expected(actual), message);else assert.deepEqual(actual, expected, message);
}

module.exports = (function () {
  function Assert(browser) {
    _classCallCheck(this, Assert);

    this.browser = browser;
  }

  // -- Location/response --

  // Asserts that a cookie with the given name has the expected value.
  //
  // identifier - Cookie name or name/domain/path (see getCookie)
  // expected   - Expected value (null to test cookie is not set)
  // message    - Assert message if cookie does not have expected value

  _createClass(Assert, [{
    key: 'cookie',
    value: function cookie(identifier) {
      var expected = arguments.length <= 1 || arguments[1] === undefined ? null : arguments[1];
      var message = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];

      var actual = this.browser.getCookie(identifier);
      assertMatch(actual, expected, message || 'Expected cookie ' + JSON.stringify(identifier) + ' to have the value "' + expected + '", found "' + actual + '"');
    }

    // Asserts that browser was redirected when retrieving the current page.
  }, {
    key: 'redirected',
    value: function redirected(message) {
      assert(this.browser.redirected, message);
    }

    // Assert that the last page load returned the expected status code.
  }, {
    key: 'status',
    value: function status(code, message) {
      assert.equal(this.browser.status, code, message);
    }

    // Assert that the last page load returned status code 200.
  }, {
    key: 'success',
    value: function success(message) {
      assert(this.browser.success, message);
    }

    // Asserts that current page has the expected URL.
    //
    // Expected value can be a String, RegExp, Function or an object, in which case
    // object properties are tested against the actual URL (e.g. pathname, host,
    // query).
  }, {
    key: 'url',
    value: function url(expected, message) {
      if (typeof expected === 'string') {
        var absolute = Utils.resolveHref(this.browser.location.href, expected);
        assertMatch(this.browser.location.href, absolute, message);
      } else if (isRegExp(expected) || typeof expected === 'function') assertMatch(this.browser.location.href, expected, message);else {
        var url = URL.parse(this.browser.location.href, true);
        for (var key in expected) {
          var value = expected[key];
          // Gracefully handle default values, e.g. document.location.hash for
          // "/foo" is "" not null, not undefined.
          var defaultValue = key === 'port' ? 80 : null;
          assertMatch(url[key] || defaultValue, value || defaultValue, message);
        }
      }
    }

    // -- Document contents --

    // Assert the named attribute of the selected element(s) has the expected value.
  }, {
    key: 'attribute',
    value: function attribute(selector, name) {
      var expected = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];
      var message = arguments.length <= 3 || arguments[3] === undefined ? null : arguments[3];

      var elements = this.browser.queryAll(selector);
      assert(elements.length, 'Expected selector "' + selector + '" to return one or more elements');
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = _getIterator(elements), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var element = _step.value;

          var actual = element.getAttribute(name);
          assertMatch(actual, expected, message);
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

    // Assert that element matching selector exists.
  }, {
    key: 'element',
    value: function element(selector, message) {
      this.elements(selector, { exactly: 1 }, message);
    }

    // Assert how many elements matching selector exist.
    //
    // Count can be an exact number, or an object with the properties:
    // atLeast - Expect to find at least that many elements
    // atMost  - Expect to find at most that many elements
    // exactly - Expect to find exactly that many elements
    //
    // If count is unspecified, defaults to at least one.
  }, {
    key: 'elements',
    value: function elements(selector, count, message) {
      var elements = this.browser.queryAll(selector);
      if (arguments.length === 1) this.elements(selector, { atLeast: 1 });else if (_Number$isInteger(count)) this.elements(selector, { exactly: count }, message);else {
        if (_Number$isInteger(count.exactly)) assert.equal(elements.length, count.exactly, message || 'Expected ' + count.exactly + ' elements matching "' + selector + '", found ' + elements.length);
        if (_Number$isInteger(count.atLeast)) assert(elements.length >= count.atLeast, message || 'Expected at least ' + count.atLeast + ' elements matching "' + selector + '", found only ' + elements.length);
        if (_Number$isInteger(count.atMost)) assert(elements.length <= count.atMost, message || 'Expected at most ' + count.atMost + ' elements matching "' + selector + '", found ' + elements.length);
      }
    }

    // Asserts the selected element(s) has the expected CSS class.
  }, {
    key: 'hasClass',
    value: function hasClass(selector, expected, message) {
      var elements = this.browser.queryAll(selector);
      assert(elements.length, 'Expected selector "' + selector + '" to return one or more elements');
      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = _getIterator(elements), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var element = _step2.value;

          var classNames = element.className.split(/\s+/);
          assert(~classNames.indexOf(expected), message || 'Expected element "' + selector + '" to have class "' + expected + '", found "' + classNames.join(', ') + '"');
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

    // Asserts the selected element(s) doest not have the expected CSS class.
  }, {
    key: 'hasNoClass',
    value: function hasNoClass(selector, expected, message) {
      var elements = this.browser.queryAll(selector);
      assert(elements.length, 'Expected selector "' + selector + '" to return one or more elements');
      var _iteratorNormalCompletion3 = true;
      var _didIteratorError3 = false;
      var _iteratorError3 = undefined;

      try {
        for (var _iterator3 = _getIterator(elements), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
          var element = _step3.value;

          var classNames = element.className.split(/\s+/);
          assert(classNames.indexOf(expected) === -1, message || 'Expected element "' + selector + '" to not have class "' + expected + '", found "' + classNames.join(', ') + '"');
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

    // Asserts the selected element(s) has the expected class names.
  }, {
    key: 'className',
    value: function className(selector, expected, message) {
      var elements = this.browser.queryAll(selector);
      assert(elements.length, 'Expected selector "' + selector + '" to return one or more elements');
      var array = expected.split(/\s+/).sort().join(' ');
      var _iteratorNormalCompletion4 = true;
      var _didIteratorError4 = false;
      var _iteratorError4 = undefined;

      try {
        for (var _iterator4 = _getIterator(elements), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
          var element = _step4.value;

          var actual = element.className.split(/\s+/).sort().join(' ');
          assertMatch(actual, array, message || 'Expected element "' + selector + '" to have class "' + expected + '", found "' + actual + '"');
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

    // Asserts the selected element(s) has the expected value for the named style
    // property.
  }, {
    key: 'style',
    value: function style(selector, _style) {
      var expected = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];
      var message = arguments.length <= 3 || arguments[3] === undefined ? null : arguments[3];

      var elements = this.browser.queryAll(selector);
      assert(elements.length, 'Expected selector "' + selector + '" to return one or more elements');
      var _iteratorNormalCompletion5 = true;
      var _didIteratorError5 = false;
      var _iteratorError5 = undefined;

      try {
        for (var _iterator5 = _getIterator(elements), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
          var element = _step5.value;

          var actual = element.style.getPropertyValue(_style);
          assertMatch(actual, expected, message || 'Expected element "' + selector + '" to have style ' + _style + ' value of "' + expected + '", found "' + actual + '"');
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

    // Asserts that selected input field (text field, text area, etc) has the expected value.
  }, {
    key: 'input',
    value: function input(selector) {
      var expected = arguments.length <= 1 || arguments[1] === undefined ? null : arguments[1];
      var message = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];

      var elements = this.browser.queryAll(selector);
      assert(elements.length, 'Expected selector "' + selector + '" to return one or more elements');
      var _iteratorNormalCompletion6 = true;
      var _didIteratorError6 = false;
      var _iteratorError6 = undefined;

      try {
        for (var _iterator6 = _getIterator(elements), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
          var element = _step6.value;

          assertMatch(element.value, expected, message);
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
    }

    // Asserts that a link exists with the given text and URL.
  }, {
    key: 'link',
    value: function link(selector, text, url, message) {
      var _this = this;

      var elements = this.browser.queryAll(selector);
      assert(elements.length, message || 'Expected selector "' + selector + '" to return one or more elements');
      var matchingText = elements.filter(function (element) {
        return element.textContent.trim() === text;
      });
      if (isRegExp(url)) {
        var matchedRegexp = matchingText.filter(function (element) {
          return url.test(element.href);
        });
        assert(matchedRegexp.length, message || 'Expected at least one link matching the given text and URL');
      } else {
        (function () {
          var absolute = Utils.resolveHref(_this.browser.location.href, url);
          var matchedURL = matchingText.filter(function (element) {
            return element.href === absolute;
          });
          assert(matchedURL.length, message || 'Expected at least one link matching the given text and URL');
        })();
      }
    }

    // Assert that text content of selected element(s) matches expected string.
    //
    // You can also call this with a regular expression, or a function.
  }, {
    key: 'text',
    value: function text(selector, expected, message) {
      var elements = this.browser.queryAll(selector);
      assert(elements.length, 'Expected selector "' + selector + '" to return one or more elements');
      var actual = elements.map(function (elem) {
        return elem.textContent;
      }).join('').trim().replace(/\s+/g, ' ');
      assertMatch(actual, expected || '', message);
    }

    // -- Window --

    // Asserts that selected element has the focus.
  }, {
    key: 'hasFocus',
    value: function hasFocus(selector, message) {
      if (selector) {
        var elements = this.browser.queryAll(selector);
        assert.equal(elements.length, 1, message || 'Expected selector "' + selector + '" to return one element');
        assert.equal(this.browser.activeElement, elements[0], message || 'Expected element "' + selector + '" to have the focus\'');
      } else assert.equal(this.browser.activeElement, this.browser.body, message || 'Expected no element to have focus');
    }

    // -- JavaScript --

    // Evaluates Javascript expression and asserts value.  With one argument,
    // asserts that the expression evaluates to (JS) true.
  }, {
    key: 'evaluate',
    value: function evaluate(expression, expected, message) {
      var actual = this.browser.evaluate(expression);
      if (arguments.length === 1) assert(actual);else assertMatch(actual, expected, message);
    }

    // Asserts that the global (window) property name has the expected value.
  }, {
    key: 'global',
    value: function global(name, expected, message) {
      var actual = this.browser.window[name];
      if (arguments.length === 1) assert(actual);else assertMatch(actual, expected, message || 'Expected global ' + name + ' to have the value "' + expected + '", found "' + actual + '"');
    }
  }]);

  return Assert;
})();
//# sourceMappingURL=assert.js.map
