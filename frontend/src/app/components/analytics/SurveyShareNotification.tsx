import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  Typography,
  Button,
  Divider,
  IconButton,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useAuth } from '@/utils/AuthContext';
import { fetchPendingShares, respondToSurveyShare } from '@/utils/surveyService';

interface SurveyShareNotificationProps {
  onAccept: (surveyId: string) => void;
}

export const SurveyShareNotification: React.FC<SurveyShareNotificationProps> = ({ onAccept }) => {
  const [pendingShares, setPendingShares] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewSurvey, setPreviewSurvey] = useState<any>(null);
  const { user } = useAuth();
  
  useEffect(() => {
    const loadPendingShares = async () => {
      try {
        const token = localStorage.getItem('accessToken') || '';
        const shares = await fetchPendingShares(token);
        setPendingShares(shares);
      } catch (error) {
        console.error('Erreur lors du chargement des partages en attente:', error);
      }
    };
    
    loadPendingShares();
    // Mettre en place un intervalle pour vérifier périodiquement
    const interval = setInterval(loadPendingShares, 60000); // Vérifier toutes les minutes
    
    return () => clearInterval(interval);
  }, []);
  
  const handleDialogOpen = () => {
    setDialogOpen(true);
  };
  
  const handleDialogClose = () => {
    setDialogOpen(false);
    setPreviewSurvey(null);
  };
  
  const handlePreviewSurvey = (survey: any) => {
    setPreviewSurvey(survey);
  };
  
  const handleClosePreview = () => {
    setPreviewSurvey(null);
  };
  
  const handleRespondToShare = async (shareId: string, accept: boolean) => {
    try {
      const token = localStorage.getItem('accessToken') || '';
      await respondToSurveyShare(shareId, accept, token);
      
      // Mettre à jour la liste locale
      if (accept) {
        const acceptedShare = pendingShares.find(share => share._id === shareId);
        if (acceptedShare && acceptedShare.surveyId) {
          onAccept(acceptedShare.surveyId);
        }
      }
      
      setPendingShares(prev => prev.filter(share => share._id !== shareId));
      setPreviewSurvey(null);
    } catch (error) {
      console.error('Erreur lors de la réponse au partage:', error);
    }
  };
  
  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleDialogOpen}
        sx={{ color: 'white' }}
      >
        <Badge badgeContent={pendingShares.length} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>
      
      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}>
          Sondages partagés avec vous
        </DialogTitle>
        <DialogContent sx={{ p: 2 }}>
          {pendingShares.length === 0 ? (
            <Typography variant="body1" sx={{ p: 2, textAlign: 'center' }}>
              Aucun sondage partagé en attente
            </Typography>
          ) : (
            <Box sx={{ maxHeight: '500px', overflow: 'auto' }}>
              {pendingShares.map((share) => (
                <Card key={share._id} sx={{ mb: 2, p: 2, borderRadius: 2 }}>
                  <Typography variant="h6">
                    {share.surveyId && share.surveyId.title ? share.surveyId.title : "Sondage non disponible"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Partagé par: {share.sharedBy}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Date: {new Date(share.createdAt).toLocaleDateString()}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {share.surveyId && share.surveyId.description || 'Aucune description disponible'}
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    {share.surveyId ? (
                      <Button 
                        variant="outlined" 
                        size="small"
                        onClick={() => handlePreviewSurvey(share.surveyId)}
                      >
                        Prévisualiser
                      </Button>
                    ) : (
                      <Button 
                        variant="outlined" 
                        size="small"
                        disabled
                      >
                        Prévisualisation non disponible
                      </Button>
                    )}
                    <Box>
                      <Button 
                        variant="outlined" 
                        color="error" 
                        size="small"
                        onClick={() => handleRespondToShare(share._id, false)}
                        sx={{ mr: 1 }}
                      >
                        Refuser
                      </Button>
                      <Button 
                        variant="contained" 
                        size="small"
                        onClick={() => handleRespondToShare(share._id, true)}
                        disabled={!share.surveyId}
                        sx={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                          }
                        }}
                      >
                        Accepter
                      </Button>
                    </Box>
                  </Box>
                  {!share.surveyId && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                      Le sondage original semble avoir été supprimé ou est inaccessible.
                    </Alert>
                  )}
                </Card>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Fermer</Button>
        </DialogActions>
      </Dialog>
      
      {/* Dialogue de prévisualisation du sondage */}
      {previewSurvey && (
        <Dialog 
          open={!!previewSurvey} 
          onClose={handleClosePreview}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
          }}>
            Prévisualisation: {previewSurvey.title}
          </DialogTitle>
          <DialogContent sx={{ p: 3 }}>
            <Typography variant="body1" sx={{ mb: 3 }}>
              {previewSurvey.description || 'Aucune description'}
            </Typography>
            
            <Typography variant="h6" gutterBottom>
              Questions ({previewSurvey.questions?.length || 0}):
            </Typography>
            
            {previewSurvey.questions?.map((question: any, index: number) => (
              <Box key={question.id} sx={{ mb: 2, p: 2, bgcolor: 'rgba(102, 126, 234, 0.1)', borderRadius: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {index + 1}. {question.text}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Type: {question.type}
                </Typography>
                {question.options && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2">Options:</Typography>
                    <ul>
                      {question.options.map((option: string, i: number) => (
                        <li key={i}>{option}</li>
                      ))}
                    </ul>
                  </Box>
                )}
              </Box>
            ))}
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Créé le: {new Date(previewSurvey.createdAt).toLocaleDateString()}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClosePreview}>Fermer</Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
}; 