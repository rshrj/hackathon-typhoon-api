const mongoose = require("mongoose");
const config = require("config");

// Get connection URI from environment vars. In development, from a .env file
const mongoURI = config.get("env.mongoUri");

// Connects to the server
const connectDB = async () => {
  try {
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Hackathon-Typhoon: MongoDB Connected");
  } catch (error) {
    console.log(
      `Hackathon-Typhoon: MongoDB Connection Failed. Exiting: ${error}`
    );
    process.exit(1);
  }
};

module.exports = connectDB;
