"use client";

import React, { useEffect, useState } from "react";
import { Box, Typography, List, ListItem, ListItemText, CircularProgress } from "@mui/material";
import { useRouter } from "next/navigation";

interface SurveyResponse {
  _id: string;
  surveyId: string;
  surveyTitle: string;
  completedAt: string;
  answers: Array<{
    questionId: string;
    value: any;
  }>;
}

const SurveyHistoryPage: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);

  useEffect(() => {
    const fetchSurveyResponses = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('accessToken');
        if (!token) throw new Error('Non authentifié');

        const response = await fetch('/api/survey-responses', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) throw new Error('Erreur lors de la récupération des réponses');

        const data = await response.json();
        setResponses(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSurveyResponses();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>Historique des enquêtes</Typography>
      {responses.length === 0 ? (
        <Typography>Vous n'avez pas encore répondu à des enquêtes.</Typography>
      ) : (
        <List>
          {responses.map((response) => (
            <ListItem
              key={response._id}
              button
              onClick={() => router.push(`/survey-responses/${response._id}`)}
              sx={{
                mb: 2,
                backgroundColor: 'white',
                borderRadius: 1,
                boxShadow: 1,
              }}
            >
              <ListItemText
                primary={response.surveyTitle}
                secondary={`Complété le: ${new Date(response.completedAt).toLocaleDateString()}`}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};

export default SurveyHistoryPage;
