"use client";

import React from "react";
import { Box, Typography, List, ListItem, ListItemText, Divider } from "@mui/material";

// Mock results data
const mockResults = {
  title: "Customer Feedback Survey",
  questions: [
    {
      text: "How satisfied are you with our service?",
      responses: [
        { option: "Very Satisfied", count: 50 },
        { option: "Satisfied", count: 30 },
        { option: "Neutral", count: 15 },
        { option: "Dissatisfied", count: 5 },
        { option: "Very Dissatisfied", count: 2 },
      ],
    },
    {
      text: "What can we improve?",
      responses: [
        { text: "Better prices", count: 20 },
        { text: "Faster service", count: 15 },
      ],
    },
    {
      text: "Rate your overall experience from 1 to 10.",
      responses: [
        { text: "Average Rating: 8.5" },
      ],
    },
  ],
};

const SurveyResultsPage: React.FC = () => {
  return (
    <Box sx={{ p: 4, backgroundColor: '#f5f5f5' }}>
      <Typography variant="h4" sx={{ mb: 3 }}>{mockResults.title}</Typography>
      <Typography variant="subtitle1" sx={{ mb: 4 }}>Survey Results</Typography>

      {mockResults.questions.map((question, index) => (
        <Box key={index} sx={{ mb: 4 }}>
          <Typography variant="h6">{question.text}</Typography>
          <List>
            {question.responses.map((response, i) => (
              <ListItem key={i}>
                <ListItemText
                  primary={`${response.option || response.text} - ${response.count || ""} responses`}
                />
              </ListItem>
            ))}
          </List>
          <Divider sx={{ my: 2 }} />
        </Box>
      ))}
    </Box>
  );
};

export default SurveyResultsPage;
