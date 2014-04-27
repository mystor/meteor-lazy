var frontMatter = Npm.require('yaml-front-matter');
var _ = Npm.require('underscore');
var path = Npm.require('path');
var sourcemap = Npm.require('source-map');
var unipackage = Npm.require('./unipackage.js');
var release = Npm.require('./release.js');

var minifiers = unipackage.load({
  library: release.current.library,
  packages: ['minifiers']
}).minifiers;

var CssTools = minifiers.CssTools;

function mergeCss(css) {
  var originals = {};
  var cssAsts = _.map(css, function(options) {
    var filename = options.servePath.replace(/^\//, '');
    originals[filename] = options;

    var parseOptions = { source: filename, position: true };
    var ast = CssTools.parseCss(options.data, parseOptions);
    ast.filename = filename;

    return ast;
  });

  var warnCb = function(filename, msg) {
    console.warn(filename + ': warn: ' + msg);
  };

  // Woo cache!
  var astCache = CssTools.mergeCssAsts(cssAsts, warnCb);

  var stringifiedCss = CssTools.stringifyCss(astCache, { sourcemap: true });

  stringifiedCss.map.sourcesContent =
    _.map(stringifiedCss.map.sources, function(filename) {
      return originals[filename].data;
    });

  // Woo compose source maps
  var newMap = sourcemap.SourceMapGenerator.fromSourceMap(
    new sourcemap.SourceMapConsumer(stringifiedCss.map));

  _.each(originals, function(options, name) {
    if (! options.sourceMap)
      return;

    try {
      newMap.applySourceMap(
        new sourcemap.SourceMapConsumer(options.sourceMap), name);
    } catch (err) {/* no-op */}
  });

  return {
    sourceMap: JSON.stringify(newMap),
    data: stringifiedCss.code,
    ast: astCache
  };
};

function minifyCss(css) {
  var minifiedCss = '';

  if (css.ast) {
    return {data: CssTools.minifyCssAst(css.ast)};
  } else {
    return {data: CssTools.minifyCss(css.data)};
  }
}

function genHandler(extension, handler) {
  return function(compileStep) {
    var isBrowser = compileStep.archMatches('browser');

    if (!isBrowser)
      return;

    var fm = frontMatter.loadFront(compileStep.read());

    // You can declare that a file shouldn't be served in the frontmatter
    // If you do this, it won't be served to the client.
    // This is useful if you want to instead use lazypackages to serve the file
    if (fm.no_serve)
      return;

    var contents = new Buffer(fm.__content, 'utf8');

    var css = [];
    var js = [];

    var readOffset = 0;
    // Shim around the compileStep to capture addStylesheet & addJavaScript calls
    var cStep = _.defaults({
      inputSize: contents.length,

      read: function(n) {
        if (n === undefined || readOffset + n > contents.length)
          n = contents.length - readOffset;

        var ret = contents.slice(readOffset, readOffset + n);
        readOffset += n;
        return ret;
      },

      appendDocument: function(options) {
        console.warn('The lazy file ' +
                     compileStep.inputPath +
                     ' appends a document section.\n' +
                     'This will not occur lazily.');

        compileStep.appendDocument(options);
      },

      addStylesheet: function(options) {
        if (!isBrowser)
          throw new Error("Stylesheets can only be emitted to " +
                          "browser targets");
        if (typeof options.data !== 'string')
          throw new Error("'data' option to addStylesheet must be a string");

        css.push(options);
      },

      addJavaScript: function(options) {
        if (typeof options.data !== 'string')
          throw new Error("'data' option to addJavaScript must be a string");
        if (typeof options.sourcePath !== 'string')
          throw new Error("'sourcePath' option must be supplied to addJavaScript.  Consider passing inputPath.");
        if (options.bare && ! archInfo.matches(self.arch, "browser"))
          throw new Error("'bare' option may only be used for browser targets");

        js.push(options);
      }
    }, compileStep);

    handler(cStep);

    var clientJs = "// Notify client about existence of lazy loadable files\n";

    if (css.length > 0) {
      var css = _.map(css, function(options) {
        options.servePath = path.join(compileStep.rootOutputPath, options.path);
        return options;
      });

      css = mergeCss(css);

      if (fm.minify)
        css = minifyCss(css);

      if (css.sourceMap) {
        css.data += "\n\n/*# sourceMappingURL=" + path.basename(compileStep.inputPath) + ".css.map */";

        compileStep.addAsset({
          data: new Buffer(css.sourceMap, 'utf8'),
          path: compileStep.inputPath + ".css.map"
        });
      }

      compileStep.addAsset({
        data: new Buffer(css.data, 'utf8'),
        path: compileStep.inputPath + ".css"
      });
      console.log(compileStep);

      clientJs += "Package.lazy.Lazy.__register_css(" + JSON.stringify(compileStep.inputPath + ".css") + ");\n";
    }

    if (js.length > 0) {
      // TODO: Implement
    }

    // Register these files on the client
    compileStep.addJavaScript({
      path: compileStep.inputPath + ".register.js",
      sourcePath: compileStep.inputPath,
      data: clientJs
    });
  }
}

function registerExtension(extension, handler) {
  if (/^lazy\./.test(extension))
    return;

  Plugin.registerSourceHandler('lazy.' + extension, genHandler(extension, handler));
}

function registerSourceHandlers() {
  var library = release.current.library;

  var soft = library.softReloadCache;
  var loaded = library.loadedPackages;

  for (k in soft) {
    var sourceHandlers = soft[k].pkg.sourceHandlers;
    for (extension in sourceHandlers)
      registerExtension(extension, sourceHandlers[extension]);
  }

  for (k in loaded) {
    var sourceHandlers = loaded[k].pkg.sourceHandlers;
    for (extension in sourceHandlers)
      registerExtension(extension, sourceHandlers[extension]);
  }
}

function jsRawHandler(compileStep) {
  compileStep.addJavaScript({
    data: compileStep.read().toString('utf8'),
    sourcePath: compileStep.inputPath,
    path: compileStep.inputPath
  });
}

// Register the extensions which will be supported by meteor-lazy
registerExtension('js', jsRawHandler);

// Everything other than js is provided by code, registerSourceHandlers should automatically find them.
registerSourceHandlers();

