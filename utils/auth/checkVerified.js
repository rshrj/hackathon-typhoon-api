const User = require('../../models/User');

module.exports = (req, res, next) => {
  const { _id } = req.user;
  User.findById(_id, (err, user) => {
    if (err || !user) {
      return res.status(500).json({
        success: false,
        toasts: ['Server error occurred']
      });
    }

    if (user.role == CUSTOMER && user.verificationToken.length == 128) {
      return res.status(403).json({
        success: false,
        toasts: ['Please verify your email to proceed']
      });
    }
    next();
  });
};
