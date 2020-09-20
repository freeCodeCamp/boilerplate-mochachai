// The event loop.
//
// Each browser has an event loop, which processes asynchronous events like
// loading pages and resources, XHR, timeouts and intervals, etc. These are
// procesed in order.
//
// The purpose of the event loop is two fold:
// - To get events processed in the right order for the active window (and only
//   the active window)
// - And to allow the code to wait until all events have been processed
//   (browser.wait, .visit, .pressButton, etc)
//
// The event loop has one interesting method: `wait`.
//
// Each window maintains its own event queue. Its interesting methods are
// `enqueue`, `http`, `dispatch` and the timeout/interval methods.

'use strict';

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _get = require('babel-runtime/helpers/get')['default'];

var _inherits = require('babel-runtime/helpers/inherits')['default'];

var _getIterator = require('babel-runtime/core-js/get-iterator')['default'];

var _Array$from = require('babel-runtime/core-js/array/from')['default'];

var assert = require('assert');

var _require = require('events');

var EventEmitter = _require.EventEmitter;

// Wrapper for a timeout (setTimeout)

var Timeout = (function () {

  // eventQueue - Reference to the event queue
  // fn         - When timer fires, evaluate this function
  // delay      - How long to wait
  // remove     - Call this to discard timer
  //
  // Instance variables add:
  // handle  - Node.js timeout handle
  // next    - When is this timer firing next

  function Timeout(eventQueue, fn, delay, remove) {
    _classCallCheck(this, Timeout);

    this.eventQueue = eventQueue;
    this.fn = fn;
    this.delay = Math.max(delay || 0, 0);
    this.remove = remove;

    this.handle = global.setTimeout(this.fire.bind(this), this.delay);
    this.next = Date.now() + this.delay;
  }

  // Wrapper for an interval (setInterval)

  _createClass(Timeout, [{
    key: 'fire',
    value: function fire() {
      var _this = this;

      // In response to Node firing setTimeout, but only allowed to process this
      // event during a wait()
      this.eventQueue.enqueue(function () {
        var eventLoop = _this.eventQueue.eventLoop;

        eventLoop.emit('setTimeout', _this.fn, _this.delay);
        try {
          _this.eventQueue.window._evaluate(_this.fn);
        } catch (error) {
          eventLoop.emit('error', error);
        }
      });
      this.remove();
    }

    // clearTimeout
  }, {
    key: 'stop',
    value: function stop() {
      global.clearTimeout(this.handle);
      this.remove();
    }
  }]);

  return Timeout;
})();

var Interval = (function () {

  // eventQueue - Reference to the event queue
  // fn        - When timer fires, evaluate this function
  // interval  - Interval between firing
  // remove    - Call this to discard timer
  //
  // Instance variables add:
  // handle  - Node.js interval handle
  // next    - When is this timer firing next

  function Interval(eventQueue, fn, interval, remove) {
    _classCallCheck(this, Interval);

    this.eventQueue = eventQueue;
    this.fn = fn;
    this.interval = Math.max(interval || 0, 0);
    this.remove = remove;
    this.fireInProgress = false;
    this.handle = global.setInterval(this.fire.bind(this), this.interval);
    this.next = Date.now() + this.interval;
  }

  // Each window has an event queue that holds all pending events.  Various
  // browser features push new functions into the queue (e.g. process XHR
  // response, setTimeout fires).  The event loop is responsible to pop these
  // events from the queue and run them, but only during browser.wait().
  //
  // In addition, the event queue keeps track of all outstanding timers
  // (setTimeout/setInterval) so it can return consecutive handles and clean them
  // up during window.destroy().
  //
  // In addition, we keep track of when the browser is expecting an event to
  // arrive in the queue (e.g. sent XHR request, expecting an event to process the
  // response soon enough).  The event loop uses that to determine if it's worth
  // waiting.

  _createClass(Interval, [{
    key: 'fire',
    value: function fire() {
      var _this2 = this;

      // In response to Node firing setInterval, but only allowed to process this
      // event during a wait()
      this.next = Date.now() + this.interval;

      // setInterval events not allowed to overlap, don't queue two at once
      if (this.fireInProgress) return;
      this.fireInProgress = true;
      this.eventQueue.enqueue(function () {
        _this2.fireInProgress = false;

        var eventLoop = _this2.eventQueue.eventLoop;

        eventLoop.emit('setInterval', _this2.fn, _this2.interval);
        try {
          _this2.eventQueue.window._evaluate(_this2.fn);
        } catch (error) {
          eventLoop.emit('error', error);
        }
      });
    }

    // clearTimeout
  }, {
    key: 'stop',
    value: function stop() {
      global.clearInterval(this.handle);
      this.remove();
    }
  }]);

  return Interval;
})();

