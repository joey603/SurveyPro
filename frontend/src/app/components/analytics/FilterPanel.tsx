import React, { useState } from 'react';
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
} from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloseIcon from '@mui/icons-material/Close';
import ClearIcon from '@mui/icons-material/Clear';

interface FilterPanelProps {
  survey: any;
  onApplyFilters: (filters: any) => void;
  onClearFilters: () => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  survey,
  onApplyFilters,
  onClearFilters,
}) => {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<any>({
    demographic: {},
    answers: {}
  });

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleApply = () => {
    onApplyFilters(filters);
    handleClose();
  };

  const handleClear = () => {
    setFilters({ demographic: {}, answers: {} });
    onClearFilters();
    handleClose();
  };

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
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        demographic: { ...prev.demographic, gender: e.target.value }
                      }))}
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
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        demographic: { ...prev.demographic, educationLevel: e.target.value }
                      }))}
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
                          onChange={(e) => setFilters(prev => ({
                            ...prev,
                            answers: {
                              ...prev.answers,
                              [question.id]: [{ operator: 'equals', value: e.target.value }]
                            }
                          }))}
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
                        onChange={(e) => setFilters(prev => ({
                          ...prev,
                          answers: {
                            ...prev.answers,
                            [question.id]: [{ operator: 'contains', value: e.target.value }]
                          }
                        }))}
                      />
                    )}
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={handleClear}
            startIcon={<ClearIcon />}
          >
            Clear All
          </Button>
          <Button
            onClick={handleApply}
            variant="contained"
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
              }
            }}
          >
            Apply Filters
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}; 