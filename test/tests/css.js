var assert = require('assert');

suite('css', function() {
  test('lazy stylesheet not loaded', function(done, server, client) {
    client.eval(function() {
      var rules = [];

      _.each(document.styleSheets, function(styleSheet) {
        if (styleSheet.rules !== null) {
          _.each(styleSheet.rules, function(rule) {
            rules.push(rule.selectorText);
          });
        }
      });

      emit('done', rules);
    }).once('done', function(rules) {
      rules.forEach(function(rule) {
        assert.notEqual(rule, '.lazy-css');
        assert.notEqual(rule, '.lazy-less');
      });

      done();
    });
  });

  test('not-lazy stylesheet loaded', function(done, server, client) {
    var css = false;
    var less = false;
    var cnt = 0;

    client.eval(function() {
      var css = false;
      var less = false;

      _.each(document.styleSheets, function(styleSheet) {
        if (styleSheet.rules !== null) {
          _.each(styleSheet.rules, function(rule) {
            if (rule.selectorText === '.notlazy-css')
              css = true;
            if (rule.selectorText === '.notlazy-less')
              less = true;
          });
        }
      });

      emit('done', css, less);
    }).once('done', function(css, less) {
      assert(css, 'notlazy css not loaded');
      assert(less, 'notlazy less not loaded');

      done();
    });
  });
});

