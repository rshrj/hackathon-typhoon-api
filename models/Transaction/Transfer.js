const mongoose = require("mongoose");

const TransferSchema = new mongoose.Schema({
  from: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: "users",
  },
  to: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: "users",
  },
});

module.exports = TransferSchema;
