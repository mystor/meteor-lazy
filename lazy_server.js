console.log('boom?');
var globalEval = eval;

File = function(js, css, evalFn, Assets) {
  this.js = js;
  // Ignore the CSS
  this.loaded = false;

  this.evalFn = evalFn;
  this.Assets = Assets;
}

_.extend(File.prototype, {
  load: function() {
    if (this.js) {
      var self = this;
      _.each(this.js, function(js) {
        self.evalFn(self.Assets.getText(js));
      })
    }
  }
});

