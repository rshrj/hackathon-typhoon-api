const router = require('express').Router();
const validator = require('validator');
const { nanoid } = require('nanoid');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const config = require('config');

const { checkUserUpdate, checkUser } = require('../utils/validation/users');
const User = require('../models/User');
const Group = require('../models/Group');
const auth = require('../utils/auth');
const checkError = require('../utils/error/checkError');

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
router.get('/me', auth(), async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id, 'name email phone');
    if (!user) {
      return res.status(500).json({
        success: false,
        payload: req.user,
        toasts: ['Unable to get user details']
      });
    }

    return res.json({
      success: true,
      payload: user,
      message: 'User details found'
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      payload: req.user,
      toasts: ['Server error occurred']
    });
  }
});

// @route   POST users/signup
// @desc    To signup a user.
//          body => { email, name: { first, last }, password, password2, phone }
// @access  PUBLIC
router.post('/signup', async (req, res, next) => {
  const {
    email,
    name: { first, last },
    phone,
    password,
    password2
  } = req.body;

  const { error, value } = checkError(checkUser, {
    email,
    name: { first, last },
    password,
    password2,
    phone
  });

  if (error) {
    return res.status(400).json({ success: false, errors: error });
  }

  let normalEmail = validator.normalizeEmail(email);

  let user = await User.findOne({ $or: [{ email: normalEmail }, { phone }] });

  if (user) {
    return res.status(400).json({
      success: false,
      message: 'User already exists',
      errors: {
        email: 'User already exists'
      }
    });
  }

  var salt = bcrypt.genSaltSync(10);
  var hash = bcrypt.hashSync(password, salt);

  const newUser = new User({
    name: {
      first,
      last
    },
    email: normalEmail,
    password: hash,
    phone
  });

  try {
    await newUser.save();

    // console.log(
    //   `${config.get('env.uiBaseUrl')}/verifyToken/${newUser.verificationToken}`
    // );

    const newDefaultGroup = new Group({
      name: 'default',
      members: [newUser._id],
      createdBy: newUser._id
    });

    await newDefaultGroup.save();

    const token = newUser.generateAuthToken();

    return res.json({
      success: true,
      payload: token,
      message: 'Successfully created an account. Please login'
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      toasts: ['Server error occurred']
    });
  }
});

router.get('/groups', auth(), async (req, res) => {
  try {
    let groups = await Group.find({ members: req.user._id });

    if (!groups || groups == null || groups == undefined || groups.length < 1) {
      return res.status(400).json({
        success: false,
        message: 'No groups found',
        toasts: ['No groups found']
      });
    }

    return res.json({
      success: true,
      payload: groups,
      message: 'User groups fetched'
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      toasts: ['Server error occurred']
    });
  }
});

router.get('/test', (req, res) => {
  return res.json({
    hello: 'test!',
    ip: req.ip
  });
});

// @route   POST users/settings
// @desc    To update a user profile.
//          body => { email, name: { first, last }, password, phone }
// @access  ADMIN, CUSTOMER
router.post('/settings', auth(), async (req, res) => {
  let { limits, income } = req;

  // TODO: implement checkSettings
  const { error, value } = checkError(checkSettings, {
    limits,
    income
  });

  if (error) {
    return res.status(400).json({ success: false, errors: error });
  }

  try {
    const user = await User.findByIdAndUpdate(req.user.id, {
      settings: {
        ...(limits !== undefined && { limits }),
        ...(income !== undefined && { income })
      }
    });

    if (user) {
      return res.json({
        success: true,
        message: 'User settings has been updated successfully.'
      });
    } else {
      return res
        .status(404)
        .json({ success: false, errors: { toasts: ['User not found.'] } });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      toasts: ['Server error occurred']
    });
  }
});

// @route   PUT users/update
// @desc    To update a user profile.
//          body => { email, name: { first, last }, password, phone }
// @access  ADMIN, CUSTOMER
router.put('/update', auth(), async (req, res) => {
  let {
    user: { _id: userId },
    body: {
      email,
      name: { first, last },
      password,
      phone
    }
  } = req;

  const { error, value } = checkError(checkUserUpdate, {
    email,
    name: { first, last },
    password,
    phone
  });

  if (error) {
    return res.status(400).json({ success: false, errors: error });
  }

  try {
    const salt = bcrypt.genSaltSync(10);
    password = bcrypt.hashSync(password, salt);

    const user = await User.findByIdAndUpdate(
      userId,
      { email, password, name: { first, last }, phone },
      { new: true }
    );

    if (user) {
      const token = user.generateAuthToken();
      return res.json({
        success: true,
        payload: token,
        message: 'User data has been updated successfully.'
      });
    } else {
      return res
        .status(404)
        .json({ success: false, errors: { toasts: ['User not found.'] } });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      toasts: ['Server error occurred']
    });
  }
});

// @route   DELETE users/
// @desc    To delete a user.
//          body => { userId }
// @access  ADMIN
router.delete('/', auth(), async (req, res) => {
  if (!mongoose.isValidObjectId(userId)) {
    return res
      .status(400)
      .json({ success: false, errors: { userId: 'Invalid userId provided.' } });
  }

  try {
    let user = await User.findByIdAndDelete(req.user._id);

    if (user) {
      return res.status(200).json({
        success: true,
        payload: user,
        message: 'User deleted successfully.'
      });
    } else {
      return res.status(404).json({
        success: false,
        toasts: ['User with the given userId was not found.']
      });
    }
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      toasts: ['Server error occurred']
    });
  }
});

// @route   POST users/reset-password
// @desc    To reset password a user's password
//          body => { userId }
// @access  ADMIN
router.post('/reset-password', auth(), async (req, res) => {
  const { userId } = req.body;

  if (!mongoose.isValidObjectId(userId)) {
    return res
      .status(400)
      .json({ success: false, errors: { userId: 'Invalid userId provided.' } });
  }

  try {
    let user = await User.findById(userId);

    if (user) {
      const salt = bcrypt.genSaltSync(10);
      user.password = bcrypt.hashSync(user.email, salt);
      await user.save();

      return res.status(200).json({
        success: true,
        payload: {},
        message: 'Password reset successfully.'
      });
    } else {
      return res.status(404).json({
        success: false,
        toasts: ['User with the given userId was not found.']
      });
    }
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      toasts: ['Server error occurred']
    });
  }
});

module.exports = router;
