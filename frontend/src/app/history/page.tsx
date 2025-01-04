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
  Rating,
  TextField,
  InputAdornment,
  Stack,
  Chip,
  Slider
} from "@mui/material";
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import Image from 'next/image';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ReactPlayer from 'react-player';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import FilterListIcon from '@mui/icons-material/FilterList';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { TextFieldProps } from '@mui/material';

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
  description?: string;
}

const SurveyHistoryPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<string | null>(null);
  const [selectedSurvey, setSelectedSurvey] = useState<SurveyResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<{
    start: Date | null;
    end: Date | null;
  }>({
    start: null,
    end: null
  });
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'popular'>('date');
  const [openDetails, setOpenDetails] = useState<boolean>(false);

  useEffect(() => {
    const fetchSurveyResponses = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('accessToken');
        if (!token) throw new Error('Non authentifié');

        // Récupérer d'abord les réponses
        const response = await fetch('http://localhost:5041/api/survey-answers/responses/user', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) throw new Error('Erreur lors de la récupération des réponses');

        const data = await response.json();
        
        // Pour chaque réponse, récupérer les détails du sondage
        const enhancedResponses = await Promise.all(data.map(async (response: SurveyResponse) => {
          try {
            const surveyResponse = await fetch(`http://localhost:5041/api/surveys/${response.surveyId}`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (surveyResponse.ok) {
              const surveyData = await surveyResponse.json();
              return {
                ...response,
                description: surveyData.description
              };
            }
            return response;
          } catch (error) {
            console.warn(`Could not fetch survey details for ${response.surveyId}:`, error);
            return response;
          }
        }));

        setResponses(enhancedResponses);
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
    setOpenDetails(true);

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

          // Associer les médias aux questions et ajouter la description
          const updatedSurvey = { 
            ...survey, 
            description: surveyData.description,
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

  const filteredResponses = responses
    .filter(response => {
      const matchesSearch = (response.surveyTitle?.toLowerCase() || '').includes(searchQuery.toLowerCase());

      if (dateRange.start && dateRange.end) {
        const responseDate = new Date(response.completedAt);
        const isInDateRange = responseDate >= dateRange.start && 
                           responseDate <= new Date(dateRange.end.setHours(23, 59, 59));
        return matchesSearch && isInDateRange;
      }

      return matchesSearch;
    })
    .sort((a, b) => {
      return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
    });

  const clearFilters = () => {
    setSearchQuery('');
    setDateRange({ start: null, end: null });
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

  if (selectedSurvey && openDetails) {
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
            <IconButton
              onClick={() => {
                setSelectedSurvey(null);
                setOpenDetails(false);
              }}
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
            <Typography variant="h4" fontWeight="bold">
              {selectedSurvey.surveyTitle}
            </Typography>
            <Typography variant="subtitle1" sx={{ mt: 1, opacity: 0.9 }}>
              {selectedSurvey.description}
            </Typography>
          </Box>

          <Box sx={{ p: 4, backgroundColor: 'white' }}>
            {selectedSurvey.demographic && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" sx={{ mb: 3, color: '#1a237e' }}>
                  Demographic Information
                </Typography>
                <Paper sx={{ p: 3, mb: 3, borderRadius: 2, border: '1px solid rgba(0, 0, 0, 0.1)' }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="textSecondary">Gender</Typography>
                      <Typography variant="body1">{selectedSurvey.demographic.gender || 'Not specified'}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="textSecondary">Date of Birth</Typography>
                      <Typography variant="body1">
                        {selectedSurvey.demographic.dateOfBirth ? formatDate(selectedSurvey.demographic.dateOfBirth) : 'Not specified'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="textSecondary">Education Level</Typography>
                      <Typography variant="body1">{selectedSurvey.demographic.educationLevel || 'Not specified'}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="textSecondary">City</Typography>
                      <Typography variant="body1">{selectedSurvey.demographic.city || 'Not specified'}</Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Box>
            )}

            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 3, color: '#1a237e' }}>
                Questions and Answers
              </Typography>
              {selectedSurvey.questions?.map((question, index) => (
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
                  </Typography>

                  {question.media && question.media.url && (
                    <Box sx={{ 
                      mb: 2,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      width: '100%'
                    }}>
                      {question.media.type === 'video' ? (
                        <Box sx={{ width: '100%', maxWidth: '600px' }}>
                          <ReactPlayer
                            url={question.media.url}
                            controls
                            width="100%"
                            height="auto"
                            style={{ 
                              borderRadius: '8px',
                              overflow: 'hidden'
                            }}
                          />
                        </Box>
                      ) : (
                        <Box sx={{ 
                          maxWidth: '400px',
                          width: '100%',
                          height: 'auto',
                          position: 'relative'
                        }}>
                          <Image
                            src={question.media.url}
                            alt="Question media"
                            width={400}
                            height={300}
                            style={{ 
                              objectFit: 'contain',
                              width: '100%',
                              height: 'auto',
                              borderRadius: '8px'
                            }}
                          />
                        </Box>
                      )}
                    </Box>
                  )}

                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle1" color="primary" sx={{ mb: 1 }}>
                      Available options and your answer:
                    </Typography>
                    {(() => {
                      const userAnswer = selectedSurvey.answers.find(a => a.questionId === question.id)?.answer;

                      switch (question.type) {
                        case 'rating':
                          return (
                            <Rating
                              value={Number(userAnswer)}
                              readOnly
                              size="large"
                              sx={{ 
                                '& .MuiRating-icon': { 
                                  fontSize: '2rem' 
                                }
                              }}
                            />
                          );

                        case 'multiple_choice':
                          return (
                            <Stack spacing={1}>
                              {question.options?.map((option) => (
                                <Chip
                                  key={option}
                                  label={option}
                                  color={option === userAnswer ? "primary" : "default"}
                                  variant={option === userAnswer ? "filled" : "outlined"}
                                  sx={{
                                    '&.MuiChip-filled': {
                                      background: option === userAnswer ? 
                                        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 
                                        'inherit'
                                    }
                                  }}
                                />
                              ))}
                            </Stack>
                          );

                        case 'yes-no':
                          return (
                            <Stack direction="row" spacing={2}>
                              <Chip
                                label="Yes"
                                color={userAnswer === 'yes' ? "primary" : "default"}
                                variant={userAnswer === 'yes' ? "filled" : "outlined"}
                                sx={{
                                  '&.MuiChip-filled': {
                                    background: userAnswer === 'yes' ? 
                                      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 
                                      'inherit'
                                  }
                                }}
                              />
                              <Chip
                                label="No"
                                color={userAnswer === 'no' ? "primary" : "default"}
                                variant={userAnswer === 'no' ? "filled" : "outlined"}
                                sx={{
                                  '&.MuiChip-filled': {
                                    background: userAnswer === 'no' ? 
                                      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 
                                      'inherit'
                                  }
                                }}
                              />
                            </Stack>
                          );

                        case 'slider':
                          return (
                            <Box sx={{ px: 2 }}>
                              <Slider
                                value={Number(userAnswer)}
                                min={1}
                                max={10}
                                marks
                                disabled
                                valueLabelDisplay="on"
                                sx={{
                                  '& .MuiSlider-markLabel': {
                                    color: 'text.secondary'
                                  },
                                  '& .MuiSlider-track': {
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                  }
                                }}
                              />
                            </Box>
                          );

                        case 'dropdown':
                          return (
                            <Stack spacing={1}>
                              {question.options?.map((option) => (
                                <Chip
                                  key={option}
                                  label={option}
                                  color={option === userAnswer ? "primary" : "default"}
                                  variant={option === userAnswer ? "filled" : "outlined"}
                                  sx={{
                                    '&.MuiChip-filled': {
                                      background: option === userAnswer ? 
                                        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 
                                        'inherit'
                                    }
                                  }}
                                />
                              ))}
                            </Stack>
                          );

                        case 'date':
                          return (
                            <Paper 
                              elevation={0} 
                              sx={{ 
                                p: 2, 
                                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                                borderRadius: 2,
                                border: '1px solid rgba(102, 126, 234, 0.2)'
                              }}
                            >
                              <Typography variant="body1">
                                {userAnswer ? formatDate(userAnswer) : 'No answer'}
                              </Typography>
                            </Paper>
                          );

                        default:
                          return (
                            <Paper 
                              elevation={0} 
                              sx={{ 
                                p: 2, 
                                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                                borderRadius: 2,
                                border: '1px solid rgba(102, 126, 234, 0.2)'
                              }}
                            >
                              <Typography variant="body1">
                                {userAnswer || 'No answer'}
                              </Typography>
                            </Paper>
                          );
                      }
                    })()}
                  </Box>
                </Paper>
              ))}
            </Box>
          </Box>
        </Paper>
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
        }}>
          <Typography variant="h4" fontWeight="bold">
            Survey History
          </Typography>
        </Box>

        <Box sx={{ p: 4, backgroundColor: 'white' }}>
          <Box sx={{ mb: 4, backgroundColor: 'background.paper', p: 3, borderRadius: 2, boxShadow: 1 }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search surveys by title..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: (searchQuery || dateRange.start || dateRange.end) && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={clearFilters}>
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Stack direction="row" spacing={2} alignItems="center">
              <Chip
                icon={<FilterListIcon />}
                label="Date Filter"
                onClick={() => setShowDateFilter(!showDateFilter)}
                color={showDateFilter ? "primary" : "default"}
                variant={showDateFilter ? "filled" : "outlined"}
                sx={{
                  '&.MuiChip-filled': {
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  }
                }}
              />
            </Stack>

            {showDateFilter && (
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                  <DatePicker
                    label="Start Date"
                    value={dateRange.start}
                    onChange={(newValue: Date | null) => {
                      setDateRange(prev => ({
                        ...prev,
                        start: newValue
                      }));
                    }}
                    renderInput={(params: TextFieldProps) => (
                      <TextField {...params} size="small" />
                    )}
                  />
                  <DatePicker
                    label="End Date"
                    value={dateRange.end}
                    onChange={(newValue: Date | null) => {
                      setDateRange(prev => ({
                        ...prev,
                        end: newValue
                      }));
                    }}
                    renderInput={(params: TextFieldProps) => (
                      <TextField {...params} size="small" />
                    )}
                    minDate={dateRange.start || undefined}
                  />
                </Stack>
              </LocalizationProvider>
            )}
          </Box>

          {responses.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center', backgroundColor: 'background.paper' }}>
              <Typography>You haven't responded to any surveys yet.</Typography>
            </Paper>
          ) : (
            <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
              {filteredResponses.map((response) => (
                <Paper
                  key={response._id}
                  elevation={1}
                  sx={{
                    borderRadius: 2,
                    overflow: 'hidden',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.3s ease-in-out',
                    position: 'relative',
                    '&:hover': {
                      boxShadow: 3,
                      zIndex: 1,
                      '& .hover-content': {
                        opacity: 1,
                        visibility: 'visible',
                        transform: 'translateY(0)',
                      }
                    }
                  }}
                >
                  <Box sx={{ 
                    p: 3,
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative'
                  }}>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        mb: 2,
                        color: 'primary.main',
                        fontWeight: 500,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.3,
                        height: '2.6em'
                      }}
                    >
                      {response.surveyTitle}
                    </Typography>

                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ 
                        mb: 2,
                        flex: 1,
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: 1.5,
                        height: '4.5em'
                      }}
                    >
                      {response.description || 'No description available'}
                    </Typography>

                    <Box
                      className="hover-content"
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'white',
                        p: 3,
                        opacity: 0,
                        visibility: 'hidden',
                        transform: 'translateY(-10px)',
                        transition: 'all 0.3s ease-in-out',
                        boxShadow: 3,
                        borderRadius: 2,
                        zIndex: 2,
                        overflowY: 'auto',
                        '&::-webkit-scrollbar': {
                          width: '8px',
                        },
                        '&::-webkit-scrollbar-track': {
                          background: '#f1f1f1',
                          borderRadius: '4px',
                        },
                        '&::-webkit-scrollbar-thumb': {
                          background: '#888',
                          borderRadius: '4px',
                          '&:hover': {
                            background: '#666',
                          },
                        },
                      }}
                    >
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          color: 'primary.main',
                          fontWeight: 500,
                          mb: 2 
                        }}
                      >
                        {response.surveyTitle}
                      </Typography>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: 'text.secondary',
                          mb: 2,
                          lineHeight: 1.6 
                        }}
                      >
                        {response.description || 'No description available'}
                      </Typography>
                    </Box>

                    <Stack 
                      direction="row" 
                      spacing={2} 
                      alignItems="center"
                      sx={{ 
                        mt: 'auto',
                        position: 'relative',
                        zIndex: 1
                      }}
                    >
                      <Typography 
                        variant="caption" 
                        color="text.secondary"
                        noWrap
                      >
                        Completed on {formatDate(response.completedAt)}
                      </Typography>
                    </Stack>
                  </Box>
                  
                  <Box sx={{ 
                    p: 2, 
                    borderTop: 1, 
                    borderColor: 'divider',
                    backgroundColor: 'action.hover',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    position: 'relative',
                    zIndex: 1
                  }}>
                    <Button
                      onClick={() => handleExpandClick(response._id)}
                      variant="contained"
                      size="small"
                      sx={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                        }
                      }}
                    >
                      View Details
                    </Button>
                  </Box>
                </Paper>
              ))}
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default SurveyHistoryPage;
