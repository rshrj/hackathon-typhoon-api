const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  homeAd: {
    title: {
      type: String,
      required: true
    },
    tagline: {
      type: String,
      required: true
    },
    image: {
      type: String,
      required: true
    },
    buttonTitle: {
      type: String,
      required: true
    },
    buttonLink: {
      type: String,
      required: true
    },
    lastUpdated: {
      type: Date,
      default: Date.now()
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: true
    }
  }
});

module.exports = mongoose.model('settings', SettingsSchema);
