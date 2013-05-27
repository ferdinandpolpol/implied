// Generated by CoffeeScript 1.6.2
(function() {
  var MongoStore, async, express, fs, implied, md5, mongolian, path, uuid;

  md5 = require('MD5');

  uuid = require('node-uuid');

  fs = require('fs');

  path = require('path');

  async = require('async');

  express = require('express');

  mongolian = require('mongolian');

  MongoStore = require('express-session-mongo');

  implied = module.exports = function(app) {
    if (app == null) {
      app = express();
    }
    return app.plugin = function(plugin, opts) {
      var child, _i, _len;

      if (plugin instanceof Array) {
        for (_i = 0, _len = plugin.length; _i < _len; _i++) {
          child = plugin[_i];
          this.plugin(child, opts);
        }
      } else if (typeof plugin === 'string') {
        if (!implied[plugin]) {
          throw "Plugin `" + plugin + "` was not found.";
        }
        app.plugin(implied[plugin]);
      } else if (plugin instanceof implied.util.Plugin) {
        new plugin(app, opts);
      } else if (typeof plugin === 'function') {
        plugin(app, opts);
      } else {
        throw "Usage: app.plugin( plugin ) where plugin is of type <String> | <Function> | <Array of plugins> , but you used app.plugin(" + typeof plugin + ")";
      }
      return app;
    };
  };

  implied.mongo = function(app) {
    var server;

    server = new mongolian();
    return app.set('db', server.db(app.get('app_name')));
  };

  implied.boilerplate = function(app) {
    app.set("views", path.join(app.get('dir'), "views"));
    app.set("view engine", "jade");
    app.use(express.limit('36mb'));
    app.use(express.bodyParser({
      upload_dir: '/tmp'
    }));
    app.use(express.cookieParser());
    if (app.get('db')) {
      app.use(express.session({
        secret: (app.get('secret')) || "UNSECURE-STRING",
        store: new MongoStore({
          native_parser: false
        })
      }));
    }
    app.use(express.methodOverride());
    app.use(express["static"](path.join(app.get('dir'), 'public')));
    app.use(express["static"](path.join("/var", app.get('name'))));
    app.locals.process = process;
    app.use(function(req, res, next) {
      res.locals.req = res.locals.request = req;
      return next();
    });
    app.use(app.router);
    return app.set('view options', {
      layout: false
    });
  };

  implied.util = require('./util');

  implied.blog = require('./lib/blog');

  implied.videos = require('./lib/videos');

  implied.users = require('./lib/users');

  implied.logging = require('./lib/logging');

  implied.admin = require('./lib/admin');

  implied.sendgrid = require('./lib/mail/sendgrid');

  implied.common = require('./lib/common');

}).call(this);

/*
//@ sourceMappingURL=index.map
*/
