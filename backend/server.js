const express = require("express");
const mongoose = require("mongoose");
const morgan = require("morgan");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const surveyRoutes = require("./routes/surveys");
const surveyAnswerRoutes = require("./routes/surveyAnswers");
const surveyShareRoutes = require("./routes/surveyShares");
const dynamicSurveyRoutes = require("./routes/dynamicSurveys");
const dynamicSurveyAnswerRoutes = require("./routes/dynamicSurveyAnswers");
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
app.use(cors({
  origin: ['http://localhost:3000','http://localhost:3001' ,'http://localhost:3002'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Debug middleware amélioré
app.use((req, res, next) => {
  console.log('=== Request Debug ===');
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  console.log('Query:', req.query);
  console.log('===================');
  next();
});

// Ajouter ce middleware de debug avant les routes
app.use((req, res, next) => {
  console.log('Requête reçue:', {
    method: req.method,
    path: req.path,
    body: req.body,
    headers: req.headers
  });
  next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/surveys", surveyRoutes);
app.use("/api/survey-answers", surveyAnswerRoutes);
app.use("/api/survey-shares", surveyShareRoutes);
app.use("/api/dynamic-surveys", dynamicSurveyRoutes);
app.use("/api/dynamic-survey-answers", dynamicSurveyAnswerRoutes);

// Catch 404 avec plus de détails
app.use((req, res) => {
  console.log("404 Not Found Details:", {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body
  });
  res.status(404).json({ 
    message: "Route not found",
    requestedPath: req.url,
    method: req.method
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something broke!',
    error: err.message
  });
});

const PORT = process.env.PORT || 5041;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Available routes:');
  console.log('- /api/auth');
  console.log('- /api/surveys');
  console.log('- /api/survey-answers');
  console.log('- /api/survey-shares');
  console.log('- /api/dynamic-surveys');
  console.log('- /api/dynamic-survey-answers');
});
