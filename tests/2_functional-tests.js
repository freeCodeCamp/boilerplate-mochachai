const chai = require("chai");
const assert = chai.assert;

const server = require("../server");

const chaiHttp = require("chai-http");
chai.use(chaiHttp);

suite("Functional Tests", function () {
  suite("Integration tests with chai-http", function () {
    // #1
    test("Test GET /hello with no name", function (done) {
      chai
        .request(server)
        .get("/hello")
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.equal(res.text, "hello Guest");
          done();
        });
    });
    // #2
    test("Test GET /hello with your name", function (done) {
      chai
        .request(server)
        .get("/hello?name=xy_z")
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.equal(res.text, "hello xy_z");
          done();
        });
    });
    // #3
    test('send {surname: "Colombo"}', function (done) {
      chai
        .request(server)
        .put("/travellers")
        .send({'surname': 'Colombo'})
        .end(function (err, res) {
        assert.deepEqual([res.body], [{"name": "Cristoforo", "surname": "Colombo", "dates": "1451 - 1506"}]);
        done();
        });
    });
    // #4
    test('send {surname: "da Verrazzano"}', function (done) {
      chai
        .request(server)
        .put("/travellers")
        .send({'surname': 'da Verrazzano'})
        .end(function (err, res){
          assert.deepEqual(res.body, {"name": "Giovanni", "surname": "da Verrazzano", "dates": "1485 - 1528"});
          done();
        });
    });
  });
});

const Browser = require("zombie");
// Browser.localhost('example.com',3000)

suite("Functional Tests with Zombie.js", function () {

  suite('"Famous Italian Explorers" form', function () {
    // #5
    test('submit "surname" : "Colombo" - write your e2e test...', function (done) {
      const browser = new Browser();
      browser.visit('/');
      browser.fill("surname", "Colombo").pressButton("submit", function () {
        assert.deepEqual([res.body], [{"name": "Cristoforo", "surname": "Colombo", "dates": "1451 - 1506"}]);
        done();
      });
    });
    // #6
    test('submit "surname" : "Vespucci" - write your e2e test...', function (done) {
      assert.fail();

      done();
    });
  });
});
