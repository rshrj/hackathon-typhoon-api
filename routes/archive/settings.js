const router = require('express').Router();

const Settings = require('../models/Settings');
const { HomeAdValidation } = require('../utils/validation/settings');
const auth = require('../utils/auth');
const { ADMIN } = require('../models/User/roles');
const checkError = require('../utils/error/checkError');

/*
  All @routes
  =>   GET /settings/homead
  =>   POST /settings/homead
*/

// @route   GET /settings/homead
// @desc    Get Home Ad
// @access  Public
router.get('/homead', async (req, res) => {
  try {
    const setting = await Settings.findOne();

    if (!setting) {
      return res.status(404).json({
        success: false
      });
    }

    return res.json({
      success: true,
      payload: setting.homeAd
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      toasts: ['Server error occurred']
    });
  }
});

// @route   POST /settings/homead
// @desc    Changes Home Ad
// @access  ADMIN
router.post('/homead', auth(ADMIN), async (req, res) => {
  const { title, tagline, image, buttonTitle, buttonLink } = req.body;

  const { error, value } = checkError(HomeAdValidation, {
    title,
    tagline,
    image,
    buttonTitle,
    buttonLink
  });

  if (error) {
    return res.status(400).json({ success: false, errors: error });
  }

  try {
    let setting = await Settings.findOne();

    if (!setting) {
      setting = new Settings();
    }

    setting.homeAd.title = title;
    setting.homeAd.tagline = tagline;
    setting.homeAd.image = image;
    setting.homeAd.buttonTitle = buttonTitle;
    setting.homeAd.buttonLink = buttonLink;
    setting.homeAd.lastUpdatedAt = new Date();
    setting.homeAd.lastUpdatedBy = req.user._id;

    await setting.save();

    return res.json({
      success: true,
      payload: setting.homeAd,
      message: 'Home Ad updated successfully'
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      toasts: ['Server error occurred']
    });
  }
});

module.exports = router;
