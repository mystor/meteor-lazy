Lazy = {
  _files: {},

  load: function load(file) {
    if (Lazy._files.hasOwnProperty(file)) {
      var loaded = new Function(Lazy._files[file]);

      // Woo arbitrary code execution!
      loaded();
    }
  }
};

__serve_lazy_file = function(fname, fcontents) {
  Lazy._files[fname] = fcontents;
};

