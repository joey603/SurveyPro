import React, { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { Paper, Typography, Box, CircularProgress, Button, IconButton, List, ListItem, ListItemText, Tooltip } from '@mui/material';
import * as d3 from 'd3';
import ReactFlow, { 
  Background, 
  Controls, 
  Node, 
  Edge, 
  EdgeProps,
  MiniMap, 
  NodeTypes,
  Handle,
  Position,
  BaseEdge,
  getStraightPath,
  useReactFlow,
  ReactFlowInstance,
  getBezierPath,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { 
  FilterAltOff as FilterAltOffIcon, 
  Clear as ClearIcon, 
  Splitscreen as SplitscreenIcon, 
  ChevronRight as ChevronRightIcon, 
  ChevronLeft as ChevronLeftIcon 
} from '@mui/icons-material';
import FilterListIcon from '@mui/icons-material/FilterList';

// Ajout du type SurveyResponse au début du fichier, juste après les imports
interface SurveyResponse {
  _id: string;
  surveyId: string;
  answers: {
    questionId: string;
    answer: string;
  }[];
  submittedAt: string;
  respondent?: {
    demographic?: {
      gender?: string;
      educationLevel?: string;
      city?: string;
      dateOfBirth?: string;
    };
  };
}

export interface PathSegment {
  questionId: string;
  questionText: string;
  answer: string;
}

interface TreeNode {
  id: string;
  questionId: string;
  text: string;
  answer: string;
  count: number;
  children?: TreeNode[];
}

export interface PathTreeVisualizerProps {
  survey: any;
  responses: any[];
  onPathSelect: (path: PathSegment[]) => void;
  selectedPaths: PathSegment[][];
  onFilterChange?: (isFiltered: boolean, filteredResponses: any[]) => void;
  onPathsLoad?: (paths: {name: string, path: PathSegment[], group: string}[]) => void;
}

// Ajoutez ce tableau de couleurs en haut du fichier, juste après les imports
const HIGHLIGHT_COLORS = [
  '#8A2BE2', // Violet
  '#1E90FF', // Bleu dodger
  '#FF6347', // Tomate
  '#32CD32', // Vert lime
  '#FF8C00', // Orange foncé
  '#9932CC', // Orchidée foncée
  '#20B2AA', // Turquoise
  '#FF1493', // Rose profond
  '#4682B4', // Bleu acier
  '#00CED1', // Turquoise moyen
];

// Ajout de l'interface nécessaire pour QuestionNode
interface QuestionNodeProps {
  data: {
    text: string;
    count: number;
    isSelected?: boolean;
    highlightColor?: string;
    secondaryPathIndices?: number[];
    primaryPathIndex?: number;
    isFilteredTree?: boolean;
    [key: string]: any;
  };
}

// Composant personnalisé pour les nœuds de question avec mise en évidence améliorée
const QuestionNode: React.FC<QuestionNodeProps> = ({ data }) => {
  // Calculer dynamiquement si le nœud est dans un chemin sélectionné plutôt que de se fier à isSelected directement
  const isInSelectedPath = data.isSelected || (data.selectedPaths && data.selectedPaths.some((path: PathSegment[]) => 
    path.some((segment: PathSegment) => segment.questionId === data.questionId)
  ));
  const highlightColor = data.highlightColor || '#667eea';
  const size = 48; // Taille du cercle représentant le nombre de réponses
  
  // Calculer les positions des indicateurs secondaires (pour montrer qu'un nœud appartient à plusieurs parcours)
  const secondaryIndicatorPositions = data.secondaryPathIndices?.map((idx: number, i: number) => {
    const angle = (Math.PI * 2 / (data.secondaryPathIndices?.length || 1)) * i;
    return {
      top: `calc(50% - 28px + ${Math.sin(angle) * 24}px)`,
      left: `calc(50% + ${Math.cos(angle) * 24}px)`,
    };
  }) || [];
  
  // L'index du parcours principal pour ce nœud 
  const primaryPathIndex = data.primaryPathIndex !== undefined ? data.primaryPathIndex : 0;
  
  // Déterminer s'il s'agit d'un nœud dans un arbre filtré (horizontal) ou principal (vertical)
  const isFilteredTree = data.isFilteredTree === true;
  
  return (
    <div style={{ 
      position: 'relative',
      width: '100%', 
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px 15px',
      boxSizing: 'border-box',
      transform: isInSelectedPath ? 'scale(1.05)' : 'scale(1)',
      transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
    }}>
      {/* Conteneur principal avec couleur dynamique */}
      <div style={{
        position: 'absolute',
        top: '5px',
        left: '5px',
        right: '5px',
        bottom: '5px',
        backgroundColor: isInSelectedPath ? `${highlightColor}10` : 'rgba(255, 255, 255, 0.95)',
        borderRadius: '16px',
        border: `${isInSelectedPath ? 3 : 2}px solid ${isInSelectedPath ? highlightColor : 'rgba(102, 126, 234, 0.2)'}`,
        boxShadow: isInSelectedPath 
          ? `0 10px 20px -5px ${highlightColor}30, 0 0 15px 5px ${highlightColor}20`
          : '0 8px 16px rgba(0, 0, 0, 0.05)',
        transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        zIndex: 1,
        animation: isInSelectedPath ? 'pulse 2.5s infinite' : 'none'
      }} />

      {/* Texte de la question */}
      <div
        style={{
          width: '100%',
          textAlign: 'center',
          fontSize: isInSelectedPath ? '15px' : '14px',
          lineHeight: '1.5',
          fontWeight: isInSelectedPath ? '600' : '500',
          color: isInSelectedPath ? '#1565c0' : '#333333',
          padding: '10px 12px',
          borderRadius: '12px',
          whiteSpace: 'normal',
          overflowWrap: 'break-word',
          wordBreak: 'break-word',
          maxHeight: '100px',
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: '12px',
          zIndex: 2,
          letterSpacing: '0.2px',
          textShadow: isInSelectedPath ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
        }}
      >
          {data.text}
        </div>

      {/* Cercle avec le nombre de réponses - couleur dynamique */}
      <div 
        style={{ 
          width: `${isInSelectedPath ? size * 1.1 : size}px`,
          height: `${isInSelectedPath ? size * 1.1 : size}px`,
          borderRadius: '50%',
          backgroundImage: isInSelectedPath 
            ? `linear-gradient(135deg, ${highlightColor}, ${highlightColor}dd)` 
            : 'linear-gradient(135deg, rgba(102, 126, 234, 0.8), rgba(118, 75, 162, 0.8))',
          border: `2px solid ${isInSelectedPath ? "#ffffff" : "rgba(255, 255, 255, 0.9)"}`,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontWeight: 'bold',
          color: '#ffffff',
          fontSize: isInSelectedPath ? '15px' : '13px',
          boxShadow: isInSelectedPath 
            ? `0 8px 16px ${highlightColor}40, 0 0 0 2px ${highlightColor}20` 
            : '0 4px 12px rgba(0, 0, 0, 0.15)',
          transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          zIndex: 3,
          position: 'relative',
          textShadow: '0 1px 3px rgba(0,0,0,0.2)'
        }}
      >
        {data.totalCount || data.count}
      </div>
      
      {/* Indication que c'est le total de répondants */}
      {isFilteredTree && (
        <div style={{
          fontSize: '11px',
          color: '#667eea',
          fontWeight: '500',
          marginTop: '5px',
          textAlign: 'center',
          opacity: 0.9,
          letterSpacing: '0.3px'
        }}>
          répondants
        </div>
      )}
      
      {/* Handles pour les connexions - différentes selon le type d'arbre */}
      {isFilteredTree ? (
        <>
      <Handle 
        type="target" 
            position={Position.Left} 
        style={{ 
              width: '12px', 
              height: '12px',
              background: isInSelectedPath 
                ? `linear-gradient(135deg, ${highlightColor}, ${highlightColor}cc)` 
                : 'linear-gradient(135deg, #667eea, #764ba2)',
          border: '2px solid white',
              zIndex: 10,
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
        }} 
      />
          
      <Handle 
        type="source" 
            position={Position.Right} 
        style={{ 
              width: '12px', 
              height: '12px',
              background: isInSelectedPath 
                ? `linear-gradient(135deg, ${highlightColor}, ${highlightColor}cc)` 
                : 'linear-gradient(135deg, #667eea, #764ba2)',
          border: '2px solid white',
              zIndex: 10,
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
            }}
          />
        </>
      ) : (
        <>
          <Handle 
            type="target" 
            position={Position.Top} 
            style={{ 
              width: '12px', 
              height: '12px',
              background: isInSelectedPath 
                ? `linear-gradient(135deg, ${highlightColor}, ${highlightColor}cc)` 
                : 'linear-gradient(135deg, #667eea, #764ba2)',
              border: '2px solid white',
              zIndex: 10,
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
            }} 
          />
          
          <Handle 
            type="source" 
            position={Position.Bottom} 
            style={{ 
              width: '12px', 
              height: '12px',
              background: isInSelectedPath 
                ? `linear-gradient(135deg, ${highlightColor}, ${highlightColor}cc)` 
                : 'linear-gradient(135deg, #667eea, #764ba2)',
          border: '2px solid white',
              zIndex: 10,
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
            }}
          />
        </>
      )}

      {/* Indicateurs secondaires pour montrer l'appartenance à d'autres parcours */}
          {secondaryIndicatorPositions.map((pos, idx) => (
            <div 
              key={idx}
              style={{
                position: 'absolute',
            width: '14px',
            height: '14px',
                borderRadius: '50%',
            background: `linear-gradient(135deg, ${HIGHLIGHT_COLORS[(primaryPathIndex + idx + 1) % HIGHLIGHT_COLORS.length]}, ${HIGHLIGHT_COLORS[(primaryPathIndex + idx + 1) % HIGHLIGHT_COLORS.length]}dd)`,
            boxShadow: `0 0 10px ${HIGHLIGHT_COLORS[(primaryPathIndex + idx + 1) % HIGHLIGHT_COLORS.length]}60, 0 0 0 2px white`,
            border: '2px solid #fff',
            ...pos,
            zIndex: 20,
            transition: 'all 0.3s ease'
              }} 
            />
          ))}
    </div>
  );
};

// Composant modifié pour les liens avec atténuation lors des croisements
const LinkComponent = ({ 
  id, 
  source, 
  target, 
  style, 
  data,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition
}: EdgeProps) => {
  
  // Check if this link is in a selected path
  const isInSelectedPath = data?.isSelected || (data?.selectedPaths && data?.selectedPaths.length > 0 && data.selectedPaths.some((path: PathSegment[]) => {
    // Check if the link matches a selected path
    for (let i = 0; i < path.length - 1; i++) {
      const sourceQuestionId = source.includes('-') ? source.split('-').pop() : source;
      const targetQuestionId = target.includes('-') ? target.split('-').pop() : target;
      
      if (path[i].questionId === sourceQuestionId && path[i+1].questionId === targetQuestionId) {
        return true;
      }
    }
    return false;
  }));
  
  // Link color and thickness
  const linkColor = data?.pathColor || 'rgba(102, 126, 234, 0.7)';
  
  const strokeWidth = isInSelectedPath ? 3 : 2;
  const opacity = isInSelectedPath ? 1 : 0.7;
  
  // Créer un chemin incurvé pour le lien
  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;
  
  // Déterminer si c'est un lien vertical ou horizontal 
  const isVertical = Math.abs(targetY - sourceY) > Math.abs(targetX - sourceX);
  
  // Générer le chemin avec getStraightPath
  const [edgePath] = getStraightPath({
    sourceX, 
    sourceY,
    targetX, 
    targetY
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
          style={{
          ...style,
          stroke: linkColor,
          strokeWidth: strokeWidth,
          opacity: opacity,
          transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          filter: isInSelectedPath ? `drop-shadow(0 0 3px ${linkColor})` : 'none'
        }}
      />
      
        {isInSelectedPath && (
        <BaseEdge
          id={`${id}-glow`}
          path={edgePath}
          style={{
            stroke: linkColor,
            strokeWidth: 1,
            opacity: 0.3,
            filter: `blur(4px) drop-shadow(0 0 5px ${linkColor})`,
            transition: 'all 0.4s ease'
          }}
        />
      )}
    </>
  );
};

// Ajouter ceci au début du composant ou dans un fichier CSS séparé
const styles = `
  .filtering-transition .react-flow__node {
    transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
  }
  
  .filtering-transition .react-flow__edge {
    transition: opacity 0.6s ease, stroke 0.6s ease !important;
  }
  
  .react-flow__node {
    transition: all 0.3s ease;
  }
`;

// Ajoutez ces styles pour améliorer la visualisation hiérarchique
const hierarchyStyles = `
  .filtering-transition .react-flow__node {
    transition: all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
  }
  
  .filtering-transition .react-flow__edge {
    transition: all 0.6s ease !important;
  }
  
  .react-flow__node {
    transition: all 0.5s ease;
  }
  
  /* Fond strié pour mieux distinguer les niveaux */
  .react-flow__renderer {
    background-image: linear-gradient(
      rgba(240, 244, 255, 0.5) 1px,
      transparent 1px
    ),
    linear-gradient(
      90deg,
      rgba(240, 244, 255, 0.5) 1px,
      transparent 1px
    );
    background-size: 30px 30px;
  }
`;

// Ajoutez ce style CSS pour une meilleure gestion des transitions
const scrollStyles = `
  .path-list-container {
    scroll-behavior: smooth;
    will-change: scroll-position;
    overscroll-behavior: contain;
  }
  
  /* Avoid jerkiness during filtered elements transition */
  .path-list-container > div {
    transform: translateZ(0); /* Activer l'accélération matérielle */
    transition: opacity 0.2s ease-in-out;
  }
  
  /* Masquer temporairement la barre de défilement pendant l'animation */
  .filtering-active .path-list-container::-webkit-scrollbar {
    width: 0px !important;
    background: transparent;
  }
  
  /* Réafficher la barre de défilement après l'animation */
  .filtering-active .path-list-container::-webkit-scrollbar {
    transition: width 0.3s ease-in-out;
  }
  
  /* Stabiliser la hauteur du conteneur */
  .path-list-container {
    min-height: 200px;
  }
`;

// Ajoutez ce style CSS pour l'effet d'atténuation des liens
const linkStyles = `
  .react-flow__edge.selected .react-flow__edge-path {
    stroke-opacity: 1;
    filter: drop-shadow(0 0 3px var(--path-color, rgba(102, 126, 234, 0.5)));
  }
  
  .highlight-path {
    mask: url(var(--path-mask)) !important;
  }
  
  /* Effet de fondu lorsqu'un lien traverse un nœud qui n'est pas sa source ou sa cible */
  .react-flow__edge:not(.selected) .react-flow__edge-path {
    transition: stroke-opacity 0.3s ease, stroke-width 0.3s ease;
  }
  
  /* Crée un effet d'atténuation lorsqu'un lien passe près d'un nœud */
  .react-flow__node:hover ~ .react-flow__edge:not(.selected) .react-flow__edge-path {
    stroke-opacity: 0.3;
  }
  
  /* Amélioration des fonds pour les composants ReactFlow */
  .react-flow__background {
    background-size: 20px 20px !important;
    background-image: radial-gradient(circle at 1px 1px, rgba(220, 230, 250, 0.5) 1px, transparent 0) !important;
  }
  
  .react-flow__controls {
    background-color: white !important;
    border-radius: 8px !important;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1) !important;
    padding: 4px !important;
  }
  
  .react-flow__controls-button {
    border-radius: 6px !important;
    border: none !important;
    background-color: rgba(255, 255, 255, 0.9) !important;
    color: #667eea !important;
    transition: all 0.2s ease !important;
    width: 24px !important;
    height: 24px !important;
    margin: 3px !important;
  }
  
  .react-flow__controls-button:hover {
    background-color: rgba(102, 126, 234, 0.1) !important;
    transform: scale(1.05) !important;
  }
  
  .react-flow__controls-button svg {
    fill: #667eea !important;
    width: 14px !important;
    height: 14px !important;
  }
  
  /* Minimap personnalisée */
  .react-flow__minimap {
    border-radius: 8px !important;
    overflow: hidden !important;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1) !important;
    border: 1px solid rgba(102, 126, 234, 0.15) !important;
  }
`;

// Définir une animation de pulse pour les nœuds sélectionnés
const pulseCss = `
@keyframes pulse {
  0% {
    box-shadow: 0 10px 20px -5px rgba(102, 126, 234, 0.2), 0 0 15px 5px rgba(102, 126, 234, 0.15);
  }
  50% {
    box-shadow: 0 10px 25px -2px rgba(102, 126, 234, 0.35), 0 0 20px 8px rgba(102, 126, 234, 0.25);
  }
  100% {
    box-shadow: 0 10px 20px -5px rgba(102, 126, 234, 0.2), 0 0 15px 5px rgba(102, 126, 234, 0.15);
  }
}
`;

// Améliorations visuelles pour ReactFlow
const reactFlowCustomStyles = `
  /* Amélioration des fonds et contrôles pour les composants ReactFlow */
  .react-flow__background {
    background-size: 20px 20px;
    background-image: radial-gradient(circle at 1px 1px, rgba(220, 230, 250, 0.5) 1px, transparent 0);
  }
  
  .react-flow__controls {
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    padding: 4px;
  }
  
  .react-flow__controls-button {
    border-radius: 6px;
    border: none;
    background-color: rgba(255, 255, 255, 0.9);
    color: #667eea;
    transition: all 0.2s ease;
  }
  
  .react-flow__controls-button:hover {
    background-color: rgba(102, 126, 234, 0.1);
    transform: scale(1.05);
  }
  
  .react-flow__controls-button svg {
    fill: #667eea;
  }
  
  /* Minimap personnalisée */
  .react-flow__minimap {
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    border: 1px solid rgba(102, 126, 234, 0.15);
  }
`;

// Ajoutez ces styles spécifiques pour l'animation du panneau
const panelTransitionStyles = `
  .panel-slide-enter {
    transform: translateX(100%);
    opacity: 0;
  }
  
  .panel-slide-enter-active {
    transform: translateX(0);
    opacity: 1;
    transition: all 0.4s ease-in-out;
  }
  
  .panel-slide-exit {
    transform: translateX(0);
    opacity: 1;
  }
  
  .panel-slide-exit-active {
    transform: translateX(100%);
    opacity: 0;
    transition: all 0.4s ease-in-out;
  }
  
  .react-flow-container {
    transition: flex 0.4s ease-in-out;
  }
`;

export const PathTreeVisualizer: React.FC<PathTreeVisualizerProps> = ({
  survey,
  responses,
  onPathSelect,
  selectedPaths,
  onFilterChange,
  onPathsLoad
}) => {
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [allPaths, setAllPaths] = useState<{name: string, path: PathSegment[], group: string}[]>([]);
  const [analysisGroups, setAnalysisGroups] = useState<{[key: string]: {name: string, paths: number[]}}>({}); 
  const [filterApplied, setFilterApplied] = useState(false);
  const [filteredPaths, setFilteredPaths] = useState<{name: string, path: PathSegment[], group: string}[]>([]);
  const [multipleTreeNodes, setMultipleTreeNodes] = useState<Node[][]>([]);
  const [multipleTreeEdges, setMultipleTreeEdges] = useState<Edge[][]>([]);
  const [pathsPanelOpen, setPathsPanelOpen] = useState(true);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef<number>(0);
  const containerHeightRef = useRef<number>(0);
  const reactFlowInstancesRef = useRef<ReactFlowInstance[]>([]);
  
  const getAlphabeticName = (index: number) => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    if (index < 26) {
      return letters[index];
    } else {
      const firstChar = letters[Math.floor(index / 26) - 1];
      const secondChar = letters[index % 26];
      return `${firstChar}${secondChar}`;
    }
  };
  
  const assignAnalysisGroups = (paths: {name: string, path: PathSegment[]}[]): {name: string, path: PathSegment[], group: string}[] => {
    const groupedPaths: {name: string, path: PathSegment[], group: string}[] = [];
    const groups: {[key: string]: {name: string, paths: number[]}} = {};
    
    const pathsByFirstQuestion: {[key: string]: number[]} = {};
    
    paths.forEach((path, index) => {
      if (path.path.length > 0) {
        const firstQ = path.path[0];
        const key = `${firstQ.questionId}-${firstQ.answer}`;
        
        if (!pathsByFirstQuestion[key]) {
          pathsByFirstQuestion[key] = [];
        }
        
        pathsByFirstQuestion[key].push(index);
      }
    });
    
    let groupIndex = 0;
    Object.entries(pathsByFirstQuestion).forEach(([key, pathIndices]) => {
      const groupName = `Group ${String.fromCharCode(65 + groupIndex)}`;
      const groupId = `group-${groupIndex}`;
      
      groups[groupId] = {
        name: groupName,
        paths: pathIndices
      };
      
      pathIndices.forEach(pathIndex => {
        if (pathIndex < paths.length) {
          groupedPaths.push({
            name: paths[pathIndex].name,
            path: paths[pathIndex].path,
            group: groupId
          });
        }
      });
      
      groupIndex++;
    });
    
    setAnalysisGroups(groups);
    return groupedPaths;
  };
  
  const extractAllPaths = (survey: any, responses: any[]) => {
    const questionsMap = new Map<string, any>();
    
    if (survey.questions) {
      survey.questions.forEach((q: any) => {
        questionsMap.set(q.id, q);
      });
    } else if (survey.nodes) {
      survey.nodes.forEach((node: any) => {
        if (node.data?.text || node.data?.label) {
          questionsMap.set(node.id, {
            id: node.id,
            text: node.data.text || node.data.label || 'Question',
            type: node.data.questionType || node.data.type || 'text'
          });
        }
      });
    }
    
    const nodeMap = new Map<string, any>();
    nodeMap.set('root', { count: responses.length, children: new Map() });
    
    responses.forEach(response => {
      let currentNodeId = 'root';
      let yOffset = 0;
      
      if (response.answers && Array.isArray(response.answers)) {
      response.answers.forEach((answer: any, index: number) => {
        const question = questionsMap.get(answer.questionId);
        if (!question) return;
        
        const answerText = answer.answer || 'Sans réponse';
        const childNodeId = `${currentNodeId}-${answer.questionId}-${answerText}`;
        
          if (!nodeMap.has(currentNodeId)) {
            console.log(`Création du nœud parent manquant: ${currentNodeId}`);
            nodeMap.set(currentNodeId, { count: 1, children: new Map() });
          }
          
        const currentNode = nodeMap.get(currentNodeId);
        if (!currentNode) {
          return;
        }
        
        if (!currentNode.children) {
          currentNode.children = new Map();
        }
        
        if (!currentNode.children.has(childNodeId)) {
          currentNode.children.set(childNodeId, {
            count: 1,
            children: new Map()
          });
        } else {
          const childNode = currentNode.children.get(childNodeId);
          childNode.count++;
        }
        
        currentNodeId = childNodeId;
      });
      }
    });
    
    const completePaths: {name: string, path: PathSegment[]}[] = [];
    const pathSet = new Set<string>();
    
    const traversePath = (nodeId: string, currentPath: PathSegment[], depth: number = 0) => {
      const node = nodeMap.get(nodeId);
      
      if (!node || !node.children || node.children.size === 0) {
        if (currentPath.length > 0) {
          // Créer une clé unique basée uniquement sur les IDs des questions
          const pathKey = currentPath.map(segment => 
            segment.questionId
          ).join('|');
          
          // Vérifier si cette séquence de questions est unique
          if (!pathSet.has(pathKey)) {
            pathSet.add(pathKey);
          completePaths.push({
            name: `Path ${getAlphabeticName(completePaths.length)}`,
            path: [...currentPath]
          });
          }
        }
        return;
      }
      
      node.children.forEach((childNode: any, childId: string) => {
        const parts = childId.split('-');
        if (parts.length >= 3) {
          const questionId = parts[parts.length - 2];
          const answer = parts[parts.length - 1];
          const question = questionsMap.get(questionId);
          
          if (question) {
            const pathSegment: PathSegment = {
              questionId,
              questionText: question.text || 'Question',
              answer
            };
            
            traversePath(childId, [...currentPath, pathSegment], depth + 1);
          }
        }
      });
    };
    
    traversePath('root', []);
    
    return assignAnalysisGroups(completePaths);
  };
  
  const nodeTypes: NodeTypes = {
    questionNode: QuestionNode,
  };
  
  const processPathTree = (survey: any, responses: any[]) => {
    if (!survey || responses.length === 0) {
      return { nodes: [], edges: [], paths: [] };
    }
    
    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];
    
    const questionMap = new Map<string, any>();
    const questionsArray: any[] = [];
    
    if (survey.isDynamic && survey.nodes) {
      survey.nodes.forEach((node: any) => {
        if (node.id !== 'root' && node.data) {
          questionMap.set(node.id, {
            id: node.id,
            text: node.data.text || node.data.label || 'Question',
            type: node.data.questionType || node.data.type || 'text',
            count: 0,
            children: []
          });
          
          questionsArray.push({
            id: node.id,
            text: node.data.text || node.data.label || 'Question',
            type: node.data.questionType || node.data.type || 'text',
            count: 0,
            children: []
          });
        }
      });
      
      if (survey.edges) {
        const parentChildMap = new Map<string, string[]>();
        
        survey.edges.forEach((edge: any) => {
          if (!parentChildMap.has(edge.source)) {
            parentChildMap.set(edge.source, []);
          }
          parentChildMap.get(edge.source)?.push(edge.target);
          
          const question = questionMap.get(edge.source);
          if (question) {
            question.children.push(edge.target);
          }
        });
        
        parentChildMap.forEach((children, parentId) => {
          const question = questionMap.get(parentId);
          if (question && children.length > 1) {
            question.isCritical = true;
          }
        });
      }
    } else if (survey.questions) {
      survey.questions.forEach((question: any) => {
        questionMap.set(question.id, {
          id: question.id,
          text: question.text,
          type: question.type,
          count: 0
        });
        
        questionsArray.push({
          id: question.id,
          text: question.text,
          type: question.type,
          count: 0
        });
      });
    }
    
    responses.forEach((response: any) => {
      response.answers.forEach((answer: { questionId: string, answer: string }) => {
        const question = questionMap.get(answer.questionId);
        if (question) {
          question.count = (question.count || 0) + 1;
        }
      });
    });
    
    // Nouvelles variables pour la disposition verticale
    const xGap = 450; // Espacement horizontal entre les nœuds frères
    const yGap = 250; // Espacement vertical entre les niveaux
    const BASE_X = 400; // Position X de départ pour le premier nœud
    const usedPositions = new Set<string>();
    const processedNodes = new Set<string>();
    const nodeLevels = new Map<string, number>(); // Pour suivre le niveau de chaque nœud
    const nodeChildren = new Map<string, string[]>(); // Pour suivre les enfants de chaque nœud
    
    // Calculer les niveaux des nœuds (profondeur dans l'arbre)
    const calculateNodeLevels = (nodeId: string, level: number = 0) => {
      if (nodeLevels.has(nodeId) && nodeLevels.get(nodeId)! >= level) {
        return;
      }
      
      nodeLevels.set(nodeId, level);
      
      const children = questionMap.get(nodeId)?.children || [];
      children.forEach((childId: string) => {
        calculateNodeLevels(childId, level + 1);
      });
    };
    
    // Identifier les nœuds racine (sans parents)
    const childIds = new Set<string>();
    questionMap.forEach((question, id) => {
      if (question.children) {
        question.children.forEach((childId: string) => {
          childIds.add(childId);
        });
      }
    });
    
    const rootNodes = Array.from(questionMap.keys()).filter(id => !childIds.has(id));
    
    // Calculer les niveaux pour tous les nœuds
    rootNodes.forEach(rootId => {
      calculateNodeLevels(rootId);
    });
    
    // Fonction pour déterminer si un nœud doit être ramifié (critique)
    const shouldBranchNode = (nodeId: string) => {
      const question = questionMap.get(nodeId);
      return question && (question.isCritical || question.type === 'yes-no' || question.type === 'dropdown');
    };
    
    // Fonction pour calculer la largeur d'une branche (pour l'espacement)
    const calculateBranchWidth = (nodeId: string, processed = new Set<string>()): number => {
      if (processed.has(nodeId)) return 0;
      processed.add(nodeId);
      
      const childrenIds = nodeChildren.get(nodeId) || [];
      if (childrenIds.length === 0) return 1;
      
      // Un nœud est critique s'il a plusieurs enfants
      if (childrenIds.length > 1) {
        // Pour les nœuds critiques, calculer la somme des largeurs des enfants
        return childrenIds.reduce((sum, childId) => {
          return sum + calculateBranchWidth(childId, new Set(processed));
        }, 0);
      }
      
      // Pour les nœuds non critiques, utiliser seulement l'enfant direct
      return calculateBranchWidth(childrenIds[0], processed);
    };
    
    // Fonction pour positionner un nœud et ses enfants
    const positionQuestion = (questionId: string, x: number, y: number) => {
      if (processedNodes.has(questionId)) return;
      processedNodes.add(questionId);
      
      const question = questionMap.get(questionId);
      if (!question) return;
      
      // Créer le nœud dans ReactFlow
      const questionNode: Node = {
        id: questionId,
        type: 'questionNode',
        data: {
          questionId: questionId,
          text: question.text,
          count: question.count || 0,
          isSelected: false,
          isRoot: false,
          isCritical: question.isCritical,
          selectedPaths: selectedPaths,
          answer: question.answer,
          pathColor: question.pathColor
        },
        position: { x, y },
        style: {
          width: 240,
          height: 160
        }
      };
      
      // Éviter les chevauchements
      let posKey = `${x},${y}`;
      while (usedPositions.has(posKey)) {
        x += 50; // petit décalage en cas de collision
        posKey = `${x},${y}`;
      }
      usedPositions.add(posKey);
      questionNode.position = { x, y };
      
      flowNodes.push(questionNode);
      
      // Traiter les enfants
      if (question.children && question.children.length > 0) {
        if (shouldBranchNode(questionId)) {
          // Pour les nœuds critiques, répartir les enfants à gauche et à droite
          const totalChildren = question.children.length;
          const childrenWidths = question.children.map((childId: string) => 
            calculateBranchWidth(childId)
          );
          
          const totalWidth = childrenWidths.reduce((sum: number, width: number) => sum + width, 0) * xGap;
          const startX = x - (totalWidth / 2) + (xGap / 2);
          
          let currentX = startX;
          
          question.children.forEach((childId: string, index: number) => {
            const childWidth = childrenWidths[index];
            const childX = currentX + (childWidth * xGap) / 2;
            const childY = y + yGap;
            
            positionQuestion(childId, childX, childY);
            
            flowEdges.push({
              id: `e-${questionId}-${childId}`,
              source: questionId,
              target: childId,
              animated: false,
              style: { 
                stroke: '#667eea',
                strokeWidth: 2.5
              },
              data: {
                selectedPaths: selectedPaths
              }
            });
            
            currentX += childWidth * xGap;
          });
        } else {
          // Pour les nœuds non critiques, placer l'enfant directement en-dessous
          const childId = question.children[0];
          positionQuestion(childId, x, y + yGap);
          
          flowEdges.push({
            id: `e-${questionId}-${childId}`,
            source: questionId,
            target: childId,
            animated: false,
            style: { 
              stroke: '#667eea',
              strokeWidth: 2.5
            },
            data: {
              selectedPaths: selectedPaths
            }
          });
        }
      }
    };
    
    if (!survey.isDynamic) {
      // Pour les sondages non dynamiques, garder la disposition linéaire verticale
      questionsArray.forEach((question, index) => {
        const questionNode: Node = {
          id: question.id,
          type: 'questionNode',
          data: {
            questionId: question.id,
            text: question.text,
            count: question.count || 0,
            isSelected: false,
            isRoot: false,
            selectedPaths: selectedPaths,
            pathColor: question.pathColor
          },
          position: { x: BASE_X, y: index * yGap },
          style: {
            width: 240,
            height: 160
          }
        };
        
        flowNodes.push(questionNode);
        
        if (index > 0) {
          const prevQuestion = questionsArray[index - 1];
          flowEdges.push({
            id: `e-${prevQuestion.id}-${question.id}`,
            source: prevQuestion.id,
            target: question.id,
            animated: false,
            style: { 
              stroke: '#667eea',
              strokeWidth: 2.5
            },
            data: {
              selectedPaths: selectedPaths
            }
          });
        }
      });
    } else {
      // Pour les sondages dynamiques, utiliser la nouvelle disposition en arbre
      const rootX = window.innerWidth / 2;
      rootNodes.forEach((nodeId, index) => {
        const rootX = BASE_X + index * xGap * 2; // Répartir les racines horizontalement
        positionQuestion(nodeId, rootX, 50);
      });
      
      // Si aucun nœud racine n'a été trouvé, utiliser une approche de secours
      if (rootNodes.length === 0 && questionsArray.length > 0) {
        questionsArray.forEach((question, index) => {
          if (!processedNodes.has(question.id)) {
            positionQuestion(question.id, BASE_X + index * xGap, 50);
          }
        });
      }
    }
    
    const paths = extractAllPaths(survey, responses);
    
    return { nodes: flowNodes, edges: flowEdges, paths };
  };
  
  useEffect(() => {
    if (survey && responses.length > 0) {
      setLoading(true);
      const { nodes, edges, paths } = processPathTree(survey, responses);
      
      console.log('=== Tous les chemins disponibles ===');
      console.log('Nombre total de chemins:', paths.length);
      paths.forEach((path, index) => {
        console.log(`Chemin ${index + 1}:`, {
          name: path.name,
          length: path.path.length,
          segments: path.path.map(segment => ({
            question: segment.questionText,
            answer: segment.answer
          }))
        });
      });
      console.log('===================================');
      
      const edgesWithSelection = edges.map(edge => ({
        ...edge,
        data: {
          ...(edge.data || {}),
          selectedPaths: selectedPaths,
          source: edge.source,
          target: edge.target
        }
      }));
      
      const nodesWithSelection = nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          selectedPaths: selectedPaths
        }
      }));
      
      setNodes(nodesWithSelection);
      setEdges(edgesWithSelection);
      setAllPaths(paths);
      
      if (onPathsLoad) {
        onPathsLoad(paths);
      }
      
      setLoading(false);
    } else {
      setLoading(false);
      setAllPaths([]);
    }
  }, [survey, responses, selectedPaths]);
  
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  
  const onNodeClick = (event: React.MouseEvent, node: Node) => {
    if (node.id === 'root') return;
    
    const pathSegments: PathSegment[] = [];
    const buildPath = (nodeId: string) => {
      if (nodeId === 'root') return;
      
      const parts = nodeId.split('-');
      if (parts.length >= 3) {
        const questionId = parts[parts.length - 2];
        const answer = parts[parts.length - 1];
        const question = survey.questions?.find((q: any) => q.id === questionId) || 
                        survey.nodes?.find((n: any) => n.id === questionId);
        
        if (question) {
          pathSegments.unshift({
            questionId,
            questionText: question.text || question.data?.text || question.data?.label || 'Question',
            answer
          });
        }
        
        const parentId = parts.slice(0, parts.length - 2).join('-');
        if (parentId !== '') {
          buildPath(parentId);
        }
      }
    };
    
    buildPath(node.id);
    
    if (pathSegments.length > 0) {
      onPathSelect(pathSegments);
    }
  };
  
  // Ajoutons un effet pour gérer le recentrage lorsque le mode filtré change
  useEffect(() => {
    if (filterApplied && multipleTreeNodes.length > 0) {
      // Donner le temps aux composants de se rendre
      setTimeout(() => {
        reactFlowInstancesRef.current.forEach((instance, idx) => {
          if (instance) {
            instance.fitView({ padding: 0.3 });
          }
        });
      }, 300);
    } else if (!filterApplied && reactFlowInstance) {
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2 });
      }, 300);
    }
  }, [filterApplied, multipleTreeNodes.length, pathsPanelOpen]);

  // Modifions également la fonction toggleFilter pour mieux gérer le recentrage
  const toggleFilter = () => {
    if (scrollContainerRef.current) {
      scrollPositionRef.current = scrollContainerRef.current.scrollTop;
      containerHeightRef.current = scrollContainerRef.current.scrollHeight;
      
      scrollContainerRef.current.style.height = `${scrollContainerRef.current.offsetHeight}px`;
      scrollContainerRef.current.classList.add('filtering-transition');
    }
    
    const newFilterState = !filterApplied;
    setFilterApplied(newFilterState);
    
    if (newFilterState) {
      // Obtenir d'abord les réponses qui correspondent exactement aux chemins sélectionnés
      const exactPathResponses = getFilteredResponses();
      
      console.log(`%cAffichage de ${exactPathResponses.length} réponses exactes dans l'arbre filtré`, 
                 'color: green; font-weight: bold');

      // Mettre à jour filteredPaths avec les chemins sélectionnés mais en gardant les noms d'origine
      const filteredPathsWithCounts = selectedPaths.map((path, index) => {
        // Trouver ce chemin dans allPaths pour récupérer son nom original
        const originalPath = allPaths.find(originalPath => 
          originalPath.path.length === path.length &&
          originalPath.path.every((segment, i) => 
            segment.questionId === path[i].questionId && 
            segment.answer === path[i].answer
          )
        );
        
        // Compter combien de réponses correspondent exactement à ce chemin
        const pathQuestionIds = path.map(segment => segment.questionId);
        
        const exactMatchesForPath = exactPathResponses.filter(response => {
          // Vérifier l'ordre des questions pour ce chemin
          const responseQuestionIds = response.answers.map((a: { questionId: string }) => a.questionId);
          let currentPathIndex = 0;
          let lastFoundIndex = -1;
          
          for (let i = 0; i < responseQuestionIds.length; i++) {
            if (responseQuestionIds[i] === pathQuestionIds[currentPathIndex]) {
              lastFoundIndex = i;
              currentPathIndex++;
              if (currentPathIndex === pathQuestionIds.length) break;
            }
          }
          
          return currentPathIndex === pathQuestionIds.length;
        });
        
        // Retourner le chemin avec son nom original si disponible
        return {
          name: originalPath ? originalPath.name : `Path ${index + 1} (${exactMatchesForPath.length} responses)`,
          path: path,
          group: 'filtered'
        };
      });
      
      // Mettre à jour la liste des chemins filtrés pour l'affichage dans le panneau
      setFilteredPaths(filteredPathsWithCounts);
      
      if (selectedPaths.length > 0) {
        const multipleNodes: Node[][] = [];
        const multipleEdges: Edge[][] = [];
        
        selectedPaths.forEach((path, pathIndex) => {
          // MODIFICATION : Créer un arbre filtré qui ne montre que les réponses exactes
          const { nodes: pathNodes, edges: pathEdges } = createSinglePathTree(
            survey, 
            exactPathResponses, // Utiliser seulement les réponses filtrées exactes
            path, 
            pathIndex
          );
          multipleNodes.push(pathNodes);
          multipleEdges.push(pathEdges);
        });
        
        setMultipleTreeNodes(multipleNodes);
        setMultipleTreeEdges(multipleEdges);
        
        // Préparons le recentrage pour les arbres filtrés
        setTimeout(() => {
          reactFlowInstancesRef.current.forEach((instance, idx) => {
            if (instance) {
              instance.fitView({ padding: 0.3 });
            }
          });
        }, 500);
      }
      
      updateVisibleElements(true, exactPathResponses);
      if (onFilterChange) {
        onFilterChange(true, exactPathResponses);
      }
    } else {
      setFilteredPaths([]);
      setMultipleTreeNodes([]);
      setMultipleTreeEdges([]);
      updateVisibleElements(false, responses);
      if (onFilterChange) {
        onFilterChange(false, responses);
      }
      
      // Recentrons la vue principale
      setTimeout(() => {
        if (reactFlowInstance) {
          reactFlowInstance.fitView({ padding: 0.2 });
        }
      }, 500);
    }
    
    requestAnimationFrame(() => {
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.style.height = '';
          scrollContainerRef.current.classList.remove('filtering-transition');
          
          scrollContainerRef.current.scrollTop = scrollPositionRef.current;
        }
      }, 50);
    });
  };
  
  const getFilteredResponses = () => {
    if (!selectedPaths || selectedPaths.length === 0) {
      console.log("Aucun chemin sélectionné, retournant toutes les réponses");
      return responses;
    }

    console.log("=== DÉTAILS DU FILTRAGE DE PARCOURS ===");
    console.log("Nombre total de réponses à filtrer:", responses.length);
    console.log(`%c${selectedPaths.length > 1 ? 'MULTI-CHEMINS: ' + selectedPaths.length + ' chemins sélectionnés!' : 'UN SEUL CHEMIN sélectionné'}`, 
      `font-weight: bold; color: ${selectedPaths.length > 1 ? 'red' : 'blue'}; font-size: 14px;`);

    // NOUVELLE APPROCHE: Traiter chaque chemin indépendamment
    console.log("%cNOUVELLE LOGIQUE: Chaque chemin est traité indépendamment", "font-weight: bold; color: green;");
    console.log("Chemins sélectionnés:");
    selectedPaths.forEach((path, idx) => {
      console.log(`  %cChemin ${idx+1}:`, 'font-weight: bold; color: blue;', path.map(segment => ({
        question: segment.questionText,
        réponse: segment.answer
      })));
    });

    // Si plusieurs chemins sont sélectionnés, expliquons la logique de filtrage
    if (selectedPaths.length > 1) {
      console.log("%cNOUVELLE LOGIQUE DE FILTRAGE MULTI-CHEMINS:", "font-weight: bold; color: green;");
      console.log("- Chaque chemin est traité INDÉPENDAMMENT");
      console.log("- Une réponse est valide si elle correspond à AU MOINS UN des chemins sélectionnés");
      console.log("- Pour chaque chemin: les réponses doivent contenir UNIQUEMENT les questions du chemin et dans le BON ORDRE");
    }

    // Variables pour les statistiques
    let totalValidResponses = 0;
    const matchesByPath: number[] = new Array(selectedPaths.length).fill(0);
    const responseIdsByPath: { [key: number]: Set<string> } = {};
    
    // Ensemble pour déduplication des IDs de réponse
    const validResponseIds = new Set<string>();

    // Traiter chaque chemin indépendamment
    selectedPaths.forEach((path, pathIndex) => {
      // Extraire les IDs de questions pour ce chemin uniquement
      const pathQuestionIds = path.map(segment => segment.questionId);
      responseIdsByPath[pathIndex] = new Set<string>();
      
      console.log(`Analyse du chemin ${pathIndex + 1} (${pathQuestionIds.length} questions):`);
      
      let validForThisPath = 0;
      let missingQuestionsCount = 0;
      let extraQuestionsCount = 0;
      let wrongOrderCount = 0;
      
      // Évaluer chaque réponse par rapport à ce chemin spécifique
      responses.forEach(response => {
        // 1. Vérifier que toutes les questions du chemin sont présentes
        const hasAllPathQuestions = pathQuestionIds.every(qId =>
        response.answers.some((answer: { questionId: string }) => answer.questionId === qId)
      );

        if (!hasAllPathQuestions) {
          missingQuestionsCount++;
          return;
        }
        
        // 2. Vérifier qu'il n'y a pas d'autres questions que celles du chemin
        const hasOnlyPathQuestions = response.answers.every((answer: { questionId: string }) =>
          pathQuestionIds.includes(answer.questionId)
        );
        
        if (!hasOnlyPathQuestions) {
          extraQuestionsCount++;
          return;
        }
        
        // 3. Vérifier l'ordre des questions
      const responseQuestionIds = response.answers.map((a: { questionId: string }) => a.questionId);
        let currentPathIndex = 0;
        let lastFoundIndex = -1;
        let orderCorrect = true;
        
        for (let i = 0; i < responseQuestionIds.length; i++) {
          if (responseQuestionIds[i] === pathQuestionIds[currentPathIndex]) {
            // Vérifier l'ordre correct
            if (lastFoundIndex !== -1) {
              const questionsBetween: Array<string> = responseQuestionIds.slice(lastFoundIndex + 1, i);
              if (questionsBetween.some((qId: string) => !pathQuestionIds.includes(qId))) {
                orderCorrect = false;
                break;
              }
            }
            
            lastFoundIndex = i;
            currentPathIndex++;
            
            if (currentPathIndex === pathQuestionIds.length) {
              break; // Toutes les questions du chemin ont été trouvées dans l'ordre
            }
          }
        }
        
        if (!orderCorrect || currentPathIndex !== pathQuestionIds.length) {
          wrongOrderCount++;
          return;
        }
        
        // Cette réponse est valide pour ce chemin
        validForThisPath++;
        matchesByPath[pathIndex]++;
        responseIdsByPath[pathIndex].add(response._id);
        validResponseIds.add(response._id); // Ajouter à l'ensemble global
      });
      
      console.log(`  Chemin ${pathIndex + 1}: ${validForThisPath} réponses valides`);
      console.log(`    - Rejetées: ${missingQuestionsCount} (questions manquantes), ${extraQuestionsCount} (questions supplémentaires), ${wrongOrderCount} (ordre incorrect)`);
    });
    
    // Construire l'ensemble final des réponses valides (union de tous les chemins)
    const filteredResponses = responses.filter(response => validResponseIds.has(response._id));
    totalValidResponses = validResponseIds.size;

    // Afficher les résultats du filtrage
    console.log("=== RÉSULTATS DU FILTRAGE ===");
    console.log(`Réponses valides trouvées: ${totalValidResponses}`);
    console.log(`Réponses rejetées: ${responses.length - totalValidResponses}`);
    
    // Afficher la distribution des correspondances par chemin
    if (selectedPaths.length > 1) {
      console.log("%cDISTRIBUTION DES CORRESPONDANCES PAR CHEMIN:", "font-weight: bold; color: purple;");
      selectedPaths.forEach((path, idx) => {
        const percentage = totalValidResponses > 0 ? Math.round((matchesByPath[idx] / totalValidResponses) * 100) : 0;
        console.log(`  Chemin ${idx+1}: ${matchesByPath[idx]} réponses (${percentage}% du total)`);
        
        // Trouver les réponses qui correspondent à plusieurs chemins
        if (selectedPaths.length > 1 && idx < selectedPaths.length - 1) {
          for (let j = idx + 1; j < selectedPaths.length; j++) {
            const intersection = new Set<string>();
            responseIdsByPath[idx].forEach(id => {
              if (responseIdsByPath[j].has(id)) {
                intersection.add(id);
              }
            });
            
            if (intersection.size > 0) {
              console.log(`    Commun avec Chemin ${j+1}: ${intersection.size} réponses`);
            }
          }
        }
      });
    }
    
    // Afficher quelques exemples de réponses valides
    if (filteredResponses.length > 0) {
      console.log("Exemples de réponses valides (max 2):");
      filteredResponses.slice(0, 2).forEach((response, idx) => {
        console.log(`  Exemple ${idx+1}:`, response.answers.map((a: { questionId: string; answer: string }) => ({
          questionId: a.questionId,
          answer: a.answer
        })));
        
        // Indiquer à quels chemins cette réponse correspond
        const matchingPaths = selectedPaths.map((_, pathIdx) => 
          responseIdsByPath[pathIdx].has(response._id) ? pathIdx + 1 : null
        ).filter(p => p !== null);
        
        console.log(`    Correspond aux chemins: ${matchingPaths.join(', ')}`);
      });
    }
    
    console.log("=====================================");

    return filteredResponses;
  };
  
  const updateVisibleElements = (filtered: boolean, responsesToUse: SurveyResponse[] = responses) => {
    if (!filtered) {
      const { nodes: originalNodes, edges: originalEdges } = processPathTree(survey, responses);
      
      const nodesPositions = originalNodes.map(node => ({
        id: node.id,
        x: node.position.x,
        y: node.position.y,
        width: node.style?.width ? Number(node.style.width) : 240,
        height: node.style?.height ? Number(node.style.height) : 160
      }));
      
      const edgesWithData = originalEdges.map(edge => ({
        ...edge,
        data: {
          ...(edge.data || {}),
          selectedPaths: selectedPaths,
          nodesPositions
        }
      }));
      
      const filteredNodes = originalNodes.filter(node => 
        selectedPaths.some(path => 
          path.some(segment => segment.questionId === node.data.questionId)
        )
      );
      
      const filteredEdges = originalEdges.filter(edge => {
        const sourceId = edge.source.includes('-') ? edge.source.split('-').slice(-1)[0] : edge.source;
        const targetId = edge.target.includes('-') ? edge.target.split('-').slice(-1)[0] : edge.target;
        
        return selectedPaths.some(path => 
          path.some(segment => segment.questionId === sourceId) &&
          path.some(segment => segment.questionId === targetId)
        );
      });
      
      const reorganizedNodes = reorganizeNodePositions(filteredNodes);
      
      setNodes(reorganizedNodes);
      setEdges(edgesWithData);
    } else {
      // On utilise les réponses filtrées pour générer un nouvel arbre
      const { nodes: exactPathNodes, edges: exactPathEdges } = processPathTree(survey, responsesToUse);
      
      const questionIdsInSelectedPaths = new Set<string>();
      
      selectedPaths.forEach(path => {
        path.forEach(segment => {
          questionIdsInSelectedPaths.add(segment.questionId);
        });
      });
      
      // Filtrer les nœuds pour ne garder que ceux qui sont dans les chemins sélectionnés
      const filteredNodes = exactPathNodes.filter(node => 
        questionIdsInSelectedPaths.has(node.data.questionId)
      );
      
      // Filtrer les arêtes pour ne garder que celles qui relient des nœuds dans les chemins sélectionnés
      const filteredEdges = exactPathEdges.filter(edge => {
        const sourceId = edge.source.includes('-') ? edge.source.split('-').slice(-1)[0] : edge.source;
        const targetId = edge.target.includes('-') ? edge.target.split('-').slice(-1)[0] : edge.target;
        
        return questionIdsInSelectedPaths.has(sourceId) && questionIdsInSelectedPaths.has(targetId);
      });
      
      const reorganizedNodes = reorganizeNodePositions(filteredNodes);
      
      const filteredNodesPositions = filteredNodes.map(node => ({
        id: node.id,
        x: node.position.x,
        y: node.position.y,
        width: node.style?.width ? Number(node.style.width) : 240,
        height: node.style?.height ? Number(node.style.height) : 160
      }));
      
      const edgesWithData = filteredEdges.map(edge => ({
        ...edge,
        data: {
          ...(edge.data || {}),
          selectedPaths: selectedPaths,
          nodesPositions: filteredNodesPositions
        }
      }));
      
      setNodes(reorganizedNodes);
      setEdges(edgesWithData);
    }
    
    if (reactFlowInstance) {
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2 });
      }, 300);
    }
  };
  
  const reorganizeNodePositions = (filteredNodes: Node[]): Node[] => {
    if (filteredNodes.length === 0) return [];
    
    const nodes = JSON.parse(JSON.stringify(filteredNodes));
    
    const xGap = 450; // Espacement horizontal entre les nœuds frères
    const yGap = 250; // Espacement vertical entre les niveaux
    const BASE_X = 400; // Position X de base
    
    // Collecter les informations sur les nœuds
    const nodeLevels = new Map<string, number>();
    const nodeChildren = new Map<string, string[]>();
    const nodeParent = new Map<string, string>();
    const isCritical = new Map<string, boolean>();
    
    // Identifier les relations parent-enfant à partir des edges
    edges.forEach(edge => {
      const sourceId = edge.source;
      const targetId = edge.target;
      
      if (!nodeChildren.has(sourceId)) {
        nodeChildren.set(sourceId, []);
      }
      nodeChildren.get(sourceId)?.push(targetId);
      nodeParent.set(targetId, sourceId);
      
      // Identifier les nœuds critiques (ceux avec plusieurs enfants)
      const children = nodeChildren.get(sourceId) || [];
      if (children.length > 1) {
        isCritical.set(sourceId, true);
      }
    });
    
    // Identifier aussi les nœuds critiques basés sur leur type
    nodes.forEach((node: Node) => {
      const nodeData = node.data || {};
      if (nodeData.isCritical || nodeData.type === 'yes-no' || nodeData.type === 'dropdown') {
        isCritical.set(node.id, true);
      }
    });
    
    // Identifier les nœuds racine (sans parent)
    const rootNodes: string[] = [];
    nodes.forEach((node: Node) => {
      if (!nodeParent.has(node.id)) {
        rootNodes.push(node.id);
      }
    });
    
    // Calculer le niveau de chaque nœud
    const calculateNodeLevel = (nodeId: string, level: number = 0) => {
      if (nodeLevels.has(nodeId) && nodeLevels.get(nodeId)! >= level) {
        return;
      }
      
      nodeLevels.set(nodeId, level);
      
      const children = nodeChildren.get(nodeId) || [];
      children.forEach(childId => {
        calculateNodeLevel(childId, level + 1);
      });
    };
    
    // Pour chaque nœud racine, calculer les niveaux
    rootNodes.forEach(rootId => {
      calculateNodeLevel(rootId);
    });
    
    // Fonction pour calculer la largeur d'une branche
    const calculateBranchWidth = (nodeId: string, processed = new Set<string>()): number => {
      if (processed.has(nodeId)) return 0;
      processed.add(nodeId);
      
      const childrenIds = nodeChildren.get(nodeId) || [];
      if (childrenIds.length === 0) return 1;
      
      // Un nœud est critique s'il a plusieurs enfants
      if (childrenIds.length > 1) {
        // Pour les nœuds critiques, calculer la somme des largeurs des enfants
        return childrenIds.reduce((sum, childId) => {
          return sum + calculateBranchWidth(childId, new Set(processed));
        }, 0);
      }
      
      // Pour les nœuds non critiques, utiliser seulement l'enfant direct
      return calculateBranchWidth(childrenIds[0], processed);
    };
    
    // Fonction récursive pour positionner les nœuds
    const positionNodes = (nodeId: string, x: number, y: number, levelWidths: Map<number, number>) => {
      const node = nodes.find((n: Node) => n.id === nodeId);
      if (!node) return;
      
      // Définir la position du nœud actuel
      node.position = { x, y };
      
      const childIds = nodeChildren.get(nodeId) || [];
      if (childIds.length === 0) return;
      
      const level = nodeLevels.get(nodeId) || 0;
      const nextLevel = level + 1;
      
      // Fonction locale pour déterminer si un nœud doit être ramifié
      const shouldBranchNodeHere = (id: string) => {
        // Vérifier si le nœud est critique (a plusieurs enfants)
        const children = nodeChildren.get(id) || [];
        if (children.length > 1) return true;
        
        // Vérifier si le nœud est du type qui doit être ramifié
        const node = nodes.find((n: Node) => n.id === id);
        if (!node) return false;
        
        const nodeData = node.data || {};
        return nodeData.isCritical || 
               nodeData.type === 'yes-no' || 
               nodeData.type === 'dropdown';
      };
      
      if (shouldBranchNodeHere(nodeId)) {
        // Pour les nœuds critiques, répartir les enfants horizontalement
        const childrenWidths = childIds.map(childId => 
          calculateBranchWidth(childId)
        );
        
        const totalWidth = childrenWidths.reduce((sum, width) => sum + width, 0) * xGap;
        const startX = x - (totalWidth / 2) + (xGap / 2);
        
        let currentX = startX;
        
        childIds.forEach((childId, index) => {
          const childWidth = childrenWidths[index];
          const childX = currentX + (childWidth * xGap) / 2;
          const childY = y + yGap;
          
          positionNodes(childId, childX, childY, levelWidths);
          
          currentX += childWidth * xGap;
        });
      } else {
        // Pour les nœuds non critiques, placer l'enfant directement en-dessous
        const childId = childIds[0];
        positionNodes(childId, x, y + yGap, levelWidths);
      }
    };
    
    // Placer chaque nœud racine avec un espacement horizontal
    const levelWidths = new Map<number, number>();
    rootNodes.forEach((rootId, index) => {
      const rootX = BASE_X + index * xGap * 2;
      positionNodes(rootId, rootX, 50, levelWidths);
    });
    
    // Vérifier et corriger les chevauchements
    const nodeBoundaries = new Map<string, {left: number, right: number, top: number, bottom: number}>();
    
    nodes.forEach((node: Node) => {
      const nodeWidth = node.style?.width ? Number(node.style.width) : 240;
      const nodeHeight = node.style?.height ? Number(node.style.height) : 160;
      
      const posX = typeof node.position.x === 'number' ? node.position.x : 0;
      const posY = typeof node.position.y === 'number' ? node.position.y : 0;
      
      nodeBoundaries.set(node.id, {
        left: posX - nodeWidth/2,
        right: posX + nodeWidth/2,
        top: posY - nodeHeight/2,
        bottom: posY + nodeHeight/2
      });
    });
    
    let corrections = true;
    let iterations = 0;
    const maxIterations = 10;
    
    while (corrections && iterations < maxIterations) {
      corrections = false;
      iterations++;
      
      nodes.forEach((nodeA: Node) => {
        nodes.forEach((nodeB: Node) => {
          if (nodeA.id !== nodeB.id) {
            const boundA = nodeBoundaries.get(nodeA.id)!;
            const boundB = nodeBoundaries.get(nodeB.id)!;
            
            if (boundA.left < boundB.right && boundA.right > boundB.left &&
                boundA.top < boundB.bottom && boundA.bottom > boundB.top) {
              
              const xOverlap = Math.min(boundA.right, boundB.right) - Math.max(boundA.left, boundB.left);
              const yOverlap = Math.min(boundA.bottom, boundB.bottom) - Math.max(boundA.top, boundB.top);
              
              if (xOverlap < yOverlap) {
                if (nodeA.position.x < nodeB.position.x) {
                  nodeA.position.x -= xOverlap / 2 + 10;
                  nodeB.position.x += xOverlap / 2 + 10;
                } else {
                  nodeA.position.x += xOverlap / 2 + 10;
                  nodeB.position.x -= xOverlap / 2 + 10;
                }
              } else {
                if (nodeA.position.y < nodeB.position.y) {
                  nodeA.position.y -= yOverlap / 2 + 10;
                  nodeB.position.y += yOverlap / 2 + 10;
                } else {
                  nodeA.position.y += yOverlap / 2 + 10;
                  nodeB.position.y -= yOverlap / 2 + 10;
                }
              }
              
              nodeBoundaries.set(nodeA.id, {
                left: nodeA.position.x - 120,
                right: nodeA.position.x + 120,
                top: nodeA.position.y - 80,
                bottom: nodeA.position.y + 80
              });
              
              nodeBoundaries.set(nodeB.id, {
                left: nodeB.position.x - 120,
                right: nodeB.position.x + 120,
                top: nodeB.position.y - 80,
                bottom: nodeB.position.y + 80
              });
              
              corrections = true;
            }
          }
        });
      });
    }
    
    return nodes.map((node: Node) => ({
      ...node,
      style: {
        ...node.style,
        transition: 'all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }
    }));
  };
  
  const handlePathSelect = (path: PathSegment[]) => {
    console.log("Path selected:", path);
    
    if (filterApplied) {
      return; // Ne rien faire si le filtre est appliqué
    }
    
    onPathSelect(path);
    
    if (path.length > 0) {
      const existingPathIndex = selectedPaths.findIndex(selectedPath => 
        selectedPath.length === path.length && 
        selectedPath.every((segment, i) => 
          segment.questionId === path[i].questionId && 
          segment.answer === path[i].answer
        )
      );
      
      let newSelectedPaths: PathSegment[][];
      
      if (existingPathIndex !== -1) {
        newSelectedPaths = selectedPaths.filter((_, index) => index !== existingPathIndex);
      } else {
        newSelectedPaths = [...selectedPaths, path];
      }
      
      const questionColors = new Map<string, string>();
      
      newSelectedPaths.forEach((selectedPath, pathIndex) => {
        const pathColor = HIGHLIGHT_COLORS[pathIndex % HIGHLIGHT_COLORS.length];
        
        selectedPath.forEach(segment => {
          if (!questionColors.has(segment.questionId) || selectedPath === path) {
            questionColors.set(segment.questionId, pathColor);
          }
        });
      });
      
      const updatedNodes = nodes.map(node => {
        const nodeQuestionId = node.data.questionId;
        const isInAnyPath = newSelectedPaths.some(selectedPath => 
          selectedPath.some(segment => segment.questionId === nodeQuestionId)
        );
        
        return {
        ...node,
        data: {
          ...node.data,
            selectedPaths: newSelectedPaths,
            isSelected: isInAnyPath,
            highlightColor: questionColors.get(nodeQuestionId) || node.data.highlightColor,
            secondaryPathIndices: isInAnyPath ? 
              newSelectedPaths
                .map((selectedPath, index) => selectedPath.some(segment => segment.questionId === nodeQuestionId) ? index : -1)
                .filter(index => index !== -1) : 
              [],
            primaryPathIndex: newSelectedPaths.findIndex(selectedPath => 
              selectedPath.some(segment => segment.questionId === nodeQuestionId)
            )
          }
        };
      });
      
      const updatedEdges = edges.map(edge => {
        const sourceId = edge.source.includes('-') ? edge.source.split('-').pop() : edge.source;
        const targetId = edge.target.includes('-') ? edge.target.split('-').pop() : edge.target;
        
        if (!sourceId || !targetId) return edge;
        
        const pathIndices: number[] = [];
        
        newSelectedPaths.forEach((selectedPath, pathIndex) => {
          for (let i = 0; i < selectedPath.length - 1; i++) {
            if (selectedPath[i].questionId === sourceId && selectedPath[i+1].questionId === targetId) {
              pathIndices.push(pathIndex);
              break;
            }
          }
        });
        
        const isInAnyPath = pathIndices.length > 0;
        const pathColor = isInAnyPath 
          ? HIGHLIGHT_COLORS[pathIndices[0] % HIGHLIGHT_COLORS.length]
          : undefined;
        
        return {
          ...edge,
          data: {
            ...(edge.data || {}),
            selectedPaths: newSelectedPaths,
            isSelected: isInAnyPath,
            pathColor: pathColor,
            pathIndices
          },
          style: {
            ...edge.style,
            stroke: pathColor || edge.style?.stroke || 'rgba(102, 126, 234, 0.7)',
            strokeWidth: isInAnyPath ? 3 : 2,
            opacity: isInAnyPath ? 1 : 0.7
          }
        };
      });
      
      setNodes(updatedNodes);
      setEdges(updatedEdges);
    }
    
    if (reactFlowInstance) {
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2 });
      }, 200);
    }
  };
  
  const createSinglePathTree = (survey: any, responses: any[], path: PathSegment[], pathIndex: number) => {
    if (!path || path.length === 0) return { nodes: [], edges: [] };
    
    // Filtrer d'abord les réponses pour ne garder que celles qui correspondent exactement à ce chemin
    const pathQuestionIds = path.map(segment => segment.questionId);
    
    const exactPathResponses = responses.filter(response => {
      // 1. Vérifier que toutes les questions du chemin sont présentes
      const hasAllPathQuestions = pathQuestionIds.every(qId =>
        response.answers.some((answer: { questionId: string }) => answer.questionId === qId)
      );
      
      if (!hasAllPathQuestions) return false;
      
      // 2. Vérifier qu'il n'y a pas d'autres questions que celles du chemin
      const hasOnlyPathQuestions = response.answers.every((answer: { questionId: string }) =>
        pathQuestionIds.includes(answer.questionId)
      );
      
      if (!hasOnlyPathQuestions) return false;
      
      // 3. Vérifier l'ordre des questions
      const responseQuestionIds = response.answers.map((a: { questionId: string }) => a.questionId);
      let currentPathIndex = 0;
      let lastFoundIndex = -1;
      
      for (let i = 0; i < responseQuestionIds.length; i++) {
        if (responseQuestionIds[i] === pathQuestionIds[currentPathIndex]) {
          if (lastFoundIndex !== -1) {
            const questionsBetween: Array<string> = responseQuestionIds.slice(lastFoundIndex + 1, i);
            if (questionsBetween.some((qId: string) => !pathQuestionIds.includes(qId))) {
              return false;
            }
          }
          
          lastFoundIndex = i;
          currentPathIndex++;
          
          if (currentPathIndex === pathQuestionIds.length) {
            break;
          }
        }
      }
      
      return currentPathIndex === pathQuestionIds.length;
    });
    
    console.log(`Chemin ${pathIndex + 1}: ${exactPathResponses.length}/${responses.length} réponses correspondent exactement`);
    
    // Construire l'arbre avec seulement les réponses exactes
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    const questionNodes: { [key: string]: Node } = {};
    
    // Nombre total de répondants pour ce chemin complet
    const totalPathRespondents = exactPathResponses.length;
    
    path.forEach((segment, index) => {
      const nodeId = `path${pathIndex}-${segment.questionId}`;
      
      const node: Node = {
        id: nodeId,
        type: 'questionNode',
        position: { x: index * 300, y: 0 },
        data: {
          questionId: segment.questionId,
          text: segment.questionText,
          answer: segment.answer,
          // Utiliser le même nombre (nombre total de personnes ayant suivi le chemin complet) pour tous les nœuds
          count: totalPathRespondents,
          totalCount: totalPathRespondents,
          pathIndex: pathIndex,
          highlightColor: HIGHLIGHT_COLORS[pathIndex % HIGHLIGHT_COLORS.length],
          isFilteredTree: true
        },
        style: { width: 240, height: 160 }
      };
      
      questionNodes[segment.questionId] = node;
      nodes.push(node);
      
      if (index > 0) {
        const prevSegment = path[index - 1];
        const sourceId = `path${pathIndex}-${prevSegment.questionId}`;
        
        const edge: Edge = {
          id: `path${pathIndex}-edge-${prevSegment.questionId}-${segment.questionId}`,
          source: sourceId,
          target: nodeId,
          type: 'smoothstep',
          animated: true,
          style: { 
            stroke: HIGHLIGHT_COLORS[pathIndex % HIGHLIGHT_COLORS.length],
            strokeWidth: 3
          },
          data: {
            text: segment.answer,
            count: totalPathRespondents,
            highlightColor: HIGHLIGHT_COLORS[pathIndex % HIGHLIGHT_COLORS.length]
          }
        };
        
        edges.push(edge);
      }
    });
    
    return { nodes, edges };
  };
  
  const getRespondentCountForSegment = (segment: PathSegment, responses: any[]): number => {
    return responses.filter(response => {
      const answer = response.answers.find((a: { questionId: string; answer: string }) => 
        a.questionId === segment.questionId
      );
      return answer && answer.answer === segment.answer;
    }).length;
  };
  
  const setReactFlowInstances = (instance: ReactFlowInstance, index: number) => {
    reactFlowInstancesRef.current[index] = instance;
  };
  
  const defaultViewport = { x: 0, y: 0, zoom: 0.8 };
  
  // Améliorons la fonction togglePathsPanel pour mieux gérer le recentrage des arbres
  const togglePathsPanel = () => {
    const wasOpen = pathsPanelOpen;
    setPathsPanelOpen(!pathsPanelOpen);
    
    // Donner le temps à ReactFlow de se redimensionner après la transition
    setTimeout(() => {
      // Si nous sommes en mode normal (pas filtré), centrer la vue principale
      if (reactFlowInstance) {
        reactFlowInstance.fitView({ padding: 0.2 });
      }
      
      // Si nous sommes en mode filtré avec plusieurs arbres, recentrer chaque arbre
      if (filterApplied && multipleTreeNodes.length > 0) {
        reactFlowInstancesRef.current.forEach((instance, idx) => {
          if (instance) {
            console.log(`Recentrage de l'arbre ${idx}`);
            instance.fitView({ padding: 0.3 });
          }
        });
      }
      
      // Si nous venons juste de fermer le panneau, donnons plus d'espace au flow principal
      if (wasOpen && reactFlowInstance) {
        console.log("Recentrage après fermeture du panneau");
        reactFlowInstance.fitView({ padding: 0.1 });
      }
    }, 400);
  };
  
  const handleFilteredPathClick = (pathIndex: number) => {
    console.log('=== Chemins filtrés ===');
    console.log('Index du chemin cliqué:', pathIndex);
    console.log('Chemin complet:', filteredPaths[pathIndex]);
    console.log('Nombre total de chemins filtrés:', filteredPaths.length);
    console.log('=====================');
    
    if (reactFlowInstancesRef.current[pathIndex]) {
      reactFlowInstancesRef.current[pathIndex].fitView({
        padding: 0.2,
        duration: 800
      });
    }
  };
  
  // New function that counts respondents who followed exactly a specific path
  const getRespondentCountForPath = (path: PathSegment[], responses: any[]): number => {
    // Extraire les IDs de questions du chemin
    const questionIds = path.map(segment => segment.questionId);
    
    // Filtrer les réponses pour ne garder que celles qui :
    // 1. Ont répondu à toutes les questions du chemin
    // 2. N'ont répondu qu'aux questions du chemin
    // 3. Ont les questions dans le bon ordre
    const filteredResponses = responses.filter(response => {
      // Vérifier que toutes les questions du chemin sont présentes
      const hasAllSelectedQuestions = questionIds.every(qId =>
        response.answers.some((answer: { questionId: string }) => answer.questionId === qId)
      );

      // Vérifier qu'il n'y a pas d'autres questions
      const hasOnlySelectedQuestions = response.answers.every((answer: { questionId: string }) =>
        questionIds.includes(answer.questionId)
      );

      // Vérifier que les questions sont dans le bon ordre
      const responseQuestionIds = response.answers.map((a: { questionId: string }) => a.questionId);
      let currentIndex = 0;
      let lastFoundIndex = -1;
      
      for (let i = 0; i < responseQuestionIds.length; i++) {
        if (responseQuestionIds[i] === questionIds[currentIndex]) {
          // Vérifier qu'il n'y a pas d'autres questions entre la dernière trouvée et celle-ci
          if (lastFoundIndex !== -1) {
            const questionsBetween: Array<string> = responseQuestionIds.slice(lastFoundIndex + 1, i);
            if (questionsBetween.some((qId: string) => !questionIds.includes(qId))) {
              return false; // Il y a des questions non autorisées entre les questions du chemin
            }
          }
          
          lastFoundIndex = i;
          currentIndex++;
          if (currentIndex === questionIds.length) {
            return true; // Toutes les questions du chemin ont été trouvées dans l'ordre
          }
        }
      }
      return false;
    });

    // Log détaillé pour le débogage
    console.log("=== Nombre de répondants pour le chemin ===");
    console.log("Questions du chemin:", questionIds);
    console.log("Nombre de réponses filtrées:", filteredResponses.length);
    console.log("============================");
    
    return filteredResponses.length;
  };
  
  return (
    <Paper 
      elevation={2}
      sx={{ 
        width: '100%', 
        height: '100%', 
        p: 2, 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(220, 230, 250, 0.2) 1px, transparent 0)',
        backgroundSize: '25px 25px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
        borderRadius: '2px',
        border: '1px solid rgba(102, 126, 234, 0.15)',
        mb: 4
      }}
    >
      <Typography variant="h6" component="h2" gutterBottom sx={{ 
        fontWeight: '600', 
        color: '#1e3a8a',
        letterSpacing: '0.2px'
      }}>
        Response Path Analysis
      </Typography>
      
      <Box sx={{ 
        display: 'flex',
        flexDirection: 'row',
        gap: 2,
        height: 'calc(100% - 60px)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <Box 
          className="react-flow-container"
          sx={{ 
            flex: pathsPanelOpen ? 4 : 1,
            flexGrow: pathsPanelOpen ? 4 : 1,
            flexBasis: 0,
            border: '1px solid rgba(102, 126, 234, 0.2)', 
            borderRadius: '12px',
            position: 'relative',
            minHeight: '500px',
            transition: 'all 0.4s ease-in-out, flex 0.4s ease-in-out, flex-grow 0.4s ease-in-out',
            overflowY: filterApplied && multipleTreeNodes.length > 0 ? 'auto' : 'hidden',
            background: 'rgba(252, 253, 255, 0.7)',
            backdropFilter: 'blur(8px)',
            boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.03)'
          }}
        >
        {loading ? (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100%' 
          }}>
            <CircularProgress />
          </Box>
        ) : responses.length > 0 ? (
            filterApplied && multipleTreeNodes.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, p: 2 }}>
                {multipleTreeNodes.map((pathNodes, index) => (
                  <Box 
                    key={`path-tree-${index}`} 
                    sx={{ 
                      border: `2px solid ${HIGHLIGHT_COLORS[index % HIGHLIGHT_COLORS.length]}`,
                      borderRadius: '8px',
                      height: '400px',
                      mb: 2,
                      position: 'relative',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: 'transform 0.2s ease-in-out',
                      '&:hover': {
                        transform: 'scale(1.02)',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
                      }
                    }}
                    onClick={() => handleFilteredPathClick(index)}
                  >
                    <Typography 
                      variant="subtitle2" 
                      sx={{ 
                        p: 1, 
                        backgroundColor: HIGHLIGHT_COLORS[index % HIGHLIGHT_COLORS.length],
                        color: 'white',
                        borderTopLeftRadius: '6px',
                        borderTopRightRadius: '6px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <Box>Path {String.fromCharCode(65 + index)}</Box>
                    </Typography>
                    <ReactFlow
                      key={`flow-${index}`}
                      nodes={pathNodes}
                      edges={multipleTreeEdges[index]}
                      nodeTypes={{ questionNode: QuestionNode }}
                      edgeTypes={{ default: LinkComponent }}
                      defaultViewport={defaultViewport}
                      minZoom={0.1}
                      maxZoom={2.5}
                      fitView
                      fitViewOptions={{ padding: 0.3 }}
                      onInit={(instance) => setReactFlowInstances(instance, index)}
                      zoomOnScroll={false}
                      zoomOnPinch={true}
                      panOnScroll={true}
                      nodesDraggable={false}
                      elementsSelectable={false}
                    >
                      <Controls 
                        position="top-right" 
                        showInteractive={true} 
                        fitViewOptions={{ padding: 0.3 }}
                      />
                      <Background 
                        color="#f0f4ff" 
                        gap={20} 
                        size={1.5}
                      />
                    </ReactFlow>
                  </Box>
                ))}
              </Box>
            ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodeClick={onNodeClick}
            nodeTypes={{ questionNode: QuestionNode }}
            edgeTypes={{ default: LinkComponent }}
            defaultViewport={defaultViewport}
              minZoom={0.1}
              maxZoom={2.5}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            onInit={setReactFlowInstance}
            zoomOnScroll={false}
            zoomOnPinch={true}
            panOnScroll={true}
            nodesDraggable={false}
                elementsSelectable={!filterApplied}
          >
            <Controls 
              position="top-right" 
              showInteractive={true} 
              fitViewOptions={{ padding: 0.3 }}
            />
            <Background 
              color="#f0f4ff" 
              gap={20} 
              size={1.5}
            />
          </ReactFlow>
            )
        ) : (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100%' 
          }}>
            <Typography variant="body2">
              No paths available
            </Typography>
          </Box>
        )}
      </Box>
      
        <Box 
          sx={{ 
            flex: pathsPanelOpen ? 0.7 : 0,
            minWidth: pathsPanelOpen ? '250px' : 0,
            maxWidth: pathsPanelOpen ? '350px' : 0,
            width: pathsPanelOpen ? 'auto' : 0,
            display: 'flex',
            flexDirection: 'column',
            border: pathsPanelOpen ? '1px solid rgba(102, 126, 234, 0.2)' : 'none',
            borderRadius: '12px',
            p: pathsPanelOpen ? 2 : 0,
            pl: pathsPanelOpen ? 2 : 0,
            height: '100%',
            maxHeight: 'calc(100vh - 120px)',
            overflow: 'hidden',
            background: pathsPanelOpen ? 'rgba(252, 253, 255, 0.7)' : 'transparent',
            backdropFilter: pathsPanelOpen ? 'blur(8px)' : 'none',
            opacity: pathsPanelOpen ? 1 : 0,
            transform: pathsPanelOpen ? 'translateX(0)' : 'translateX(100%)',
            transition: 'all 0.4s ease-in-out, width 0.4s ease-in-out, min-width 0.4s ease-in-out, max-width 0.4s ease-in-out, transform 0.4s ease-in-out',
            position: 'relative',
            visibility: pathsPanelOpen ? 'visible' : 'hidden',
            pointerEvents: pathsPanelOpen ? 'auto' : 'none'
          }}
          className="complete-paths-panel"
        >
          {pathsPanelOpen && (
            <>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 1
              }}>
                <Typography variant="subtitle2" sx={{ 
                  fontWeight: 600, 
                  color: '#1e3a8a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                  <SplitscreenIcon fontSize="small" sx={{ color: '#667eea' }} />
                  {filterApplied ? 'Filtered Paths' : 'Complete Paths'}
          </Typography>
                
                <Button
                  size="small"
                  onClick={togglePathsPanel}
                  sx={{
                    minWidth: 'auto',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    p: 0,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    '&:hover': {
                      background: 'rgba(102, 126, 234, 0.1)',
                    }
                  }}
                >
                  <ChevronRightIcon fontSize="small" sx={{ color: '#667eea' }} />
                </Button>
              </Box>
          
          {allPaths.length > 0 ? (
            <Box 
              ref={scrollContainerRef}
              className={`path-list-container ${filterApplied ? 'filtering-active' : ''}`}
              sx={{ 
                overflowY: 'auto',
                overflowX: 'hidden',
                flex: 1,
                height: 'calc(100% - 30px)',
                    position: 'relative',
                '&::-webkit-scrollbar': {
                  width: '8px',
                },
                '&::-webkit-scrollbar-track': {
                  background: '#f1f1f1',
                  borderRadius: '4px',
                },
                '&::-webkit-scrollbar-thumb': {
                      background: '#667eea99',
                  borderRadius: '4px',
                },
                '&::-webkit-scrollbar-thumb:hover': {
                      background: '#667eea',
                }
              }}
            >
              {selectedPaths.length > 0 && (
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Button
                    variant={filterApplied ? "contained" : "outlined"}
                    color={filterApplied ? "primary" : "inherit"}
                    size="small"
                    onClick={toggleFilter}
                        sx={{ 
                          width: '100%',
                          borderRadius: '10px',
                          textTransform: 'none',
                          fontWeight: 600,
                          boxShadow: filterApplied ? '0 4px 12px rgba(102, 126, 234, 0.25)' : 'none',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        {filterApplied ? "Show all paths" : "Filter selected paths"}
                  </Button>
                </Box>
              )}
              
              {(filterApplied ? filteredPaths : allPaths).map((pathItem, index) => {
                const isSelected = selectedPaths.some(p => 
                  p.length === pathItem.path.length && 
                  p.every((segment, i) => 
                    segment.questionId === pathItem.path[i].questionId && 
                    segment.answer === pathItem.path[i].answer
                  )
                );
                
                const selectedPathIndex = selectedPaths.findIndex(p => 
                  p.length === pathItem.path.length && 
                  p.every((segment, i) => 
                    segment.questionId === pathItem.path[i].questionId && 
                    segment.answer === pathItem.path[i].answer
                  )
                );
                
                    const pathColorIndex = selectedPathIndex !== -1 
                      ? selectedPathIndex 
                      : selectedPaths.length % HIGHLIGHT_COLORS.length;
                    
                    const pathColor = selectedPathIndex !== -1 
                  ? HIGHLIGHT_COLORS[selectedPathIndex % HIGHLIGHT_COLORS.length] 
                      : 'rgba(102, 126, 234, 0.7)';
                
                const backgroundColor = isSelected 
                      ? `${HIGHLIGHT_COLORS[selectedPathIndex % HIGHLIGHT_COLORS.length]}10`
                  : 'background.paper';
                
                return (
                <Box 
                  key={index}
                  sx={{
                        p: 1.5,
                        mb: 1.5,
                    border: '1px solid',
                        borderColor: isSelected ? pathColor : 'rgba(102, 126, 234, 0.1)',
                        borderRadius: '12px',
                      backgroundColor: backgroundColor,
                    cursor: 'pointer',
                        transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                    '&:hover': {
                        backgroundColor: isSelected 
                            ? `${HIGHLIGHT_COLORS[pathColorIndex % HIGHLIGHT_COLORS.length]}20`
                            : 'rgba(102, 126, 234, 0.04)',
                          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.06)',
                          transform: 'scale(1.02)'
                        },
                        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        boxShadow: isSelected 
                          ? `0 8px 20px -5px ${HIGHLIGHT_COLORS[selectedPathIndex % HIGHLIGHT_COLORS.length]}20` 
                          : '0 2px 8px rgba(0, 0, 0, 0.02)'
                    }}
                    onClick={() => handlePathSelect(pathItem.path)}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box 
                          sx={{ 
                            width: 12, 
                            height: 12, 
                            borderRadius: '50%', 
                            backgroundColor: isSelected 
                              ? HIGHLIGHT_COLORS[selectedPathIndex % HIGHLIGHT_COLORS.length]
                              : 'rgba(102, 126, 234, 0.4)',
                            boxShadow: isSelected 
                              ? `0 0 8px ${HIGHLIGHT_COLORS[selectedPathIndex % HIGHLIGHT_COLORS.length]}60`
                              : 'none',
                            border: '2px solid white'
                          }} 
                        />
                      <Typography variant="body2" fontWeight="bold" color={isSelected ? pathColor : 'text.primary'}>
                    {pathItem.name} ({pathItem.path.length} steps)
                  </Typography>
                    </Box>
                    
                  <Box sx={{ mt: 1 }}>
                    {pathItem.path.map((segment, segIdx) => (
                          <Box key={segIdx} sx={{ 
                            display: 'flex', 
                            mb: 0.5, 
                            fontSize: '0.8rem',
                            p: 0.5,
                            borderRadius: '4px',
                            backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.7)' : 'transparent'
                          }}>
                            <Typography variant="caption" sx={{ 
                              mr: 1,
                              fontWeight: 'bold', 
                              color: isSelected ? pathColor : 'text.secondary'
                            }}>
                          {segIdx + 1}.
        </Typography>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '100%'
                          }}
                        >
                            {segment.questionText.substring(0, 40)}
                            {segment.questionText.length > 40 ? '...' : ''}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
                );
              })}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No paths available
            </Typography>
              )}
            </>
          )}
        </Box>
        
        {/* Bouton pour ouvrir le panneau quand il est fermé */}
        {!pathsPanelOpen && (
          <Button
            onClick={togglePathsPanel}
            sx={{
              position: 'absolute',
              right: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              minWidth: 'auto',
              width: '28px',
              height: '80px',
              borderRadius: '8px 0 0 8px',
              backgroundColor: 'rgba(102, 126, 234, 0.1)',
              color: '#667eea',
              '&:hover': {
                backgroundColor: 'rgba(102, 126, 234, 0.2)',
              },
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 10
            }}
          >
            <ChevronLeftIcon />
          </Button>
        )}
      </Box>
      <style>{styles}</style>
      <style>{hierarchyStyles}</style>
      <style>{scrollStyles}</style>
      <style>{linkStyles}</style>
      <style>{pulseCss}</style>
      <style>{reactFlowCustomStyles}</style>
      <style>{panelTransitionStyles}</style>
    </Paper>
  );
};