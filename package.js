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
    'yaml-front-matter': '3.0.1'
  }
});

Package.on_use(function(api) {
  api.use(['meteor', 'underscore'], ['client', 'server']);
  api.add_files('lazy_common.js', ['client', 'server']);
  api.add_files('lazy_client.js', 'client');
  api.add_files('lazy_server.js', 'server');

  api.export('Lazy', ['client', 'server']);
});

