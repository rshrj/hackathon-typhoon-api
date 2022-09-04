const mongoose = require("mongoose");

const {
  transactionTypes: { expense, income, transfer },
} = require("../../constants");

const TransactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [expense, income, transfer],
    required: true,
  },
  description: {
    type: String,
  },
  amount: {
    type: Number,
    min: 0,
  },
  details: {
    type: Object,
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "groups",
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("transactions", TransactionSchema);
