"use client";

import React, { useEffect, useState } from "react";
import { 
  Box, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  CircularProgress,
  Paper,
  Collapse,
  IconButton,
  Divider,
  Grid
} from "@mui/material";
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import Image from 'next/image';

interface Demographic {
  gender?: string;
  dateOfBirth?: string;
  educationLevel?: string;
  city?: string;
}

interface Question {
  id: string;
  text: string;
  type: string;
  options?: string[];
  media?: {
    url: string;
    type: string;
  };
}

interface SurveyResponse {
  _id: string;
  surveyId: string;
  surveyTitle: string;
  completedAt: string;
  demographic?: Demographic;
  answers: Array<{
    questionId: string;
    answer: any;
  }>;
  questions?: Question[];
}

const SurveyHistoryPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<string | null>(null);

  useEffect(() => {
    const fetchSurveyResponses = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('accessToken');
        if (!token) throw new Error('Non authentifié');

        const response = await fetch('http://localhost:5041/api/survey-answers/responses/user', {
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

  const handleExpandClick = async (responseId: string) => {
    if (expandedId === responseId) {
      setExpandedId(null);
      return;
    }

    setExpandedId(responseId);
    setLoadingDetails(responseId);

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('Non authentifié');

      const response = await fetch(`http://localhost:5041/api/survey-answers/responses/${responseId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Erreur lors de la récupération des détails');

      const detailData = await response.json();
      setResponses(prev => prev.map(r => 
        r._id === responseId ? { ...r, questions: detailData.questions } : r
      ));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingDetails(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
    <Box sx={{ p: 4, maxWidth: 1200, margin: '0 auto' }}>
      <Typography variant="h4" sx={{ mb: 3, color: 'primary.main' }}>
        Historique des enquêtes
      </Typography>
      
      {responses.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography>Vous n'avez pas encore répondu à des enquêtes.</Typography>
        </Paper>
      ) : (
        <List>
          {responses.map((response) => (
            <Paper 
              key={response._id} 
              sx={{ 
                mb: 2,
                backgroundColor: 'white',
                boxShadow: 1,
                borderRadius: 1
              }}
            >
              <ListItem
                sx={{
                  borderRadius: 1,
                }}
              >
                <ListItemText
                  primary={
                    <Typography variant="h6">
                      {response.surveyTitle}
                    </Typography>
                  }
                  secondary={`Complété le: ${formatDate(response.completedAt)}`}
                />
                <IconButton
                  onClick={() => handleExpandClick(response._id)}
                  sx={{ 
                    transform: expandedId === response._id ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.3s'
                  }}
                >
                  {expandedId === response._id ? 
                    <KeyboardArrowUpIcon /> : 
                    <KeyboardArrowDownIcon />
                  }
                </IconButton>
              </ListItem>
              
              <Collapse in={expandedId === response._id} timeout="auto" unmountOnExit>
                <Box sx={{ p: 3 }}>
                  {loadingDetails === response._id ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : (
                    <>
                      {response.demographic && (
                        <Box sx={{ mb: 3 }}>
                          <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                            Informations démographiques
                          </Typography>
                          <Grid container spacing={2}>
                            {response.demographic.gender && (
                              <Grid item xs={12} sm={6}>
                                <Paper sx={{ p: 2 }}>
                                  <Typography variant="subtitle2" color="textSecondary">Genre</Typography>
                                  <Typography>{response.demographic.gender}</Typography>
                                </Paper>
                              </Grid>
                            )}
                            {response.demographic.dateOfBirth && (
                              <Grid item xs={12} sm={6}>
                                <Paper sx={{ p: 2 }}>
                                  <Typography variant="subtitle2" color="textSecondary">Date de naissance</Typography>
                                  <Typography>{new Date(response.demographic.dateOfBirth).toLocaleDateString()}</Typography>
                                </Paper>
                              </Grid>
                            )}
                            {response.demographic.educationLevel && (
                              <Grid item xs={12} sm={6}>
                                <Paper sx={{ p: 2 }}>
                                  <Typography variant="subtitle2" color="textSecondary">Niveau d'éducation</Typography>
                                  <Typography>{response.demographic.educationLevel}</Typography>
                                </Paper>
                              </Grid>
                            )}
                            {response.demographic.city && (
                              <Grid item xs={12} sm={6}>
                                <Paper sx={{ p: 2 }}>
                                  <Typography variant="subtitle2" color="textSecondary">Ville</Typography>
                                  <Typography>{response.demographic.city}</Typography>
                                </Paper>
                              </Grid>
                            )}
                          </Grid>
                        </Box>
                      )}

                      <Divider sx={{ my: 3 }} />

                      <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                        Réponses au questionnaire
                      </Typography>
                      
                      {response.questions ? (
                        response.questions.map((question, index) => (
                          <Paper 
                            key={question.id} 
                            sx={{ 
                              mb: 2, 
                              p: 2,
                              backgroundColor: 'background.paper',
                              boxShadow: 2
                            }}
                          >
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                              Question {index + 1}: {question.text}
                            </Typography>

                            {question.media?.url && (
                              <Box sx={{ 
                                my: 2, 
                                position: 'relative',
                                width: '100%',
                                maxWidth: 400,
                                height: 'auto',
                                margin: '16px auto'
                              }}>
                                {question.media.type === 'image' ? (
                                  <Image
                                    src={question.media.url}
                                    alt={`Image pour la question ${index + 1}`}
                                    width={400}
                                    height={300}
                                    style={{
                                      width: '100%',
                                      height: 'auto',
                                      objectFit: 'contain',
                                      borderRadius: '8px'
                                    }}
                                  />
                                ) : question.media.type === 'video' ? (
                                  <video
                                    controls
                                    style={{
                                      width: '100%',
                                      maxWidth: '400px',
                                      borderRadius: '8px'
                                    }}
                                  >
                                    <source src={question.media.url} type="video/mp4" />
                                    Votre navigateur ne supporte pas la lecture de vidéos.
                                  </video>
                                ) : null}
                              </Box>
                            )}

                            <Typography sx={{ mt: 1, color: 'text.primary' }}>
                              <strong>Votre réponse:</strong>{' '}
                              {response.answers.find(a => a.questionId === question.id)?.answer?.toString() || 'Non répondu'}
                            </Typography>
                          </Paper>
                        ))
                      ) : (
                        <Typography>Aucun détail disponible</Typography>
                      )}
                    </>
                  )}
                </Box>
              </Collapse>
            </Paper>
          ))}
        </List>
      )}
    </Box>
  );
};

export default SurveyHistoryPage;
