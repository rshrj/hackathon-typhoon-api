const router = require("express").Router();
const passport = require("passport");

const { checkLogin } = require("../utils/validation/auth");
const User = require("../models/User/User");
const checkError = require("../utils/error/checkError");

/*
  All @routes
  =>   POST auth/login
  =>   POST auth/resendToken
  =>   GET auth/verify/:token
  =>   POST auth/forgotpassword
  =>   GET auth/forgotpassword/:token
  =>   POST auth/resetpassword
*/

// @route   POST auth/login
// @desc    For login
// @access  Public
router.post("/login", async (req, res, next) => {
  const { email, password } = req.body;
  const { error } = checkError(checkLogin, {
    email,
    password,
  });

  if (error) {
    return res.status(400).json({ success: false, errors: error });
  }

  passport.authenticate(
    "local",
    { session: false },
    async (err, user, info) => {
      if (err) {
        console.log(err);
        return res.status(500).json({
          success: false,
          toasts: ["Server error occurred"],
        });
      }
      if (!user) {
        return res.status(400).json({
          success: false,
          toasts: ["Unable to login"],
          errors: info,
        });
      }
      req.login(user, { session: false }, (error) => {
        if (error) {
          console.log(error);
          return res.status(500).json({
            success: false,
            toasts: ["Server error occurred"],
          });
        }

        User.findById(user._id, (error2, user2) => {
          if (error2) {
            return res.status(500).json({
              success: false,
              toasts: ["Server error occurred"],
            });
          }

          // const token = jwt.sign(user, process.env.JWTSECRET);
          const token = user.generateAuthToken();

          return res.json({
            success: true,
            payload: token,
            message: "Logged in successfully",
          });
        });
      });
      return null;
    }
  )(req, res, next);

  return null;
});

// @route   GET auth/verify/:token
// @desc    To verify user via token
// @access  Public
// router.get('/verify/:token', async (req, res) => {
//   const { token } = req.params;

//   try {
//     let user = await User.findOne({ verificationToken: token });

//     if (!user) {
//       return res.status(400).json({
//         success: false,
//         toasts: ['Invalid verification token']
//       });
//     }

//     user.verificationToken = '';
//     await user.save();

//     return res.json({
//       success: true,
//       payload: user,
//       message: 'Email verified successfully'
//     });
//   } catch (err) {
//     console.log(err);
//     return res.status(500).json({
//       success: false,
//       toasts: ['Server error occurred']
//     });
//   }
// });

// @route   POST auth/resendToken
// @desc    To resend email verification mail
// @access  Public
// router.post('/resendToken', async (req, res) => {
//   const { email } = req.body;

//    const { error, value } = checkError(
//      Joi.object({
//        email: Joi.string().trim().email().required().label('Email'),
//      }),
//      {
//        email,
//      }
//    );

//    if (error) {
//      return res.status(400).json({ success: false, errors: error });
//    }

//   try {
//     let user = await User.findOne({ email: validator.normalizeEmail(email) });

//     if (!user) {
//       return res.status(400).json({
//         success: false,
//         toasts: ['User does not exist. Please sign up.'],
//       });
//     }

//     if (user && user.verificationToken == '') {
//       return res.status(400).json({
//         success: false,
//         toasts: ['Your account is already verified. Please login.'],
//       });
//     }

//     user.verificationToken = nanoid(128);
//     await user.save();

//     await sendMail({
//       to: user.email,
//       from: config.get('env.smtp.user'),
//       subject: `Welcome to ${config.get(
//         'content.mail.welcomeTo'
//       )}. Please verify your email`,
//       template: 'emailVerification',
//       templateVars: {
//         name: user.name.first,
//         verificationLink: `${uiPath}/verifyToken/${user.verificationToken}`,
//         welcomeTo: config.get('content.mail.welcomeTo'),
//       },
//     });

//     // console.log(`${uiPath}/verifyToken/${user.verificationToken}`);

