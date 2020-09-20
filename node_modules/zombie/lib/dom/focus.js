// Support for element focus.

'use strict';

var DOM = require('./index');

var FOCUS_ELEMENTS = ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'ANCHOR'];

// The element in focus.
//
// If no element has the focus, return the document.body.
DOM.HTMLDocument.prototype.__defineGetter__('activeElement', function () {
  return this._inFocus || this.body;
});

// Change the current element in focus (or null for blur)
function setFocus(document, element) {
  var inFocus = document._inFocus;
  if (element !== inFocus) {
    if (inFocus) {
      var _onblur = document.createEvent('HTMLEvents');
      _onblur.initEvent('blur', false, false);
      inFocus.dispatchEvent(_onblur);
    }
    if (element) {
      // null to blur
      var _onfocus = document.createEvent('HTMLEvents');
      _onfocus.initEvent('focus', false, false);
      element.dispatchEvent(_onfocus);
      document._inFocus = element;
      document.defaultView.browser.emit('focus', element);
    }
  }
}

// All HTML elements have a no-op focus/blur methods.
DOM.HTMLElement.prototype.focus = function () {};
DOM.HTMLElement.prototype.blur = function () {};

// Input controls have active focus/blur elements.  JSDOM implements these as
// no-op, so we have to over-ride each prototype individually.
var CONTROLS = [DOM.HTMLInputElement, DOM.HTMLSelectElement, DOM.HTMLTextAreaElement, DOM.HTMLButtonElement, DOM.HTMLAnchorElement];

CONTROLS.forEach(function (elementType) {
  elementType.prototype.focus = function () {
    setFocus(this.ownerDocument, this);
  };

  elementType.prototype.blur = function () {
    setFocus(this.ownerDocument, null);
  };

  // Capture the autofocus element and use it to change focus
  var setAttribute = elementType.prototype.setAttribute;
  elementType.prototype.setAttribute = function (name, value) {
    setAttribute.call(this, name, value);
    if (name === 'autofocus') {
      var _document = this.ownerDocument;
      if (~FOCUS_ELEMENTS.indexOf(this.tagName) && !_document._inFocus) this.focus();
    }
  };
});

// When changing focus onto form control, store the current value.  When changing
// focus to different control, if the value has changed, trigger a change event.
var INPUTS = [DOM.HTMLInputElement, DOM.HTMLTextAreaElement, DOM.HTMLSelectElement];

INPUTS.forEach(function (elementType) {
  elementType.prototype._eventDefaults.focus = function (event) {
    var element = event.target;
    element._focusValue = element.value || '';
  };

  elementType.prototype._eventDefaults.blur = function (event) {
    var element = event.target;
    var focusValue = element._focusValue;
    if (focusValue !== element.value) {
      // null == undefined
      var change = element.ownerDocument.createEvent('HTMLEvents');
      change.initEvent('change', false, false);
      element.dispatchEvent(change);
    }
  };
});
//# sourceMappingURL=focus.js.map
