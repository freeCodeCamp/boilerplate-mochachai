const chai = require('chai');
const assert = chai.assert;

suite('Unit Tests', function(){
  
  // Make ALL tests pass
  // !! Don't scramble the Assertions. We rely on their order to check the results !!
  suite('Basic Assertions', function() {
    test('#isNull, #isNotNull', function(){
      assert.fail(null, 'this is an optional error description - e.g. null is null');
      assert.fail( 1, '1 is not null');
    });
  
    test('#isDefined, #isUndefined', function(){
      assert.fail( null, 'null is not undefined');
      assert.fail( undefined, 'undefined IS undefined');
      assert.fail( 'hello', 'a string is not undefined' );
    });
  
    test('#isOk, #isNotOk', function(){
      assert.fail( null, 'null is falsey');
      assert.fail( "I'm truthy", 'a string is truthy');
      assert.fail( true, 'true is truthy' );
    });
  
    test('#isTrue, #isNotTrue', function(){
      assert.fail( true, 'true is true');
      assert.fail( !!'double negation', 'double negation of a truthy is true');
      assert.fail({ value: 'truthy' }, 'A truthy object is NOT TRUE (neither is false...)' );
    });
  });
  
  // -----------------------------------------------------------------------------
  
  suite('Equality', function() {
    test('#equal, #notEqual', function(){
      assert.fail( 12, '12', 'numbers are coerced into strings with == ');
      assert.fail( {value: 1}, {value:1}, '== compares object references');
      assert.fail( 6 * '2', '12', 'no more hints...');
      assert.fail( 6 + '2', '12', 'type your error message if you want' );
    });

    test('#strictEqual, #notStrictEqual', function(){
      assert.fail( 6, '6' );
      assert.fail( 6, 3*2 );
      assert.fail( 6 * '2', 12 );
      assert.fail( [1, 'a', {} ], [1, 'a', {}] );
    });

    test('#deepEqual, #notDeepEqual', function(){
      assert.fail( { a: '1', b: 5 } , { b: 5, a: '1' }, "keys order doesn't matter" );
      assert.fail( { a: [5, 6] }, { a: [6, 5] }, "array elements position does matter !!" );
    });
  });

// -----------------------------------------------------------------------------
  

  // This function is used in the tests. Don't Edit it.
  function weirdNumbers(delta) {
    return (1 + delta - Math.random());
  }

  suite('Comparisons', function() {
    test('#isAbove, #isAtMost', function() {
      assert.fail('hello'.length , 5);
      assert.fail(1, 0);
      assert.fail(Math.PI, 3);
      assert.fail(1 - Math.random(), 1);
    });

    test('#isBelow, #isAtLeast', function() {
      assert.fail('world'.length , 5);
      assert.fail(2*Math.random(), 0);
      assert.fail(5 % 2, 2);
      assert.fail(2/3, 1);
    });

    test('#approximately', function() {
      assert.approximately(weirdNumbers(0.5) , 1, 0 );
      assert.approximately(weirdNumbers(0.2) , 1, 0 );
    });
  });

// -----------------------------------------------------------------------------

  // These variables are used in the tests. Don't Edit them.
  const winterMonths = ['dec,','jan', 'feb', 'mar'];
  const backendLanguages = ['php', 'python', 'javascript', 'ruby', 'asp'];
  suite('Arrays', function(){
    test('#isArray, #isNotArray', function() {
      assert.fail('isThisAnArray?'.split(''), 'String.prototype.split() returns an Array');
      assert.fail([1,2,3].indexOf(2), 'indexOf returns a number.');
    });
    
    test('Array #include, #notInclude', function() {
      assert.fail(winterMonths, 'jul', "It's summer in july...");
      assert.fail(backendLanguages, 'javascript', 'JS is a backend language !!');
    });
  });

// -----------------------------------------------------------------------------

  // These variables are used in the tests. Don't Edit them.
  const formatPeople = function(name, age) {
    return '# name: ' + name + ', age: ' + age + '\n';
  };
  suite('Strings', function(){
    test('#isString, #isNotString', function() {
      assert.fail(Math.sin(Math.PI/4), 'a float is not a string');
      assert.fail(process.env.PATH, 'env vars are strings (or undefined)');
      assert.fail(JSON.stringify({type: 'object'}), 'a JSON is a string');
    });
    
    test('String #include, #notInclude', function() {
      assert.fail('Arrow', 'row', "Arrow contains row...");
      assert.fail('dart', 'queue', "But a dart doesn't contain a queue");
    });

    test('#match, #notMatch', function() {
      const regex =  /^#\sname\:\s[\w\s]+,\sage\:\s\d+\s?$/;
      assert.fail(formatPeople('John Doe', 35), regex);
      assert.fail(formatPeople('Paul Smith III', 'twenty-four'), regex);
    });
  });
  
 // ----------------------------------------------------------------------------- 

  // These variables are used in the tests. Don't Edit them.
  const Car = function() {
    this.model = 'cedan';
    this.engines = 1;
    this.wheels = 4;
  };

  const Plane = function() {
    this.model = '737';
    this.engines = ['left', 'right'];
    this.wheels = 6;
    this.wings = 2;
  };
  
  const myCar = new Car();
  const airlinePlane = new Plane();

  suite('Objects', function(){
    test('#property, #notProperty', function() {
      assert.fail(myCar, 'wings', 'A car has not wings');
      assert.fail(airlinePlane, 'engines', 'planes have engines');
      assert.fail(myCar, 'wheels', 'Cars have wheels');
    });

    test('#typeOf, #notTypeOf', function() {
      assert.fail(myCar, 'object');
      assert.fail(myCar.model, 'string');
      assert.fail(airlinePlane.wings, 'string');
      assert.fail(airlinePlane.engines, 'array');
      assert.fail(myCar.wheels, 'number');
    });

    test('#instanceOf, #notInstanceOf', function() {
      assert.fail(myCar, Plane);
      assert.fail(airlinePlane, Plane);
      assert.fail(airlinePlane, Object, 'everything is an Object');
      assert.fail(myCar.wheels, String );
    });
  });
  
// -----------------------------------------------------------------------------
});
