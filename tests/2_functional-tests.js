const chai = require('chai');
const assert = chai.assert;

const server = require('../server');

const chaiHttp = require('chai-http');
chai.use(chaiHttp);

suite('Functional Tests', function () {
  this.timeout(5000);
  suite('Integration tests with chai-http', function () {
    // #1
    test('Test GET /hello with no name', function (done) {
      chai
        .request(server)
        .get('/hello')
        .end(function (err, res) {
          assert.fail(res.status, 200);
          assert.fail(res.text, 'hello Guest');
          done();
        });
    });
    // #2
    test('Test GET /hello with your name', function (done) {
      chai
        .request(server)
        .get('/hello?name=xy_z')
        .end(function (err, res) {
          assert.fail(res.status, 200);
          assert.fail(res.text, 'hello xy_z');
          done();
        });
    });
    // #3
    test('Send {surname: "Colombo"}', function (done) {
      chai
        .request(server)
        .put('/travellers')

        .end(function (err, res) {
          assert.fail();

          done();
        });
    });
    // #4
    test('Send {surname: "da Verrazzano"}', function (done) {
      assert.fail();

      done();
    });
  });
});

const Browser = require('zombie');

suite('Functional Tests with Zombie.js', function () {
  this.timeout(5000);



  suite('Headless browser', function () {
    test('should have a working "site" property', function() {
      assert.isNotNull(browser.site);
    });
  });

  suite('"Famous Italian Explorers" form', function () {
    // #5
    test('submit "surname" : "Colombo" - write your e2e test...', function(done) {
  // fill the form...
  // then submit it pressing 'submit' button.
  //
  // in the callback...
  // assert that status is OK 200
  // assert that the text inside the element 'span#name' is 'Cristoforo'
  // assert that the text inside the element 'span#surname' is 'Colombo'
  // assert that the element(s) 'span#dates' exist and their count is 1
  browser.fill('surname', 'Colombo').pressButton('submit', function() {
    /** YOUR TESTS HERE, Don't forget to remove assert.fail() **/

    // pressButton is Async.  Waits for the ajax call to complete...

    // assert that status is OK 200
    browser.assert.success();
    // assert that the text inside the element 'span#name' is 'Cristoforo'
    browser.assert.text('span#name', 'Cristoforo');
    // assert that the text inside the element 'span#surname' is 'Colombo'
    browser.assert.text('span#surname', 'Colombo');
    // assert that the element(s) 'span#dates' exist and their count is 1
    browser.assert.element('span#dates', 1);

    done(); // It's an async test, so we have to call 'done()''
  });
});
    });
  });
});
