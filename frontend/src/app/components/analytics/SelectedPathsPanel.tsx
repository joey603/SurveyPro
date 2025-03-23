import React, { useState } from 'react';
import {
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Chip,
  TextField,
  Button,
  Box
} from '@mui/material';
import { PathTreeVisualizer, PathSegment } from './PathTreeVisualizer';
import { GroupsList as ImportedGroupsList, GroupsListProps, AnalysisGroup } from './GroupsList';

interface SelectedPathsPanelProps {
  selectedPaths: PathSegment[][];
  onCreateGroup: (name: string, paths: PathSegment[][]) => void;
  onClearSelection: () => void;
  totalRespondents: number;
}

export const SelectedPathsPanel: React.FC<SelectedPathsPanelProps> = ({
  selectedPaths,
  onCreateGroup,
  onClearSelection,
  totalRespondents
}) => {
  const [groupName, setGroupName] = useState('');
  
  const handleCreateGroup = () => {
    if (groupName.trim() && selectedPaths.length > 0) {
      onCreateGroup(groupName, selectedPaths);
      setGroupName('');
    }
  };
  
  const formatPath = (path: PathSegment[]): string => {
    return path.map(segment => segment.questionText).join(' → ');
  };
  
  return (
    <Paper sx={{ p: 2, height: '50%', overflow: 'auto' }}>
      <Typography variant="subtitle1" gutterBottom>
        Parcours sélectionnés ({selectedPaths.length})
      </Typography>
      
      {selectedPaths.length > 0 ? (
        <>
          <List dense>
            {selectedPaths.map((path, index) => (
              <ListItem key={index} divider={index < selectedPaths.length - 1}>
                <ListItemText
                  primary={`Parcours ${index + 1}`}
                  secondary={formatPath(path)}
                />
              </ListItem>
            ))}
          </List>
          
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip 
              label={`${totalRespondents} répondants`} 
              color="primary" 
              variant="outlined" 
            />
          </Box>
          
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              size="small"
              label="Nom du groupe"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Ex: Utilisateurs satisfaits"
            />
            
            <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between' }}>
              <Button 
                variant="outlined" 
                color="error" 
                size="small"
                onClick={onClearSelection}
              >
                Effacer la sélection
              </Button>
              
              <Button 
                variant="contained" 
                size="small"
                onClick={handleCreateGroup}
                disabled={!groupName.trim() || selectedPaths.length === 0}
              >
                Créer un groupe
              </Button>
            </Box>
          </Box>
        </>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Cliquez sur des chemins dans l'arborescence pour les sélectionner et créer un groupe d'analyse.
        </Typography>
      )}
    </Paper>
  );
};
