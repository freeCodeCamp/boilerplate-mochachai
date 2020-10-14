const chai = require('chai');
const assert = chai.assert;

const server = require('../server');

const chaiHttp = require('chai-http');
chai.use(chaiHttp);


suite('Functional Tests', function() {
 
  // ### EXAMPLE ### 
  test('Asynchronous test #example', function(done){
    setTimeout(function(){
      assert.isOk('Async test !!');
      done(); /** Call 'done()' when the async operation is completed**/
    }, 500);   // the function will be executed after 500ms
  });
  
  // NOTE: The tests having #example in their description string,
  // are instructional examples and are not parsed by our test analyser
  
  suite('Integration tests with chai-http', function() {

    // ### EXAMPLE ### 
    suite('GET /hello?name=[name] => "hello [name]"', function(){
      // We send a name string in the url query string.
      test('#example - ?name=John',  function(done){   // Don't forget the callback...
         chai.request(server)             // 'server' is the Express App
          .get('/hello?name=John')        // http_method(url)
          .end(function(err, res){        // Send the request. Pass a callback in
                                          // node style. `res` is the response object
            // res.status contains the status code
            assert.equal(res.status, 200, 'response status should be 200');
            // res.text contains the response as a string
            assert.equal(res.text, 'hello John', 'response should be "hello John"');
            done();
          });
      });
      
      test('Test GET /hello with no name',  function(done){
         chai.request(server)
          .get('/hello')
          .end(function(err, res){
          
            assert.fail(res.status, 200);
            assert.fail(res.text, 'hello Guest');
            done();
          });
      });

      test('Test GET /hello with your name',  function(done){
         chai.request(server)
          .get('/hello?name=xy_z')
          .end(function(err, res){

            assert.fail(res.status, 200);
            assert.fail(res.text, 'hello xy_z');
            done();
          });
      });

    });
    
    // ### EXAMPLE ### 
    suite('PUT /travellers', function(){
      test('#example - responds with appropriate JSON data when sending {surname: "Polo"}',  function(done){
         chai.request(server)
          .put('/travellers')         // note the PUT method
          .send({surname: 'Polo'})    // attach the payload, encoded as JSON
          .end(function(err, res){    // Send the request. Pass a Node callback

            assert.equal(res.status, 200, 'response status should be 200');
            assert.equal(res.type, 'application/json', "Response should be json");
            
            // res.body contains the response parsed as a JS object, when appropriate
            // (i.e the response type is JSON)
            assert.equal(res.body.name, 'Marco', 'res.body.name should be "Marco"');
            assert.equal(res.body.surname, 'Polo', 'res.body.surname should be "Polo"' );
            
            // call 'done()' when... done
            done();
          });
      });
      
      test('send {surname: "Colombo"}',  function(done){
       chai.request(server)
        .put('/travellers')

        .end(function(err, res){

          assert.fail();
          
          done();
        });
      });

      test('send {surname: "da Verrazzano"}', function(done) {

        assert.fail();
        done();
      });
    });

  });

  const Browser = require('zombie');


  suite('e2e Testing with Zombie.js', function() {
 
    suite('"Famous Italian Explorers" form', function() {


      
      // ### EXAMPLE ###
      test('#example - submit the input "surname" : "Polo"', function(done) {
        browser
          .fill('surname', 'Polo')
          .pressButton('submit', function(){
            // pressButton is ## Async ##.  
            // It waits for the ajax call to complete...

            // assert that status is OK 200
            browser.assert.success();
            // assert that the text inside the element 'span#name' is 'Marco'
            browser.assert.text('span#name', 'Marco');
            // assert that the text inside the element 'span#surname' is 'Polo'
            browser.assert.text('span#surname', 'Polo');
            // assert that the element(s) 'span#dates' exist and their count is 1
            browser.assert.element('span#dates', 1);

            done();   // It's an async test, so we have to call 'done()''
          });
      });

      /** Now it's your turn. Please don't use the keyword #example in the title. **/
      
      test('submit "surname" : "Colombo" - write your e2e test...', function(done) {

        // fill the form...
        // then submit it pressing 'submit' button.
        //
        // in the callback...
        // assert that status is OK 200
        // assert that the text inside the element 'span#name' is 'Cristoforo'
        // assert that the text inside the element 'span#surname' is 'Colombo'
        // assert that the element(s) 'span#dates' exist and their count is 1
        browser
          .fill('surname', 'Colombo')
          .pressButton('submit', function(){
            
            /** YOUR TESTS HERE, Don't forget to remove assert.fail() **/
            
            // pressButton is Async.  Waits for the ajax call to complete...

            // assert that status is OK 200

            // assert that the text inside the element 'span#name' is 'Cristoforo'

            // assert that the text inside the element 'span#surname' is 'Colombo'

            // assert that the element(s) 'span#dates' exist and their count is 1
            
            assert.fail();
            
            done();   // It's an async test, so we have to call 'done()''
          });
        // 
      });
      
      /** Try it again... No help this time **/
      test('submit "surname" : "Vespucci" - write your e2e test...', function(done) {

        // fill the form, and submit.
        // assert that status is OK 200
        // assert that the text inside the element 'span#name' is 'Amerigo'
        // assert that the text inside the element 'span#surname' is 'Vespucci'
        // assert that the element(s) 'span#dates' exist and their count is 1
        assert.fail();
        done();
      
      });
    });
  });
});
