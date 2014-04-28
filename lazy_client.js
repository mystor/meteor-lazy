File = function(js, css) {
  this.js = js;
  this.css = css;
  this.loaded = false;
};

_.extend(File.prototype, {
  load: function() {
    if (this.js) {
      var script = document.createElement('script');
      script.setAttribute('src', Meteor.absoluteUrl(this.js));
      document.body.appendChild(script);
    }

    if (this.css) {
      var link = document.createElement('link');
      link.setAttribute('rel', 'stylesheet');
      link.setAttribute('href', Meteor.absoluteUrl(this.css));
      document.head.appendChild(link);
    }

    this.loaded = true;
  }
});