//     return res.json({
//       success: true,
//       // payload: user,
//       message: 'Email resent successfully. Please check your email.',
//     });

//   } catch (err) {
//     console.log(err);
//     return res.status(500).json({
//       success: false,
//       toasts: ['Server error occurred'],
//     });
//   }
// });

// @route   POST auth/forgotpassword
// @desc    To initial forgotpassword
// @access  Public
// router.post('/forgotpassword', async (req, res) => {
//   const { email } = req.body;

//   const { error, value } = checkError(
//     Joi.object({
//       email: Joi.string().trim().email().required().label('Email')
//     }),
//     {
//       email
//     }
//   );

//   if (error) {
//     return res.status(400).json({ success: false, errors: error });
//   }

//   try {
//     let user = await User.findOne({ email: validator.normalizeEmail(email) });

//     if (!user) {
//       return res.status(400).json({
//         success: false,
//         toasts: ['User does not exist. Please sign up.'],
//         errors: { email: 'User does not exist' }
//       });
//     }

//     // if (user.verificationToken !== '') {
//     //   return res.status(400).json({
//     //     success: false,
//     //     toasts: [
//     //       'A request already exists. Please check your email for instructions'
//     //     ],
//     //     errors: { email: 'Check your email' }
//     //   });
//     // }

//     let verificationToken = nanoid(64);
//     user.verificationToken = verificationToken;
//     await user.save();

//     await sendMail({
//       to: user.email,
//       from: config.get('env.smtp.user'),
//       subject: 'Password Reset.',
//       template: 'resetPassword',
//       templateVars: {
//         name: user.name.first,
//         verificationLink: `${uiPath}/forgotpassword?token=${user.verificationToken}`
//       }
//     });

//     // console.log(`${uiPath}/forgotpassword?token=${user.verificationToken}`);

//     return res.json({
//       success: true,
//       message: 'Please check your email to reset your password.'
//     });
//   } catch (err) {
//     console.log(err);
//     return res.status(500).json({
//       success: false,
//       toasts: ['Server error occurred']
//     });
//   }
// });

// @route   GET auth/forgotpassword/:token
// @desc    To verify forgotpassword token
// @access  Public
// router.get('/forgotpassword/:token', async (req, res) => {
//   const { token } = req.params;

//   if (!token || token == '' || token.length != 64) {
//     return res.status(400).json({
//       success: false,
//       toasts: ['Invalid token provided']
//     });
//   }

//   try {
//     let user = await User.findOne(
//       { verificationToken: token },
//       '-verificationToken -password'
//     );

//     if (!user) {
//       return res.status(400).json({
//         success: false,
//         toasts: ['Invalid token provided']
//       });
//     }

//     return res.json({
//       success: true,
//       payload: user,
//       message: 'Reset password initiated.'
//     });
//   } catch (err) {
//     console.log(err);
//     return res.status(500).json({
//       success: false,
//       toasts: ['Server error occurred']
//     });
//   }
// });

// @route   POST auth/resetpassword
// @desc    To reset password
// @access  Public
// router.post('/resetpassword', async (req, res) => {
//   const { token, password, password2 } = req.body;

//   const { error, value } = checkError(checkResetPassword, {
//     token,
//     password,
//     password2
//   });

//   if (error) {
//     return res.status(400).json({ success: false, errors: error });
//   }

//   try {
//     let user = await User.findOne({ verificationToken: token });

//     if (!user) {
//       return res.status(400).json({
//         success: false,
//         toasts: ['Invalid token provided.']
//       });
//     }

//     let salt = bcrypt.genSaltSync(10);
//     let hash = bcrypt.hashSync(password, salt);

//     user.verificationToken = '';
//     user.password = hash;
//     await user.save();

//     return res.json({
//       success: true,
//       message: 'Your password has been reset successfully. Please login.'
//     });
//   } catch (err) {
//     console.log(err);
//     return res.status(500).json({
//       success: false,
//       toasts: ['Server error occurred']
//     });
//   }
// });

module.exports = router;
