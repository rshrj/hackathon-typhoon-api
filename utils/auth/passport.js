const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const JwtStrategy = require("passport-jwt").Strategy;
const { ExtractJwt } = require("passport-jwt");
const bcrypt = require("bcryptjs");
const validator = require("validator");
const config = require("config");

const User = require("../../models/User");

passport.use(
  "local",
  new LocalStrategy(
    { usernameField: "email", passwordField: "password", session: false },
    async (email, password, done) => {
      try {
        const user = await User.findOne({
          email: validator.normalizeEmail(email),
        });
        if (!user) {
          return done(null, false, { email: "User not found" });
        }
        if (!bcrypt.compareSync(password, user.password)) {
          return done(null, false, { password: "Wrong password" });
        }

        return done(
          null,
          {
            _id: user.id,
            email: user.email,
          },
          "Logged in Successfully"
        );
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.use(
  "jwt",
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get("env.jwtSecret"),
    },
    async (payload, done) => {
      try {
        const user = {
          _id: payload._id,
          email: payload.email,
        };
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);
