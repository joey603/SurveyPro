"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  TextField,
  IconButton,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  Slider,
  Rating,
  Select,
} from "@mui/material";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { createSurvey } from "../../utils/surveyService";

type Question = {
  id: string;
  type: string;
  text: string;
  options?: string[];
  media?: string; // URL or file path of the media
};

type FormData = {
  title: string;
  description: string;
  questions: Question[];
};

const questionTypes = [
  { value: "multiple-choice", label: "Multiple Choice" },
  { value: "text", label: "Open-ended" },
  { value: "dropdown", label: "Dropdown" },
  { value: "yes-no", label: "Yes/No" },
  { value: "slider", label: "Slider" },
  { value: "rating", label: "Rating (Stars)" },
  { value: "file-upload", label: "File Upload" },
  { value: "matrix", label: "Matrix (Rows and Columns)" },
  { value: "number", label: "Number Input" },
];

const templates = [
  {
    title: "Customer Feedback",
    description: "A simple customer feedback survey.",
    questions: [
      {
        id: "1",
        type: "rating",
        text: "How satisfied are you with our service?",
        options: [],
      },
      {
        id: "2",
        type: "text",
        text: "What could we improve?",
        options: [],
      },
    ],
  },
  {
    title: "Employee Engagement",
    description: "A survey to measure employee engagement.",
    questions: [
      {
        id: "1",
        type: "multiple-choice",
        text: "How do you feel about your work environment?",
        options: ["Very Positive", "Positive", "Neutral", "Negative", "Very Negative"],
      },
    ],
  },
];

