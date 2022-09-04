const mongoose = require('mongoose');
const { categories } = require('../../constants');

const ExpenseSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: categories
  },
  spent_by: {
    type: mongoose.SchemaTypes.ObjectId,
    ref: 'users'
  },
  splitting_rule: {
    type: Object
  }
});

module.exports = ExpenseSchema;
