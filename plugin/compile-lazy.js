var frontMatter = Npm.require('yaml-front-matter');
var _ = Npm.require('underscore');
var path = Npm.require('path');
var sourcemap = Npm.require('source-map');
var unipackage = Npm.require('./unipackage.js');
var release = Npm.require('./release.js');
var Fiber = Npm.require('fibers');

// We will load the minifiers package.  This is the same package
// which is used internally by the bundler to combine & minify
// css and js for use in Meteor applications.
var minifiers = unipackage.load({
  library: release.current.library,
  packages: ['minifiers']
}).minifiers;

var CssTools = minifiers.CssTools;

// Re-implementations of useful functions from the bundler for handling CSS
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

function mergeSourceMaps(first, second) {
  first = JSON.parse(first);
  second = JSON.parse(second);

  var map = sourcemap.SourceMapGenerator.fromSourceMap(new sourcemap.SourceMapConsumer(second));
  map.applySourceMap(new sourcemap.SourceMapConsumer(first));

  return map.toString();
}

function stripFrontMatter(data, pathForSourceMap) {
  var map = new sourcemap.SourceNode(null, null, null, "");
  var sourceLines = data.split('\n');
  var inFm = /^--- *\n/.test(data);
  var fmSrc = '';

  // Don't use the first line to end the frontmatter
  if (inFm)
    sourceLines = sourceLines.slice(1);

  _.each(sourceLines, function(line, linum) {
    if (inFm) {
      if (/^--- *$/.test(line))
        inFm = false;
      else
        fmSrc += "\n" + line;
    } else {
      map.add(new sourcemap.SourceNode(linum + 2, 0, pathForSourceMap, line + '\n'));
    }
  });

  // TODO: Actually parse the frontmatter
  var fm = {};

  var ret = map.toStringWithSourceMap({ file: pathForSourceMap });
  ret.fm = fm;

  return ret;
}

