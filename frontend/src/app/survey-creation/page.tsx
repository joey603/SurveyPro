"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  MenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  Switch,
  Select,
  Slider,
  Rating,
} from "@mui/material";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { ChromePicker } from "react-color";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { createSurvey } from "../../utils/surveyService";

type Question = {
  id: string;
  type: string;
  text: string;
  options?: string[];
  media?: string;
};

type FormData = {
  title: string;
  description: string;
  demographicEnabled: boolean;
  questions: Question[];
};

const questionTypes = [
  { value: "multiple-choice", label: "Multiple Choice" },
  { value: "text", label: "Open-ended" },
  { value: "dropdown", label: "Dropdown" },
  { value: "yes-no", label: "Yes/No" },
  { value: "slider", label: "Slider" },
  { value: "rating", label: "Rating (Stars)" },
  { value: "date", label: "Date Picker" },
  { value: "file-upload", label: "File Upload" },
  { value: "color-picker", label: "Color Picker" },
];

const cityOptions = ["Tel Aviv", "Jerusalem", "Haifa", "Ashdod", "Eilat", "Be'er Sheva"];
const educationOptions = [
  "High School",
  "Bachelor's",
  "Master's",
  "Doctorate",
  "Other",
];

const SurveyCreationPage: React.FC = () => {
  const { control, handleSubmit, setValue, reset, watch } = useForm<FormData>({
    defaultValues: {
      title: "",
      description: "",
      demographicEnabled: false,
      questions: [],
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "questions",
  });

  const [localOptions, setLocalOptions] = useState<{ [key: string]: string[] }>({});
  const [showPreview, setShowPreview] = useState(false);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const demographicEnabled = watch("demographicEnabled");

  const handleAddQuestion = () => {
    const id = Date.now().toString();
    append({ id, type: "text", text: "", options: [], media: "" });
    setLocalOptions((prev) => ({ ...prev, [id]: [] }));
  };

  const handleDeleteQuestion = (index: number) => {
    const questionId = fields[index].id;
    remove(index);
    setLocalOptions((prev) => {
      const updated = { ...prev };
      delete updated[questionId];
      return updated;
    });
  };

  const handleQuestionTypeChange = (index: number, newType: string) => {
    const updatedQuestions = [...fields];

    const currentText = updatedQuestions[index].text;

    updatedQuestions[index] = {
      ...updatedQuestions[index],
      type: newType,
      text: currentText,
      options: newType === "multiple-choice" || newType === "dropdown" ? [""] : [],
    };

    const questionId = fields[index].id;

    if (newType === "multiple-choice" || newType === "dropdown") {
      setLocalOptions((prev) => ({ ...prev, [questionId]: prev[questionId] || [""] }));
    } else {
      setLocalOptions((prev) => {
        const updated = { ...prev };
        delete updated[questionId];
        return updated;
      });
    }

    update(index, updatedQuestions[index]);
  };

  const handleAddOption = (questionId: string) => {
    setLocalOptions((prev) => ({
      ...prev,
      [questionId]: [...(prev[questionId] || []), ""],
    }));
  };

  const handleOptionChange = (questionId: string, optionIndex: number, value: string) => {
    setLocalOptions((prev) => {
      const updatedOptions = [...(prev[questionId] || [])];
      updatedOptions[optionIndex] = value;
      return { ...prev, [questionId]: updatedOptions };
    });
  };

  const handleResetSurvey = () => {
    reset({
      title: "",
      description: "",
      demographicEnabled: false,
      questions: [],
    });
    setLocalOptions({});
  };

  const onSubmit = async (data: FormData) => {
    const questionsWithUpdatedOptions = data.questions.map((question) => ({
      ...question,
      options: localOptions[question.id] || [],
    }));

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        throw new Error("No authentication token found.");
      }
      await createSurvey({ ...data, questions: questionsWithUpdatedOptions }, token);
      alert("Survey saved successfully!");
    } catch (error) {
      console.error("Error saving survey:", error);
      alert("Failed to save survey. Check the console for details.");
    }
  };

  const renderDemographicPreview = () => (
    <Box sx={{ mt: 2, p: 2, border: "1px solid #ddd", borderRadius: "8px", backgroundColor: "#f9f9f9" }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Demographic Information
      </Typography>
      <RadioGroup>
        <FormControlLabel value="male" control={<Radio />} label="Male" />
        <FormControlLabel value="female" control={<Radio />} label="Female" />
        <FormControlLabel value="other" control={<Radio />} label="Other" />
      </RadioGroup>
      <TextField fullWidth sx={{ mt: 2 }} label="Date of Birth" placeholder="MM/DD/YYYY" variant="outlined" />
      <Select fullWidth sx={{ mt: 2 }} displayEmpty defaultValue="">
        <MenuItem value="" disabled>
          Select education level
        </MenuItem>
        {educationOptions.map((level, index) => (
          <MenuItem key={index} value={level}>
            {level}
          </MenuItem>
        ))}
      </Select>
      <Select fullWidth sx={{ mt: 2 }} displayEmpty defaultValue="">
        <MenuItem value="" disabled>
          Select your city
        </MenuItem>
        {cityOptions.map((city, index) => (
          <MenuItem key={index} value={city}>
            {city}
          </MenuItem>
        ))}
      </Select>
    </Box>
  );

  const renderPreviewQuestion = () => {
    if (currentPreviewIndex === 0 && demographicEnabled) {
      return renderDemographicPreview();
    }

    const question = fields[currentPreviewIndex - (demographicEnabled ? 1 : 0)];
    if (!question) return null;

    return (
      <Box sx={{ mt: 2, p: 2, border: "1px solid #ddd", borderRadius: "8px", backgroundColor: "#f9f9f9" }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {question.text}
        </Typography>
        {question.type === "multiple-choice" && (
          <RadioGroup>
            {localOptions[question.id]?.map((option, index) => (
              <FormControlLabel key={index} value={option} control={<Radio />} label={option} />
            ))}
          </RadioGroup>
        )}
        {question.type === "text" && <TextField fullWidth variant="outlined" placeholder="Your answer" />}
        {question.type === "dropdown" && (
          <Select fullWidth>
            {localOptions[question.id]?.map((option, index) => (
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
        {question.type === "date" && (
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="Select a date"
              value={selectedDate}
              onChange={(newDate) => setSelectedDate(newDate)}
              renderInput={(params) => <TextField {...params} />}
            />
          </LocalizationProvider>
        )}
        {question.type === "file-upload" && (
          <Button variant="outlined" component="label">
            Upload File
            <input
              type="file"
              hidden
              onChange={(e) => e.target.files && setUploadedFile(e.target.files[0])}
            />
          </Button>
        )}
        {uploadedFile && (
          <Typography sx={{ mt: 2 }} variant="body2">
            Uploaded file: {uploadedFile.name}
          </Typography>
        )}
        {question.type === "color-picker" && (
          <ChromePicker
            color="#000"
            onChangeComplete={(color) => console.log("Selected color:", color.hex)}
          />
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ padding: 4 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Survey Creation
      </Typography>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Controller
          name="title"
          control={control}
          render={({ field }) => (
            <TextField {...field} label="Survey Title" fullWidth sx={{ mb: 2 }} variant="outlined" />
          )}
        />
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <TextField {...field} label="Survey Description" fullWidth sx={{ mb: 2 }} variant="outlined" />
          )}
        />

        <FormControlLabel
          control={
            <Switch
              checked={demographicEnabled}
              onChange={(e) => setValue("demographicEnabled", e.target.checked)}
            />
          }
          label="Include Demographic Questions"
        />

        {fields.map((field, index) => (
          <Box key={field.id} sx={{ mb: 3, borderBottom: "1px solid lightgray", pb: 3 }}>
            <Controller
              name={`questions.${index}.text`}
              control={control}
              render={({ field }) => (
                <TextField {...field} label={`Question ${index + 1}`} fullWidth sx={{ mb: 2 }} />
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
                {localOptions[field.id]?.map((option, optionIndex) => (
                  <Box key={optionIndex} sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                    <TextField
                      value={option}
                      onChange={(e) => handleOptionChange(field.id, optionIndex, e.target.value)}
                      fullWidth
                      variant="outlined"
                    />
                    <IconButton
                      onClick={() =>
                        setLocalOptions((prev) => {
                          const updated = [...(prev[field.id] || [])];
                          updated.splice(optionIndex, 1);
                          return { ...prev, [field.id]: updated };
                        })
                      }
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                ))}
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => handleAddOption(field.id)}
                >
                  Add Option
                </Button>
              </Box>
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

        <Button onClick={handleAddQuestion} variant="outlined">
          Add Question
        </Button>
        <Button type="submit" variant="contained" color="primary" sx={{ ml: 2 }}>
          Save Survey
        </Button>
        <Button onClick={handleResetSurvey} variant="contained" color="secondary" sx={{ ml: 2 }}>
          Reset Survey
        </Button>
        <Button
          onClick={() => setShowPreview(true)}
          variant="outlined"
          color="info"
          sx={{ ml: 2 }}
        >
          Preview
        </Button>
      </form>

      {showPreview && (
        <Dialog open={showPreview} onClose={() => setShowPreview(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ textAlign: "center" }}>Preview Survey</DialogTitle>
          <DialogContent>
            <Typography variant="h5" sx={{ mb: 2 }}>
              {watch("title")}
            </Typography>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              Total Questions: {fields.length + (demographicEnabled ? 1 : 0)}
            </Typography>
            {renderPreviewQuestion()}
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setCurrentPreviewIndex((prev) => Math.max(prev - 1, 0))}
              disabled={currentPreviewIndex === 0}
            >
              Previous
            </Button>
            <Button
              onClick={() =>
                setCurrentPreviewIndex((prev) =>
                  Math.min(prev + 1, fields.length + (demographicEnabled ? 1 : 0) - 1)
                )
              }
              disabled={currentPreviewIndex === fields.length + (demographicEnabled ? 1 : 0) - 1}
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
