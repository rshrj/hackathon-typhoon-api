const router = require('express').Router();
const mongoose = require('mongoose');
const FuzzySearch = require('fuzzy-search');

const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Group = require('../models/Group');

const {
  transactionTypes: { expense, income, transfer },
  categories
} = require('../constants');

const auth = require('../utils/auth/index');
const checkError = require('../utils/error/checkError');
const objToArray = require('../utils/helpers/objToArray');

const flatten = (amount) => (amount > 0 ? amount : 0);
const getScore = (amount, limit) => 5;

/*
  All @routes
  =>   GET listings/featured
  =>   GET listings/fuzzy
  =>   GET listings/particular
  =>   GET listings/all
  =>   GET listings/:listingId
  =>   GET listings/related/:listingId
  =>   POST listings/:listingId
  =>   POST listings/user
  =>   POST listings/add/rentlease
  =>   POST listings/add/sellapartment
  =>   POST listings/add/sellproject
  =>   PUT listings/updateState
  =>   DELETE listings/delete
*/

/*
 @route   POST transactions/new
 @desc    Add a new transaction
 @access  Private
*/
router.post('/new', auth(), async (req, res) => {
  const { body, user } = req;
  const { type, description, amount, details, group } = body;

  //Validation
  // TODO: implement TransactionValidation
  // const { error, value } = checkError(TransactionValidation, {
  //   type,
  //   description,
  //   amount,
  //   details,
  //   group
  // });

  // if (error) {
  //   return res.status(400).json({ success: false, errors: error });
  // }

  try {
    let g = await Group.findById(group);

    if (!g || g == null || g == undefined) {
      return res.status(401).json({
        success: false,
        toasts: ['Invalid group']
      });
    }

    if (!g.members.includes(user._id)) {
      return res.status(401).json({
        success: false,
        toasts: ['Invalid group']
      });
    }

    const transaction = new Transaction({
      type,
      description,
      amount,
      details,
      group,
      createdBy: user._id
    });

    await transaction.save();

    return res.status(201).json({
      success: true,
      payload: transaction,
      message: 'Transaction added successfully'
    });
  } catch (err) {
    if (err instanceof mongoose.Error.ValidationError) {
      console.log(err.message.split(':')[2]);
    }
    console.log(err);
    return res.status(500).json({
      success: false,
      toasts: ['Server error occurred']
    });
  }
});

// @route   GET listings/all
// @desc    ADMIN =>  Can  fetch all listings of a user
//          CUSTOMER => Can fetch his/her all listings.
// @access  CUSTOMER, ADMIN
router.get('/:groupId', auth(), async (req, res) => {
  const { user } = req;
  const { groupId } = req.params;

  try {
    let group = await Group.findById(groupId);

    if (!group || group === null || group === undefined) {
      return res.status(401).json({
        success: false,
        toasts: ['Invalid resource']
      });
    }

    if (!group.members.includes(user._id)) {
      return res.status(403).json({
        success: false,
        toasts: ['You are not authorized to perform this action.']
      });
    }

    let transactions = await Transaction.find({ group: groupId });

    return res.status(200).json({
      success: true,
      payload: transactions,
      message: 'Transactions fetched successfully.'
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      toasts: ['Server error occurred']
    });
  }
});

// @route   GET /:groupId/owe-owed
// @desc    Amount owed to others and other owe us
// @access  Private
router.get('/:groupId/owe-owed', auth(), async (req, res) => {
  const { user } = req;
  const { groupId } = req.params;

  try {
    let group = await Group.findById(groupId);

    if (!group || group === null || group === undefined) {
      return res.status(401).json({
        success: false,
        toasts: ['Invalid resource']
      });
    }

    if (!group.members.includes(user._id)) {
      return res.status(403).json({
        success: false,
        toasts: ['You are not authorized to perform this action.']
      });
    }

    let transactions = await Transaction.find({ group: groupId });

    owed = {};
    group.members
      .filter((member) => member !== user._id)
      .forEach((member) => (owed[member] = 0));

    transactions.forEach((t) => {
      if (t.type === expense && t.expense.spent_by === user._id) {
        group.members
          .filter((member) => member !== user._id)
          .forEach(
            (member) =>
              (owed[member] =
                owed[member] -
                (t.expense.splitting_rule[member] || 0) * t.amount)
          );
      }
      if (t.type === expense && t.expense.spent_by !== user._id) {
        owed[t.expense.spent_by] =
          owed[t.expense.spent_by] +
          (t.expense.splitting_rule[user._id] || 0) * t.amount;
      }

      if (t.type === income && t.income.receieved_by === user._id) {
        group.members
          .filter((member) => member !== user._id)
          .forEach(
            (member) =>
              (owed[member] =
                owed[member] +
                (t.income.splitting_rule[member] || 0) * t.amount)
          );
      }
      if (t.type === income && t.income.receieved_by !== user._id) {
        owed[t.income.receieved_by] =
          owed[t.income.receieved_by] -
          (t.income.splitting_rule[user._id] || 0) * t.amount;
      }

      if (t.type === transfer && t.transfer.from === user._id) {
        owed[t.transfer.to] = owed[t.transfer.to] - t.amount;
      }
      if (t.type === transfer && t.transfer.to === user._id) {
        owed[t.transfer.from] = owed[t.transfer.from] + t.amount;
      }
    });

    return res.status(200).json({
      success: true,
      payload: owed,
      message: 'Owe-owed report generated successfully.'
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      toasts: ['Server error occurred']
    });
  }
});

