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
  Paper,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ShareIcon from '@mui/icons-material/Share';
import InfoIcon from '@mui/icons-material/Info';

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
      setError('Please enter an email address');
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
      if (err.message && err.message.includes("Recipient not found")) {
        setError(`The user with email "${email}" does not exist in the system.`);
      } else {
        setError(err.message || 'An error occurred while sharing the survey');
      }
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
          <Typography variant="h6">Share Survey</Typography>
        </Box>
        <IconButton onClick={handleClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ pt: 3, pb: 1 }}>
        {survey && (
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            You are sharing: <strong>{survey.title}</strong>
          </Typography>
        )}
        
        <Paper elevation={0} sx={{ p: 2, bgcolor: 'rgba(102, 126, 234, 0.05)', mb: 3, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <InfoIcon color="primary" sx={{ mt: 0.5 }} />
            <Typography variant="body2" color="text.secondary">
              Sharing this survey will send an invitation to the recipient's email. They will need to accept the invitation to access the survey and its analytics. You can view pending and accepted shares in your analytics dashboard.
            </Typography>
          </Box>
        </Paper>
        
        <TextField
          autoFocus
          margin="dense"
          id="email"
          label="Recipient email"
          type="email"
          fullWidth
          variant="outlined"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          sx={{ mb: 2 }}
          helperText="Enter the email address of an existing SurveyFlow user"
        />
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Survey shared successfully! The recipient will receive a notification to accept the shared survey.
          </Alert>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button 
          onClick={handleClose}
          disabled={loading}
        >
          Cancel
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
          {loading ? 'Sharing...' : 'Share'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ShareDialog; 