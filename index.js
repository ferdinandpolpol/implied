// Generated by CoffeeScript 1.7.1
(function() {
  var MongoStore, async, express, fs, http, implied, md5, mongojs, path, uuid;

  md5 = require('MD5');

  uuid = require('node-uuid');

  fs = require('fs');

  path = require('path');

  async = require('async');

  http = require('http');

  express = require('express');

  mongojs = require('mongojs');

  MongoStore = require('connect-mongo')(express);

  implied = module.exports = function(app, options) {
    options = implied.util.extend({
      serve: true
    }, options);
    this.options = options;
    if (app == null) {
      app = express();
    }
    app.set('implied', implied);
    (require(path.join(process.cwd(), 'config')))(app);
    app.set('server', http.Server(app));
    if (options.serve) {
      process.nextTick(function() {
        return (app.get('server')).listen(app.get("port"), function() {
          return console.log("Express server listening on port " + app.get("port"));
        });
      });
    }
    implied.middleware = {
      page: function(req, res, next) {
        var pagename;
        if ((req.method || req.originalMethod) !== 'GET') {
          return next();
        }
        pagename = req.path.substring(1).replace(/\/$/, '');
        return fs.exists(path.join(app.get('dir'), 'views', 'pages', pagename + '.jade'), function(exists) {
          if (exists) {
            return res.render(path.join('pages', pagename), {
              req: req
            });
          } else {
            return next();
          }
        });
      },
      cms: function(req, res, next) {
        var db, pagename;
        db = app.get('db');
        if ((req.method || req.originalMethod) !== 'GET') {
          return next();
        }
        pagename = req.path.substring(1).replace(/\/$/, '');
        return db.collection('cms').findOne({
          page: pagename
        }, function(err, page) {
          if (page) {
            return fs.exists(path.join(app.get('dir'), 'views', 'cms', pagename + '.jade'), function(exists) {
              if (exists) {
                return res.render(path.join('cms', pagename), page);
              } else {
                return res.render(path.join('cms', 'cms.jade'), page);
              }
            });
          } else {
            return next();
          }
        });
      }
    };
    app.plugin = function(plugin, opts) {
      var child, plugin_instance, plugin_name, registered_plugins, _i, _len;
      if (!this.get("app_name")) {
        this.set("app_name", process.cwd().split("/").pop());
      }
      if (opts == null) {
        opts = {};
      }
      plugin_instance = void 0;
      plugin_name = opts.plugin_name;
      if (plugin instanceof Array) {
        for (_i = 0, _len = plugin.length; _i < _len; _i++) {
          child = plugin[_i];
          this.plugin(child, opts);
        }
      } else if (typeof plugin === 'string') {
        if (!implied[plugin]) {
          throw "Plugin `" + plugin + "` was not found.";
        }
        app.plugin(implied[plugin], implied.util.extend({
          plugin_name: plugin
        }, opts));
      } else if (plugin instanceof implied.util.Plugin) {
        plugin_instance = new plugin(app);
      } else if (typeof plugin === 'function') {
        plugin(app, opts);
        plugin_instance = plugin;
      } else {
        throw "Usage: app.plugin( plugin ) where plugin is of type <String> | <Function> | <Array of plugins> , but you used app.plugin(" + typeof plugin + ")";
      }
      if (plugin_instance && plugin_name) {
        registered_plugins = app.get('plugins') || {};
        registered_plugins[plugin_name] = plugin_instance;
        return app.set('plugins', registered_plugins);
      }
    };
    return app;
  };

  implied.mongo = function(app) {
    var connect_string;
    if (!app.get('db_name')) {
      app.set('db_name', app.get('app_name'));
    }
    connect_string = app.get('db_name');
    if (app.get('db_password')) {
      connect_string = (app.get('db_username')) + ':' + (app.get('db_password')) + '@localhost/' + connect_string;
    }
    return app.set('db', mongojs(app.get('db_name')));
  };

  implied.mongo.oid_str = function(inp) {
    return (me.oid(inp)).toString();
  };

  implied.mongo.oid = function(inp) {
    var byte, result;
    if (inp instanceof mongojs.ObjectId) {
      return inp;
    } else if (inp.bytes) {
      result = ((function() {
        var _i, _len, _ref, _results;
        _ref = inp.bytes;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          byte = _ref[_i];
          _results.push(implied.util.zpad(byte.toString(16), 2));
        }
        return _results;
      })()).join('');
      return mongojs.ObjectId(result);
    } else {
      return mongojs.ObjectId('' + inp);
    }
  };

  implied.boilerplate = function(app) {
    var helmet, store_opts;
    if (!app.get('dir')) {
      app.set('dir', process.cwd());
    }
    if (!app.get("upload_dir")) {
      app.set("upload_dir", path.join("/var", app.get("app_name")));
    }
    app.set("views", path.join(app.get('dir'), "views"));
    app.set("view engine", "jade");
    if ((app.get('env')) === 'development') {
      app.locals.pretty = true;
      app.locals.development = true;
    }
    app.use(express.bodyParser({
      upload_dir: '/tmp'
    }));
    if (app.get('security_headers') === true) {
      helmet = require('helmet');
      app.use(helmet.xframe());
      app.use(helmet.iexss());
      app.use(helmet.contentTypeOptions());
      app.use(helmet.cacheControl());
    }
    app.use(express.cookieParser());
    if (app.get('db_name')) {
      store_opts = {
        db: app.get('db_name')
      };
      if (app.get('db_password')) {
        store_opts.username = app.get('db_username');
        store_opts.password = app.get('db_password');
      }
      app.use(express.session({
        secret: (app.get('secret')) || "UNSECURE-STRING",
        store: new MongoStore(store_opts)
      }));
      if (app.get('csrf') === true) {
        app.use(express.csrf());
        app.use(function(req, res, next) {
          res.locals.csrf = req.session._csrf;
          return next();
        });
      }
    }
    app.use(express.methodOverride());
    app.use(function(req, res, next) {
      if (req.query.referrer) {
        req.session.referrer = req.query.referrer;
      }
      return next();
    });
    app.use(express["static"](path.join(app.get('dir'), 'public')));
    app.use(express["static"](app.get("upload_dir")));
    app.locals.process = process;
    app.use(function(req, res, next) {
      res.locals.req = res.locals.request = req;
      return next();
    });
    app.use(implied.middleware.cms);
    app.use(implied.middleware.page);
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

  implied.multi_views = require('./lib/multi_views');

}).call(this);

//# sourceMappingURL=index.map
