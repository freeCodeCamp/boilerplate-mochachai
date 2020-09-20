// Support for iframes.

'use strict';

var DOM = require('./index');
var resourceLoader = require('jsdom/lib/jsdom/browser/resource-loader');

function loadFrame(frame) {
  // Close current content window in order to open a new one
  if (frame._contentWindow) {
    frame._contentWindow.close();
    delete frame._contentWindow;
  }

  function onload() {
    frame.contentWindow.removeEventListener('load', onload);
    var parentDocument = frame._ownerDocument;
    var loadEvent = parentDocument.createEvent('HTMLEvents');
    loadEvent.initEvent('load', false, false);
    frame.dispatchEvent(loadEvent);
  }

  // This is both an accessor to the contentWindow and a side-effect of creating
  // the window and loading the document based on the value of frame.src
  //
  // Not happy about this hack
  frame.contentWindow.addEventListener('load', onload);
}

function refreshAccessors(document) {
  var window = document._defaultView;
  var frames = document.querySelectorAll('iframe,frame');
  for (var i = 0; i < window._length; ++i) {
    delete window[i];
  }window._length = frames.length;
  Array.prototype.forEach.call(frames, function (frame, i) {
    window.__defineGetter__(i, function () {
      return frame.contentWindow;
    });
  });
}

function refreshNameAccessor(frame) {
  var name = frame.getAttribute('name');
  // https://html.spec.whatwg.org/multipage/browsers.html#named-access-on-the-window-object:supported-property-names
  if (name) {
    // I do not know why this only works with _global and not with _defaultView :(
    var _window = frame._ownerDocument._global;
    delete _window[name];
    if (isInDocument(frame)) _window.__defineGetter__(name, function () {
      return frame.contentWindow;
    });
  }
}

function isInDocument(el) {
  var document = el._ownerDocument;
  var current = el;
  while (current = current._parentNode) if (current === document) return true;
  return false;
}

DOM.HTMLFrameElement.prototype._attrModified = function (name, value, oldVal) {
  DOM.HTMLElement.prototype._attrModified.call(this, name, value, oldVal);
  if (name === 'name') {
    if (oldVal)
      // I do not know why this only works with _global and not with _defaultView :(
      delete this._ownerDocument._global[oldVal];
    refreshNameAccessor(this);
  } else if (name === 'src' && value !== oldVal && isInDocument(this)) loadFrame(this);
};

DOM.HTMLFrameElement.prototype._detach = function () {
  DOM.HTMLElement.prototype._detach.call(this);
  if (this.contentWindow) this.contentWindow.close();
  refreshAccessors(this._ownerDocument);
  refreshNameAccessor(this);
};

DOM.HTMLFrameElement.prototype._attach = function () {
  DOM.HTMLElement.prototype._attach.call(this);
  loadFrame(this);
  refreshAccessors(this._ownerDocument);
  refreshNameAccessor(this);
};

DOM.HTMLFrameElement.prototype.__defineGetter__('contentDocument', function () {
  return this.contentWindow.document;
});

DOM.HTMLFrameElement.prototype.__defineGetter__('contentWindow', function () {
  var _this = this;

  if (!this._contentWindow) {
    var createHistory = require('../history');
    var parentDocument = this._ownerDocument;
    var parentWindow = parentDocument.defaultView;

    // Need to bypass JSDOM's window/document creation and use ours
    var openWindow = createHistory(parentWindow.browser, function (active) {
      // Change the focus from window to active.
      _this._contentWindow = active;
    });

    var src = this.src.trim() === '' ? 'about:blank' : this.src;
    this._contentWindow = openWindow({
      name: this.name,
      url: resourceLoader.resolveResourceUrl(parentDocument, src),
      parent: parentWindow,
      referrer: parentWindow.location.href
    });
  }
  return this._contentWindow;
});
//# sourceMappingURL=iframe.js.map
