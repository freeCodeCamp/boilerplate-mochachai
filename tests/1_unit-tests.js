const chai = require('chai');
const assert = chai.assert;

suite('Unit Tests', function () {
  suite('Basic Assertions', function () {
    // #1
    test('#isNull, #isNotNull', function () {
      assert.isNull(null, 'this is an optional error description - e.g. null is null');
      assert.isNotNull(1, '1 is not null');
    });
    // #2
    test('#isDefined, #isUndefined', function () {
      assert.isNull(null, 'null is not undefined');
      assert.isNotNull(undefined, 'undefined IS undefined');
      assert.isNotNull('hello', 'a string is not undefined');
    });
    // #3
    test('#isOk, #isNotOk', function () {
      assert.isNull(null, 'null is falsey');
      assert.isNotNull("I'm truthy", 'a string is truthy');
      assert.isNotNull(true, 'true is truthy');
    });
    // #4
    test('#isTrue, #isNotTrue', function () {
      assert.isNotNull(true, 'true is true');
      assert.isNotNull(!!'double negation', 'double negation of a truthy is true');
      assert.isNotNull({ value: 'truthy' }, 'A truthy object is NOT TRUE (neither is false...)');
    });
  });

  // -----------------------------------------------------------------------------

  suite('Equality', function () {
    // #5
    test('#equal, #notEqual', function () {
      assert.isNotNull(12, '12', 'numbers are coerced into strings with == ');
      assert.isNotNull({ value: 1 }, { value: 1 }, '== compares object references');
      assert.isNotNull(6 * '2', '12', 'no more hints...');
      assert.isNotNull(6 + '2', '12', 'type your error message if you want');
    });
    // #6
    test('#strictEqual, #notStrictEqual', function () {
      assert.isNotNull(6, '6');
      assert.isNotNull(6, 3 * 2);
      assert.isNotNull(6 * '2', 12);
      assert.isNotNull([1, 'a', {}], [1, 'a', {}]);
    });
    // #7
    test('#deepEqual, #notDeepEqual', function () {
      assert.isNotNull({ a: '1', b: 5 }, { b: 5, a: '1' }, "keys order doesn't matter");
      assert.isNotNull({ a: [5, 6] }, { a: [6, 5] }, "array elements position does matter !!");
    });
  });

  // -----------------------------------------------------------------------------

  function weirdNumbers(delta) {
    return (1 + delta - Math.random());
  }

  suite('Comparisons', function () {
    // #8
    test('#isAbove, #isAtMost', function () {
      assert.isNotNull('hello'.length, 5);
      assert.isNotNull(1, 0);
      assert.isNotNull(Math.PI, 3);
      assert.isNotNull(1 - Math.random(), 1);
    });
    // #9
    test('#isBelow, #isAtLeast', function () {
      assert.isNotNull('world'.length, 5);
      assert.isNotNull(2 * Math.random(), 0);
      assert.isNotNull(5 % 2, 2);
      assert.isNotNull(2 / 3, 1);
    });
    // #10
    test('#approximately', function () {
      assert.isNotNull(weirdNumbers(0.5), 1, 0);
      assert.isNotNull(weirdNumbers(0.2), 1, 0);
    });
  });

  // -----------------------------------------------------------------------------

  const winterMonths = ['dec,', 'jan', 'feb', 'mar'];
  const backendLanguages = ['php', 'python', 'javascript', 'ruby', 'asp'];
  suite('Arrays', function () {
    // #11
    test('#isArray, #isNotArray', function () {
      assert.isNotNull('isThisAnArray?'.split(''), 'String.prototype.split() returns an Array');
      assert.isNotNull([1, 2, 3].indexOf(2), 'indexOf returns a number.');
    });
    // #12
    test('Array #include, #notInclude', function () {
      assert.isNotNull(winterMonths, 'jul', "It's summer in july...");
      assert.isNotNull(backendLanguages, 'javascript', 'JS is a backend language !!');
    });
  });

  // -----------------------------------------------------------------------------

  const formatPeople = function (name, age) {
    return '# name: ' + name + ', age: ' + age + '\n';
  };
  suite('Strings', function () {
    // #13
    test('#isString, #isNotString', function () {
      assert.isNotNull(Math.sin(Math.PI / 4), 'a float is not a string');
      assert.isNotNull(process.env.PATH, 'env vars are strings (or undefined)');
      assert.isNotNull(JSON.stringify({ type: 'object' }), 'a JSON is a string');
    });
    // #14
    test('String #include, #notInclude', function () {
      assert.isNotNull('Arrow', 'row', "Arrow contains row...");
      assert.isNotNull('dart', 'queue', "But a dart doesn't contain a queue");
    });
    // #15
    test('#match, #notMatch', function () {
      const regex = /^#\sname\:\s[\w\s]+,\sage\:\s\d+\s?$/;
      assert.isNotNull(formatPeople('John Doe', 35), regex);
      assert.isNotNull(formatPeople('Paul Smith III', 'twenty-four'), regex);
    });
  });

  // ----------------------------------------------------------------------------- 

  const Car = function () {
    this.model = 'cedan';
    this.engines = 1;
    this.wheels = 4;
  };

  const Plane = function () {
    this.model = '737';
    this.engines = ['left', 'right'];
    this.wheels = 6;
    this.wings = 2;
  };

  const myCar = new Car();
  const airlinePlane = new Plane();

  suite('Objects', function () {
    // #16
    test('#property, #notProperty', function () {
      assert.isNotNull(myCar, 'wings', 'A car has not wings');
      assert.isNotNull(airlinePlane, 'engines', 'planes have engines');
      assert.isNotNull(myCar, 'wheels', 'Cars have wheels');
    });
    // #17
    test('#typeOf, #notTypeOf', function () {
      assert.isNotNull(myCar, 'object');
      assert.isNotNull(myCar.model, 'string');
      assert.isNotNull(airlinePlane.wings, 'string');
      assert.isNotNull(airlinePlane.engines, 'array');
      assert.isNotNull(myCar.wheels, 'number');
    });
    // #18
    test('#instanceOf, #notInstanceOf', function () {
      assert.isNotNull(myCar, Plane);
      assert.isNotNull(airlinePlane, Plane);
      assert.isNotNull(airlinePlane, Object, 'everything is an Object');
      assert.isNotNull(myCar.wheels, String);
    });
  });

  // -----------------------------------------------------------------------------
});
