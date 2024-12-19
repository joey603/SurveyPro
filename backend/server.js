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
app.use(express.json({ limit: "50mb" }));
app.use(cors());

// Debug middleware pour logger toutes les requêtes
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/surveys", surveyRoutes);
app.use("/api/survey-answers", (req, res, next) => {
  console.log("Survey Answers route hit:", req.method, req.url);
  next();
}, surveyAnswerRoutes);

// Catch 404 et logger
app.use((req, res) => {
  console.log("404 Not Found:", req.method, req.url);
  res.status(404).json({ message: "Route not found" });
});

const PORT = process.env.PORT || 5041;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
