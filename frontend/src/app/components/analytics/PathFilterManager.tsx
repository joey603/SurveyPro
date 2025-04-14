import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { PathSegment } from './PathTreeVisualizer';

// Interface pour le contexte
interface PathFilterContextType {
  filteredQuestionIds: string[];
  isPathFiltered: boolean;
  setFilteredQuestionIds: (ids: string[]) => void;
  clearPathFilter: () => void;
  applyPathFilter: (path: PathSegment[]) => void;
}

// Création du contexte
const PathFilterContext = createContext<PathFilterContextType | undefined>(undefined);

// Hook personnalisé pour utiliser le contexte
export const usePathFilter = () => {
  const context = useContext(PathFilterContext);
  if (!context) {
    throw new Error('usePathFilter must be used within a PathFilterProvider');
  }
  return context;
};

// Props pour le fournisseur
interface PathFilterProviderProps {
  children: ReactNode;
}

// Composant fournisseur du contexte
export const PathFilterProvider: React.FC<PathFilterProviderProps> = ({ children }) => {
  const [filteredQuestionIds, setFilteredQuestionIds] = useState<string[]>([]);
  const [isPathFiltered, setIsPathFiltered] = useState(false);

  // Appliquer un filtre de chemin
  const applyPathFilter = (path: PathSegment[]) => {
    if (!path || path.length === 0) {
      clearPathFilter();
      return;
    }
    
    // Extraire les IDs de questions du chemin
    const questionIds = path.map(segment => segment.questionId);
    
    // Mettre à jour l'état
    setFilteredQuestionIds(questionIds);
    setIsPathFiltered(true);
    
    // Log pour le débogage
    console.log("Path filter applied:", questionIds);
    console.log("Path filter details:", path.map(segment => ({
      questionId: segment.questionId,
      questionText: segment.questionText,
      answer: segment.answer
    })));
  };

  // Effacer le filtre de chemin
  const clearPathFilter = () => {
    setFilteredQuestionIds([]);
    setIsPathFiltered(false);
    console.log("Path filter cleared");
  };

  // Valeur du contexte
  const value = {
    filteredQuestionIds,
    isPathFiltered,
    setFilteredQuestionIds,
    clearPathFilter,
    applyPathFilter
  };

  return (
    <PathFilterContext.Provider value={value}>
      {children}
    </PathFilterContext.Provider>
  );
};

// Composant HOC pour filtrer les questions
interface FilteredQuestionsProps {
  questions: any[];
  render: (filteredQuestions: any[]) => JSX.Element;
}

export const FilteredQuestions: React.FC<FilteredQuestionsProps> = ({ 
  questions, 
  render 
}) => {
  const { filteredQuestionIds, isPathFiltered } = usePathFilter();
  
  // Filtrer les questions si nécessaire
  const filteredQuestions = isPathFiltered && filteredQuestionIds.length > 0
    ? questions.filter(q => filteredQuestionIds.includes(q.id))
    : questions;
  
  // Rendre le composant avec les questions filtrées
  return render(filteredQuestions);
};

// Composant pour indiquer qu'un filtre de chemin est actif
export const PathFilterIndicator: React.FC = () => {
  const { isPathFiltered, clearPathFilter } = usePathFilter();
  
  if (!isPathFiltered) return null;
  
  return (
    <div style={{ 
      backgroundColor: 'rgba(102, 126, 234, 0.1)',
      color: '#667eea',
      padding: '4px 10px',
      borderRadius: '16px',
      fontSize: '0.875rem',
      fontWeight: 500,
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    }}>
      <span>Filtered by path</span>
      <button 
        onClick={clearPathFilter}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#667eea',
          padding: 0,
          fontSize: '1rem'
        }}
      >
        ×
      </button>
    </div>
  );
}; 