import React, { useState } from 'react';
import {
  Paper,
  Box,
  Typography,
  Button,
  Stack,
  Chip,
  Card,
  CardHeader,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import {
  BarChart as BarChartIcon,
  AutoGraph as AutoGraphIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  ListAlt as ListAltIcon,
  Lock as LockIcon,
  Public as PublicIcon,
  Quiz as QuizIcon,
  Poll as PollIcon,
  AccountTree as AccountTreeIcon,
  Share as ShareIcon,
} from '@mui/icons-material';
import { colors } from '@/theme/colors';

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
  isDynamic?: boolean;
  nodes?: any[];
  edges?: any[];
  responses?: SurveyResponse[];
  isPrivate?: boolean;
  privateLink?: string;
  isShared?: boolean;
}

interface Question {
  id: string;
  text: string;
  type: string;
}

interface SurveyResponse {
  _id: string;
  surveyId: string;
  answers: Answer[];
  submittedAt: string;
}

interface Answer {
  questionId: string;
  answer: string;
}

// Étendre l'interface Survey pour les sondages partagés
interface SurveyWithShare extends Survey {
  isShared?: boolean;
  shareId?: string;
  sharedBy?: string;
  status?: 'pending' | 'accepted' | 'rejected';
}

interface AnalyticsCardProps {
  survey: SurveyWithShare;
  onDelete?: (id: string) => void;
  onViewAnalytics: (survey: SurveyWithShare) => void;
  userId?: string;
  responses?: SurveyResponse[];
  onAcceptShare?: (shareId: string) => void;
  onRejectShare?: (shareId: string) => void;
}

