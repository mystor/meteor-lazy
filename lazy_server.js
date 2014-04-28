console.log('boom?');
var globalEval = eval;

File = function(js, css, Npm, Assets) {
  this.js = js;
  // Ignore the CSS
  this.loaded = false;

  this.Npm = Npm;
  this.Assets = Assets;
}

_.extend(File.prototype, {
  load: function() {
    if (this.js) {
      //Assets.getText(this.js, function(err, data) {
        //if (!err)
          //globalEval(data);
        //else
          //throw err;
      //});
      this.Assets.getText(this.js);
    }
  }
});

