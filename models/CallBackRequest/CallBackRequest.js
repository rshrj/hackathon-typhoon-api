const mongoose = require('mongoose');

const CallBackRequestSchema = new mongoose.Schema({
  state: {
    type: String,
    enum: ['pendingCall', 'calledAlready'],
    default: 'pendingCall'
  },
  fromIp: {
    type: String
  },
  name: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('callbackrequests', CallBackRequestSchema);
