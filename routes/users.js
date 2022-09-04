const router = require("express").Router();
const validator = require("validator");
const bcrypt = require("bcryptjs");

const { checkUser } = require("../utils/validation/users");
const User = require("../models/User");
const Group = require("../models/Group");
const auth = require("../utils/auth");
const checkError = require("../utils/error/checkError");

/*
  All @routes
  =>   GET users/all
  =>   GET users/me
  =>   POST users/reset-password
  =>   POST users/signup
  =>   PUT users/update
  =>   DELETE users/
*/

// @route   GET users/me
// @desc    To get your own data.
// @access  ADMIN, CUSTOMER
router.get("/me", auth(), async (req, res) => {
  try {
    const user = await User.findById(req.user._id, "name email phone");
    if (!user) {
      return res.status(500).json({
        success: false,
        payload: req.user,
        toasts: ["Unable to get user details"],
      });
    }

    return res.json({
      success: true,
      payload: user,
      message: "User details found",
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      payload: req.user,
      toasts: ["Server error occurred"],
    });
  }
});

// @route   POST users/signup
// @desc    To signup a user.
//          body => { email, name: { first, last }, password, password2, phone }
// @access  PUBLIC
router.post("/signup", async (req, res) => {
  const {
    email,
    name: { first, last },
    phone,
    password,
    password2,
  } = req.body;

  const { error } = checkError(checkUser, {
    email,
    name: { first, last },
    password,
    password2,
    phone,
  });

  if (error) {
    return res.status(400).json({ success: false, errors: error });
  }

  const normalEmail = validator.normalizeEmail(email);

  const user = await User.findOne({ $or: [{ email: normalEmail }, { phone }] });

  if (user) {
    return res.status(400).json({
      success: false,
      message: "User already exists",
      errors: {
        email: "User already exists",
      },
    });
  }

  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);

  const newUser = new User({
    name: {
      first,
      last,
    },
    email: normalEmail,
    password: hash,
    phone,
  });

  try {
    await newUser.save();

    // console.log(
    //   `${config.get('env.uiBaseUrl')}/verifyToken/${newUser.verificationToken}`
    // );

    const newDefaultGroup = new Group({
      name: "default",
      members: [newUser._id],
      createdBy: newUser._id,
    });

    await newDefaultGroup.save();

    const token = newUser.generateAuthToken();

    return res.json({
      success: true,
      payload: token,
      message: "Successfully created an account. Please login",
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      toasts: ["Server error occurred"],
    });
  }
});

router.get("/groups", auth(), async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id });

    if (
      !groups ||
      groups == null ||
      groups === undefined ||
      groups.length < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "No groups found",
        toasts: ["No groups found"],
      });
    }

    return res.json({
      success: true,
      payload: groups,
      message: "User groups fetched",
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      toasts: ["Server error occurred"],
    });
  }
});

router.get("/test", (req, res) =>
  res.json({
    hello: "test!",
    ip: req.ip,
  })
);

// @route   POST users/settings
// @desc    To update a user profile.
//          body => { email, name: { first, last }, password, phone }
// @access  ADMIN, CUSTOMER
router.post("/settings", auth(), async (req, res) => {
  const { limits, income } = req;

  // TODO: implement checkSettings
  // const { error } = checkError(checkSettings, {
  //   limits,
  //   income,
  // });

  // if (error) {
  //   return res.status(400).json({ success: false, errors: error });
  // }

  try {
    const user = await User.findByIdAndUpdate(req.user.id, {
      settings: {
        ...(limits !== undefined && { limits }),
        ...(income !== undefined && { income }),
      },
    });

    if (user) {
      return res.json({
        success: true,
        message: "User settings has been updated successfully.",
      });
    }
    return res
      .status(404)
      .json({ success: false, errors: { toasts: ["User not found."] } });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      toasts: ["Server error occurred"],
    });
  }
});

module.exports = router;
