var assert = require('assert');

suite('js', function() {
  suite('client', function() {
    test('lazy javascript not loaded', function(done, server, client) {
      var client_loaded = client.evalSync(function() {
        emit('return', [
          window.lazy_js_loaded,
          window.lazy_coffee_loaded,
          Template.lazy_html
        ]);
      });

      assert(!client_loaded[0], 'lazy javascript loaded');
      assert(!client_loaded[1], 'lazy coffeescript loaded');
      assert(!client_loaded[2], 'lazy html loaded');

      done();
    });

    test('not-lazy javascript loaded', function(done, server, client) {
      var client_loaded = client.evalSync(function() {
        emit('return', [
          window.notlazy_js_loaded,
          window.notlazy_coffee_loaded,
          Template.notlazy_html
        ]);
      });

      assert(client_loaded[0], 'not-lazy javascript not loaded');
      assert(client_loaded[1], 'not-lazy coffeescript not loaded');
      assert(client_loaded[2], 'not-lazy html not loaded');

      done();
    });
  });

  suite('server', function() {
    test('lazy javascript not loaded', function(done, server) {
      var server_loaded = server.evalSync(function() {
        emit('return', [
          global.lazy_js_loaded,
          global.lazy_coffee_loaded
        ]);
      });

      assert(!server_loaded[0], 'lazy javascript loaded');
      assert(!server_loaded[1], 'lazy coffeescript loaded');

      done();
    });

    test('not-lazy javascript loaded', function(done, server) {
      var server_loaded = server.evalSync(function() {
        emit('return', [
          global.notlazy_js_loaded,
          global.notlazy_coffee_loaded
        ]);
      });

      assert(server_loaded[0], 'not-lazy javascript not loaded');
      assert(server_loaded[1], 'not-lazy coffeescript not loaded');

      done();
    });
  });
});

