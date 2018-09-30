var chai = require('chai');
var assert = chai.assert;

suite('Unit Tests', function(){
  
  // Make ALL tests pass
  // !! Don't scramble the Assertions. We rely on their order to check the results !!
  suite('Basic Assertions', function() {
    /** assert.fail() will always fail. Change it into something more useful... **/
  
    /** 1 - Use assert.isNull() or assert.isNotNull() to make the tests pass. **/
    test('#isNull, #isNotNull', function(){
      assert.fail(null, 'this is an optional error description - e.g. null is null');
      assert.fail( 1, '1 is not null');
    });
  
    /** 2 - Use assert.isDefined() or assert.isUndefined() to make the tests pass. **/
    test('#isDefined, #isUndefined', function(){
      assert.fail( null, 'null is not undefined');
      assert.fail( undefined, 'undefined IS undefined');
      assert.fail( 'hello', 'a string is not undefined' );
    });
  
    /** 3 - Use assert.isOk() or assert.isNotOk() to make the tests pass. **/
    // .isOk(truthy) and .isNotOk(falsey) will pass
    test('#isOk, #isNotOk', function(){
      assert.fail( null, 'null is falsey');
      assert.fail( "I'm truthy", 'a string is truthy');
      assert.fail( true, 'true is truthy' );
    });
  
    /** 4 - Use assert.isTrue() or assert.isNotTrue() to make the tests pass. **/
    // .isTrue(true) and .isNotTrue(everything else) will pass.
    // .isFalse() and .isNotFalse() also exist.
    test('#isTrue, #isNotTrue', function(){
      assert.fail( true, 'true is true');
      assert.fail( !!'double negation', 'double negation of a truthy is true');
      assert.fail({ value: 'truthy' }, 'A truthy object is NOT TRUE (neither is false...)' );
    });
  
    // There are more assertions like these: .isNaN(), .isBoolean(), 
    // and many others. Almost all the assertions in the chai library
    // have their negative counterpart - e.g. .isNotBoolean(), ...
  });
  
  // -----------------------------------------------------------------------------
  
  suite('Equality', function() {
    /** 5 - .equal(), .notEqual() **/
    // .equal() compares objects using '=='
    test('#equal, #notEqual', function(){
      assert.fail( 12, '12', 'numbers are coerced into strings with == ');
      assert.fail( {value: 1}, {value:1}, '== compares object references');
      assert.fail( 6 * '2', '12', 'no more hints...');
      assert.fail( 6 + '2', '12', 'type your error message if you want' );
    });
    /** 6 - .strictEqual(), .notStrictEqual() **/
    // .strictEqual() compares objects using '==='
    test('#strictEqual, #notStrictEqual', function(){
      assert.fail( 6, '6' );
      assert.fail( 6, 3*2 );
      assert.fail( 6 * '2', 12 );
      assert.fail( [1, 'a', {} ], [1, 'a', {}] );
    });
    /** 7 - .deepEqual(), .notDeepEqual() **/
    // .deepEqual() asserts that two object are deep equal
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
    
    /** 8 - .isAbove() => a > b , .isAtMost() => a <= b **/
    test('#isAbove, #isAtMost', function() {
      assert.fail('hello'.length , 5);
      assert.fail(1, 0);
      assert.fail(Math.PI, 3);
      assert.fail(1 - Math.random(), 1);
    });

    /** 9 - .isBelow() => a < b , .isAtLeast =>  a >= b **/
    test('#isBelow, #isAtLeast', function() {
      assert.fail('world'.length , 5);
      assert.fail(2*Math.random(), 0);
      assert.fail(5 % 2, 2);
      assert.fail(2/3, 1);
    });

    /** 10 - .approximately **/
    // .approximately(actual, expected, range, [message])
    // actual = expected +/- range
    // Choose the minimum range (3rd parameter) to make the test always pass
    // it should be less than 1
    test('#approximately', function() {
      assert.approximately(weirdNumbers(0.5) , 1, /*edit this*/ 0 );
      assert.approximately(weirdNumbers(0.2) , 1, /*edit this*/ 0 );
    });
  });

// -----------------------------------------------------------------------------

  // These variables are used in the tests. Don't Edit them.
  var winterMonths = ['dec,','jan', 'feb', 'mar'];
  var backendLanguages = ['php', 'python', 'javascript', 'ruby', 'asp'];
  suite('Arrays', function(){
    
    /** 11 - #isArray vs #isNotArray **/
    test('#isArray, #isNotArray', function() {
      assert.fail('isThisAnArray?'.split(''), 'String.prototype.split() returns an Array');
      assert.fail([1,2,3].indexOf(2), 'indexOf returns a number.');
    });
    
    /** 12 - #include vs #notInclude **/
    test('Array #include, #notInclude', function() {
      assert.fail(winterMonths, 'jul', "It's summer in july...");
      assert.fail(backendLanguages, 'javascript', 'JS is a backend language !!');
    });
  });

// -----------------------------------------------------------------------------

  // These variables are used in the tests. Don't Edit them.
  var formatPeople = function(name, age) {
    return '# name: ' + name + ', age: ' + age + '\n';
  };
  suite('Strings', function(){
    
    /** 13 - #isString asserts that the actual value is a string. **/
    test('#isString, #isNotString', function() {
      assert.fail(Math.sin(Math.PI/4), 'a float is not a string');
      assert.fail(process.env.PATH, 'env vars are strings (or undefined)');
      assert.fail(JSON.stringify({type: 'object'}), 'a JSON is a string');
    });
    
    /** 14 - #include (on #notInclude ) works for strings too !! **/
    // It asserts that the actual string contains the expected substring
    test('String #include, #notInclude', function() {
      assert.fail('Arrow', 'row', "Arrow contains row...");
      assert.fail('dart', 'queue', "But a dart doesn't contain a queue");
    });
    
    /** 15 - #match Asserts that th actual value **/
    // matches the second argument regular expression.
    test('#match, #notMatch', function() {
      var regex =  /^#\sname\:\s[\w\s]+,\sage\:\s\d+\s?$/;
      assert.fail(formatPeople('John Doe', 35), regex);
      assert.fail(formatPeople('Paul Smith III', 'twenty-four'), regex);
    });
  });
  
 // ----------------------------------------------------------------------------- 

  // These variables are used in the tests. Don't Edit them.
  var Car = function() {
    this.model = 'cedan';
    this.engines = 1;
    this.wheels = 4;
  };

  var Plane = function() {
    this.model = '737';
    this.engines = ['left', 'right'];
    this.wheels = 6;
    this.wings = 2;
  };
  
  var myCar = new Car();
  var airlinePlane = new Plane();

  suite('Objects', function(){
    
    /** 16 - #property asserts that the actual object has a given property. **/
    // Use #property or #notProperty where appropriate
    test('#property, #notProperty', function() {
      assert.fail(myCar, 'wings', 'A car has not wings');
      assert.fail(airlinePlane, 'engines', 'planes have engines');
      assert.fail(myCar, 'wheels', 'Cars have wheels');
    });

    test('#typeof, #notTypeOf', function() {
      
      /** 17 #typeOf asserts that value’s type is the given string, **/
      // as determined by Object.prototype.toString.
      // Use #typeOf or #notTypeOf where appropriate
      assert.fail(myCar, 'object');
      assert.fail(myCar.model, 'string');
      assert.fail(airlinePlane.wings, 'string');
      assert.fail(airlinePlane.engines, 'array');
      assert.fail(myCar.wheels, 'number');
    });

    test('#instanceOf, #notInstanceOf', function() {
      
      /** 18 #instanceOf asserts that an object is an instance of a constructor **/
      // Use #instanceOf or #notInstanceOf where appropriate
      assert.fail(myCar, Plane);
      assert.fail(airlinePlane, Plane);
      assert.fail(airlinePlane, Object, 'everything is an Object');
      assert.fail(myCar.wheels, String );
    });
  });
  
// -----------------------------------------------------------------------------
});

/** 
 * Good Job, You are done here !!! 
 *  Please go to the file "2_functional_tests.js" ... 
 **/