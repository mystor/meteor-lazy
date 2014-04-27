Lazy = {
  load: function load(file) {
    var script = document.createElement('script');
    script.setAttribute('src', Meteor.absuluteUrl(file));
    document.body.appendChild(script);
  }
};

__register_lazy_file = function(fname) {
  console.log(fname);
};