// Generates a handler for a lazy version of an extension.
// Will delegate compiling to the original extension, but also 
// handle making the extension lazy loaded.
function genHandler(extension, handler) {
  return function(compileStep) {
    var isBrowser = compileStep.archMatches('browser');

    // TODO: Map sourcemaps correctly through frontmatter stripping
    var data = compileStep.read();
    // var fm = frontMatter.loadFront(data);
    var beforeCompile = stripFrontMatter(data.toString('utf8'), compileStep.pathForSourceMap);

    var fm = beforeCompile.fm;
    var contents = new Buffer(beforeCompile.code, 'utf8');


    // You can declare that a file shouldn't be served in the frontmatter
    // If you do this, it won't be served to the client.
    // This is useful if you want to instead use lazypackages to serve the file
    if (fm.no_serve)
      return;

    // The css and js files which need to be served lazily
    var css = [];
    var js = [];

    // var contents = new Buffer(fm.__content, 'utf8');

    var readOffset = 0;
    // Shim around the compileStep to capture addStylesheet & addJavaScript calls
    var cStep = _.defaults({
      inputSize: contents.length,

      // The file passed into the original reader has the frontmatter stripped.
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

    // Call the original handler, and capture any emitted assets.
    handler(cStep);

    var clientOptions = {
      path: compileStep.inputPath,
      name: fm.name
    };

    if (css.length > 0) {
      var css = _.map(css, function(options) {
        options.servePath = path.join(compileStep.rootOutputPath, options.path);
        return options;
      });

      css = mergeCss(css);

      if (fm.minify)
        css = minifyCss(css);

      if (css.sourceMap) {
        css.data += "\n\n/*# sourceMappingURL=" + path.basename(compileStep.inputPath) + ".css.map */\n";

        compileStep.addAsset({
          data: new Buffer(css.sourceMap, 'utf8'),
          path: compileStep.inputPath + ".css.map"
        });
      }

      compileStep.addAsset({
        data: new Buffer(css.data, 'utf8'),
        path: compileStep.inputPath + ".css"
      });

      clientOptions.css = compileStep.inputPath + ".css";
    }

    if (js.length > 0) {
      var jsSrc, jsMap;
      if (js.length > 1) {
        // TODO: Support Sourcemaps through concatenation
        jsSrc = _.map(js, function(options) {
          return options.data;
        }).join('\n;\n');
        jsMap = null;
      } else {
        jsSrc = js[0].data;
        if (js[0].sourceMap)
          jsMap = mergeSourceMaps(beforeCompile.map.toString(), js[0].sourceMap);
        else
          jsMap = beforeCompile.map.toString();

        // Ensure we have the correct source material
        var parsedMap = JSON.parse(jsMap);
        parsedMap.sourcesContent = parsedMap.sourcesContent || {};
        _.each(parsedMap.sources, function(v, k) {
          if (v === compileStep.pathForSourceMap)
            parsedMap.sourcesContent[k] = data.toString('utf8');
        });
        // parsedMap.sourcesContent[compileStep.pathForSourceMap] = data.toString('utf8');
        parsedMap.file = compileStep.pathForSourceMap + ".js";
        jsMap = JSON.stringify(parsedMap);
      }

      if (fm.minify) {
        jsSrc = minifiers.UglifyJSMinify(jsSrc, {
          fromString: true,
          compress: {drop_debugger: false}
        }).code;
        jsMap = null;
      }

      if (jsMap) {
        jsSrc += "\n//# sourceMappingURL=" + path.basename(compileStep.inputPath) + ".js.map\n";

        console.log('woo Map!');

        compileStep.addAsset({
          data: new Buffer(jsMap, 'utf8'),
          path: compileStep.inputPath + ".js.map"
        });
      }

      if (!isBrowser)
        console.log(compileStep.inputPath + ".js");

      compileStep.addAsset({
        data: new Buffer(jsSrc, 'utf8'),
        path: compileStep.inputPath + ".js"
      });

      clientOptions.js = compileStep.inputPath + ".js";
    }

    // Generate the client javascript for registering the file
    var clientJs = (
      "// (autogenerated) Register lazy file " + compileStep.inputPath + "\n" +
      "Package['lazy'].Lazy._register(" + JSON.stringify(clientOptions) +
      (isBrowser ? '' : ', Npm, Assets') + ");\n"
    );

    // Register these files on the client
    compileStep.addJavaScript({
      path: compileStep.inputPath + ".register.js",
      sourcePath: compileStep.inputPath,
      data: clientJs
    });
  }
}

// Registers a handler for the lazy version of an extension
function registerExtension(extension, handler) {
  if (/^lazy\./.test(extension))
    return;

  console.log("registered:", extension);

  Plugin.registerSourceHandler('lazy.' + extension, genHandler(extension, handler));
}

// Registers a handler for the lazy version of all extensions added by
// smart packages. This is done when this package is loaded, and will
// not correctly identify extensions added by smart packages after
// the lazy plugin has been loaded.
function registerSourceHandlers() {
  var library = release.current.library;

  var soft = library.softReloadCache;
  var loaded = library.loadedPackages;

  for (k in soft) {
    if (k === 'lazy')
      continue;

    // Make sure that the other plugin has initialized first
    soft[k].pkg._ensurePluginsInitialized();

    var sourceHandlers = soft[k].pkg.sourceHandlers;
    for (extension in sourceHandlers)
      registerExtension(extension, sourceHandlers[extension]);
  }

  for (k in loaded) {
    if (k === 'lazy')
      continue;

    // Make sure that the other plugin has initialized first
    loaded[k].pkg._ensurePluginsInitialized();

    var sourceHandlers = loaded[k].pkg.sourceHandlers;
    for (extension in sourceHandlers)
      registerExtension(extension, sourceHandlers[extension]);
  }
}


// Basic handler for javascript files. Js files aren't handled by any
// package (as handlers are written in javascript), so it has to be implemented
// seperately.
function jsRawHandler(compileStep) {
  compileStep.addJavaScript({
    data: compileStep.read().toString('utf8'),
    sourcePath: compileStep.inputPath,
    path: compileStep.inputPath
  });
}

// Register the extensions which will be supported by meteor-lazy
registerSourceHandlers();
registerExtension('js', jsRawHandler);

// Meteor Lazy will support lazy packages, which are lazily loaded bundles
// of code. It allows for multiple files to be combined together before
// they are lazily loaded.
Plugin.registerSourceHandler('lazypackage', function(compileStep) {
  compileStep.addAsset({
    data: new Buffer("This is a test", 'utf8'),
    path: "woop.js"
  });
  // TODO: Implement
  console.warn('Lazy packages have not been implemented yet');
});

