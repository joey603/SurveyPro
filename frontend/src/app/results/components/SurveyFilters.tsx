import React from 'react';
import { 
  Box, 
  TextField, 
  IconButton, 
  Chip,
  Stack,
  InputAdornment 
} from '@mui/material';
import { 
  Search as SearchIcon,
  Clear as ClearIcon,
  FilterList as FilterListIcon 
} from '@mui/icons-material';
import type { SurveyFilters as FilterType } from '../types';

interface SurveyFiltersProps {
  filters: FilterType;
  onFilterChange: (filters: FilterType) => void;
  onClearFilters: () => void;
}

export const SurveyFilters: React.FC<SurveyFiltersProps> = ({
  filters,
  onFilterChange,
  onClearFilters
}) => {
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({
      ...filters,
      search: event.target.value
    });
  };

  return (
    <Box sx={{ mb: 3 }}>
      <TextField
        fullWidth
        placeholder="Rechercher un sondage..."
        value={filters.search || ''}
        onChange={handleSearchChange}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
          endAdornment: filters.search && (
            <InputAdornment position="end">
              <IconButton onClick={onClearFilters} size="small">
                <ClearIcon />
              </IconButton>
            </InputAdornment>
          )
        }}
        sx={{ mb: 2 }}
      />

      <Stack direction="row" spacing={1}>
        <Chip
          icon={<FilterListIcon />}
          label="Date"
          onClick={() => {/* Implémenter le filtre par date */}}
          variant={filters.date ? "filled" : "outlined"}
        />
        <Chip
          icon={<FilterListIcon />}
          label="Réponses"
          onClick={() => {/* Implémenter le filtre par nombre de réponses */}}
          variant={filters.responses ? "filled" : "outlined"}
        />
      </Stack>
    </Box>
  );
}; 