const router = require('express').Router();
const validator = require('validator');
const { nanoid } = require('nanoid');
const mongoose = require('mongoose');

const { checkUserUpdate, checkUser } = require('../utils/validation/users');
const Group = require('../models/Group');
const User = require('../models/User/User');
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

// @route   POST groups/new
// @desc    To create a new group.
// @access  Private
router.post('/new', auth(), async (req, res) => {
  const { name, invited_emails } = req.body;

  // TODO: implement checkNewGroup
  const { error, value } = checkError(checkNewGroup, {
    name,
    invited_emails
  });

  if (error) {
    return res.status(400).json({ success: false, errors: error });
  }

  let invited_emails_normal = invited_emails.map((email) =>
    validator.normalizeEmail(email)
  );

  let group = await Group.findOne({ name });

  if (group) {
    return res.status(400).json({
      success: false,
      message: 'Group with provided name already exists',
      errors: {
        name: 'Group with provided name already exists'
      }
    });
  }

  let invited = await Promise.all(
    invited_emails_normal.map(async (email) => {
      const user = await User.findOne({ email }, '_id');
      if (!user || user == null || user == undefined) {
        return undefined;
      }

      return user._id;
    })
  ).filter((invitee) => invitee != undefined);

  const newGroup = new Group({
    name,
    invited,
    members: [req.user.id],
    createdBy: req.user.id
  });

  try {
    await newGroup.save();

    // console.log(
    //   `${config.get('env.uiBaseUrl')}/verifyToken/${newUser.verificationToken}`
    // );

    return res.json({
      success: true,
      payload: newGroup,
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

// @route   GET :groupId/accept
// @desc    Accept a group invite
// @access  Private
router.get('/:groupId/accept', auth(), async (req, res) => {
  let group = await Group.findOne({ groupId });

  if (!group || group == null || group == undefined) {
    return res.status(400).json({
      success: false,
      message: 'Invalid request',
      errors: {
        name: 'Invalid request'
      }
    });
  }

  if (!group.invited.includes(req.user._id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid request',
      errors: {
        name: 'Invalid request'
      }
    });
  }

  group.members.push(req.user._id);
  group.invited.splice(group.invited.indexOf(req.user._id), 1);

  try {
    await group.save();

    return res.json({
      success: true,
      payload: group,
      message: 'Successfully added to group'
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      toasts: ['Server error occurred']
    });
  }
});

// @route   GET :groupId/reject
// @desc    Reject a group invite
// @access  Private
router.get('/:groupId/reject', auth(), async (req, res) => {
  let group = await Group.findOne({ groupId });

  if (!group || group == null || group == undefined) {
    return res.status(400).json({
      success: false,
      message: 'Invalid request',
      errors: {
        name: 'Invalid request'
      }
    });
  }

  if (!group.invited.includes(req.user._id)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid request',
      errors: {
        name: 'Invalid request'
      }
    });
  }

  group.invited.splice(group.invited.indexOf(req.user._id), 1);

  try {
    await group.save();

    return res.json({
      success: true,
      payload: group,
      message: 'Successfully deleted the invite'
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

    const token = newUser.generateAuthToken();

    return res.json({
      success: true,
      // payload: token,
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

module.exports = router;
