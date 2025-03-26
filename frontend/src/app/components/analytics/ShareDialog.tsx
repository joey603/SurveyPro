import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  CircularProgress,
  Typography,
  IconButton,
  Box,
  Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ShareIcon from '@mui/icons-material/Share';

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  onShare: (email: string) => Promise<void>;
  survey: {
    _id: string;
    title: string;
  } | null;
}

const ShareDialog: React.FC<ShareDialogProps> = ({ open, onClose, onShare, survey }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleShareClick = async () => {
    if (!email) {
      setError('Veuillez entrer une adresse email');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await onShare(email);
      setSuccess(true);
      setEmail('');
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors du partage du sondage');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setError(null);
    setSuccess(false);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      PaperProps={{
        sx: { borderRadius: 2, width: '100%', maxWidth: 500 }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        py: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ShareIcon />
          <Typography variant="h6">Partager le sondage</Typography>
        </Box>
        <IconButton onClick={handleClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ pt: 3, pb: 1 }}>
        {survey && (
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            Vous allez partager : <strong>{survey.title}</strong>
          </Typography>
        )}
        
        <TextField
          autoFocus
          margin="dense"
          id="email"
          label="Email du destinataire"
          type="email"
          fullWidth
          variant="outlined"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          sx={{ mb: 2 }}
        />
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Sondage partagé avec succès !
          </Alert>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button 
          onClick={handleClose}
          disabled={loading}
        >
          Annuler
        </Button>
        <Button 
          onClick={handleShareClick}
          variant="contained"
          disabled={loading || !email}
          startIcon={loading ? <CircularProgress size={20} /> : <ShareIcon />}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
            },
          }}
        >
          {loading ? 'Partage en cours...' : 'Partager'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ShareDialog; 