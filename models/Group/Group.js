const mongoose = require("mongoose");

const GroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  members: {
    type: [mongoose.SchemaTypes.ObjectId],
    ref: "users",
  },
  invited: {
    type: [mongoose.SchemaTypes.ObjectId],
    ref: "users",
    default: [],
  },
  createdBy: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: "users",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("groups", GroupSchema);
