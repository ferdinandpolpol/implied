// Generated by CoffeeScript 1.10.0
var cli, migration;

migration = require('./migration');

cli = module.exports = function(app) {
  migration(app, cli);
  return app.set('cli', cli);
};