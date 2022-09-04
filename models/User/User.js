const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const config = require("config");

// below schema should also contain mobile no.

const UserSchema = new mongoose.Schema({
  name: {
    first: {
      type: String,
      trim: true,
      required: true,
    },
    last: {
      type: String,
      trim: true,
      required: true,
    },
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    unique: true,
  },
  phone: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  settings: {
    limits: {
      type: Object,
    },
    income: {
      type: Number,
      min: 0,
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

UserSchema.methods.generateAuthToken = () => {
  const token = jwt.sign(
    { _id: this._id, email: this.email },
    config.get("env.jwtSecret")
  );
  return token;
};

module.exports = mongoose.model("users", UserSchema);
