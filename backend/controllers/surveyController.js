const Survey = require("../models/Survey");

exports.createSurvey = async (req, res) => {
  try {
    console.log("Incoming request body:", req.body); // Log the entire request body

    const { title, questions, demographicEnabled, demographicData } = req.body;

    console.log("Received title:", title);
    console.log("Received questions:", questions);
    console.log("Received demographicEnabled:", demographicEnabled);
    console.log("Received demographicData:", demographicData);

    // Validate the request body
    if (!title || !questions || questions.length === 0) {
      console.log("Validation failed: Title or questions are missing.");
      return res.status(400).json({ message: "Title and questions are required." });
    }

    // Validate each question
    for (const question of questions) {
      console.log("Validating question:", question);
      if (!question.id.match(/^[a-zA-Z0-9-_]+$/)) {
        console.log(`Invalid question ID: ${question.id}`);
        return res.status(400).json({
          message: `Invalid question ID: ${question.id}. Must match /^[a-zA-Z0-9-_]+$/.`,
        });
      }
      if (!["multiple-choice", "text", "dropdown", "slider", "rating", "yes-no"].includes(question.type)) {
        console.log(`Invalid question type: ${question.type}`);
        return res.status(400).json({
          message: `Invalid question type: ${question.type}. Allowed types: multiple-choice, text, dropdown, slider, rating, yes-no.`,
        });
      }
      if (!question.text) {
        console.log(`Missing text in question: ${JSON.stringify(question)}`);
        return res.status(400).json({
          message: `Question text is required. Invalid question: ${JSON.stringify(question)}`,
        });
      }
    }

    // Create and save the survey
    const survey = new Survey({
      title,
      questions,
      demographicEnabled,
      demographicData,
      createdBy: req.user?.id, // Assuming authMiddleware adds req.user
    });

    console.log("Survey object before saving:", survey);

    await survey.save();
    console.log("Survey saved successfully:", survey);

    res.status(201).json({ message: "Survey created successfully!", survey });
  } catch (error) {
    console.error("Error creating survey:", error.message); // Log error message
    res.status(500).json({ message: "Error creating survey.", error: error.message });
  }
};

exports.getSurveys = async (req, res) => {
  try {
    console.log("Fetching surveys for user:", req.user.id);

    const surveys = await Survey.find({ createdBy: req.user.id });

    if (!surveys.length) {
      return res.status(404).json({ message: "No surveys found." });
    }

    res.status(200).json(surveys);
  } catch (error) {
    console.error("Error fetching surveys:", error.message);
    res.status(500).json({ message: "Error fetching surveys.", error: error.message });
  }
};

exports.getSurveyById = async (req, res) => {
  try {
    console.log("Fetching survey with ID:", req.params.id);

    const survey = await Survey.findById(req.params.id);

    if (!survey) {
      return res.status(404).json({ message: "Survey not found." });
    }

    res.status(200).json(survey);
  } catch (error) {
    console.error("Error fetching survey details:", error.message);
    res.status(500).json({ message: "Error fetching survey details.", error: error.message });
  }
};
