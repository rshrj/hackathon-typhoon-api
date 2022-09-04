const config = require("config");
const express = require("express");
const passport = require("passport");
const cors = require("cors");

// Connect to MongoDB server
const connectDB = require("./config/db");

connectDB();

const app = express();

// Parse request bodies as JSON
app.use(express.json());
app.use(passport.initialize());

require("./utils/auth/passport");

// Log each request using morgan
if (process.env.NODE_ENV !== "production") {
  // eslint-disable-next-line import/no-extraneous-dependencies, global-require
  const morgan = require("morgan");
  app.use(morgan("combined"));
}

// Enable CORS, any origin
// TODO: Restrict CORS policy in production
app.use(cors());

// Trust Reverse Proxy
app.set("trust proxy", true);

// Test Async error handling
// const asyncHandler = require('./utils/error/asyncHandler');
// app.use('/', asyncHandler((req, res)=>{
//     throw new Error('Some error occured');
//     return res.send('Done')
// }));

// Route handlers
app.use("/api/v1/users", require("./routes/users"));
app.use("/api/v1/auth", require("./routes/auth"));
app.use("/api/v1/groups", require("./routes/groups"));
app.use("/api/v1/transactions", require("./routes/transactions"));

app.use("*", (req, res) =>
  res.status(404).json({
    success: false,
    message: "Page not found",
    toasts: ["Page not found"],
  })
);

// For Error Handling
// app.use((err, req, res, next)=>{
//   console.log(err);
//   return res.send('Something went wrong.')
// });

// Port to listen on
const port = config.get("env.port") || 5050;

app.listen(port, () =>
  console.log(`Hackathon-Typhoon: Express is listening on port ${port}`)
);