// @route   GET /summary
// @desc    Category wise distribution of expenses
// @access  Private
router.get('/summary', auth(), async (req, res) => {
  const { user } = req;

  user = await User.findById(user._id);

  if (!user || user == null || user == undefined) {
    return res.status(401).json({
      success: false,
      toasts: ['Something went wrong']
    });
  }

  try {
    let transactions = await Transaction.find({ type: expense });
    transactions = transactions.filter(
      (t) => t.expense.spent_by === req.user._id
    );

    summary = {};
    categories.forEach((category) => (summary[category] = {}));
    transactions.forEach(
      (t) => (summary[t.expense.category]['amount'] += t.amount)
    );

    if (user.settings.limits != null) {
      categories.forEach(
        (category) =>
          (summary[category] = {
            ...summary[category],
            score: getScore(summary[category], user.settings.limits[category])
          })
      );
    }

    return res.status(200).json({
      success: true,
      payload: summary,
      message: 'Summary report generated successfully.'
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      toasts: ['Server error occurred']
    });
  }
});

// @route   GET listings/all
// @desc    ADMIN =>  Can  fetch all listings of a user
//          CUSTOMER => Can fetch his/her all listings.
// @access  CUSTOMER, ADMIN
router.get('/:groupId/owe', auth(), async (req, res) => {
  const { user } = req;
  const { groupId } = req.params;

  try {
    let group = Group.findById(groupId);

    if (!group || group === null || group === undefined) {
      return res.status(401).json({
        success: false,
        toasts: ['Invalid resource']
      });
    }

    if (!group.members.includes(user._id)) {
      return res.status(403).json({
        success: false,
        toasts: ['You are not authorized to perform this action.']
      });
    }

    let transactions = Transaction.find({ group: groupId });

    return res.status(200).json({
      success: true,
      payload: transactions,
      message: 'Transactions fetched successfully.'
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      toasts: ['Server error occurred']
    });
  }
});

// @route   GET listings/featured
// @desc    To fetch featured properties.
// @access  Public
router.get('/featured', async (req, res) => {
  const buySize = 8;
  const rentSize = 4;

  try {
    let buy = await Listing.find({
      state: APPROVED,
      type: { $in: [SELL_APARTMENT, SELL_PROJECT] }
    })
      .sort('-createdAt')
      .limit(buySize);

    let rent = await Listing.find({ state: APPROVED, type: RENT_LEASE })
      .sort('-createdAt')
      .limit(rentSize);

    return res.json({
      success: true,
      payload: {
        buy: buy.map((listing) =>
          listing.type === SELL_PROJECT ? decorateProject(listing) : listing
        ),
        rent
      }
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      toasts: ['Server error occurred']
    });
  }
});

// @route   GET listings/fuzzy
// @desc    To fetch particular type of listings with query
// @access  Public
router.post('/fuzzy', async (req, res) => {
  const { query, type } = req.body;

  //Validation
  const { error, value } = checkError(FuzzySearchValidation, {
    query,
    type
  });

  if (error) {
    return res.status(400).json({ success: false, errors: error });
  }

  try {
    let listings = await Listing.find({
      state: APPROVED,
      type: { $in: type }
    });

    let fields = type.reduce(
      (p, c) => {
        return [...p, `${c}.location`, `${c}.landmark`];
      },
      ['name']
    );
    console.log(fields);

    const searcher = new FuzzySearch(listings, fields);
    const foundListings = searcher.search(query);
    if (foundListings.length > 0) {
      listings = foundListings;
    }
    return res.status(200).json({
      success: true,
      payload: listings.map((listing) =>
        listing.type === SELL_PROJECT ? decorateProject(listing) : listing
      ),
      message: 'Properties data fetched successfully.'
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      toasts: ['Server error occurred']
    });
  }
});

// @route   GET listings/particular
// @desc    To fetch particular type of listings
// @access  Public
router.post('/particular', async (req, res) => {
  let { page, size, type } = req.body;

  //Validation
  const { error, value } = checkError(ParticularListingValidation, {
    page,
    size,
    type
  });

  if (error) {
    return res.status(400).json({ success: false, errors: error });
  }

  try {
    if (!page) {
      page = 1;
    }

    if (!size) {
      size = 10;
    }

    let listings = await Listing.find({ type: { $in: type } })
      .skip((page - 1) * size)
      .limit(size);

    return res.status(200).json({
      success: true,
      payload: listings.map((listing) =>
        listing.type === SELL_PROJECT ? decorateProject(listing) : listing
      ),
      message: 'Properties data fetched successfully.'
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
