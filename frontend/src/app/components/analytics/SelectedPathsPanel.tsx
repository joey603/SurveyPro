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

// Remplacer la constante PATH_COLORS pour qu'elle utilise plus directement les lettres comme clés
const PATH_COLORS: { [key: string]: string } = {
  'A': '#8A2BE2', // Violet
  'B': '#1E90FF', // Bleu dodger
  'C': '#FF6347', // Tomate
  'D': '#32CD32', // Vert lime
  'E': '#FF8C00', // Orange foncé
  'F': '#9932CC', // Orchidée foncée
  'G': '#20B2AA', // Turquoise
  'H': '#FF1493', // Rose profond
  'I': '#4682B4', // Bleu acier
  'J': '#00CED1', // Turquoise moyen
  'K': '#FF69B4', // Rose chaud
  'L': '#4169E1', // Bleu royal
  'M': '#2E8B57', // Vert mer
  'N': '#DAA520', // Or
  'O': '#4B0082', // Indigo
  'P': '#FF4500', // Orange rouge
  'Q': '#008080', // Teal
  'R': '#800080', // Pourpre
  'S': '#FFD700', // Or
  'T': '#00FF00', // Vert lime
  'U': '#FF00FF', // Magenta
  'V': '#00FFFF', // Cyan
  'W': '#FFA500', // Orange
  'X': '#800000', // Marron
  'Y': '#000080', // Bleu marine
  'Z': '#008000', // Vert
};

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

  const getPathColor = (pathIndex: number): string => {
    const pathLetter = String.fromCharCode(65 + pathIndex);
    return PATH_COLORS[pathLetter] || '#667eea';
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
                {selectedPaths.map((path, index) => {
                  const pathColor = getPathColor(index);
                  const pathName = `Path ${String.fromCharCode(65 + index)}`;
                  
                  return (
                    <ListItem 
                      key={index} 
                      divider={index < selectedPaths.length - 1}
                      sx={{
                        borderLeft: `4px solid ${pathColor}`,
                        backgroundColor: `${pathColor}10`,
                        mb: 1,
                        borderRadius: 1
                      }}
                    >
                      <ListItemText
                        primary={
                          <Typography 
                            variant="subtitle2" 
                            sx={{ 
                              color: pathColor,
                              fontWeight: 'bold'
                            }}
                          >
                            {pathName}
                          </Typography>
                        }
                        secondary={formatPath(path)}
                      />
                    </ListItem>
                  );
                })}
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
              No paths selected
            </Typography>
          )}
        </Box>
      </Paper>
    </Box>
  );
};
