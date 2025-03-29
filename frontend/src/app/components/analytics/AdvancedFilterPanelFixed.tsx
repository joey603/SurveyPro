import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Tabs,
  Tab,
  IconButton,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Grid
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import FilterListIcon from '@mui/icons-material/FilterList';

// Types
interface Question {
  id: string;
  text: string;
  type: string;
  options?: string[];
}

interface Survey {
  _id: string;
  title: string;
  description?: string;
  questions?: Question[];
  nodes?: any[];
  createdAt: string;
  demographicEnabled: boolean;
  userId: string;
  sharedBy?: string;
  status?: 'pending' | 'accepted' | 'rejected';
  isDynamic?: boolean;
}

interface SurveyResponse {
  _id: string;
  surveyId: string;
  answers: Answer[];
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

interface Answer {
  questionId: string;
  answer: string;
}

interface FilterRule {
  operator: string;
  value: string | number | null;
  secondValue?: string | number | null;
}

interface AnswerFilters {
  [questionId: string]: FilterRule[];
}

interface DemographicFilters {
  gender?: string;
  educationLevel?: string;
  city?: string;
  age?: [number, number];
}

interface Filters {
  demographic: DemographicFilters;
  answers: AnswerFilters;
}

interface AdvancedFilterPanelProps {
  survey: Survey;
  responses: SurveyResponse[];
  onApplyFilters: (filteredResponses: SurveyResponse[]) => void;
  pathFilterActive?: boolean;
}

export const AdvancedFilterPanel: React.FC<AdvancedFilterPanelProps> = ({
  survey,
  responses,
  onApplyFilters,
  pathFilterActive = false
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [currentQuestionId, setCurrentQuestionId] = useState('');
  const [filters, setFilters] = useState<Filters>({
    demographic: {},
    answers: {}
  });
  const [tempRule, setTempRule] = useState<FilterRule>({
    operator: 'equals',
    value: null
  });
  const [filteredResponses, setFilteredResponses] = useState<SurveyResponse[]>(responses);

  // Cette fonction récupère les questions, peu importe le type de sondage
  const getQuestionsList = (): Question[] => {
    // Si nous avons des questions standard
    if (survey.questions && survey.questions.length > 0) {
      return survey.questions;
    }
    
    // Si nous avons un sondage dynamique avec des nodes
    if (survey.nodes && survey.nodes.length > 0) {
      return survey.nodes
        .filter(node => 
          node.type === 'questionNode' || 
          node.data?.questionType || 
          (node.data?.text && node.type !== 'startNode' && node.type !== 'endNode')
        )
        .map(node => ({
          id: node.id,
          text: node.data?.text || node.data?.label || 'Question sans texte',
          type: node.data?.questionType || node.type || 'unknown',
          options: node.data?.options
        }));
    }
    
    // Si nous n'avons ni questions ni nodes, retourner un tableau vide
    return [];
  };

  useEffect(() => {
    setFilteredResponses(responses);
  }, [responses]);

  const getOperatorsByType = (questionType: string): string[] => {
    const commonOperators = ['equals', 'not equals', 'contains', 'not contains'];
    
    switch (questionType) {
      case 'multiple-choice':
      case 'dropdown':
      case 'yes-no':
        return ['equals', 'not equals'];
      case 'text':
        return commonOperators;
      case 'rating':
      case 'slider':
        return ['equals', 'not equals', 'greater than', 'less than', 'between'];
      case 'date':
        return ['equals', 'not equals', 'after', 'before', 'between'];
      default:
        return commonOperators;
    }
  };

  const evaluateRule = (value: any, rule: FilterRule): boolean => {
    if (value === null || value === undefined) {
      return false;
    }
    
    const normalizeYesNo = (val: any): any => {
      if (val && typeof val === 'string') {
        const lowerVal = val.toLowerCase();
        if (lowerVal === 'yes' || lowerVal === 'true' || lowerVal === '1') {
          return 'yes';
        } else if (lowerVal === 'no' || lowerVal === 'false' || lowerVal === '0') {
          return 'no';
        }
      }
      return val;
    };
    
    // Normalize values for yes/no comparisons
    const normalizedValue = normalizeYesNo(value);
    const normalizedRuleValue = normalizeYesNo(rule.value);
    
    switch (rule.operator) {
      case 'equals':
        return normalizedValue === normalizedRuleValue;
      case 'not equals':
        return normalizedValue !== normalizedRuleValue;
      case 'contains':
        return typeof normalizedValue === 'string' && typeof normalizedRuleValue === 'string' 
          ? normalizedValue.toLowerCase().includes(normalizedRuleValue.toLowerCase())
          : false;
      case 'not contains':
        return typeof normalizedValue === 'string' && typeof normalizedRuleValue === 'string' 
          ? !normalizedValue.toLowerCase().includes(normalizedRuleValue.toLowerCase())
          : true;
      case 'greater than':
        return typeof normalizedValue === 'number' && typeof normalizedRuleValue === 'number' 
          ? normalizedValue > normalizedRuleValue
          : false;
      case 'less than':
        return typeof normalizedValue === 'number' && typeof normalizedRuleValue === 'number' 
          ? normalizedValue < normalizedRuleValue
          : false;
      case 'between':
        return typeof normalizedValue === 'number' && 
               typeof normalizedRuleValue === 'number' && 
               typeof rule.secondValue === 'number'
          ? normalizedValue >= normalizedRuleValue && normalizedValue <= rule.secondValue
          : false;
      default:
        return false;
    }
  };

  const formatFilterValue = (value: any): string => {
    if (value === null || value === undefined) return 'N/A';
    
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    if (typeof value === 'object' && value instanceof Date) {
      return value.toLocaleDateString();
    }
    
    if (typeof value === 'string' && value.length > 20) {
      return `${value.substring(0, 20)}...`;
    }
    
    return String(value);
  };

  const getOperatorLabel = (operator: string): string => {
    switch (operator) {
      case 'equals': return 'is';
      case 'not equals': return 'is not';
      case 'contains': return 'contains';
      case 'not contains': return 'doesn\'t contain';
      case 'greater than': return 'is greater than';
      case 'less than': return 'is less than';
      case 'between': return 'is between';
      default: return operator;
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleOpenAnswerFilterDialog = (questionId: string) => {
    const questions = getQuestionsList();
    const question = questions.find(q => q.id === questionId);
    
    if (question) {
      setCurrentQuestionId(questionId);
      setTempRule({
        operator: getOperatorsByType(question.type)[0],
        value: null
      });
      setFilterDialogOpen(true);
    }
  };

  const handleCloseAnswerFilterDialog = () => {
    setFilterDialogOpen(false);
    setCurrentQuestionId('');
  };

  const handleAddRule = () => {
    const questions = getQuestionsList();
    const question = questions.find(q => q.id === currentQuestionId);
    
    if (!question || !tempRule.operator || (tempRule.value === null && tempRule.operator !== 'is empty')) {
      return;
    }
    
    setFilters(prevFilters => {
      const updatedAnswerFilters = { ...prevFilters.answers };
      
      if (!updatedAnswerFilters[currentQuestionId]) {
        updatedAnswerFilters[currentQuestionId] = [];
      }
      
      updatedAnswerFilters[currentQuestionId].push(tempRule);
      
      const newFilters = {
        ...prevFilters,
        answers: updatedAnswerFilters
      };
      
      applyFilters(newFilters);
      return newFilters;
    });
    
    handleCloseAnswerFilterDialog();
  };

  const handleRemoveRule = (questionId: string, ruleIndex: number) => {
    setFilters(prevFilters => {
      const updatedAnswerFilters = { ...prevFilters.answers };
      
      if (updatedAnswerFilters[questionId]) {
        updatedAnswerFilters[questionId] = updatedAnswerFilters[questionId].filter((_, index) => index !== ruleIndex);
        
        if (updatedAnswerFilters[questionId].length === 0) {
          delete updatedAnswerFilters[questionId];
        }
      }
      
      const newFilters = {
        ...prevFilters,
        answers: updatedAnswerFilters
      };
      
      applyFilters(newFilters);
      return newFilters;
    });
  };

  const handleClearFilters = () => {
    const emptyFilters: Filters = {
      demographic: {},
      answers: {}
    };
    
    setFilters(emptyFilters);
    applyFilters(emptyFilters);
  };

  const applyFilters = (currentFilters: Filters) => {
    const filtered = responses.filter(response => {
      // Apply demographic filters
      if (Object.keys(currentFilters.demographic).length > 0) {
        const demographicData = response.respondent?.demographic;
        
        if (!demographicData) {
          return false;
        }
        
        const normalizeYesNo = (val: any): any => {
          if (val && typeof val === 'string') {
            const lowerVal = val.toLowerCase();
            if (lowerVal === 'yes' || lowerVal === 'true' || lowerVal === '1') {
              return 'yes';
            } else if (lowerVal === 'no' || lowerVal === 'false' || lowerVal === '0') {
              return 'no';
            }
          }
          return val;
        };
        
        // Check gender
        if (currentFilters.demographic.gender && 
            normalizeYesNo(demographicData.gender) !== normalizeYesNo(currentFilters.demographic.gender)) {
          return false;
        }
        
        // Check education level
        if (currentFilters.demographic.educationLevel && 
            demographicData.educationLevel !== currentFilters.demographic.educationLevel) {
          return false;
        }
        
        // Check city
        if (currentFilters.demographic.city && 
            demographicData.city !== currentFilters.demographic.city) {
          return false;
        }
        
        // Check age range
        if (currentFilters.demographic.age && demographicData.dateOfBirth) {
          const birthDate = new Date(demographicData.dateOfBirth);
          const ageInYears = (new Date().getFullYear() - birthDate.getFullYear());
          
          if (ageInYears < currentFilters.demographic.age[0] || 
              ageInYears > currentFilters.demographic.age[1]) {
            return false;
          }
        }
      }
      
      // Apply answer filters
      if (Object.keys(currentFilters.answers).length > 0) {
        for (const questionId in currentFilters.answers) {
          const rules = currentFilters.answers[questionId];
          const answer = response.answers.find(a => a.questionId === questionId);
          
          if (!answer) {
            return false;
          }
          
          // All rules for this question must be satisfied
          const allRulesSatisfied = rules.every(rule => 
            evaluateRule(answer.answer, rule)
          );
          
          if (!allRulesSatisfied) {
            return false;
          }
        }
      }
      
      return true;
    });
    
    setFilteredResponses(filtered);
    onApplyFilters(filtered);
  };

  // Find out all the different demographic values in responses
  const demographicValues = {
    genders: [...new Set(responses
      .filter(r => r.respondent?.demographic?.gender)
      .map(r => r.respondent?.demographic?.gender))],
    educationLevels: [...new Set(responses
      .filter(r => r.respondent?.demographic?.educationLevel)
      .map(r => r.respondent?.demographic?.educationLevel))],
    cities: [...new Set(responses
      .filter(r => r.respondent?.demographic?.city)
      .map(r => r.respondent?.demographic?.city))]
  };

  const questions = getQuestionsList();
  const hasDemographicData = responses.some(r => r.respondent?.demographic);
  const hasActiveFilters = Object.keys(filters.answers).length > 0 || Object.keys(filters.demographic).length > 0;
  
  let selectedQuestion = null;
  if (currentQuestionId) {
    selectedQuestion = questions.find(q => q.id === currentQuestionId);
  }

  const activeFilterCount = 
    Object.keys(filters.answers).reduce((count, questionId) => count + filters.answers[questionId].length, 0) + 
    Object.keys(filters.demographic).length;

  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 2, mb: 3, boxShadow: '0 3px 10px rgba(0, 0, 0, 0.1)' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ 
          display: 'flex', 
          alignItems: 'center',
          fontWeight: 'medium'
        }}>
          <FilterListIcon sx={{ mr: 1, color: '#667eea' }} />
          Advanced Filters
        </Typography>
        
        <Box>
          {hasActiveFilters && (
            <Button 
              variant="outlined" 
              color="inherit" 
              size="small" 
              onClick={handleClearFilters}
              sx={{ mr: 1 }}
            >
              Clear Filters
            </Button>
          )}
          
          <Chip
            label={`${filteredResponses.length} / ${responses.length} responses`}
            color={hasActiveFilters ? "primary" : "default"}
            sx={{
              background: hasActiveFilters ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : undefined,
              '& .MuiChip-label': {
                fontWeight: 'medium'
              }
            }}
          />
        </Box>
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      <Box sx={{ width: '100%' }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          sx={{
            '& .Mui-selected': {
              color: '#667eea',
              fontWeight: 'bold'
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#667eea'
            }
          }}
        >
          <Tab label="Question Filters" />
          {survey.demographicEnabled && hasDemographicData && (
            <Tab label="Demographic Filters" />
          )}
        </Tabs>
        
        <Box sx={{ p: 2, pt: 3 }}>
          {activeTab === 0 && (
            <Box>
              <Grid container spacing={2}>
                {questions.length > 0 ? (
                  questions.map(question => (
                    <Grid item xs={12} md={6} key={question.id}>
                      <Paper 
                        elevation={0} 
                        sx={{ 
                          p: 2, 
                          borderRadius: 2, 
                          border: '1px solid rgba(0,0,0,0.08)',
                          height: '100%'
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'medium' }}>
                            {question.text}
                          </Typography>
                          
                          <Button 
                            size="small" 
                            startIcon={<AddIcon />}
                            onClick={() => handleOpenAnswerFilterDialog(question.id)}
                          >
                            Add Filter
                          </Button>
                        </Box>
                        
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            Type: {question.type}
                          </Typography>
                        </Box>
                        
                        {filters.answers[question.id] && filters.answers[question.id].length > 0 && (
                          <Box sx={{ mt: 2 }}>
                            {filters.answers[question.id].map((rule, index) => (
                              <Chip
                                key={index}
                                label={`${getOperatorLabel(rule.operator)} ${formatFilterValue(rule.value)}${rule.secondValue ? ` and ${formatFilterValue(rule.secondValue)}` : ''}`}
                                onDelete={() => handleRemoveRule(question.id, index)}
                                sx={{ m: 0.5 }}
                              />
                            ))}
                          </Box>
                        )}
                      </Paper>
                    </Grid>
                  ))
                ) : (
                  <Grid item xs={12}>
                    <Typography color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                      No questions available to filter.
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
          
          {activeTab === 1 && survey.demographicEnabled && hasDemographicData && (
            <Box>
              <Grid container spacing={3}>
                {demographicValues.genders.length > 0 && (
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth variant="outlined" size="small">
                      <InputLabel>Gender</InputLabel>
                      <Select
                        value={filters.demographic.gender || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFilters(prev => {
                            const newFilters = {
                              ...prev,
                              demographic: {
                                ...prev.demographic,
                                gender: value || undefined
                              }
                            };
                            applyFilters(newFilters);
                            return newFilters;
                          });
                        }}
                        label="Gender"
                      >
                        <MenuItem value="">
                          <em>Any</em>
                        </MenuItem>
                        {demographicValues.genders.map((gender: any) => (
                          <MenuItem key={gender} value={gender}>
                            {gender}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}
                
                {demographicValues.educationLevels.length > 0 && (
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth variant="outlined" size="small">
                      <InputLabel>Education Level</InputLabel>
                      <Select
                        value={filters.demographic.educationLevel || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFilters(prev => {
                            const newFilters = {
                              ...prev,
                              demographic: {
                                ...prev.demographic,
                                educationLevel: value || undefined
                              }
                            };
                            applyFilters(newFilters);
                            return newFilters;
                          });
                        }}
                        label="Education Level"
                      >
                        <MenuItem value="">
                          <em>Any</em>
                        </MenuItem>
                        {demographicValues.educationLevels.map((level: any) => (
                          <MenuItem key={level} value={level}>
                            {level}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}
                
                {demographicValues.cities.length > 0 && (
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth variant="outlined" size="small">
                      <InputLabel>City</InputLabel>
                      <Select
                        value={filters.demographic.city || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFilters(prev => {
                            const newFilters = {
                              ...prev,
                              demographic: {
                                ...prev.demographic,
                                city: value || undefined
                              }
                            };
                            applyFilters(newFilters);
                            return newFilters;
                          });
                        }}
                        label="City"
                      >
                        <MenuItem value="">
                          <em>Any</em>
                        </MenuItem>
                        {demographicValues.cities.map((city: any) => (
                          <MenuItem key={city} value={city}>
                            {city}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Age Range (years)
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      label="Min"
                      type="number"
                      size="small"
                      value={filters.demographic.age?.[0] || ''}
                      onChange={(e) => {
                        const min = parseInt(e.target.value, 10);
                        setFilters(prev => {
                          const newFilters = {
                            ...prev,
                            demographic: {
                              ...prev.demographic,
                              age: [
                                isNaN(min) ? 0 : min,
                                prev.demographic.age?.[1] || 100
                              ]
                            }
                          };
                          applyFilters(newFilters);
                          return newFilters;
                        });
                      }}
                      InputProps={{ inputProps: { min: 0, max: 120 } }}
                    />
                    <TextField
                      label="Max"
                      type="number"
                      size="small"
                      value={filters.demographic.age?.[1] || ''}
                      onChange={(e) => {
                        const max = parseInt(e.target.value, 10);
                        setFilters(prev => {
                          const newFilters = {
                            ...prev,
                            demographic: {
                              ...prev.demographic,
                              age: [
                                prev.demographic.age?.[0] || 0,
                                isNaN(max) ? 100 : max
                              ]
                            }
                          };
                          applyFilters(newFilters);
                          return newFilters;
                        });
                      }}
                      InputProps={{ inputProps: { min: 0, max: 120 } }}
                    />
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}
        </Box>
      </Box>
      
      {/* Filter Dialog */}
      <Dialog 
        open={filterDialogOpen} 
        onClose={handleCloseAnswerFilterDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ 
          pb: 1, 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}>
          Add Filter
          <IconButton onClick={handleCloseAnswerFilterDialog} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ pt: 3 }}>
          {selectedQuestion && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                {selectedQuestion.text}
              </Typography>
              
              <Box sx={{ mt: 2 }}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Operator</InputLabel>
                  <Select
                    value={tempRule.operator}
                    onChange={(e) => setTempRule({ ...tempRule, operator: e.target.value })}
                    label="Operator"
                  >
                    {getOperatorsByType(selectedQuestion.type).map(op => (
                      <MenuItem key={op} value={op}>
                        {getOperatorLabel(op)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                {(selectedQuestion.type === 'multiple-choice' || selectedQuestion.type === 'dropdown' || selectedQuestion.type === 'yes-no') && (
                  <FormControl fullWidth>
                    <InputLabel>Value</InputLabel>
                    <Select
                      value={tempRule.value || ''}
                      onChange={(e) => setTempRule({ ...tempRule, value: e.target.value })}
                      label="Value"
                    >
                      {selectedQuestion.type === 'yes-no' ? (
                        [
                          <MenuItem key="yes" value="yes">Yes</MenuItem>,
                          <MenuItem key="no" value="no">No</MenuItem>
                        ]
                      ) : (
                        selectedQuestion.options?.map(option => (
                          <MenuItem key={option} value={option}>
                            {option}
                          </MenuItem>
                        )) || []
                      )}
                    </Select>
                  </FormControl>
                )}
                
                {(selectedQuestion.type === 'text') && (
                  <TextField
                    fullWidth
                    label="Value"
                    value={tempRule.value || ''}
                    onChange={(e) => setTempRule({ ...tempRule, value: e.target.value })}
                  />
                )}
                
                {(selectedQuestion.type === 'rating' || selectedQuestion.type === 'slider') && (
                  <>
                    <TextField
                      fullWidth
                      type="number"
                      label="Value"
                      value={tempRule.value === null ? '' : tempRule.value}
                      onChange={(e) => setTempRule({ ...tempRule, value: parseFloat(e.target.value) || 0 })}
                      sx={{ mb: 2 }}
                    />
                    
                    {tempRule.operator === 'between' && (
                      <TextField
                        fullWidth
                        type="number"
                        label="Second Value"
                        value={tempRule.secondValue === null ? '' : tempRule.secondValue}
                        onChange={(e) => setTempRule({ ...tempRule, secondValue: parseFloat(e.target.value) || 0 })}
                      />
                    )}
                  </>
                )}
                
                {selectedQuestion.type === 'date' && (
                  <>
                    <TextField
                      fullWidth
                      type="date"
                      label="Value"
                      value={tempRule.value || ''}
                      onChange={(e) => setTempRule({ ...tempRule, value: e.target.value })}
                      sx={{ mb: 2 }}
                      InputLabelProps={{ shrink: true }}
                    />
                    
                    {tempRule.operator === 'between' && (
                      <TextField
                        fullWidth
                        type="date"
                        label="Second Value"
                        value={tempRule.secondValue || ''}
                        onChange={(e) => setTempRule({ ...tempRule, secondValue: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                      />
                    )}
                  </>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleCloseAnswerFilterDialog}>
            Cancel
          </Button>
          <Button 
            onClick={handleAddRule}
            variant="contained"
            disabled={tempRule.value === null && tempRule.operator !== 'is empty'}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
              },
            }}
          >
            Add Filter
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}; 