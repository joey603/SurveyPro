"use client";

import React from "react";
import { Box, Typography, List, ListItem, ListItemText } from "@mui/material";
import { useRouter } from "next/navigation";

// Mock survey history
const mockHistory = [
  { id: "1", title: "Customer Feedback Survey", completedAt: "2024-11-20" },
  { id: "2", title: "Employee Engagement Survey", completedAt: "2024-11-18" },
];

const SurveyHistoryPage: React.FC = () => {
  const router = useRouter();

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>Survey History</Typography>
      <List>
        {mockHistory.map((survey) => (
          <ListItem
            key={survey.id}
            button
            onClick={() => router.push(`/survey-results/${survey.id}`)}
          >
            <ListItemText
              primary={survey.title}
              secondary={`Completed on: ${new Date(survey.completedAt).toLocaleDateString()}`}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default SurveyHistoryPage;
