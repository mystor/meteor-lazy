File = function(js, css, evalFn) {
  this.js = js;
  this.css = css;
  this.evalFn = evalFn;
  this.loaded = false;
};

_.extend(File.prototype, {
  load: function(callback) {
    var self = this;

    var loadedTarget = this.js.length + this.css.length;
    var loadedCount = 0;
    var loaded = [];
    
    _.each(this.css, function(css) {
      var link = document.createElement('link');
      link.setAttribute('rel', 'stylesheet');
      link.setAttribute('href', Meteor.absoluteUrl(css));
      link.addEventListener('load', function(e) {
        loadedCount++;
        if (loadedCount >= loadedTarget) {
          self._evalJs(loaded);

          if (typeof callback === 'function')
            callback(null);
        }
      });
      document.head.appendChild(link);
    });

    // Loading the javascript is a bit more annoying. 
    // We want to be sure that we execute them in the correct
    // order, and we want to evaluate them with evalFn.
    _.each(this.js, function(js, i) {
      HTTP.get(Meteor.absoluteUrl(js), function(err, data) {
        if (err) {
          if (typeof callback === 'function')
            callback(err);
          else
            throw err;
        } else {
          loaded[i] = {
            data: data.content,
            url: Meteor.absoluteUrl(js)
          };

          loadedCount++;
          if (loadedCount >= loadedTarget) {
            self._evalJs(loaded);

            if (typeof callback === 'function')
              callback(null);
          }
        }
      });
    });

    this.loaded = true;
  },

  _evalJs: function(js) {
    var self = this;

    _.each(js, function(file) {
      var src = file.data + '\n//# sourceURL=' + file.url + '\n';
      self.evalFn(src);
    });
  }
});

