"use client";

import React from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
  Slider,
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";

// Mock survey data
const mockSurvey = {
  title: "Customer Feedback Survey",
  description: "Please provide your feedback to help us improve.",
  questions: [
    {
      id: "1",
      type: "multiple-choice",
      text: "How satisfied are you with our service?",
      options: ["Very Satisfied", "Satisfied", "Neutral", "Dissatisfied", "Very Dissatisfied"],
    },
    {
      id: "2",
      type: "text",
      text: "What can we improve?",
    },
    {
      id: "3",
      type: "slider",
      text: "Rate your overall experience from 1 to 10.",
    },
  ],
};

const SurveyAnswerPage: React.FC = () => {
  const { control, handleSubmit } = useForm();

  const onSubmit = (data: any) => {
    console.log("Survey Answers Submitted:", data);
    alert("Thank you for submitting your answers!");
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>{mockSurvey.title}</Typography>
      <Typography variant="subtitle1" sx={{ mb: 4 }}>{mockSurvey.description}</Typography>

      <form onSubmit={handleSubmit(onSubmit)}>
        {mockSurvey.questions.map((question) => (
          <Box key={question.id} sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>{question.text}</Typography>

            {question.type === "multiple-choice" && (
              <Controller
                name={`answers.${question.id}`}
                control={control}
                render={({ field }) => (
                  <RadioGroup {...field}>
                    {question.options.map((option, index) => (
                      <FormControlLabel key={index} value={option} control={<Radio />} label={option} />
                    ))}
                  </RadioGroup>
                )}
              />
            )}

            {question.type === "text" && (
              <Controller
                name={`answers.${question.id}`}
                control={control}
                render={({ field }) => (
                  <TextField {...field} label="Your Answer" fullWidth />
                )}
              />
            )}

            {question.type === "slider" && (
              <Controller
                name={`answers.${question.id}`}
                control={control}
                render={({ field }) => (
                  <Slider {...field} min={1} max={10} valueLabelDisplay="auto" />
                )}
              />
            )}
          </Box>
        ))}

        <Button type="submit" variant="contained" color="primary">Submit</Button>
      </form>
    </Box>
  );
};

export default SurveyAnswerPage;
