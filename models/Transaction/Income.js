const mongoose = require("mongoose");

const IncomeSchema = new mongoose.Schema({
  receieved_by: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: "users",
  },
  splitting_rule: {
    type: Object,
  },
});

module.exports = IncomeSchema;
