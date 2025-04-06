import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

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

  // Ajouter un effet pour logger les changements d'état du filtre
  useEffect(() => {
    console.log("FilterContext: isPathFiltered changed to", isPathFiltered);
    console.log("FilterContext: filtered question IDs:", pathFilteredQuestionIds);
  }, [isPathFiltered, pathFilteredQuestionIds]);

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