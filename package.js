Package.describe({
  summary: "woo"
});

Package._transitional_registerBuildPlugin({
  name: 'compileLazy',
  use: [],
  sources: [
    'plugin/compile-lazy.js'
  ],
  npmDependencies: {
    'yaml-front-matter': '3.0.1',
    'uglify-js': '2.4.7'
  }
});

Package.on_use(function(api) {
  api.add_files('lazy-client.js', 'client');
  api.add_files('lazy-server.js', 'server');

  api.export('Lazy', ['client', 'server']);
  api.export('__register_lazy_file', 'client');
  api.export('__serve_lazy_file', 'server');
});

