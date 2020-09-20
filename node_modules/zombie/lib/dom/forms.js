// Patches to JSDOM for properly handling forms.
'use strict';

var _Map = require('babel-runtime/core-js/map')['default'];

var _Array$from = require('babel-runtime/core-js/array/from')['default'];

var _Object$assign = require('babel-runtime/core-js/object/assign')['default'];

var DOM = require('./index');
var File = require('fs');
var Mime = require('mime');
var Path = require('path');

// The Form
// --------

// Forms convert INPUT fields of type file into this object and pass it as
// parameter to resource request.
//
// The base class is a String, so the value (e.g. when passed in a GET request)
// is the base filename.  Additional properties include the MIME type (`mime`),
// the full filename (`filename`) and the `read` method that returns the file
// contents.
function uploadedFile(filename) {
  var file = {
    valueOf: function valueOf() {
      return Path.basename(filename);
    }
  };
  file.filename = filename;
  file.mime = Mime.lookup(filename);
  file.read = function () {
    return File.readFileSync(filename);
  };
  return file;
}

// Implement form.submit such that it actually submits a request to the server.
// This method takes the submitting button so we can send the button name/value.
DOM.HTMLFormElement.prototype.submit = function (button) {
  var form = this;
  var document = form.ownerDocument;
  var params = new _Map();

  function addFieldValues(fieldName, values) {
    var current = params.get(fieldName) || [];
    var next = current.concat(values);
    params.set(fieldName, next);
  }

  function addFieldToParams(field) {
    if (field.getAttribute('disabled')) return;

    var name = field.getAttribute('name');
    if (!name) return;

    if (field.nodeName === 'SELECT') {
      var selected = _Array$from(field.options).filter(function (option) {
        return option.selected;
      }).map(function (options) {
        return options.value;
      });

      if (field.multiple) addFieldValues(name, selected);else {
        var value = selected.length > 0 ? selected[0] : field.options.length && field.options[0].value;
        addFieldValues(name, [value]);
      }
      return;
    }

    if (field.nodeName === 'INPUT' && (field.type === 'checkbox' || field.type === 'radio')) {
      if (field.checked) {
        var value = field.value || '1';
        addFieldValues(name, [value]);
      }
      return;
    }

    if (field.nodeName === 'INPUT' && field.type === 'file') {
      if (field.value) {
        var value = uploadedFile(field.value);
        addFieldValues(name, [value]);
      }
      return;
    }

    if (field.nodeName === 'TEXTAREA' || field.nodeName === 'INPUT') {
      if (field.type !== 'submit' && field.type !== 'image') addFieldValues(name, [field.value]);
      return;
    }
  }

  function addButtonToParams() {
    if (button.nodeName === 'INPUT' && button.type === 'image') {
      addFieldValues(button.name + '.x', ['0']);
      addFieldValues(button.name + '.y', ['0']);

      if (button.value) addFieldValues(button.name, [button.value]);
    } else addFieldValues(button.name, [button.value]);
  }

  function submit() {
    if (button && button.name) addButtonToParams();

    // Ask window to submit form, let it figure out how to handle this based on
    // the target attribute.
    document.defaultView._submit({
      url: form.getAttribute('action') || document.location.href,
      method: form.getAttribute('method') || 'GET',
      encoding: form.getAttribute('enctype'),
      params: params,
      target: form.getAttribute('target')
    });
  }

  function process(index) {
    var field = form.elements.item(index);
    if (!field) {
      submit();
      return;
    }
    addFieldToParams(field);
    process(index + 1);
  }

  process(0);
};

// Replace dispatchEvent so we can send the button along the event.
DOM.HTMLFormElement.prototype._dispatchSubmitEvent = function (button) {
  var event = this.ownerDocument.createEvent('HTMLEvents');
  event.initEvent('submit', true, true);
  event._button = button;
  return this.dispatchEvent(event);
};

// Default behavior for submit events is to call the form's submit method, but we
// also pass the submitting button.
DOM.HTMLFormElement.prototype._eventDefaults.submit = function (event) {
  event.target.submit(event._button);
};

// Buttons
// -------

// Default behavior for clicking on inputs.
DOM.HTMLInputElement.prototype._eventDefaults = _Object$assign({}, DOM.HTMLElement.prototype._eventDefaults);

DOM.HTMLInputElement.prototype._eventDefaults.click = function (event) {
  var input = event.target;

  function change() {
    var changeEvent = input.ownerDocument.createEvent('HTMLEvents');
    changeEvent.initEvent('change', true, true);
    input.dispatchEvent(changeEvent);
  }

  switch (input.type) {
    case 'reset':
      {
        if (input.form) input.form.reset();
        break;
      }
    case 'submit':
      {
        if (input.form) input.form._dispatchSubmitEvent(input);
        break;
      }
    case 'image':
      {
        if (input.form) input.form._dispatchSubmitEvent(input);
        break;
      }
    case 'checkbox':
      {
        change();
        break;
      }
    case 'radio':
      {
        if (!input.getAttribute('readonly')) {
          input.checked = true;
          change();
        }
      }
  }
};

// Current INPUT behavior on click is to capture sumbit and handle it, but
// ignore all other clicks. We need those other clicks to occur, so we're going
// to dispatch them all.
DOM.HTMLInputElement.prototype.click = function () {
  var _this = this;

  var input = this;
  input.focus();

  // First event we fire is click event
  function click() {
    var clickEvent = input.ownerDocument.createEvent('HTMLEvents');
    clickEvent.initEvent('click', true, true);
    return input.dispatchEvent(clickEvent);
  }

  switch (input.type) {
    case 'checkbox':
      {
        if (input.getAttribute('readonly')) break;

        var original = input.checked;
        input.checked = !original;
        var checkResult = click();
        if (checkResult === false) input.checked = original;
        break;
      }

    case 'radio':
      {
        if (input.getAttribute('readonly')) break;

        if (input.checked) click();else {
          (function () {
            var radios = input.ownerDocument.querySelectorAll('input[type=radio][name=\'' + _this.getAttribute('name') + '\']');
            var checked = _Array$from(radios).filter(function (radio) {
              return radio.checked && radio.form === _this.form;
            }).map(function (radio) {
              radio.checked = false;
            })[0];

            input.checked = true;
            var radioResult = click();
            if (radioResult === false) {
              input.checked = false;
              _Array$from(radios).filter(function (radio) {
                return radio.form === input.form;
              }).forEach(function (radio) {
                radio.checked = radio === checked;
              });
            }
          })();
        }
        break;
      }

    default:
      {
        click();
        break;
      }
  }
};

// Default behavior for form BUTTON: submit form.
DOM.HTMLButtonElement.prototype._eventDefaults.click = function (event) {
  var button = event.target;
  if (button.getAttribute('disabled')) return false;

  var form = button.form;
  if (form) return form._dispatchSubmitEvent(button);
};
//# sourceMappingURL=forms.js.map
