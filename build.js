const fs = require('fs-extra');

fs.emptyDir('dist').then(() => {
  fs.copy('src/views', 'dist/views');
  fs.copy('src/public', 'dist/public');
  fs.copy('node_modules', 'dist/node_modules');
  fs.copy('config.json', 'dist/config/static/config.json');
});
