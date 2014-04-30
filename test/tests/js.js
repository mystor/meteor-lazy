var assert = require('assert');

suite('js', function() {
  suite('client', function() {
    test('lazy javascript not loaded', function(done, server, client) {
      var client_loaded = client.evalSync(function() {
        emit('return', window.lazy_js_loaded);
      });

      assert(!client_loaded, 'client lazy javascript loaded');

      done();
    });

    test('not-lazy javascript loaded', function(done, server, client) {
      var client_loaded = client.evalSync(function() {
        emit('return', window.notlazy_js_loaded);
      });

      assert(client_loaded, 'client not-lazy javascript not loaded');

      done();
    })
  });

  suite('server', function() {
    test('lazy javascript not loaded', function(done, server) {
      var server_loaded = server.evalSync(function() {
        emit('return', global.lazy_js_loaded);
      });

      assert(!server_loaded, 'server lazy javascript loaded');

      done();
    });

    test('not-lazy javascript loaded', function(done, server) {
      var server_loaded = server.evalSync(function() {
        emit('return', global.notlazy_js_loaded);
      });

      assert(server_loaded, 'client not-lazy javascript not loaded');

      done();
    });
  });
});
