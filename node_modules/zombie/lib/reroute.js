// Domain routing and port forwarding
//
// Used for mapping hosts and domains to localhost, so you can open TCP
// connections with friendly hostnames to test against the local server.
//
// Can also map any source port to any destination port, so you can use port 80
// to access localhost server running on unprivileged port.

'use strict';

var _Map = require('babel-runtime/core-js/map')['default'];

var _Object$assign = require('babel-runtime/core-js/object/assign')['default'];

var assert = require('assert');
var Net = require('net');

// Routing table.
//
// key   - Source host name or wildcard (e.g. "example.com", "*.example.com")
// value - Object that maps source port to target port
var routing = new _Map();

// Flip this from enableRerouting() so we only inject our code into
// Socket.connect once.
var enabled = false;

// If there's a route for host/port, returns destination port number.
//
// Called recursively to handle wildcards.  Starting with the host
// www.example.com, it will attempt to match routes from most to least specific:
//
//   www.example.com
// *.www.example.com
//     *.example.com
//             *.com
function findTargetPort(_x, _x2) {
  var _again = true;

  _function: while (_again) {
    var hostname = _x,
        port = _x2;
    _again = false;

    var route = routing.get(hostname);
    if (route) return route[port];

    // This will first expand www.hostname.com to *.www.hostname.com,
    // then contract it to *.hostname.com, *.com and finally *.
    var wildcard = hostname.replace(/^(\*\.[^.]+(\.|$))?/, '*.');
    if (wildcard !== '*.') {
      _x = wildcard;
      _x2 = port;
      _again = true;
      route = wildcard = undefined;
      continue _function;
    }
  }
}

// Called once to hack Socket.connect
function enableRerouting() {
  if (enabled) return;
  enabled = true;

  var connect = Net.Socket.prototype.connect;
  Net.Socket.prototype.connect = function (options, callback) {
    if (typeof options === 'object') {
      var port = findTargetPort(options.host, options.port);
      if (port) {
        options = _Object$assign({}, options, { host: 'localhost', port: port });
        return connect.call(this, options, callback);
      }
    }
    return connect.apply(this, arguments);
  };
}

// source - Hostname or host:port (default to port 80)
// target - Target port number
module.exports = function addRoute(source, target) {
  assert(source, 'Expected source address of the form "host:port" or just "host"');
  var sourceHost = source.split(':')[0];
  var sourcePort = source.split(':')[1] || 80;
  var route = routing.get(sourceHost) || {};
  routing.set(sourceHost, route);
  if (!route[sourcePort]) route[sourcePort] = target;
  assert(route[sourcePort] === target, 'Already have routing from ' + source + ' to ' + route[sourcePort]);

  // Enable Socket.connect routing
  enableRerouting();
};
//# sourceMappingURL=reroute.js.map
