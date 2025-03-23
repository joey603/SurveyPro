import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Chip,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
  Stack,
  Tab,
  Tabs,
} from '@mui/material';
import {
  FilterList as FilterListIcon,
  Clear as ClearIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { calculateAge } from '@/utils/dateUtils';

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
  questions: Question[];
  createdAt: string;
  demographicEnabled: boolean;
  userId: string;
  sharedBy?: string;
  status?: 'pending' | 'accepted' | 'rejected';
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
}

export const AdvancedFilterPanel: React.FC<AdvancedFilterPanelProps> = ({
  survey,
  responses,
  onApplyFilters,
}) => {
  // États
  const [filters, setFilters] = useState<Filters>({
    demographic: {},
    answers: {}
  });
  const [answerFilterDialogOpen, setAnswerFilterDialogOpen] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [tempRule, setTempRule] = useState<FilterRule>({ operator: 'equals', value: null });
  const [ageRange, setAgeRange] = useState<[number, number]>([0, 100]);
  const [activeTab, setActiveTab] = useState(1);
  const [cities, setCities] = useState<string[]>([]);

  // Effet pour extraire les villes uniques des réponses
  React.useEffect(() => {
    const uniqueCities = new Set<string>();
    responses.forEach(response => {
      if (response.respondent?.demographic?.city) {
        uniqueCities.add(response.respondent.demographic.city);
      }
    });
    setCities(Array.from(uniqueCities));
  }, [responses]);

  // Fonctions utilitaires
  const getOperatorsByType = (questionType: string): string[] => {
    const commonOperators = ['equals', 'not'];
    
    switch (questionType) {
      case 'rating':
      case 'slider':
        return [...commonOperators, 'greater', 'less', 'between'];
      case 'text':
        return [...commonOperators, 'contains', 'not_contains'];
      case 'multiple-choice':
      case 'dropdown':
      case 'yes-no':
        return commonOperators;
      case 'date':
        return [...commonOperators, 'before', 'after', 'between'];
      default:
        return commonOperators;
    }
  };

  const evaluateRule = (value: any, rule: FilterRule): boolean => {
    // Si la valeur est undefined, on la convertit en null pour la comparaison
    const safeValue = value ?? null;
    const safeRuleValue = rule.value ?? null;

    console.log("Evaluating rule:", rule.operator, "Value:", safeValue, "Rule value:", safeRuleValue);
    
    // Normaliser les valeurs yes/no pour les comparaisons
    const normalizeYesNo = (val: any): any => {
      if (val === null || val === undefined) return val;
      
      // Convertir en chaîne et en minuscules
      const strVal = String(val).toLowerCase();
      
      // Normaliser les variations de "yes" et "no"
      if (strVal === 'yes' || strVal === 'y' || strVal === 'true' || strVal === '1') {
        return 'yes';
      } else if (strVal === 'no' || strVal === 'n' || strVal === 'false' || strVal === '0') {
        return 'no';
      }
      
      return val;
    };
    
    // Pour les comparaisons d'égalité, normaliser les valeurs yes/no
    if (rule.operator === 'equals' || rule.operator === 'not') {
      const normalizedValue = normalizeYesNo(safeValue);
      const normalizedRuleValue = normalizeYesNo(safeRuleValue);
      
      console.log("Normalized values for comparison:", normalizedValue, normalizedRuleValue);
      
      if (rule.operator === 'equals') {
        console.log("Equals comparison result:", normalizedValue === normalizedRuleValue);
        return normalizedValue === normalizedRuleValue;
      } else { // not
        console.log("Not equals comparison result:", normalizedValue !== normalizedRuleValue);
        return normalizedValue !== normalizedRuleValue;
      }
    }
    
    switch (rule.operator) {
      case 'equals': // Déjà traité ci-dessus
      case 'not': // Déjà traité ci-dessus
        return false; // Ne devrait jamais arriver ici
      case 'greater':
        return Number(safeValue) > Number(safeRuleValue);
      case 'less':
        return Number(safeValue) < Number(safeRuleValue);
      case 'between':
        if (rule.secondValue === undefined) return false;
        const numValue = Number(safeValue);
        const min = Number(safeRuleValue);
        const max = Number(rule.secondValue);
        return numValue >= min && numValue <= max;
      case 'contains':
        return String(safeValue).toLowerCase().includes(String(safeRuleValue).toLowerCase());
      case 'not_contains':
        return !String(safeValue).toLowerCase().includes(String(safeRuleValue).toLowerCase());
      default:
        return true;
    }
  };

  const formatFilterValue = (value: any): string => {
    if (value === null || value === undefined) {
      return 'N/A';
    }

    if (Array.isArray(value)) {
      return `${value[0]}-${value[1]}`;
    }

    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    if (typeof value === 'number') {
      return value.toString();
    }

    // Pour les chaînes de caractères
    return value.toString().charAt(0).toUpperCase() + value.toString().slice(1);
  };

  const getOperatorLabel = (operator: string): string => {
    switch (operator) {
      case 'equals': return 'equals';
      case 'not': return 'is not equal to';
      case 'greater': return 'is greater than';
      case 'less': return 'is less than';
      case 'between': return 'is between';
      case 'contains': return 'contains';
      case 'not_contains': return 'does not contain';
      default: return operator;
    }
  };

  // Gestionnaires d'événements
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleOpenAnswerFilterDialog = (questionId: string) => {
    const question = survey.questions.find(q => q.id === questionId);
    if (question) {
      setSelectedQuestionId(questionId);
      setTempRule({ 
        operator: getOperatorsByType(question.type)[0], 
        value: null 
      });
      setAnswerFilterDialogOpen(true);
    }
  };

  const handleCloseAnswerFilterDialog = () => {
    setAnswerFilterDialogOpen(false);
    setSelectedQuestionId(null);
    setTempRule({ operator: 'equals', value: null });
  };

  const handleAddRule = () => {
    if (!selectedQuestionId || tempRule.value === null) return;
    
    console.log("Adding rule for question:", selectedQuestionId);
    console.log("Rule to add:", tempRule);
    
    setFilters(prev => {
      const newFilters = { ...prev };
      if (!newFilters.answers[selectedQuestionId]) {
        newFilters.answers[selectedQuestionId] = [];
      }
      
      // Vérifier si une règle similaire existe déjà pour éviter les doublons
      const ruleExists = newFilters.answers[selectedQuestionId].some(
        existingRule => 
          existingRule.operator === tempRule.operator && 
          existingRule.value === tempRule.value &&
          existingRule.secondValue === tempRule.secondValue
      );
      
      // Ajouter la règle seulement si elle n'existe pas déjà
      if (!ruleExists) {
        newFilters.answers[selectedQuestionId].push({ ...tempRule });
        console.log("Rule added, new filters:", newFilters);
      } else {
        console.log("Rule already exists, not adding");
      }
      
      return newFilters;
    });
    
    handleCloseAnswerFilterDialog();
  };

  const handleRemoveRule = (questionId: string, ruleIndex: number) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      if (newFilters.answers[questionId]) {
        newFilters.answers[questionId] = newFilters.answers[questionId].filter((_, idx) => idx !== ruleIndex);
        if (newFilters.answers[questionId].length === 0) {
          delete newFilters.answers[questionId];
        }
      }
      return newFilters;
    });
  };

  const handleClearFilters = () => {
    setFilters({
      demographic: {},
      answers: {}
    });
    setAgeRange([0, 100]);
  };

  const handleApplyFilters = useCallback(() => {
    // Ajouter des logs pour déboguer
    console.log("Applying filters:", JSON.stringify(filters, null, 2));
    console.log("Total responses before filtering:", responses.length);
    console.log("Responses data:", responses);
    
    // Fonction pour normaliser les valeurs yes/no
    const normalizeYesNo = (val: any): any => {
      if (val === null || val === undefined) return val;
      
      // Convertir en chaîne et en minuscules
      const strVal = String(val).toLowerCase();
      
      // Normaliser les variations de "yes" et "no"
      if (strVal === 'yes' || strVal === 'y' || strVal === 'true' || strVal === '1') {
        return 'yes';
      } else if (strVal === 'no' || strVal === 'n' || strVal === 'false' || strVal === '0') {
        return 'no';
      }
      
      return val;
    };
    
    // Appliquer les filtres démographiques et de réponses
    const filteredResponses = responses.filter(response => {
      // Vérifier les filtres démographiques
      if (filters.demographic.gender && 
          response.respondent?.demographic?.gender !== filters.demographic.gender) {
        return false;
      }
      
      // Ajouter des logs pour déboguer le filtre Education Level
      if (filters.demographic.educationLevel) {
        console.log("Filtering by education level:", filters.demographic.educationLevel);
        console.log("User education level:", response.respondent?.demographic?.educationLevel);
        
        // Vérifier si la valeur d'éducation correspond, en tenant compte des variations possibles
        const filterValue = filters.demographic.educationLevel.toLowerCase();
        const userValue = (response.respondent?.demographic?.educationLevel || '').toLowerCase();
        
        // Correspondances possibles pour chaque niveau d'éducation
        const matchesHighSchool = filterValue === 'high_school' && 
          (userValue === 'high_school' || userValue === 'high school' || userValue === 'highschool');
        
        const matchesBachelor = filterValue === 'bachelor' && 
          (userValue === 'bachelor' || userValue === 'bachelor\'s degree' || userValue === 'bachelors degree' || 
           userValue === 'bachelor degree' || userValue === 'bachelor\u2019s degree');
        
        const matchesMaster = filterValue === 'master' && 
          (userValue === 'master' || userValue === 'master\'s degree' || userValue === 'masters degree' || 
           userValue === 'master degree' || userValue === 'master\u2019s degree');
        
        const matchesPhD = filterValue === 'phd' && 
          (userValue === 'phd' || userValue === 'ph.d.' || userValue === 'ph.d' || 
           userValue === 'doctorate' || userValue === 'doctoral degree');
        
        const matchesOther = filterValue === 'other' && 
          (userValue === 'other' || 
           (!matchesHighSchool && !matchesBachelor && !matchesMaster && !matchesPhD));
        
        // Si aucune correspondance n'est trouvée, filtrer cette réponse
        if (!matchesHighSchool && !matchesBachelor && !matchesMaster && !matchesPhD && !matchesOther) {
          console.log("Education level does not match, filtering out");
          return false;
        }
      }
      
      if (filters.demographic.city && 
          response.respondent?.demographic?.city !== filters.demographic.city) {
        return false;
      }
      
      if (filters.demographic.age && response.respondent?.demographic?.dateOfBirth) {
        try {
          const birthDate = new Date(response.respondent.demographic.dateOfBirth);
          const age = calculateAge(birthDate);
          console.log("Calculated age:", age, "for date:", response.respondent.demographic.dateOfBirth);
          
          if (age < filters.demographic.age[0] || age > filters.demographic.age[1]) {
            return false;
          }
        } catch (error) {
          console.error("Error calculating age:", error);
          // Ne pas filtrer si le calcul de l'âge échoue
        }
      }
      
      // Vérifier les filtres de réponses aux questions
      for (const questionId in filters.answers) {
        const rules = filters.answers[questionId];
        const answer = response.answers.find(a => a.questionId === questionId);
        
        console.log("Checking question:", questionId);
        console.log("Rules:", rules);
        console.log("Answer found:", answer);
        
        if (!answer) {
          console.log("No answer found for question, filtering out");
          return false;
        }
        
        // Trouver la question correspondante pour connaître son type
        const question = survey.questions.find(q => q.id === questionId);
        console.log("Question type:", question?.type);
        
        // Vérifier chaque règle pour cette question
        for (const rule of rules) {
          console.log("Checking rule:", rule);
          
          // Traitement spécial pour les questions yes-no
          if (question?.type === 'yes-no') {
            const normalizedAnswer = normalizeYesNo(answer.answer);
            const normalizedRuleValue = normalizeYesNo(rule.value);
            
            console.log("Yes-No question detected. Normalized answer:", normalizedAnswer, "Normalized rule value:", normalizedRuleValue);
            
            if (rule.operator === 'equals') {
              if (normalizedAnswer !== normalizedRuleValue) {
                console.log("Yes-No equals comparison failed");
                return false;
              }
              continue; // Passer à la règle suivante
            } else if (rule.operator === 'not') {
              if (normalizedAnswer === normalizedRuleValue) {
                console.log("Yes-No not equals comparison failed");
                return false;
              }
              continue; // Passer à la règle suivante
            }
          }
          
          // Pour les autres types de questions, utiliser evaluateRule normalement
          if (!evaluateRule(answer.answer, rule)) {
            console.log("Rule evaluation failed, filtering out");
            return false;
          }
        }
      }
      
      return true;
    });
    
    console.log("Filtered responses:", filteredResponses.length);
    
    // Toujours appliquer les filtres, même si le tableau est vide
    onApplyFilters(filteredResponses);

    if (filteredResponses.length === 0) {
      console.log("Aucune réponse ne correspond aux filtres, affichage d'un tableau vide");
    }
  }, [filters, responses, onApplyFilters, calculateAge, evaluateRule, survey.questions]);

  // Rendu du composant
  return (
    <Box>
      <Paper elevation={1} sx={{ p: 3, borderRadius: 2, mb: 3 }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 3,
          pb: 2,
          borderBottom: '1px solid rgba(102, 126, 234, 0.1)'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FilterListIcon sx={{ 
              color: '#667eea',
              fontSize: '1.8rem'
            }} />
            <Typography variant="h6" sx={{ 
              fontWeight: 600,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Filter Responses
            </Typography>
          </Box>
          <Button
            startIcon={<ClearIcon />}
            onClick={handleClearFilters}
            disabled={Object.keys(filters.answers).length === 0 && Object.keys(filters.demographic).length === 0}
            sx={{
              color: '#667eea',
              borderColor: 'rgba(102, 126, 234, 0.3)',
              '&:hover': {
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.04)'
              },
              '&.Mui-disabled': {
                color: 'rgba(0, 0, 0, 0.26)'
              }
            }}
          >
            Clear All Filters
          </Button>
        </Box>

        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          sx={{ 
            mb: 3,
            '& .MuiTabs-indicator': {
              backgroundColor: '#667eea'
            },
            '& .Mui-selected': {
              color: '#667eea !important'
            }
          }}
        >
          <Tab label="Demographic Filters" disabled={!survey.demographicEnabled} />
          <Tab label="Answer Filters" />
        </Tabs>

        {activeTab === 0 && survey.demographicEnabled && (
          <>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
                  <InputLabel>Gender</InputLabel>
                  <Select
                    value={filters.demographic.gender || ''}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      demographic: { ...prev.demographic, gender: e.target.value || undefined }
                    }))}
                    label="Gender"
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="male">Male</MenuItem>
                    <MenuItem value="female">Female</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
                  <InputLabel>Education Level</InputLabel>
                  <Select
                    value={filters.demographic.educationLevel || ''}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      demographic: { ...prev.demographic, educationLevel: e.target.value || undefined }
                    }))}
                    label="Education Level"
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="high_school">High School</MenuItem>
                    <MenuItem value="bachelor">Bachelor</MenuItem>
                    <MenuItem value="master">Master</MenuItem>
                    <MenuItem value="phd">PhD</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
                  <InputLabel>City</InputLabel>
                  <Select
                    value={filters.demographic.city || ''}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      demographic: { ...prev.demographic, city: e.target.value || undefined }
                    }))}
                    label="City"
                  >
                    <MenuItem value="">All</MenuItem>
                    {cities.map(city => (
                      <MenuItem key={city} value={city}>{city}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Age
                  </Typography>
                  <Box sx={{ px: 2 }}>
                    <Slider
                      value={filters.demographic.age || ageRange}
                      onChange={(_event, newValue) => {
                        const ageValue = newValue as [number, number];
                        setAgeRange(ageValue);
                        // Toujours définir la valeur de l'âge, même si elle est [0, 100]
                        setFilters(prev => ({
                          ...prev,
                          demographic: { 
                            ...prev.demographic, 
                            age: ageValue
                          }
                        }));
                        console.log("Age filter set to:", ageValue);
                      }}
                      valueLabelDisplay="auto"
                      min={0}
                      max={100}
                      sx={{
                        color: '#667eea',
                        '& .MuiSlider-thumb': {
                          '&:hover, &.Mui-focusVisible': {
                            boxShadow: '0px 0px 0px 8px rgba(102, 126, 234, 0.16)'
                          }
                        }
                      }}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">
                        0
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        100
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Grid>
            </Grid>

            {/* Affichage des filtres démographiques actifs sous forme de puces */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Active Demographic Filters
              </Typography>
              
              <Box sx={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: 1,
                mt: 2
              }}>
                {filters.demographic.gender && (
                  <Chip
                    label={`Gender: ${filters.demographic.gender === 'male' ? 'Male' : filters.demographic.gender === 'female' ? 'Female' : 'Other'}`}
                    onDelete={() => setFilters(prev => ({
                      ...prev,
                      demographic: { ...prev.demographic, gender: undefined }
                    }))}
                    sx={{
                      backgroundColor: 'rgba(102, 126, 234, 0.08)',
                      color: '#667eea',
                      borderRadius: '6px',
                      '& .MuiChip-deleteIcon': {
                        color: '#667eea',
                        '&:hover': { color: '#764ba2' }
                      }
                    }}
                  />
                )}
                
                {filters.demographic.educationLevel && (
                  <Chip
                    label={`Education Level: ${
                      filters.demographic.educationLevel === 'high_school' ? 'High School' :
                      filters.demographic.educationLevel === 'bachelor' ? 'Bachelor' :
                      filters.demographic.educationLevel === 'master' ? 'Master' :
                      filters.demographic.educationLevel === 'phd' ? 'PhD' : 
                      filters.demographic.educationLevel === 'other' ? 'Other' :
                      filters.demographic.educationLevel
                    }`}
                    onDelete={() => setFilters(prev => ({
                      ...prev,
                      demographic: { ...prev.demographic, educationLevel: undefined }
                    }))}
                    sx={{
                      backgroundColor: 'rgba(102, 126, 234, 0.08)',
                      color: '#667eea',
                      borderRadius: '6px',
                      '& .MuiChip-deleteIcon': {
                        color: '#667eea',
                        '&:hover': { color: '#764ba2' }
                      }
                    }}
                  />
                )}
                
                {filters.demographic.city && (
                  <Chip
                    label={`City: ${filters.demographic.city}`}
                    onDelete={() => setFilters(prev => ({
                      ...prev,
                      demographic: { ...prev.demographic, city: undefined }
                    }))}
                    sx={{
                      backgroundColor: 'rgba(102, 126, 234, 0.08)',
                      color: '#667eea',
                      borderRadius: '6px',
                      '& .MuiChip-deleteIcon': {
                        color: '#667eea',
                        '&:hover': { color: '#764ba2' }
                      }
                    }}
                  />
                )}
                
                {filters.demographic.age && (
                  <Chip
                    label={`Age: ${filters.demographic.age[0]} - ${filters.demographic.age[1]} years`}
                    onDelete={() => {
                      setAgeRange([0, 100]);
                      setFilters(prev => ({
                        ...prev,
                        demographic: { ...prev.demographic, age: undefined }
                      }));
                    }}
                    sx={{
                      backgroundColor: 'rgba(102, 126, 234, 0.08)',
                      color: '#667eea',
                      borderRadius: '6px',
                      '& .MuiChip-deleteIcon': {
                        color: '#667eea',
                        '&:hover': { color: '#764ba2' }
                      }
                    }}
                  />
                )}
                
                {!filters.demographic.gender && 
                 !filters.demographic.educationLevel && 
                 !filters.demographic.city && 
                 !filters.demographic.age && (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    No active demographic filter.
                  </Typography>
                )}
              </Box>
            </Box>
          </>
        )}

        {activeTab === 1 && (
          <>
            <Box sx={{ mb: 3 }}>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setAnswerFilterDialogOpen(true)}
                sx={{
                  borderColor: 'rgba(102, 126, 234, 0.3)',
                  color: '#667eea',
                  '&:hover': {
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.04)'
                  }
                }}
              >
                Add Answer Filter
              </Button>
            </Box>

            {Object.keys(filters.answers).length > 0 ? (
              <Box sx={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: 1
              }}>
                {Object.entries(filters.answers).map(([questionId, rules]) => {
                  const question = survey.questions.find(q => q.id === questionId);
                  // Utiliser un Set pour suivre les règles déjà affichées et éviter les doublons
                  const displayedRules = new Set();
                  
                  return rules.map((rule, ruleIndex) => {
                    // Créer une clé unique pour cette règle
                    const ruleKey = `${rule.operator}-${rule.value}-${rule.secondValue || ''}`;
                    
                    // Si cette règle a déjà été affichée, ne pas la réafficher
                    if (displayedRules.has(ruleKey)) {
                      return null;
                    }
                    
                    // Marquer cette règle comme affichée
                    displayedRules.add(ruleKey);
                    
                    return (
                      <Chip
                        key={`${questionId}-${ruleIndex}`}
                        label={`${question?.text || 'Question'}: ${getOperatorLabel(rule.operator)} ${formatFilterValue(rule.value)}${
                          rule.secondValue ? ` - ${formatFilterValue(rule.secondValue)}` : ''
                        }`}
                        onDelete={() => handleRemoveRule(questionId, ruleIndex)}
                        sx={{
                          backgroundColor: 'rgba(102, 126, 234, 0.08)',
                          color: '#667eea',
                          borderRadius: '6px',
                          maxWidth: '300px',
                          '& .MuiChip-label': {
                            whiteSpace: 'normal',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          },
                          '& .MuiChip-deleteIcon': {
                            color: '#667eea',
                            '&:hover': { color: '#764ba2' }
                          }
                        }}
                      />
                    );
                  }).filter(Boolean); // Filtrer les éléments null
                })}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                No answer filter defined. Click "Add Answer Filter" to start.
              </Typography>
            )}
          </>
        )}

        <Divider sx={{ my: 3 }} />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={handleClearFilters}
            sx={{
              borderColor: 'rgba(102, 126, 234, 0.3)',
              color: '#667eea',
              '&:hover': {
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.04)'
              }
            }}
          >
            Reset
          </Button>
          <Button
            variant="contained"
            onClick={handleApplyFilters}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
              }
            }}
          >
            Apply Filters
          </Button>
        </Box>
      </Paper>

      {/* Dialogue pour ajouter un filtre de réponse */}
      <Dialog
        open={answerFilterDialogOpen}
        onClose={handleCloseAnswerFilterDialog}
        maxWidth="sm"
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
          Add Answer Filter
          <IconButton onClick={handleCloseAnswerFilterDialog} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ mt: 2 }}>
          <FormControl fullWidth variant="outlined" sx={{ mb: 3 }}>
            <InputLabel>Question</InputLabel>
            <Select
              value={selectedQuestionId || ''}
              onChange={(e) => {
                const questionId = e.target.value;
                setSelectedQuestionId(questionId);
                const question = survey.questions.find(q => q.id === questionId);
                if (question) {
                  setTempRule(prev => ({
                    ...prev,
                    operator: getOperatorsByType(question.type)[0]
                  }));
                }
              }}
              label="Question"
            >
              {survey.questions.map(question => (
                <MenuItem key={question.id} value={question.id}>
                  {question.text}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedQuestionId && (
            <>
              <FormControl fullWidth variant="outlined" sx={{ mb: 3 }}>
                <InputLabel>Operator</InputLabel>
                <Select
                  value={tempRule.operator}
                  onChange={(e) => setTempRule(prev => ({ ...prev, operator: e.target.value }))}
                  label="Operator"
                >
                  {getOperatorsByType(survey.questions.find(q => q.id === selectedQuestionId)?.type || '').map(op => (
                    <MenuItem key={op} value={op}>
                      {getOperatorLabel(op)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {tempRule.operator === 'between' ? (
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    {(() => {
                      const question = survey.questions.find(q => q.id === selectedQuestionId);
                      if (!question) return null;

                      switch (question.type) {
                        case 'rating':
                        case 'slider':
                          return (
                            <TextField
                              fullWidth
                              label="Minimum Value"
                              variant="outlined"
                              type="number"
                              value={tempRule.value || ''}
                              onChange={(e) => setTempRule(prev => ({ ...prev, value: e.target.value }))}
                            />
                          );
                        default:
                          return (
                            <TextField
                              fullWidth
                              label="Minimum Value"
                              variant="outlined"
                              value={tempRule.value || ''}
                              onChange={(e) => setTempRule(prev => ({ ...prev, value: e.target.value }))}
                            />
                          );
                      }
                    })()}
                  </Grid>
                  <Grid item xs={6}>
                    {(() => {
                      const question = survey.questions.find(q => q.id === selectedQuestionId);
                      if (!question) return null;

                      switch (question.type) {
                        case 'rating':
                        case 'slider':
                          return (
                            <TextField
                              fullWidth
                              label="Maximum Value"
                              variant="outlined"
                              type="number"
                              value={tempRule.secondValue || ''}
                              onChange={(e) => setTempRule(prev => ({ ...prev, secondValue: e.target.value }))}
                            />
                          );
                        default:
                          return (
                            <TextField
                              fullWidth
                              label="Maximum Value"
                              variant="outlined"
                              value={tempRule.secondValue || ''}
                              onChange={(e) => setTempRule(prev => ({ ...prev, secondValue: e.target.value }))}
                            />
                          );
                      }
                    })()}
                  </Grid>
                </Grid>
              ) : (
                <>
                  {(() => {
                    const question = survey.questions.find(q => q.id === selectedQuestionId);
                    if (!question) return null;

                    switch (question.type) {
                      case 'yes-no':
                        return (
                          <FormControl fullWidth variant="outlined">
                            <InputLabel>Value</InputLabel>
                            <Select
                              value={tempRule.value || ''}
                              onChange={(e) => setTempRule(prev => ({ ...prev, value: e.target.value }))}
                              label="Value"
                            >
                              <MenuItem value="yes">Yes</MenuItem>
                              <MenuItem value="no">No</MenuItem>
                            </Select>
                          </FormControl>
                        );
                      
                      case 'multiple-choice':
                      case 'dropdown':
                        return (
                          <FormControl fullWidth variant="outlined">
                            <InputLabel>Value</InputLabel>
                            <Select
                              value={tempRule.value || ''}
                              onChange={(e) => setTempRule(prev => ({ ...prev, value: e.target.value }))}
                              label="Value"
                            >
                              {question.options?.map(option => (
                                <MenuItem key={option} value={option}>{option}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        );
                      
                      case 'rating':
                      case 'slider':
                        return (
                          <TextField
                            fullWidth
                            label="Value"
                            variant="outlined"
                            type="number"
                            value={tempRule.value || ''}
                            onChange={(e) => setTempRule(prev => ({ ...prev, value: e.target.value }))}
                          />
                        );
                      
                      default:
                        return (
                          <TextField
                            fullWidth
                            label="Value"
                            variant="outlined"
                            value={tempRule.value || ''}
                            onChange={(e) => setTempRule(prev => ({ ...prev, value: e.target.value }))}
                          />
                        );
                    }
                  })()}
                </>
              )}
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={handleCloseAnswerFilterDialog}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddRule}
            variant="contained"
            disabled={!selectedQuestionId || tempRule.value === null || tempRule.value === ''}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
              }
            }}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}; 