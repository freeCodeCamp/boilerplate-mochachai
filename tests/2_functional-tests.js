const chai = require("chai");
const assert = chai.assert;

const server = require("../server");

const chaiHttp = require("chai-http");
chai.use(chaiHttp);

suite("Functional Tests", function () {
  this.timeout(5000);
  suite("Integration tests with chai-http", function () {
    // #1
    test("Test GET /hello with no name", function (done) {
      chai
        .request(server)
        .keepOpen()
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
        .keepOpen()
        .get("/hello?name=aj")
        .end(function (err, res) {
          assert.equal(res.status, 200);
          assert.equal(res.text, "hello aj");
          done();
        });
    });
    // #3
    test('Send {surname: "Colombo"}', function (done) {
      chai
        .request(server)
        .keepOpen()
        .put("/travellers")
        .send({
          surname: "Colombo",
        })

        .end(function (err, res) {
          // assert.fail();]
          assert.equal(res.status, 200);
          assert.equal(res.type, "application/json");
          assert.equal(res.body.name, "Cristoforo");
          assert.equal(res.body.surname, "Colombo");

          done();
        });
    });
    // #4
    test('Send {surname: "da Verrazzano"}', function (done) {
      // assert.fail();
      chai
        .request(server)
        .keepOpen()
        .put("/travellers")
        .send({ surname: "da Verrazzano" })
        .end((err, res) => {
          assert.equal(res.status, 200);
          assert.equal(res.type, "application/json");
          assert.equal(res.body.name, "Giovanni");
          assert.equal(res.body.surname, "da Verrazzano");
        });
      done();
    });
  });
});

const Browser = require("zombie");

// add project URL to the site property
Browser.site = "http://0.0.0.0:3000";
const browser = new Browser();

suite("Functional Tests with Zombie.js", function () {
  suiteSetup(function (done) {
    // this.timeout(5000);
    console.log(browser);
    return browser.visit("/", done);
  });

  suite("Headless browser", function () {
    test('should have a working "site" property', function () {
      assert.isNotNull(browser.site);
    });
  });

  suite('"Famous Italian Explorers" form', function () {
    // #5
    test('Submit the surname "Colombo" in the HTML form', function (done) {
      // assert.fail();
      browser
        .fill("surname", "Colombo")
        .then(() => browser.pressButton("submit"))
        .then(() => {
          // assert that the browser status is OK 200
          // assert.equal(browser.status, 200);
          browser.assert.success();

          // assert that the text inside the element span#name is 'Cristoforo'
          // assert.equal(browser.text('span#name'), 'Cristoforo');
          browser.assert.text("span#name", "Cristoforo");

          // assert that the text inside the element span#surname is 'Colombo'
          // assert.equal(browser.text('span#surname'), 'Colombo');
          browser.assert.text("span#surname", "Colombo");

          //  assert that the elements span#dates exist and that their count is 1
          // assert.equal(browser.querySelectorAll('span#dates').length, 1);
          browser.assert.elements("span#dates", 1);
        })
        .then(() => done())
        .catch(done);

      // done();
    });
    // #6
    test('Submit the surname "Vespucci" in the HTML form', function (done) {
      // assert.fail();
      browser
        .fill("surname", "Vespucci")
        .then(() => browser.pressButton("submit"))
        .then(() => {
          browser.assert.success();
          browser.assert.text('span#name', 'Amerigo');
          browser.assert.text('span#surname', 'Vespucci');
          browser.assert.elements('span#dates', 1);


        }).then(() => done())
        .catch(done);

      // done();
    });
  });
});
