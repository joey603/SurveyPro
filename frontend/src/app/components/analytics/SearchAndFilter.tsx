import React, { useState } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  Stack,
  Chip,
  IconButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

interface SearchAndFilterProps {
  onSearchChange: (value: string) => void;
  onDateRangeChange: (start: Date | null, end: Date | null) => void;
  onSortChange: (sort: 'date' | 'popular') => void;
}

const SearchAndFilter: React.FC<SearchAndFilterProps> = ({
  onSearchChange,
  onDateRangeChange,
  onSortChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<{
    start: Date | null;
    end: Date | null;
  }>({
    start: null,
    end: null
  });
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'popular'>('date');

  const clearFilters = () => {
    setSearchQuery('');
    setDateRange({ start: null, end: null });
    setShowDateFilter(false);
    setSortBy('date');
    onSearchChange('');
    onDateRangeChange(null, null);
    onSortChange('date');
  };

  return (
    <Box
      sx={{ 
        mb: 4, 
        backgroundColor: 'background.paper', 
        p: 3, 
        borderRadius: 2, 
        boxShadow: 1 
      }}
    >
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Rechercher des analyses par titre ou description..."
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          onSearchChange(e.target.value);
        }}
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
          endAdornment: (searchQuery || dateRange.start || dateRange.end) && (
            <InputAdornment position="end">
              <IconButton
                size="small"
                onClick={clearFilters}
              >
                <ClearIcon />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
      >
        <Chip
          icon={<FilterListIcon />}
          label="Filtre par date"
          onClick={() => setShowDateFilter(!showDateFilter)}
          color={showDateFilter ? "primary" : "default"}
          variant={showDateFilter ? "filled" : "outlined"}
          sx={{
            '&.MuiChip-filled': {
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }
          }}
        />
        <Chip
          icon={<FilterListIcon />}
          label={`Tri par ${sortBy === 'date' ? 'date' : 'popularité'}`}
          onClick={() => {
            const newSortBy = sortBy === 'date' ? 'popular' : 'date';
            setSortBy(newSortBy);
            onSortChange(newSortBy);
          }}
          color={sortBy === 'popular' ? "primary" : "default"}
          variant={sortBy === 'popular' ? "filled" : "outlined"}
          sx={{
            '&.MuiChip-filled': {
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }
          }}
        />
      </Stack>

      {showDateFilter && (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Stack
            direction="row"
            spacing={2}
            sx={{ mt: 2 }}
          >
            <DatePicker
              label="Date de début"
              value={dateRange.start}
              onChange={(newValue: Date | null) => {
                setDateRange(prev => {
                  const newRange = {
                    ...prev,
                    start: newValue
                  };
                  onDateRangeChange(newRange.start, newRange.end);
                  return newRange;
                });
              }}
            />
            <DatePicker
              label="Date de fin"
              value={dateRange.end}
              onChange={(newValue: Date | null) => {
                setDateRange(prev => {
                  const newRange = {
                    ...prev,
                    end: newValue
                  };
                  onDateRangeChange(newRange.start, newRange.end);
                  return newRange;
                });
              }}
              minDate={dateRange.start || undefined}
            />
          </Stack>
        </LocalizationProvider>
      )}
    </Box>
  );
};

export default SearchAndFilter; 