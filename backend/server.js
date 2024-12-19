const express = require("express");
const mongoose = require("mongoose");
const morgan = require("morgan");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const surveyRoutes = require("./routes/surveys");
const surveyAnswerRoutes = require("./routes/surveyAnswers");
require("dotenv").config();

const app = express();

// Database connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((error) => console.error("Could not connect to MongoDB:", error));

// Middleware
app.use(morgan("combined"));
app.use(express.json({ limit: "50mb" })); // Allow large JSON payloads for media
app.use(cors());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/surveys", (req, res, next) => {
  console.log("Surveys route hit"); // Log to verify the route is hit
  next();
}, surveyRoutes);
app.use("/api/survey-answers", surveyAnswerRoutes);

const PORT = process.env.PORT || 5041;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
