const passport = require('passport');

module.exports =
  (...roles) =>
  (req, res, next) => {
    passport.authenticate('jwt', { session: false }, (err, user, info) => {
      if (err || !user) {
        return res.status(401).json({
          success: false,
          toasts: ['Unauthorized to access this endpoint'],
          errors: info
        });
      }

      req.login(user, { session: false }, (err) => {
        if (err) {
          return res.status(500).json({
            success: false,
            toasts: ['Server error occured']
          });
        }

        const hasRole =
          roles.length > 0 ? roles.find((role) => user.role === role) : true;

        if (!hasRole) {
          return res.status(401).json({
            success: false,
            toasts: ['Unauthorized to access this endpoint']
          });
        } else {
          return next();
        }
      });
    })(req, res, next);
  };
