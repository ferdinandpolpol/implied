(function() {
  module.exports = function(opts) {
    var common, db;
    db = opts.db;
    return common = {
      staff: function(req, res, next) {
        if (req.session.email) {
          return db.collection('users').findOne({
            email: req.session.email,
            admin: true
          }, function(err, user) {
            if (user) {
              return next();
            } else {
              if (typeof req.flash === "function") {
                req.flash('Not authorized.');
              }
              return res.redirect(opts.login_url + "?then=" + req.path);
            }
          });
        } else {
          if (typeof req.flash === "function") {
            req.flash('Not authorized.');
          }
          return res.redirect(opts.login_url + "?then=" + req.path);
        }
      }
    };
  };
}).call(this);