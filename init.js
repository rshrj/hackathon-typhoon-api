// Connect to MongoDB server
const prompt = require("prompt");
const { nanoid } = require("nanoid");
const bcrypt = require("bcryptjs");
const validator = require("validator");
const config = require("config");

const connectDB = require("./config/db");

const User = require("./models/User");
const { ADMIN } = require("./models/User/roles");
const sendMail = require("./utils/mailing/sendmail");

const emailRe =
  /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
const phoneRe = /^[6-9]\d{9}$/;

const userSchema = {
  properties: {
    email: {
      description: "Enter your email",
      type: "string",
      pattern: emailRe,
      message: "Please enter a valid email",
      required: true,
    },
    firstName: {
      description: "Enter your first name",
      type: "string",
      message: "First name is required",
      required: true,
    },
    lastName: {
      description: "Enter your last name",
      type: "string",
      message: "Last name is required",
      required: true,
    },
    phone: {
      description: "Enter your phone number",
      type: "string",
      pattern: phoneRe,
      message: "Please enter a valid phone number",
    },
    password: {
      description: "Enter a password",
      type: "string",
      message: "Enter a valid password",
      hidden: true,
      replace: "*",
      required: true,
    },
    password2: {
      description: "Confirm your password",
      type: "string",
      message: "Enter a valid password",
      hidden: true,
      replace: "*",
      required: true,
    },
  },
};

(async () => {
  await connectDB();
  try {
    const { email, firstName, lastName, phone, password, password2 } =
      await prompt.get(userSchema);

    const normalEmail = validator.normalizeEmail(email);

    const user = await User.findOne({
      $or: [{ email: normalEmail }, { phone }],
    });

    if (user) {
      console.log({
        success: false,
        message: "User already exists",
      });
      return;
    }

    const verificationToken = nanoid(128);

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    const newUser = new User({
      name: {
        first: firstName,
        last: lastName,
      },
      email: normalEmail,
      password: hash,
      role: ADMIN,
      phone,
      verificationToken,
    });

    try {
      await newUser.save();

      await sendMail({
        to: newUser.email,
        from: config.get("env.smtp.user"),
        subject: `Welcome to ${config.get(
          "content.mail.welcomeTo"
        )}. Please verify your email`,
        template: "emailVerification",
        templateVars: {
          name: newUser.name.first,
          verificationLink: `${config.get("env.baseUrl")}/auth/verify/${
            newUser.verificationToken
          }`,
          welcomeTo: config.get("content.mail.welcomeTo"),
        },
      });

      console.log({
        success: true,
        message: "Successfully created an account. Please verify your email",
      });
      return;
    } catch (err) {
      console.log(err);
      return;
    }
  } catch (error) {
    console.log(error);
  }
})();
