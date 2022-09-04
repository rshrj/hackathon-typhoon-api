const passport = require("passport");

module.exports = () => (req, res, next) => {
  passport.authenticate("jwt", { session: false }, (err, user, info) => {
    if (err || !user) {
      return res.status(401).json({
        success: false,
        toasts: ["Unauthorized to access this endpoint"],
        errors: info,
      });
    }

    req.login(user, { session: false }, (error) => {
      if (error) {
        return res.status(500).json({
          success: false,
          toasts: ["Server error occured"],
        });
      }

      return next();
    });

    return null;
  })(req, res, next);
};
