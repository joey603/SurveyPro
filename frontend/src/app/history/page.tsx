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
  Grid,
  Button,
  Rating
} from "@mui/material";
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import Image from 'next/image';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ReactPlayer from 'react-player';

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
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyResponse | null>(null);

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
    const survey = responses.find(r => r._id === responseId);
    if (!survey) return;

    setLoadingDetails(responseId);

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('Non authentifié');

      // Récupérer les détails de la réponse
      const responseDetails = await fetch(`http://localhost:5041/api/survey-answers/responses/${responseId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!responseDetails.ok) throw new Error('Erreur lors de la récupération des détails');

      const detailData = await responseDetails.json();
      console.log('Detail data received:', detailData);

      // Récupérer les médias du sondage
      try {
        const mediaResponse = await fetch(`http://localhost:5041/api/surveys/${detailData.surveyId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (mediaResponse.ok) {
          const surveyData = await mediaResponse.json();
          console.log('Survey data with media:', surveyData);

          // Associer les médias aux questions si disponibles
          const updatedSurvey = { 
            ...survey, 
            questions: detailData.questions.map((q: any) => {
              const surveyQuestion = surveyData.questions?.find((sq: any) => sq.id === q.id);
              return {
                ...q,
                media: typeof surveyQuestion?.media === 'string' ? {
                  url: surveyQuestion.media,
                  type: surveyQuestion.media.toLowerCase().includes('.mp4') ? 'video' : 'image'
                } : null
              };
            })
          };
          
          console.log('Updated survey with media:', updatedSurvey);
          setSelectedSurvey(updatedSurvey);
        } else {
          // Si on ne peut pas récupérer les médias, on continue sans
          setSelectedSurvey({
            ...survey,
            questions: detailData.questions
          });
        }
      } catch (mediaError) {
        console.warn('Could not fetch media, continuing without:', mediaError);
        setSelectedSurvey({
          ...survey,
          questions: detailData.questions
        });
      }

    } catch (err: any) {
      console.error('Error fetching survey details:', err);
      setError(err.message);
    } finally {
      setLoadingDetails(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  if (loading) {
    return (
      <Box sx={{
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <CircularProgress sx={{ color: '#667eea' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: { xs: 2, sm: 4 },
    }}>
      <Paper elevation={3} sx={{
        borderRadius: 3,
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '800px',
        mb: 4,
      }}>
        <Box sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          py: 4,
          px: 4,
          color: 'white',
          textAlign: 'center',
          position: 'relative'
        }}>
          {selectedSurvey && (
            <IconButton
              onClick={() => setSelectedSurvey(null)}
              sx={{
                position: 'absolute',
                left: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'white',
              }}
            >
              <ArrowBackIcon />
            </IconButton>
          )}
          <Typography variant="h4" fontWeight="bold">
            {selectedSurvey ? selectedSurvey.surveyTitle : 'Survey History'}
          </Typography>
          {selectedSurvey && (
            <Typography variant="subtitle1" sx={{ mt: 1, opacity: 0.9 }}>
              Completed on {formatDate(selectedSurvey.completedAt)}
            </Typography>
          )}
        </Box>

        <Box sx={{ p: 4, backgroundColor: 'white' }}>
          {responses.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center', backgroundColor: 'background.paper' }}>
              <Typography>You haven't responded to any surveys yet.</Typography>
            </Paper>
          ) : !selectedSurvey ? (
            <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
              {responses.map((response) => (
                <Paper
                  key={response._id}
                  elevation={1}
                  sx={{
                    borderRadius: 2,
                    overflow: 'hidden',
                    transition: 'box-shadow 0.3s ease-in-out',
                    '&:hover': {
                      boxShadow: 3,
                    }
                  }}
                >
                  <Box sx={{ p: 3 }}>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        mb: 2,
                        color: 'primary.main',
                        fontWeight: 500
                      }}
                    >
                      {response.surveyTitle}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      color="text.secondary"
                      sx={{ display: 'block', mb: 2 }}
                    >
                      Completed on {formatDate(response.completedAt)}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ 
                    p: 2, 
                    borderTop: 1, 
                    borderColor: 'divider',
                    backgroundColor: 'action.hover',
                    display: 'flex',
                    justifyContent: 'flex-end'
                  }}>
                    <Button
                      onClick={() => handleExpandClick(response._id)}
                      variant="contained"
                      size="small"
                      sx={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                        },
                      }}
                    >
                      View Details
                    </Button>
                  </Box>
                </Paper>
              ))}
            </Box>
          ) : (
            <Box>
              {selectedSurvey.demographic && (
                <Paper 
                  elevation={1}
                  sx={{ 
                    p: 3, 
                    mb: 4, 
                    borderRadius: 2,
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                  }}
                >
                  <Typography variant="h6" sx={{ mb: 3, color: '#1a237e' }}>
                    Demographic Information
                  </Typography>
                  <Grid container spacing={2}>
                    {selectedSurvey.demographic.gender && (
                      <Grid item xs={12} sm={6}>
                        <Paper sx={{ p: 2 }}>
                          <Typography variant="subtitle2" color="textSecondary">Gender</Typography>
                          <Typography>{selectedSurvey.demographic.gender}</Typography>
                        </Paper>
                      </Grid>
                    )}
                    {selectedSurvey.demographic.dateOfBirth && (
                      <Grid item xs={12} sm={6}>
                        <Paper sx={{ p: 2 }}>
                          <Typography variant="subtitle2" color="textSecondary">Date of Birth</Typography>
                          <Typography>
                            {selectedSurvey.demographic.dateOfBirth ? 
                              (() => {
                                const date = new Date(selectedSurvey.demographic.dateOfBirth);
                                const day = String(date.getDate()).padStart(2, '0');
                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                const year = date.getFullYear();
                                return `${day}/${month}/${year}`;
                              })() : 
                              'Not provided'
                            }
                          </Typography>
                        </Paper>
                      </Grid>
                    )}
                    {selectedSurvey.demographic.educationLevel && (
                      <Grid item xs={12} sm={6}>
                        <Paper sx={{ p: 2 }}>
                          <Typography variant="subtitle2" color="textSecondary">Education Level</Typography>
                          <Typography>{selectedSurvey.demographic.educationLevel}</Typography>
                        </Paper>
                      </Grid>
                    )}
                    {selectedSurvey.demographic.city && (
                      <Grid item xs={12} sm={6}>
                        <Paper sx={{ p: 2 }}>
                          <Typography variant="subtitle2" color="textSecondary">City</Typography>
                          <Typography>{selectedSurvey.demographic.city}</Typography>
                        </Paper>
                      </Grid>
                    )}
                  </Grid>
                </Paper>
              )}

              <Typography variant="h6" sx={{ mb: 3, color: '#1a237e' }}>
                Survey Responses
              </Typography>

              {selectedSurvey.questions?.map((question, index) => {
                console.log('Question media:', question.media);
                
                return (
                  <Paper
                    key={question.id}
                    elevation={1}
                    sx={{
                      p: 3,
                      mb: 3,
                      borderRadius: 2,
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                    }}
                  >
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      Question {index + 1}: {question.text}
                      <Typography 
                        component="span" 
                        sx={{ 
                          ml: 2,
                          fontSize: '0.8em',
                          color: 'text.secondary',
                          backgroundColor: 'rgba(102, 126, 234, 0.1)',
                          padding: '4px 8px',
                          borderRadius: '4px'
                        }}
                      >
                        {(() => {
                          switch (question.type) {
                            case 'text':
                              return 'Text Response';
                            case 'multiple-choice':
                              return 'Multiple Choice';
                            case 'slider':
                              return 'Slider';
                            case 'rating':
                              return 'Rating';
                            case 'dropdown':
                              return 'Dropdown';
                            case 'yes-no':
                              return 'Yes/No';
                            case 'date':
                              return 'Date';
                            case 'file-upload':
                              return 'File Upload';
                            case 'color-picker':
                              return 'Color Picker';
                            default:
                              return question.type;
                          }
                        })()}
                      </Typography>
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
                            alt={`Image for question ${index + 1}`}
                            width={400}
                            height={300}
                            style={{
                              width: '100%',
                              height: 'auto',
                              objectFit: 'contain',
                              borderRadius: '8px'
                            }}
                            unoptimized
                          />
                        ) : question.media.type === 'video' ? (
                          <ReactPlayer
                            url={question.media.url}
                            controls
                            width="100%"
                            height="auto"
                            style={{ borderRadius: '8px' }}
                            config={{
                              file: {
                                attributes: {
                                  controlsList: 'nodownload',
                                  onContextMenu: (e: React.MouseEvent) => e.preventDefault()
                                }
                              }
                            }}
                          />
                        ) : null}
                      </Box>
                    )}

                    <Box sx={{ 
                      mt: 2,
                      p: 2,
                      backgroundColor: 'rgba(102, 126, 234, 0.05)',
                      borderRadius: 1
                    }}>
                      <Typography sx={{ color: 'text.primary' }}>
                        <strong>Your answer:</strong>{' '}
                        {(() => {
                          const answer = selectedSurvey.answers.find(a => a.questionId === question.id)?.answer;
                          if (!answer) return 'Not answered';
                          
                          switch (question.type) {
                            case 'date':
                              if (typeof answer === 'string' && answer.match(/^\d{4}-\d{2}-\d{2}/)) {
                                const date = new Date(answer);
                                const day = String(date.getDate()).padStart(2, '0');
                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                const year = date.getFullYear();
                                return `${day}/${month}/${year}`;
                              }
                              return answer.toString();
                              
                            case 'rating':
                              return (
                                <Rating 
                                  value={Number(answer)} 
                                  readOnly 
                                  size="small"
                                  sx={{ ml: 1 }}
                                />
                              );
                              
                            case 'slider':
                              return `${answer}/10`;
                              
                            case 'yes-no':
                              return answer.toString().charAt(0).toUpperCase() + answer.toString().slice(1);
                              
                            case 'color-picker':
                              return (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  {answer.toString()}
                                  <Box
                                    sx={{
                                      width: 20,
                                      height: 20,
                                      borderRadius: '4px',
                                      backgroundColor: answer.toString(),
                                      border: '1px solid rgba(0,0,0,0.1)'
                                    }}
                                  />
                                </Box>
                              );
                              
                            default:
                              return answer.toString();
                          }
                        })()}
                      </Typography>
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default SurveyHistoryPage;