const SurveyCreationPage: React.FC = () => {
  const { control, handleSubmit, setValue, reset, watch } = useForm<FormData>({
    defaultValues: {
      title: "",
      description: "",
      questions: [],
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "questions",
  });

  const [responseMessage, setResponseMessage] = useState<string | null>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<FormData | null>(null);
  const [isCreatingNewSurvey, setIsCreatingNewSurvey] = useState(false);

  const handleUseTemplate = (template: FormData) => {
    reset({
      title: template.title,
      description: template.description,
      questions: template.questions,
    });
    setSelectedTemplate(template);
    setShowTemplateDialog(false);
  };

  const handleAddQuestion = () => {
    append({ id: Date.now().toString(), type: "text", text: "", options: [], media: "" });
  };

  const handleDeleteQuestion = (index: number) => {
    remove(index);
  };

  const handleQuestionTypeChange = (index: number, newType: string) => {
    const updatedQuestions = [...fields];
    updatedQuestions[index] = {
      ...updatedQuestions[index],
      type: newType,
      options: newType === "multiple-choice" || newType === "dropdown" ? [""] : [],
    };
    update(index, updatedQuestions[index]);
  };

  const handleAddOption = (index: number) => {
    const updatedQuestions = [...fields];
    if (!updatedQuestions[index].options) {
      updatedQuestions[index].options = [];
    }
    updatedQuestions[index].options!.push("");
    update(index, updatedQuestions[index]);
  };

  const handleOptionChange = (index: number, optionIndex: number, value: string) => {
    setValue(`questions.${index}.options.${optionIndex}`, value, { shouldValidate: true });
  };

  const handleDeleteOption = (questionIndex: number, optionIndex: number) => {
    const updatedQuestions = [...fields];
    updatedQuestions[questionIndex].options!.splice(optionIndex, 1);
    update(questionIndex, updatedQuestions[questionIndex]);
  };

  const handleMediaUpload = (index: number, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const updatedQuestions = [...fields];
      updatedQuestions[index].media = reader.result as string;
      update(index, updatedQuestions[index]);
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = async (data: FormData) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setResponseMessage("You must be logged in to create a survey.");
        return;
      }
      const response = await createSurvey(data, token);
      setResponseMessage(response.message || "Survey created successfully!");
    } catch (error: any) {
      setResponseMessage(error.response?.data?.message || "Failed to create survey.");
    }
  };

  const surveyTitle = watch("title");
  const surveyQuestions = watch("questions");

  const handleNextQuestion = () => {
    if (currentQuestionIndex < surveyQuestions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const renderPreviewQuestion = () => {
    const question = surveyQuestions[currentQuestionIndex];
    if (!question) return null;

    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6">{question.text}</Typography>
        {question.media && (
          <Box sx={{ mt: 2 }}>
            <img src={question.media} alt="Media" style={{ maxWidth: "100%", borderRadius: "8px" }} />
          </Box>
        )}
        {question.type === "multiple-choice" && (
          <RadioGroup>
            {question.options?.map((option, index) => (
              <FormControlLabel key={index} value={option} control={<Radio />} label={option} />
            ))}
          </RadioGroup>
        )}
        {question.type === "text" && <TextField fullWidth variant="outlined" />}
        {question.type === "dropdown" && (
          <Select fullWidth>
            {question.options?.map((option, index) => (
              <MenuItem key={index} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        )}
        {question.type === "slider" && <Slider valueLabelDisplay="auto" />}
        {question.type === "rating" && <Rating />}
        {question.type === "yes-no" && (
          <RadioGroup>
            <FormControlLabel value="yes" control={<Radio />} label="Yes" />
            <FormControlLabel value="no" control={<Radio />} label="No" />
          </RadioGroup>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ padding: 4 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Survey Creation
      </Typography>

      {responseMessage && (
        <Typography
          variant="subtitle1"
          sx={{ mb: 3, color: responseMessage.includes("successfully") ? "green" : "red" }}
        >
          {responseMessage}
        </Typography>
      )}

      {!isCreatingNewSurvey && !selectedTemplate && (
        <Box sx={{ mb: 3, display: "flex", gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setIsCreatingNewSurvey(true)}
          >
            Create Survey
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => setShowTemplateDialog(true)}
          >
            Use Template
          </Button>
        </Box>
      )}

      <Dialog
        open={showTemplateDialog}
        onClose={() => setShowTemplateDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Select a Template</DialogTitle>
        <DialogContent>
          {templates.map((template, index) => (
            <Button
              key={index}
              variant="contained"
              onClick={() => handleUseTemplate(template)}
              sx={{ mb: 2 }}
            >
              {template.title}
            </Button>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTemplateDialog(false)} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {(isCreatingNewSurvey || selectedTemplate) && (
        <form onSubmit={handleSubmit(onSubmit)}>
          <Controller
            name="title"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Survey Title"
                fullWidth
                sx={{ mb: 2 }}
                variant="outlined"
              />
            )}
          />
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Survey Description"
                fullWidth
                sx={{ mb: 2 }}
                variant="outlined"
              />
            )}
          />

          {fields.map((field, index) => (
            <Box key={field.id} sx={{ mb: 3, borderBottom: "1px solid lightgray", pb: 3 }}>
              <Controller
                name={`questions.${index}.text`}
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={`Question ${index + 1}`}
                    fullWidth
                    sx={{ mb: 2 }}
                    variant="outlined"
                  />
                )}
              />

              <TextField
                select
                label="Question Type"
                fullWidth
                sx={{ mb: 2 }}
                value={field.type}
                onChange={(e) => handleQuestionTypeChange(index, e.target.value)}
              >
                {questionTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </TextField>

              {["multiple-choice", "dropdown"].includes(field.type) && (
                <Box sx={{ mb: 2 }}>
                  {field.options?.map((option, optionIndex) => (
                    <Box
                      key={optionIndex}
                      sx={{ display: "flex", alignItems: "center", mb: 1 }}
                    >
                      <TextField
                        value={option}
                        onChange={(e) =>
                          handleOptionChange(index, optionIndex, e.target.value)
                        }
                        fullWidth
                        variant="outlined"
                      />
                      <IconButton
                        onClick={() => handleDeleteOption(index, optionIndex)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  ))}
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => handleAddOption(index)}
                  >
                    Add Option
                  </Button>
                </Box>
              )}

              <Button
                variant="outlined"
                component="label"
                sx={{ mb: 2 }}
              >
                Upload Image/Video
                <input
                  type="file"
                  accept="image/*,video/*"
                  hidden
                  onChange={(e) =>
                    e.target.files && handleMediaUpload(index, e.target.files[0])
                  }
                />
              </Button>

              {field.media && (
                <Typography variant="body2" color="textSecondary">
                  Uploaded Media: {field.media}
                </Typography>
              )}

              <Button
                onClick={() => handleDeleteQuestion(index)}
                startIcon={<DeleteIcon />}
                color="secondary"
              >
                Delete Question
              </Button>
            </Box>
          ))}

          <Button variant="outlined" onClick={handleAddQuestion} sx={{ mb: 3 }}>
            Add Question
          </Button>
          <Button type="submit" variant="contained" color="primary">
            Save Survey
          </Button>
          <Button
            onClick={() => setShowPreview(true)}
            variant="contained"
            color="info"
            sx={{ ml: 2 }}
          >
            Preview
          </Button>
        </form>
      )}

      {showPreview && (
        <Dialog open={showPreview} onClose={() => setShowPreview(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ textAlign: "center" }}>
            {surveyTitle} - Preview
          </DialogTitle>
          <DialogContent>
            {renderPreviewQuestion()}
          </DialogContent>
          <DialogActions>
            <Button
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
            >
              Previous
            </Button>
            <Button
              onClick={handleNextQuestion}
              disabled={currentQuestionIndex === surveyQuestions.length - 1}
            >
              Next
            </Button>
            <Button onClick={() => setShowPreview(false)} color="primary">
              Close
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default SurveyCreationPage;
