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
    <Box sx={{ mt: 4, width: '100%' }} className="selected-paths-panel">
      <Typography variant="h6" gutterBottom>
        Response Path Analysis
      </Typography>
      
      <Paper elevation={2} sx={{ 
        borderRadius: 2,
        overflow: 'hidden',
        mb: 4,
        height: '500px',
        width: '100%'
      }}>
        <Box sx={{ p: 3, height: '100%', overflow: 'auto' }}>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Selected Paths ({selectedPaths.length})
          </Typography>
          
          {selectedPaths.length > 0 ? (
            <>
              <List dense>
                {selectedPaths.map((path, index) => (
                  <ListItem key={index} divider={index < selectedPaths.length - 1}>
                    <ListItemText
                      primary={`Path ${index + 1}`}
                      secondary={formatPath(path)}
                    />
                  </ListItem>
                ))}
              </List>
              
              <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip 
                  label={`${totalRespondents} respondents`} 
                  color="primary" 
                  variant="outlined" 
                />
              </Box>
              
              <Box sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Group name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Ex: Satisfied users"
                />
                
                <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between' }}>
                  <Button 
                    variant="outlined" 
                    color="error" 
                    size="small"
                    onClick={onClearSelection}
                  >
                    Clear selection
                  </Button>
                  
                  <Button 
                    variant="contained" 
                    size="small"
                    onClick={handleCreateGroup}
                    disabled={!groupName.trim() || selectedPaths.length === 0}
                  >
                    Create group
                  </Button>
                </Box>
              </Box>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Click on paths in the tree to select them and create an analysis group.
            </Typography>
          )}
        </Box>
      </Paper>
    </Box>
  );
};
