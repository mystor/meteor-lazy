var files = {};

Lazy = {
  // Lazily load a file.
  // Usage:
  //     Lazy.load('client/someFile.lazy.js');
  // ~ or ~
  //     Lazy.load('namedFileName');
  //
  // Note: This will always load the file, whether or not
  // it has already been loaded.  To only load files which
  // have not been loaded yet, use Lazy.require(file)
  load: function load(file) {
    if (files.hasOwnProperty(file)) {
      files[file].load();
    } else {
      throw new Error('No lazy file with name/path (' + file + ')');
    }
  },

  // Lazily load a file if it hasn't already been loaded.
  // Usage:
  //     Lazy.require('client/someFile.lazy.js');
  // ~ or ~
  //     Lazy.require('namedFileName');
  //
  // Note: This will only load the file if it has already
  // been loaded. To load files even if they have already 
  // been loaded, use Lazy.load(file)
  require: function require(file) {
    if (files.hasOwnProperty(file)) {
      if (files[file].loaded)
        return true;

      files[file].load();
      return false;
    } else {
      throw new Error('No lazy file with name/path (' + file + ')');
    }
  },

  // INTERNAL
  // Registers a file defined by options with the loader, allowing
  // it to be loaded by the program using Lazy.load and Lazy.require
  //
  // We accept Npm and Assets such that the correct Npm and Assets
  // objects can be provided to the file when it is lazy-loaded on
  // the server.
  _register: function _register(options, Npm, Assets) {
    var file = new File(options.js, options.css, Npm, Assets);
    
    if (options.path) {
      if (files.hasOwnProperty(options.path))
        throw new Error('Multiple lazy files have same name/path (' + options.path + ')');

      files[options.path] = file;
    }

    if (options.name) {
      if (files.hasOwnProperty(options.name)) 
        throw new Error('Multiple lazy files have same name/path (' + options.name + ')');

      files[options.name] = file;
    }
  }

};