var EventQueue = (function () {

  // Instance variables:
  // browser          - Reference to the browser
  // eventLoop        - Reference to the browser's event loop
  // queue            - FIFO queue of functions to call
  // expecting        - These are holding back the event loop
  // timers           - Sparse array of timers (index is the timer handle)
  // eventSources     - Additional sources for events (SSE, WS, etc)
  // nextTimerHandle  - Value of next timer handler

  function EventQueue(window) {
    _classCallCheck(this, EventQueue);

    this.window = window;
    this.browser = window.browser;
    this.eventLoop = this.browser._eventLoop;
    this.queue = [];
    this.expecting = 0;
    this.timers = [];
    this.eventSources = [];
    this.nextTimerHandle = 1;
  }

  // The browser event loop.
  //
  // Each browser has one event loop that processes events from the queues of the
  // currently active window and its frames (child windows).
  //
  // The wait method is responsible to process all pending events.  It goes idle
  // once:
  // - There are no more events waiting in the queue (of the active window)
  // - There are no more timers waiting to fire (next -> Infinity)
  // - No future events are expected to arrive (e.g. in-progress XHR requests)
  //
  // The wait method will complete before the loop goes idle, if:
  // - Past the specified timeout
  // - The next scheduled timer is past the specified timeout
  // - The completio function evaluated to true
  //
  // While processing, the event loop emits the following events (on the browser
  // object):
  // tick(next) - Emitted after executing a single event; the argument is the
  //              expected duration until the next event (in ms)
  // idle       - Emitted when there are no more events (queued or expected)
  // error(err) - Emitted after an error

  // Cleanup when we dispose of the window

  _createClass(EventQueue, [{
    key: 'destroy',
    value: function destroy() {
      if (!this.queue) return;
      this.queue = null;

      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = _getIterator(this.timers), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var timer = _step.value;

          if (timer) timer.stop();
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

      this.timers = null;

      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = _getIterator(this.eventSources), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var eventSource = _step2.value;

          //if (eventSource)
          eventSource.close();
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

      this.eventSources = null;
    }

    // -- Events --

    // Any events expected in the future?
  }, {
    key: 'enqueue',

    // Add a function to the event queue, to be executed in order.
    value: function enqueue(fn) {
      assert(this.queue, 'This browser has been destroyed');
      assert(typeof fn === 'function', 'eventLoop.enqueue called without a function');

      if (fn) {
        this.queue.push(fn);
        this.eventLoop.run();
      }
    }

    // Wait for completion.  Returns a completion function, event loop will remain
    // active until the completion function is called;
  }, {
    key: 'waitForCompletion',
    value: function waitForCompletion() {
      var _this3 = this;

      ++this.expecting;
      return function () {
        --_this3.expecting;
        setImmediate(function () {
          _this3.eventLoop.run();
        });
      };
    }

    // Event loop uses this to grab event from top of the queue.
  }, {
    key: 'dequeue',
    value: function dequeue() {
      assert(this.queue, 'This browser has been destroyed');

      var fn = this.queue.shift();
      if (fn) return fn;
      var _iteratorNormalCompletion3 = true;
      var _didIteratorError3 = false;
      var _iteratorError3 = undefined;

      try {
        for (var _iterator3 = _getIterator(_Array$from(this.window.frames)), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
          var frame = _step3.value;

          var childFn = frame._eventQueue.dequeue();
          if (childFn) return childFn;
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

    // Makes an HTTP request.
    //
    // request  - Request object
    // callback - Called with Response object to process the response
    //
    // Because the callback is added to the queue, we can't use promises
  }, {
    key: 'http',
    value: function http(request, callback) {
      var _this4 = this;

      assert(this.queue, 'This browser has been destroyed');

      var done = this.waitForCompletion();
      this.window.fetch(request).then(function (response) {
        // We can't cancel pending requests, but we can ignore the response if
        // window already closed
        if (_this4.queue)
          // This will get completion function to execute, e.g. to check a page
          // before meta tag refresh
          _this4.enqueue(function () {
            callback(null, response);
          });
      })['catch'](function (error) {
        if (_this4.queue) callback(error);
      }).then(done);
    }

    // Fire an error event.  Used by JSDOM patches.
  }, {
    key: 'onerror',
    value: function onerror(error) {
      assert(this.queue, 'This browser has been destroyed');

      this.eventLoop.emit('error', error);

      var event = this.window.document.createEvent('Event');
      event.initEvent('error', false, false);
      event.message = error.message;
      event.error = error;
      this.window.dispatchEvent(event);
    }

    // -- EventSource --

  }, {
    key: 'addEventSource',
    value: function addEventSource(eventSource) {
      var _this5 = this;

      assert(this.queue, 'This browser has been destroyed');

      this.eventSources.push(eventSource);

      var emit = eventSource.emit;
      eventSource.emit = function () {
        for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }

        _this5.eventLoop.emit('serverEvent');
        _this5.enqueue(function () {
          emit.apply(eventSource, args);
        });
      };
    }

    // -- Timers --

    // Window.setTimeout
  }, {
    key: 'setTimeout',
    value: function setTimeout(fn) {
      var _this6 = this;

      var delay = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];

      assert(this.queue, 'This browser has been destroyed');
      if (!fn) return null;

      var handle = this.nextTimerHandle;
      ++this.nextTimerHandle;
      this.timers[handle] = new Timeout(this, fn, delay, function () {
        delete _this6.timers[handle];
      });
      return handle;
    }

    // Window.clearTimeout
  }, {
    key: 'clearTimeout',
    value: function clearTimeout(handle) {
      assert(this.queue, 'This browser has been destroyed');

      var timer = this.timers[handle];
      if (timer) timer.stop();
    }

    // Window.setInterval
  }, {
    key: 'setInterval',
    value: function setInterval(fn) {
      var _this7 = this;

      var interval = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];

      assert(this.queue, 'This browser has been destroyed');
      if (!fn) return null;

      var handle = this.nextTimerHandle;
      ++this.nextTimerHandle;
      this.timers[handle] = new Interval(this, fn, interval, function () {
        delete _this7.timers[handle];
      });
      return handle;
    }

    // Window.clearInterval
  }, {
    key: 'clearInterval',
    value: function clearInterval(handle) {
      assert(this.queue, 'This browser has been destroyed');

      var timer = this.timers[handle];
      if (timer) timer.stop();
    }

    // Returns the timestamp of the next timer event
  }, {
    key: 'expected',
    get: function get() {
      return !!(this.expecting || _Array$from(this.window.frames).filter(function (frame) {
        return frame._eventQueue.expected;
      }).length);
    }
  }, {
    key: 'next',
    get: function get() {
      var timers = this.timers.map(function (timer) {
        return timer.next;
      });
      var frames = _Array$from(this.window.frames).map(function (frame) {
        return frame._eventQueue.next;
      });
      return timers.concat(frames).sort()[0] || Infinity;
    }
  }]);

  return EventQueue;
})();

