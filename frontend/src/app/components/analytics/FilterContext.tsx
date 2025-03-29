import React, { createContext, useContext, useState, ReactNode } from 'react';

interface FilterContextType {
  pathFilteredQuestionIds: string[];
  setPathFilteredQuestionIds: (ids: string[]) => void;
  isPathFiltered: boolean;
  setIsPathFiltered: (filtered: boolean) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const FilterProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [pathFilteredQuestionIds, setPathFilteredQuestionIds] = useState<string[]>([]);
  const [isPathFiltered, setIsPathFiltered] = useState(false);

  return (
    <FilterContext.Provider value={{
      pathFilteredQuestionIds,
      setPathFilteredQuestionIds,
      isPathFiltered,
      setIsPathFiltered
    }}>
      {children}
    </FilterContext.Provider>
  );
};

export const useFilter = () => {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilter must be used within a FilterProvider');
  }
  return context;
}; 