export const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
  survey,
  onDelete,
  onViewAnalytics,
  userId,
  responses = [],
  onAcceptShare,
  onRejectShare,
}) => {
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  
  const responseCount = responses?.length || 0;
  
  // Vérifier la validité des données du sondage pour le débogage
  const isValidSurvey = Boolean(survey && survey._id);
  
  if (!isValidSurvey) {
    console.error('Invalid survey data:', survey);
    return null; // Ne pas rendre ce composant si les données sont invalides
  }
  
  // Déterminer si c'est un sondage dynamique (vérifier plusieurs façons possibles)
  const isDynamicSurvey = Boolean(
    survey.isDynamic || 
    (survey.nodes && survey.nodes.length > 0) || 
    (survey.edges && survey.edges.length > 0)
  );
  
  // Déterminer si c'est un sondage privé
  const isPrivateSurvey = Boolean(
    survey.isPrivate || 
    survey.privateLink || 
    (survey.title && survey.title.toLowerCase().includes('private'))
  );
  
  // Déterminer si c'est un sondage partagé
  const isSharedSurvey = Boolean(survey.isShared);
  const isPendingSurvey = isSharedSurvey && survey.status === 'pending';
  
  console.log('Rendu de la carte pour le sondage:', {
    id: survey._id,
    title: survey.title || 'No title',
    isShared: isSharedSurvey, 
    status: survey.status,
    sharedBy: survey.sharedBy,
    isDynamic: isDynamicSurvey,
    shareId: survey.shareId || 'none',
    questions: survey.questions?.length || 0,
    nodes: survey.nodes?.length || 0
  });
  
  const handleDeleteClick = () => {
    setOpenDeleteDialog(true);
  };
  
  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
  };
  
  const handleConfirmDelete = () => {
    if (isSharedSurvey && survey.shareId && onRejectShare) {
      // Si c'est un sondage partagé, appeler onRejectShare pour le refuser
      onRejectShare(survey.shareId);
    } else if (onDelete) {
      // Sinon, c'est un sondage possédé par l'utilisateur, utiliser onDelete
      onDelete(survey._id);
    }
    setOpenDeleteDialog(false);
  };
  
  return (
    <>
      <Card
        elevation={1}
        className="analytics-survey-card"
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
          },
          border: isPendingSurvey 
            ? '2px dashed #f44336' 
            : (isSharedSurvey ? '2px dashed #667eea' : 'none'),
        }}
      >
        {/* Badge Private/Public positionné en haut à droite */}
        <Box sx={{ 
          position: 'absolute', 
          top: 8, 
          right: 8, 
          zIndex: 3
        }}>
          <Chip 
            icon={isPrivateSurvey ? <LockIcon fontSize="small" /> : <PublicIcon fontSize="small" />}
            label={isPrivateSurvey ? "Private" : "Public"}
            size="small" 
            color="primary"
            variant="outlined" 
          />
        </Box>
        
        {/* Badge pour les sondages partagés */}
        {isSharedSurvey && (
          <Box sx={{ 
            position: 'absolute', 
            top: 8, 
            left: 8, 
            zIndex: 3 
          }}>
            <Chip 
              icon={<ShareIcon fontSize="small" />}
              label={isPendingSurvey ? "Pending" : "Shared"}
              size="small"
              color={isPendingSurvey ? "error" : "secondary"}
              sx={{ fontWeight: 'bold' }}
            />
          </Box>
        )}
        
        <CardContent sx={{ 
          pt: 4, 
          position: 'relative',
          flex: '1 0 auto',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <Typography
            variant="h6"
            sx={{
              color: 'primary.main',
              fontWeight: 500,
              mb: 1,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: 1.3,
              height: '2.6em',
            }}
          >
            {survey.title || "Untitled"}
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 2,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: 1.5,
              height: '4.5em',
            }}
          >
            {survey.description || 'No description available'}
          </Typography>
          
          {/* Ajout du contenu de survol */}
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
              {survey.title}
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                color: 'text.secondary',
                mb: 2,
                lineHeight: 1.6 
              }}
            >
              {survey.description || 'No description available'}
            </Typography>
          </Box>

          {/* Conteneur pour les badges */}
          <Box sx={{ 
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start'
          }}>
            <Stack
              direction="row"
              spacing={1}
              sx={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: '8px',
                mt: 2,
                mb: 2,
                minHeight: '56px',
                '& .MuiChip-root': {
                  margin: '0 !important'
                }
              }}
            >
              <Chip
                size="small"
                icon={<BarChartIcon sx={{ fontSize: 16 }} />}
                label={`${responseCount} Responses`}
                sx={{
                  backgroundColor: 'rgba(102, 126, 234, 0.1)',
                  color: '#667eea',
                  height: '24px',
                  '& .MuiChip-icon': {
                    color: '#667eea'
                  },
                }}
              />
              <Chip
                size="small"
                icon={<QuizIcon sx={{ fontSize: 16 }} />}
                label={`${survey.questions?.length || survey.nodes?.length || 0} Questions`}
                sx={{
                  backgroundColor: 'rgba(102, 126, 234, 0.1)',
                  color: '#667eea',
                  height: '24px',
                  '& .MuiChip-icon': {
                    color: '#667eea'
                  },
                }}
              />
              <Chip
                size="small"
                icon={isDynamicSurvey ? <AutoGraphIcon sx={{ fontSize: 16 }} /> : <ListAltIcon sx={{ fontSize: 16 }} />}
                label={isDynamicSurvey ? "Dynamic" : "Static"}
                sx={{
                  backgroundColor: 'rgba(102, 126, 234, 0.1)',
                  color: '#667eea',
                  height: '24px',
                  '& .MuiChip-icon': {
                    color: '#667eea'
                  },
                }}
              />
              {survey.demographicEnabled && (
                <Chip
                  size="small"
                  label="Demographic"
                  sx={{
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    color: '#667eea',
                    height: '24px',
                  }}
                />
              )}
              {survey.sharedBy && (
                <Chip
                  size="small"
                  icon={<EmailIcon sx={{ fontSize: 16 }} />}
                  label={`Shared by ${survey.sharedBy}`}
                  sx={{
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    color: '#667eea',
                    height: '24px',
                    '& .MuiChip-icon': {
                      color: '#667eea'
                    },
                  }}
                />
              )}
            </Stack>
            
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ 
                mt: 'auto',
                mb: 0 
              }}
            >
              Created on {new Date(survey.createdAt).toLocaleDateString()}
            </Typography>
          </Box>
        </CardContent>

        <Box
          sx={{
            p: 2,
            borderTop: 1,
            borderColor: 'divider',
            backgroundColor: 'rgba(102, 126, 234, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            position: 'relative',
            zIndex: 1
          }}
        >
          {/* Boutons pour les sondages en attente */}
          {isPendingSurvey && onAcceptShare && onRejectShare ? (
            <>
              <Button
                variant="outlined"
                size="small"
                color="error"
                onClick={() => onRejectShare(survey.shareId || '')}
                sx={{
                  borderColor: '#f44336',
                  color: '#f44336',
                  '&:hover': {
                    borderColor: '#d32f2f',
                    backgroundColor: 'rgba(244, 67, 54, 0.1)',
                  },
                }}
              >
                Reject
              </Button>
              <Button
                variant="contained"
                size="small"
                color="success"
                onClick={() => onAcceptShare(survey.shareId || '')}
                sx={{
                  ml: 1,
                  background: 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)',
                  },
                }}
              >
                Accept
              </Button>
            </>
          ) : (
            <>
              {/* Bouton Delete uniquement pour les sondages possédés par l'utilisateur */}
              {userId === survey.userId && onDelete && !isSharedSurvey && (
                <Button
                  variant="outlined"
                  size="small"
                  color="error"
                  onClick={handleDeleteClick}
                  startIcon={<DeleteIcon />}
                  className="delete-button"
                  sx={{
                    borderColor: '#f44336',
                    color: '#f44336',
                    '&:hover': {
                      borderColor: '#d32f2f',
                      backgroundColor: 'rgba(244, 67, 54, 0.1)',
                    },
                  }}
                >
                  Delete
                </Button>
              )}
              
              {/* Bouton Remove pour les sondages partagés et acceptés */}
              {isSharedSurvey && survey.status === 'accepted' && onRejectShare && (
                <Button
                  variant="outlined"
                  size="small"
                  color="error"
                  onClick={handleDeleteClick}
                  startIcon={<DeleteIcon />}
                  className="delete-button"
                  sx={{
                    borderColor: '#f44336',
                    color: '#f44336',
                    '&:hover': {
                      borderColor: '#d32f2f',
                      backgroundColor: 'rgba(244, 67, 54, 0.1)',
                    },
                  }}
                >
                  Remove
                </Button>
              )}
              <Button
                variant="contained"
                size="small"
                onClick={() => onViewAnalytics(survey)}
                className="view-button"
                data-tutorial="view-analytics-button"
                sx={{
                  ml: 'auto',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                  },
                }}
              >
                View Analytics
              </Button>
            </>
          )}
        </Box>
      </Card>
      
      {/* Boîte de dialogue de confirmation de suppression */}
      <Dialog
        open={openDeleteDialog}
        onClose={handleCloseDeleteDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {isSharedSurvey ? "Remove Shared Survey" : "Confirm Deletion"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {isSharedSurvey 
              ? `Are you sure you want to remove "${survey.title}" from your dashboard? You will no longer have access to this survey.`
              : `Are you sure you want to delete the survey "${survey.title}"? This action cannot be undone.`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="error" autoFocus>
            {isSharedSurvey ? "Remove" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}; 