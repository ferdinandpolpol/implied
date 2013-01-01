(function() {
  var admin, blog, fs, md5, users, uuid;
  md5 = require('MD5');
  uuid = require('node-uuid');
  fs = require('fs');
  users = function(opts) {
    var Users, app, db, goto_next, server_path, statics, _ref;
    if ((_ref = opts.salt) == null) {
      opts.salt = 'secret-the-cat';
    }
    app = opts.app;
    db = opts.db;
    Users = db.collection('users');
    statics = function(arr) {
      return arr.forEach(function(item) {
        return app.get('/' + item, function(req, res) {
          return res.render(item, {
            req: req
          });
        });
      });
    };
    statics(['signup', 'login', 'reset-password-confirm', 'reset-password-submit']);
    goto_next = function(req, res) {
      return res.redirect(req.query.then || req.body.then || '/');
    };
    app.post("/login", function(req, res) {
      return Users.findOne({
        email: req.body.email,
        $or: [
          {
            password: req.body.password
          }, {
            password: md5(req.body.password + opts.salt)
          }
        ]
      }, function(err, user) {
        if (user) {
          req.session.email = user.email;
          if (typeof req.flash === "function") {
            req.flash("success", "You've been logged in.");
          }
          return goto_next(req, res);
        } else {
          if (typeof req.flash === "function") {
            req.flash("error", "Email or password incorrect.");
          }
          return res.redirect(req.path);
        }
      });
    });
    app.get("/logout", function(req, res) {
      req.session.email = null;
      if (typeof req.flash === "function") {
        req.flash("success", "You've been safely logged out");
      }
      return goto_next(req, res);
    });
    app.post("/signup", function(req, res) {
      if (req.body.email && req.body.password) {
        req.body.password = md5(req.body.password + opts.salt);
        return Users.find({
          email: req.body.email
        }).toArray(function(err, users) {
          if (users.length === 0) {
            return Users.insert(req.body, function(err, user) {
              req.session.email = user.email;
              return goto_next(req, res);
            });
          } else {
            if (typeof req.flash === "function") {
              req.flash("error", "That user already exists.");
            }
            return res.render('signup', {
              req: req
            });
          }
        });
      } else {
        if (typeof req.flash === "function") {
          req.flash("error", "Please enter a username and password.");
        }
        return res.render('signup', {
          req: req
        });
      }
    });
    server_path = function(req) {
      var url;
      url = req.protocol + "://" + req.host;
      if (req.port && req.port !== 80) {
        url += ":" + req.port;
      }
      return url;
    };
    app.post("/reset-password-submit", function(req, res) {
      return Users.findOne({
        email: req.body.email
      }, function(err, user) {
        var token;
        if (user) {
          token = uuid.v4();
          Users.update({
            _id: user._id
          }, {
            $set: {
              password_reset_token: token
            }
          });
          if (typeof opts.mailer === "function") {
            opts.mailer({
              to: user.email,
              subject: "Password Reset",
              body: "Go here to reset your password: http://" + opts.host + "/reset-password-confirm?token=" + token
            });
          }
          console.log('sent');
          if (typeof req.flash === "function") {
            req.flash("message", "You've been sent an email with instructions on resetting your password.");
          }
          return goto_next(req, res);
        } else {
          return typeof req.flash === "function" ? req.flash("error", "No user with that email address was found.") : void 0;
        }
      });
    });
    return app.post("/reset-password-confirm", function(req, res) {
      var query;
      if (req.session.email) {
        query = {
          email: req.session.email
        };
      } else {
        query = {
          password_reset_token: req.query.token
        };
      }
      return Users.update(query, {
        $set: {
          password: req.body.password
        }
      }, function(err, user) {
        if (err) {
          req.flash('error', 'Password reset failed');
        } else {
          req.flash('success', 'Password was reset');
        }
        return goto_next(req, res);
      });
    });
  };
  admin = function(opts) {
    var FORMS, app, common, db, forms, staff, _ref;
    if ((_ref = opts.login_url) == null) {
      opts.login_url = "/login";
    }
    app = opts.app;
    db = opts.db;
    forms = opts.forms || {};
    common = require("./common")(opts);
    staff = common.staff;
    app.get("/admin", staff, function(req, res) {
      return res.render('admin/admin', {
        req: req,
        email: req.session.email
      });
    });
    app.get("/admin/:collection", staff, function(req, res) {
      return db.collection(req.params.collection).find().toArray(function(err, records) {
        return res.render("admin-list", {
          title: req.params.collection,
          form: forms[req.params.collection],
          req: req,
          email: req.session.email,
          records: records
        });
      });
    });
    app.get("/admin/:collection/:id", staff, function(req, res) {
      return db.collection(req.params.collection).findOne({
        _id: new ObjectId(req.params.id)
      }, function(err, rec) {
        return res.render("admin-object", {
          title: req.params.collection,
          req: req,
          form: forms[req.params.collection],
          email: req.session.email,
          rec: rec
        });
      });
    });
    app.post("/admin/:collection/:id", staff, function(req, res) {
      return db.collection(req.params.collection).update({
        _id: new ObjectId(req.params.id)
      }, {
        $set: req.body
      }, function(err) {
        return res.redirect('/admin/' + req.params.collection);
      });
    });
    return FORMS = {
      pages: {
        print: 'paths',
        fields: [
          {
            name: 'title'
          }, {
            name: 'path'
          }, {
            name: 'content',
            type: 'textarea'
          }, {
            name: 'meta'
          }
        ]
      }
    };
  };
  blog = require('./blog');
  module.exports.init = function(opts) {
    if (opts.blog) {
      blog(opts);
    }
    if (opts.users) {
      users(opts);
    }
    if (opts.admin) {
      return admin(opts);
    }
  };
}).call(this);
