import React from 'react';
import {
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tooltip
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { PathSegment } from './PathTreeVisualizer';

export interface AnalysisGroup {
  id: string;
  name: string;
  paths: PathSegment[][];
  respondentCount: number;
  createdAt: Date;
}

export interface GroupsListProps {
  groups: AnalysisGroup[];
  onSelectGroup: (groupId: string) => void;
  onDeleteGroup: (groupId: string) => void;
  onRenameGroup: (groupId: string, newName: string) => void;
}

export const GroupsList: React.FC<GroupsListProps> = ({
  groups,
  onSelectGroup,
  onDeleteGroup,
  onRenameGroup
}) => {
  if (groups.length === 0) {
    return null;
  }

  return (
    <Paper sx={{ p: 2, height: '50%', overflow: 'auto' }}>
      <Typography variant="subtitle1" gutterBottom>
        Analysis Groups ({groups.length})
      </Typography>
      
      <List dense>
        {groups.map((group: AnalysisGroup) => (
          <ListItem 
            key={group.id}
            button
            onClick={() => onSelectGroup(group.id)}
          >
            <ListItemText
              primary={group.name}
              secondary={`${group.respondentCount} respondents • ${group.paths.length} paths`}
            />
            <ListItemSecondaryAction>
              <Tooltip title="View group analysis">
                <IconButton edge="end" onClick={() => onSelectGroup(group.id)}>
                  <VisibilityIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Rename">
                <IconButton edge="end" onClick={() => {
                  const newName = prompt('New name for this group:', group.name);
                  if (newName) onRenameGroup(group.id, newName);
                }}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton 
                  edge="end" 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Are you sure you want to delete this group?')) {
                      onDeleteGroup(group.id);
                    }
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};
