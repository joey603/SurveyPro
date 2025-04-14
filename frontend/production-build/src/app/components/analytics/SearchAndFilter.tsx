import React, { useState, forwardRef } from 'react';
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
import LockIcon from '@mui/icons-material/Lock';
import PublicIcon from '@mui/icons-material/Public';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { colors } from '@/theme/colors';

interface CustomDatePickerProps {
  id?: string;
  'data-testid'?: string;
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  minDate?: Date;
}

const CustomDatePicker = forwardRef<HTMLDivElement, CustomDatePickerProps>(
  ({ id, 'data-testid': dataTestId, label, value, onChange, minDate, ...props }, ref) => {
    return (
      <DatePicker
        {...props}
        ref={ref}
        label={label}
        value={value}
        onChange={onChange}
        minDate={minDate}
        renderInput={(params) => (
          <TextField
            {...params}
            id={id}
            data-testid={dataTestId}
            size="small"
          />
        )}
      />
    );
  }
);

CustomDatePicker.displayName = 'CustomDatePicker';

interface SearchAndFilterProps {
  onSearchChange: (value: string) => void;
  onDateRangeChange: (start: Date | null, end: Date | null) => void;
  onSortChange: (sort: 'date' | 'popular') => void;
  onPendingChange: (showPending: boolean) => void;
  onPrivacyFilterChange: (privacyFilter: 'all' | 'private' | 'public') => void;
}

const SearchAndFilter: React.FC<SearchAndFilterProps> = ({
  onSearchChange,
  onDateRangeChange,
  onSortChange,
  onPendingChange,
  onPrivacyFilterChange
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<{
    start: Date | null;
    end: Date | null;
  }>({
    start: null,
    end: null,
  });
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'popular'>('date');
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [privacyFilter, setPrivacyFilter] = useState<'all' | 'private' | 'public'>('all');

  const clearFilters = () => {
    setSearchQuery('');
    setDateRange({ start: null, end: null });
    setShowDateFilter(false);
    setSortBy('date');
    setShowPendingOnly(false);
    setPrivacyFilter('all');
    onSearchChange('');
    onDateRangeChange(null, null);
    onSortChange('date');
    onPendingChange(false);
    if (onPrivacyFilterChange) {
      onPrivacyFilterChange('all');
    }
  };

  const handlePrivacyFilterClick = () => {
    const newFilter = privacyFilter === 'all' 
      ? 'private' 
      : (privacyFilter === 'private' ? 'public' : 'all');
    
    setPrivacyFilter(newFilter);
    onPrivacyFilterChange(newFilter);
  };

  const getPrivacyFilterIcon = () => {
    switch(privacyFilter) {
      case 'private': return <LockIcon />;
      case 'public': return <PublicIcon />;
      default: return <FilterListIcon />;
    }
  };

  const getPrivacyFilterLabel = () => {
    switch(privacyFilter) {
      case 'private': return 'Private';
      case 'public': return 'Public';
      default: return 'All Surveys';
    }
  };

  return (
    <Box
      sx={{
        mb: 4,
        backgroundColor: colors.background.paper,
        p: 3,
        borderRadius: 2,
        boxShadow: 1,
      }}
    >
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search surveys..."
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
          endAdornment: (searchQuery ||
            dateRange.start ||
            dateRange.end ||
            showPendingOnly ||
            privacyFilter !== 'all') && (
            <InputAdornment position="end">
              <IconButton size="small" onClick={clearFilters}>
                <ClearIcon />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      <Stack direction="row" spacing={2} alignItems="center" sx={{ flexWrap: 'wrap', gap: 1 }}>
        <Chip
          icon={<FilterListIcon />}
          label="Date Filter"
          onClick={() => setShowDateFilter(!showDateFilter)}
          color={showDateFilter ? 'primary' : 'default'}
          variant={showDateFilter ? 'filled' : 'outlined'}
          sx={{
            '&.MuiChip-filled': {
              background: colors.primary.gradient,
            },
          }}
        />
        
        <Chip
          icon={<FilterListIcon />}
          label={`Sort by ${sortBy === 'date' ? 'date' : 'popularity'}`}
          onClick={() => {
            const newSortBy = sortBy === 'date' ? 'popular' : 'date';
            setSortBy(newSortBy);
            onSortChange(newSortBy);
          }}
          color={sortBy === 'popular' ? 'primary' : 'default'}
          variant={sortBy === 'popular' ? 'filled' : 'outlined'}
          sx={{
            '&.MuiChip-filled': {
              background: colors.primary.gradient,
            },
          }}
        />
        
        <Chip
          icon={getPrivacyFilterIcon()}
          label={getPrivacyFilterLabel()}
          onClick={handlePrivacyFilterClick}
          color={privacyFilter !== 'all' ? 'primary' : 'default'}
          variant={privacyFilter !== 'all' ? 'filled' : 'outlined'}
          sx={{
            '&.MuiChip-filled': {
              background: colors.primary.gradient,
            },
          }}
        />
        
        <Chip
          icon={<FilterListIcon />}
          label="Pending"
          onClick={() => {
            setShowPendingOnly(!showPendingOnly);
            onPendingChange(!showPendingOnly);
          }}
          color={showPendingOnly ? 'primary' : 'default'}
          variant={showPendingOnly ? 'filled' : 'outlined'}
          sx={{
            '&.MuiChip-filled': {
              background: colors.primary.gradient,
            },
          }}
        />
      </Stack>

      {showDateFilter && (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <CustomDatePicker
              label="Start Date"
              value={dateRange.start}
              onChange={(newValue: Date | null) => {
                setDateRange((prev) => {
                  const newRange = { ...prev, start: newValue };
                  onDateRangeChange(newRange.start, newRange.end);
                  return newRange;
                });
              }}
            />
            <CustomDatePicker
              label="End Date"
              value={dateRange.end}
              onChange={(newValue: Date | null) => {
                setDateRange((prev) => {
                  const newRange = { ...prev, end: newValue };
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