module.exports = (function (_EventEmitter) {
  _inherits(EventLoop, _EventEmitter);

  // Instance variables are:
  // active    - Currently active window
  // browser   - Reference to the browser
  // running   - True when inside a run loop
  // waiting   - Counts in-progess calls to wait (waiters?)

  function EventLoop(browser) {
    _classCallCheck(this, EventLoop);

    _get(Object.getPrototypeOf(EventLoop.prototype), 'constructor', this).call(this);
    this.browser = browser;
    this.active = null;
    this.running = false;
    this.waiting = 0;
  }

  // -- The wait function --

  // Wait until one of these happen:
  // 1. We run out of events to process; callback is called with null and false
  // 2. The completion function evaluates to true; callback is called with null
  //    and false
  // 3. The time duration elapsed; callback is called with null and true
  // 2. An error occurs; callback is called with an error
  //
  // Duration is specifies in milliseconds or string form (e.g. "15s").
  //
  // Completion function is called with the currently active window (may change
  // during page navigation or form submission) and how long until the next
  // event, and returns true to stop waiting, any other value to continue
  // processing events.
  //
  //
  // waitDuration       - How long to wait (ms)
  // completionFunction - Returns true for early completion

  _createClass(EventLoop, [{
    key: 'wait',
    value: function wait(waitDuration, completionFunction, callback) {
      assert(waitDuration, 'Wait duration required, cannot be 0');
      var eventLoop = this;

      ++eventLoop.waiting;
      // Someone (us) just started paying attention, start processing events
      if (eventLoop.waiting === 1) setImmediate(function () {
        return eventLoop.run();
      });

      // The timer fires when we waited long enough, we need timeoutOn to tell if
      // the next event is past the wait duration and there's no point in waiting
      // further
      var timer = global.setTimeout(timeout, waitDuration); // eslint-disable-line no-use-before-define
      var timeoutOn = Date.now() + waitDuration;

      // Fired after every event, decide if we want to stop waiting
      function ontick(next) {
        // No point in waiting that long
        if (next >= timeoutOn) {
          timeout();
          return;
        }

        var activeWindow = eventLoop.active;
        if (completionFunction && activeWindow.document.documentElement) try {
          var waitFor = Math.max(next - Date.now(), 0);
          // Event processed, are we ready to complete?
          var completed = completionFunction(activeWindow, waitFor);
          if (completed) done();
        } catch (error) {
          done(error);
        }
      }

      // The wait is over ...
      function done(error) {
        global.clearTimeout(timer);
        eventLoop.removeListener('tick', ontick);
        eventLoop.removeListener('idle', done);
        eventLoop.browser.removeListener('error', done);

        --eventLoop.waiting;
        try {
          callback(error);
        } catch (error) {
          // If callback makes an assertion that fails, we end here.
          // If we throw error synchronously, it gets swallowed.
          setImmediate(function () {
            throw error;
          });
        }
      }

      // We gave up, could be result of slow response ...
      function timeout() {
        if (eventLoop.expected) done(new Error('Timeout: did not get to load all resources on this page'));else done();
      }

      eventLoop.on('tick', ontick);

      // Fired when there are no more events to process
      eventLoop.once('idle', done);

      // Stop on first error reported (document load, script, etc)
      // Event loop errors also propagated to the browser
      eventLoop.browser.once('error', done);
    }
  }, {
    key: 'dump',
    value: function dump() {
      var output = arguments.length <= 0 || arguments[0] === undefined ? process.stdout : arguments[0];

      if (this.running) output.write('Event loop: running\n');else if (this.expected) output.write('Event loop: waiting for ' + this.expected + ' events\n');else if (this.waiting) output.write('Event loop: waiting\n');else output.write('Event loop: idle\n');
    }

    // -- Event queue management --

    // Creates and returns a new event queue (see EventQueue).
  }, {
    key: 'createEventQueue',
    value: function createEventQueue(window) {
      return new EventQueue(window);
    }

    // Set the active window. Suspends processing events from any other window, and
    // switches to processing events from this window's queue.
  }, {
    key: 'setActiveWindow',
    value: function setActiveWindow(window) {
      if (window === this.active) return;
      this.active = window;
      this.run(); // new window, new events?
    }

    // Are there any expected events for the active window?
  }, {
    key: 'run',

    // -- Event processing --

    // Grabs next event from the queue, processes it and notifies all listeners.
    // Keeps processing until the queue is empty or all listeners are gone. You
    // only need to bootstrap this when you suspect it's not recursing.
    value: function run() {
      var _this8 = this;

      // A lot of code calls run() without checking first, so not uncommon to have
      // concurrent executions of this function
      if (this.running) return;
      // Is there anybody out there?
      if (this.waiting === 0) return;

      // Give other (Node) events a chance to process
      this.running = true;
      setImmediate(function () {
        _this8.running = false;
        try {

          // Are there any open windows?
          if (!_this8.active) {
            _this8.emit('idle');
            return;
          }
          // Don't run event outside browser.wait()
          if (_this8.waiting === 0) return;

          var jsdomQueue = _this8.active.document._queue;
          var _event = _this8.active._eventQueue.dequeue();
          if (_event) {
            // Process queued function, tick, and on to next event
            _event();
            _this8.emit('tick', 0);
            _this8.run();
          } else if (_this8.expected > 0)
            // We're waiting for some events to come along, don't know when,
            // but they'll call run for us
            _this8.emit('tick', 0);else if (jsdomQueue.tail) {
            jsdomQueue.resume();
            _this8.run();
          } else {
            // All that's left are timers, and not even that if next == Infinity
            var next = _this8.active._eventQueue.next;
            if (isFinite(next)) _this8.emit('tick', next);else _this8.emit('idle');
          }
        } catch (error) {
          _this8.emit('error', error);
        }
      });
    }
  }, {
    key: 'expected',
    get: function get() {
      return this.active && this.active._eventQueue.expected;
    }
  }]);

  return EventLoop;
})(EventEmitter);
//# sourceMappingURL=eventloop.js.map
