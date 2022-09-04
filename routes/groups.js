const router = require("express").Router();
const validator = require("validator");

const Group = require("../models/Group");
const User = require("../models/User/User");
const auth = require("../utils/auth");

/*
  All @routes
  =>   GET users/all
  =>   GET users/me
  =>   POST users/reset-password
  =>   POST users/signup
  =>   PUT users/update
  =>   DELETE users/
*/

// @route   POST groups/new
// @desc    To create a new group.
// @access  Private
router.post("/new", auth(), async (req, res) => {
  const { name, invitedEmails } = req.body;

  // TODO: implement checkNewGroup
  // const { error } = checkError(checkNewGroup, {
  //   name,
  //   invitedEmails,
  // });

  // if (error) {
  //   return res.status(400).json({ success: false, errors: error });
  // }

  const invitedEmailsNormal = invitedEmails.map((email) =>
    validator.normalizeEmail(email)
  );

  const group = await Group.findOne({ name });

  if (group) {
    return res.status(400).json({
      success: false,
      message: "Group with provided name already exists",
      errors: {
        name: "Group with provided name already exists",
      },
    });
  }

  const invited = await Promise.all(
    invitedEmailsNormal.map(async (email) => {
      const user = await User.findOne({ email }, "_id");
      if (!user || user == null || user === undefined) {
        return undefined;
      }

      return user._id;
    })
  ).filter((invitee) => invitee !== undefined);

  const newGroup = new Group({
    name,
    invited,
    members: [req.user.id],
    createdBy: req.user.id,
  });

  try {
    await newGroup.save();

    // console.log(
    //   `${config.get('env.uiBaseUrl')}/verifyToken/${newUser.verificationToken}`
    // );

    return res.json({
      success: true,
      payload: newGroup,
      message: "Successfully created an account. Please login",
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      toasts: ["Server error occurred"],
    });
  }
});

// @route   GET :groupId/accept
// @desc    Accept a group invite
// @access  Private
router.get("/:groupId/accept", auth(), async (req, res) => {
  const { groupId } = req.params;
  const group = await Group.findOne({ group: groupId });

  if (!group || group == null || group === undefined) {
    return res.status(400).json({
      success: false,
      message: "Invalid request",
      errors: {
        name: "Invalid request",
      },
    });
  }

  if (!group.invited.includes(req.user._id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid request",
      errors: {
        name: "Invalid request",
      },
    });
  }

  group.members.push(req.user._id);
  group.invited.splice(group.invited.indexOf(req.user._id), 1);

  try {
    await group.save();

    return res.json({
      success: true,
      payload: group,
      message: "Successfully added to group",
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      toasts: ["Server error occurred"],
    });
  }
});

// @route   GET :groupId/reject
// @desc    Reject a group invite
// @access  Private
router.get("/:groupId/reject", auth(), async (req, res) => {
  const { groupId } = req.params;
  const group = await Group.findOne({ group: groupId });

  if (!group || group == null || group === undefined) {
    return res.status(400).json({
      success: false,
      message: "Invalid request",
      errors: {
        name: "Invalid request",
      },
    });
  }

  if (!group.invited.includes(req.user._id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid request",
      errors: {
        name: "Invalid request",
      },
    });
  }

  group.invited.splice(group.invited.indexOf(req.user._id), 1);

  try {
    await group.save();

    return res.json({
      success: true,
      payload: group,
      message: "Successfully deleted the invite",
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      toasts: ["Server error occurred"],
    });
  }
});

module.exports = router;
