import React, { useState, ReactNode, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  IconButton,
  Chip,
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloseIcon from '@mui/icons-material/Close';
import ClearIcon from '@mui/icons-material/Clear';

// Définir le type pour SurveyResponse
interface SurveyResponse {
  _id: string;
  surveyId: string;
  answers: any[];
  submittedAt: string;
  respondent?: {
    demographic?: {
      gender?: string;
      educationLevel?: string;
      city?: string;
      dateOfBirth?: string;
    };
  };
}

interface FilterPanelProps {
  survey: any;
  responses: SurveyResponse[];
  filteredResponses: SurveyResponse[];
  onApplyFilters: (filters: any) => void;
  onClearFilters: () => void;
  setFilteredResponses: (responses: SurveyResponse[]) => void;
}

// D'abord, définissons une interface pour notre structure de filtres
interface FilterState {
  demographic: {
    gender?: string;
    educationLevel?: string;
    city?: string;
    age?: [number, number];
    [key: string]: any;
  };
  answers: {
    [questionId: string]: Array<{
      operator: string;
      value: string;
    }>;
  };
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  survey,
  responses,
  filteredResponses,
  onApplyFilters,
  onClearFilters,
  setFilteredResponses,
}) => {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    demographic: {},
    answers: {}
  });
  const [activeFilters, setActiveFilters] = useState(false);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    handleApplyFilters(newFilters);
  };

  const handleApplyFilters = (filters: FilterState) => {
    // Vérifier si des filtres sont actifs
    const hasActiveDemographicFilters = Object.values(filters.demographic).some(
      value => value !== undefined && value !== '' && value !== null
    );
    
    const hasActiveAnswerFilters = Object.keys(filters.answers).length > 0;
    
    // Mettre à jour l'état des filtres actifs
    setActiveFilters(hasActiveDemographicFilters || hasActiveAnswerFilters);
    
    console.log("Applying filters:", JSON.stringify(filters, null, 2));
    console.log("Total responses before filtering:", responses.length);
    console.log("Responses data:", responses);
    
    const filtered = responses.filter((response: SurveyResponse) => {
      // Filtrage démographique
      if (filters.demographic.gender && 
          response.respondent?.demographic?.gender !== filters.demographic.gender) {
        return false;
      }
      
      if (filters.demographic.educationLevel) {
        console.log("Filtering by education level:", filters.demographic.educationLevel);
        console.log("User education level:", response.respondent?.demographic?.educationLevel);
        
        if (response.respondent?.demographic?.educationLevel !== filters.demographic.educationLevel) {
          console.log("Education level does not match, filtering out");
          return false;
        }
      }
      
      // Autres filtres...
      
      return true;
    });
    
    console.log("Filtered responses:", filtered.length);
    
    setFilteredResponses(filtered);
    
    if (filtered.length === 0) {
      console.log("Aucune réponse ne correspond aux critères, affichage d'un tableau vide");
    }
    
    // Appeler la fonction passée en prop
    onApplyFilters(filters);
    handleClose();
  };

  const handleClearFilters = () => {
    setFilters({
      demographic: {},
      answers: {}
    });
    setActiveFilters(false);
    onClearFilters();
  };

  const renderData = (data: any): ReactNode => {
    if (!data) {
      return <Typography>Aucune donnée disponible</Typography>;
    }
    
    return (Object.entries(data || {}).map(([key, value]) => (
      <div key={key}>{key}: {String(value)}</div>
    )) as ReactNode);
  };

  const renderStatistics = () => {
    // Vérifier si le tableau filtré est vide
    if (filteredResponses.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            Aucune réponse ne correspond aux critères de filtrage
          </Typography>
          <Button 
            variant="outlined" 
            onClick={onClearFilters}
            sx={{ mt: 2 }}
          >
            Réinitialiser les filtres
          </Button>
        </Box>
      );
    }
    
    // Afficher les statistiques avec les données filtrées
    return (
      <Box>
        {/* Vos graphiques basés sur filteredResponses */}
      </Box>
    );
  };

  useEffect(() => {
    if (filteredResponses.length === 0 && activeFilters) {
      setFilteredResponses(responses);
    }
  }, [filteredResponses, activeFilters]);

  return (
    <>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 2 
      }}>
        <Typography variant="h6">
          Filter Responses
        </Typography>
        <Button
          startIcon={<FilterListIcon />}
          onClick={handleOpen}
          variant="contained"
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
            }
          }}
        >
          Configure Filters
        </Button>
      </Box>

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}>
          Configure Filters
          <IconButton onClick={handleClose} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ mt: 2 }}>
          {survey.demographicEnabled && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                Demographic Filters
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Gender</InputLabel>
                    <Select
                      value={filters.demographic.gender || ''}
                      onChange={(e) => {
                        const newFilters = {
                          ...filters,
                          demographic: { ...filters.demographic, gender: e.target.value }
                        };
                        handleFilterChange(newFilters);
                      }}
                    >
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value="male">Male</MenuItem>
                      <MenuItem value="female">Female</MenuItem>
                      <MenuItem value="other">Other</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Education Level</InputLabel>
                    <Select
                      value={filters.demographic.educationLevel || ''}
                      onChange={(e) => {
                        const newFilters = {
                          ...filters,
                          demographic: { ...filters.demographic, educationLevel: e.target.value }
                        };
                        handleFilterChange(newFilters);
                      }}
                    >
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value="high_school">High School</MenuItem>
                      <MenuItem value="bachelor">Bachelor's Degree</MenuItem>
                      <MenuItem value="master">Master's Degree</MenuItem>
                      <MenuItem value="phd">PhD</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>
          )}

          <Box>
            <Typography variant="h6" gutterBottom>
              Answer Filters
            </Typography>
            <Grid container spacing={2}>
              {survey.questions.map((question: any) => (
                <Grid item xs={12} key={question.id}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      {question.text}
                    </Typography>
                    {question.type === 'multiple-choice' ? (
                      <FormControl fullWidth>
                        <Select
                          value={filters.answers[question.id]?.[0]?.value || ''}
                          onChange={(e) => {
                            const newFilters = {
                              ...filters,
                              answers: {
                                ...filters.answers,
                                [question.id]: [{ operator: 'equals', value: e.target.value }]
                              }
                            };
                            handleFilterChange(newFilters);
                          }}
                        >
                          <MenuItem value="">All</MenuItem>
                          {question.options?.map((option: string) => (
                            <MenuItem key={option} value={option}>
                              {option}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    ) : (
                      <TextField
                        fullWidth
                        placeholder="Filter value..."
                        value={filters.answers[question.id]?.[0]?.value || ''}
                        onChange={(e) => {
                          const newFilters = {
                            ...filters,
                            answers: {
                              ...filters.answers,
                              [question.id]: [{ operator: 'contains', value: e.target.value }]
                            }
                          };
                          handleFilterChange(newFilters);
                        }}
                      />
                    )}
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1">
              {filteredResponses.length} réponses affichées
              {filteredResponses.length !== responses.length && 
                ` (filtrées à partir de ${responses.length} réponses)`}
            </Typography>
            
            {filteredResponses.length !== responses.length && (
              <Chip 
                label="Filtres actifs" 
                color="primary" 
                size="small" 
                onDelete={onClearFilters}
                sx={{ ml: 2 }}
              />
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={() => {
              const emptyFilters = { demographic: {}, answers: {} };
              setFilters(emptyFilters);
              onClearFilters();
            }}
            startIcon={<ClearIcon />}
          >
            Clear All
          </Button>
          <Button
            onClick={handleClose}
            variant="contained"
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
              }
            }}
          >
            Fermer
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}; 