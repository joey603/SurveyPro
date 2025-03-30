import React, { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { Paper, Typography, Box, CircularProgress, Button } from '@mui/material';
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
  useReactFlow
} from 'reactflow';
import 'reactflow/dist/style.css';
import { FilterAltOff as FilterAltOffIcon, Clear as ClearIcon } from '@mui/icons-material';

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

// Composant personnalisé pour les nœuds de question avec mise en évidence améliorée
const QuestionNode = ({ data }: { data: any }) => {
  // Au lieu de chercher uniquement l'index du premier parcours, trouvons tous les parcours
  const pathIndices: number[] = [];
  
  if (data.selectedPaths && data.selectedPaths.length > 0) {
    data.selectedPaths.forEach((path: PathSegment[], index: number) => {
      if (path.some((segment: PathSegment) => segment.questionId === data.questionId)) {
        pathIndices.push(index);
      }
    });
  }
  
  const isInSelectedPath = pathIndices.length > 0;
  const primaryPathIndex = pathIndices.length > 0 ? pathIndices[0] : -1;
  const highlightColor = isInSelectedPath 
    ? HIGHLIGHT_COLORS[primaryPathIndex % HIGHLIGHT_COLORS.length] 
    : 'rgba(102, 126, 234, 0.2)';

  // Calculer la taille du cercle basée sur le nombre de répondants avec un min et max
  const minSize = 26;
  const maxSize = 50;
  const size = Math.min(maxSize, Math.max(minSize, 26 + (data.count * 1.5)));
  
  // Générer les positions des indicateurs secondaires autour du contour
  const getSecondaryIndicatorPositions = (count: number) => {
    // Toujours garder le point principal en haut à droite
    if (count <= 1) return [];
    
    // Pour les autres points, calculer les positions autour du contour
    const positions = [];
    
    // Calcul du rayon du contour en fonction de la taille du nœud
    // Nous utilisons une approximation pour un rectangle moyen
    const nodeWidth = 240; // Largeur moyenne du nœud
    const nodeHeight = 160; // Hauteur moyenne du nœud
    
    // Définir les positions pour chaque côté du contour
    // Commencer par la droite en descendant, puis en bas de droite à gauche,
    // puis à gauche en remontant, et enfin en haut de gauche à droite
    
    // Nombre maximum d'indicateurs par côté
    const maxPerSide = Math.ceil(count / 4);
    
    // Côté droit (en descendant)
    for (let i = 0; i < Math.min(maxPerSide, count - 1); i++) {
      positions.push({
        right: '-8px',
        top: `${30 + i * 24}px`, // Commencer après le point principal
      });
    }
    
    // Côté bas (de droite à gauche)
    if (count > maxPerSide) {
      const bottomCount = Math.min(maxPerSide, count - 1 - maxPerSide);
      for (let i = 0; i < bottomCount; i++) {
        positions.push({
          bottom: '-8px',
          right: `${30 + i * 24}px`,
        });
      }
    }
    
    // Côté gauche (en remontant)
    if (count > maxPerSide * 2) {
      const leftCount = Math.min(maxPerSide, count - 1 - maxPerSide * 2);
      for (let i = 0; i < leftCount; i++) {
        positions.push({
          left: '-8px',
          bottom: `${30 + i * 24}px`,
        });
      }
    }
    
    // Côté haut (de gauche à droite)
    if (count > maxPerSide * 3) {
      const topCount = Math.min(maxPerSide, count - 1 - maxPerSide * 3);
      for (let i = 0; i < topCount; i++) {
        positions.push({
          top: '-8px',
          left: `${30 + i * 24}px`,
        });
      }
    }
    
    return positions;
  };
  
  // Obtenir les positions calculées
  const secondaryIndicatorPositions = getSecondaryIndicatorPositions(pathIndices.length);
  
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
      transition: 'all 0.4s ease'
    }}>
      {/* Conteneur principal avec couleur dynamique */}
      <div style={{
        position: 'absolute',
        top: '5px',
        left: '5px',
        right: '5px',
        bottom: '5px',
        backgroundColor: isInSelectedPath ? `${highlightColor}20` : 'rgba(255, 255, 255, 0.95)',
        borderRadius: '12px',
        border: `${isInSelectedPath ? 4 : 2}px solid ${isInSelectedPath ? highlightColor : 'rgba(102, 126, 234, 0.2)'}`,
        boxShadow: isInSelectedPath 
          ? `0 0 15px 5px ${highlightColor}40`
          : '0 2px 8px rgba(0, 0, 0, 0.05)',
        transition: 'all 0.3s ease',
        zIndex: 1,
        animation: isInSelectedPath ? 'pulse 2s infinite' : 'none'
      }} />

      {/* Texte de la question */}
      <div
        style={{
          width: '100%',
          textAlign: 'center',
          fontSize: isInSelectedPath ? '15px' : '14px',
          lineHeight: '1.4',
          fontWeight: isInSelectedPath ? '600' : 'normal',
          color: isInSelectedPath ? '#1565c0' : '#333333',
          padding: '8px 10px',
          borderRadius: '8px',
          whiteSpace: 'normal',
          overflowWrap: 'break-word',
          wordBreak: 'break-word',
          maxHeight: '90px',
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: '10px',
          zIndex: 2,
          letterSpacing: '0.2px'
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
          backgroundColor: isInSelectedPath 
            ? highlightColor 
            : "rgba(102, 126, 234, 0.7)",
          border: `2px solid ${isInSelectedPath ? "#ffffff" : "rgba(255, 255, 255, 0.8)"}`,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontWeight: 'bold',
          color: '#ffffff',
          fontSize: isInSelectedPath ? '14px' : '12px',
          boxShadow: isInSelectedPath ? `0 4px 8px ${highlightColor}40` : '0 2px 6px rgba(0, 0, 0, 0.15)',
          transition: 'all 0.3s ease',
          zIndex: 3,
          position: 'relative'
        }}
      >
        {data.count}
        </div>
      
      {/* Handles - couleur dynamique */}
      <Handle 
        type="target" 
        position={Position.Top} 
        style={{ 
          background: isInSelectedPath ? highlightColor : '#667eea',
          width: isInSelectedPath ? '10px' : '8px',
          height: isInSelectedPath ? '10px' : '8px',
          top: '-5px',
          borderRadius: '50%',
          border: '2px solid white',
          zIndex: 10
        }} 
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        style={{ 
          background: isInSelectedPath ? highlightColor : '#667eea',
          width: isInSelectedPath ? '10px' : '8px',
          height: isInSelectedPath ? '10px' : '8px',
          bottom: '-5px',
          borderRadius: '50%',
          border: '2px solid white',
          zIndex: 10
        }} 
      />

      {/* Indicateur visuel principal avec couleur dynamique */}
      {isInSelectedPath && (
        <div style={{
          position: 'absolute',
          top: '-8px',
          right: '-8px',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: highlightColor,
          border: '2px solid white',
          zIndex: 20,
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }} />
      )}
      
      {/* Indicateurs pour les parcours multiples autour du contour */}
      {pathIndices.length > 1 && (
        <>
          {secondaryIndicatorPositions.map((pos, idx) => (
            <div 
              key={idx}
              style={{
                position: 'absolute',
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                backgroundColor: HIGHLIGHT_COLORS[pathIndices[idx + 1] % HIGHLIGHT_COLORS.length],
                border: '2px solid white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                zIndex: 19,
                ...pos // Appliquer la position calculée
              }} 
            />
          ))}
        </>
      )}
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
  // Détection des liens appartenant aux parcours sélectionnés (code existant)
  let pathIndex = -1;
  
  if (data && data.selectedPaths && data.selectedPaths.length > 0) {
    // Extraire tous les identifiants possibles - complets, partiels, et composants individuels
    const extractAllIds = (id: string) => {
      const parts = id.split('-');
      const result = [id]; // ID complet
      
      // Ajouter les segments individuels
      for (let i = 0; i < parts.length; i++) {
        if (parts[i]) result.push(parts[i]);
      }
      
      // Ajouter les combinaisons de segments qui pourraient être des IDs
      if (parts.length >= 2) {
        const lastSegment = parts[parts.length - 1];
        const secondLastSegment = parts[parts.length - 2];
        
        if (lastSegment) result.push(lastSegment); // Dernier segment
        if (secondLastSegment) result.push(secondLastSegment); // Avant-dernier segment
        if (lastSegment && secondLastSegment) {
          result.push(`${secondLastSegment}-${lastSegment}`); // Combinaison des deux derniers
        }
      }
      
      // Retourner directement le tableau sans utiliser filter
      return result as string[]; // Nous savons que tous les éléments sont des strings
    };
    
    const sourceIds = extractAllIds(source);
    const targetIds = extractAllIds(target);
    
    // Parcourir tous les chemins sélectionnés
    outerLoop: for (let i = 0; i < data.selectedPaths.length; i++) {
      const path = data.selectedPaths[i];
      
      // Vérification 1: Segments directement consécutifs dans le parcours
      for (let j = 0; j < path.length - 1; j++) {
        for (const srcId of sourceIds) {
          for (const tgtId of targetIds) {
            if (path[j].questionId === srcId && path[j+1].questionId === tgtId) {
              pathIndex = i;
              break outerLoop;
            }
          }
        }
      }
      
      // Vérification 2: Trouver toutes les questions dans le parcours
      const questionsInPath = path.map((segment: PathSegment) => segment.questionId);
      
      // Vérifier si source et cible sont toutes deux dans le parcours
      let sourceInPath = false;
      let sourceIndex = -1;
      let targetInPath = false;
      let targetIndex = -1;
      
      // Trouver tous les indices possibles pour source et cible
      for (let j = 0; j < questionsInPath.length; j++) {
        for (const srcId of sourceIds) {
          if (questionsInPath[j] === srcId || questionsInPath[j].includes(srcId)) {
            sourceInPath = true;
            if (sourceIndex === -1 || j < sourceIndex) sourceIndex = j;
          }
        }
        
        for (const tgtId of targetIds) {
          if (questionsInPath[j] === tgtId || questionsInPath[j].includes(tgtId)) {
            targetInPath = true;
            if (targetIndex === -1 || j < targetIndex) targetIndex = j;
          }
        }
      }
      
      // Si les deux sont dans le parcours, vérifier l'ordre
      if (sourceInPath && targetInPath) {
        // Cas 1: Source vient avant target directement dans le parcours
        if (sourceIndex < targetIndex) {
          pathIndex = i;
          break outerLoop;
        }
        
        // Cas 2: Connexion entre branches parallèles
        // Pour les liens latéraux entre enfants d'une même question critique
        // ou autres cas spéciaux où l'ordre n'est pas strictement séquentiel
        if (Math.abs(sourceIndex - targetIndex) <= 2) { // Tolérance de 2 positions
          pathIndex = i;
          break outerLoop;
        }
      }
    }
  }
  
  const isInSelectedPath = pathIndex >= 0;
  const highlightColor = isInSelectedPath 
    ? HIGHLIGHT_COLORS[pathIndex % HIGHLIGHT_COLORS.length] 
    : '#667eea';

  // Style avec couleur dynamique
  const customStyle = {
    stroke: isInSelectedPath ? highlightColor : "#667eea", 
    strokeWidth: isInSelectedPath ? 6 : 2.5,
    strokeDasharray: isInSelectedPath ? "" : "6 4",
    filter: isInSelectedPath ? `drop-shadow(0 0 8px ${highlightColor}80)` : 'none',
    transition: 'all 0.4s ease',
    strokeLinecap: "round" as const,
    opacity: isInSelectedPath ? 1 : 0.8,
  };

  if (!sourceX || !sourceY || !targetX || !targetY) {
    return null;
  }

  // Calculer le chemin entre les points source et cible
  const verticalDistance = Math.abs(targetY - sourceY);
  const curveIntensity = Math.min(100, verticalDistance / 2);
  
  const path = `
    M${sourceX},${sourceY} 
    C${sourceX},${sourceY + curveIntensity} 
    ${targetX},${targetY - curveIntensity} 
    ${targetX},${targetY}
  `;

  return (
    <>
      {/* Effet de halo pour les liens sélectionnés */}
      {isInSelectedPath && (
        <path
          id={`${id}-glow`}
          style={{
            stroke: `${highlightColor}40`,
            strokeWidth: 8,
            fillOpacity: 0,
            strokeLinecap: "round" as const,
          }}
          className="react-flow__edge-path"
          d={path}
        />
      )}
      
      {/* Chemin principal avec effet d'atténuation */}
      <path
        id={id}
        style={customStyle}
        className={`react-flow__edge-path ${isInSelectedPath ? 'highlight-path' : ''}`}
        d={path}
        markerEnd={`url(#${id}-arrowhead)`}
      />
      
      {/* Définition du marqueur de flèche */}
      <defs>
        <marker
          id={`${id}-arrowhead`}
          viewBox="0 0 10 10"
          refX="5"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={isInSelectedPath ? highlightColor : "#667eea"} />
        </marker>
        
        {/* Masque pour créer l'effet d'atténuation */}
        {isInSelectedPath && (
          <mask id={`${id}-mask`}>
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Les cercles transparents permettront d'atténuer les parties des liens qui traversent des rectangles */}
            {data?.nodesPositions?.map((node: any, index: number) => (
              node.id !== source && node.id !== target ? 
                <rect 
                  key={index}
                  x={node.x - (node.width/2) - 5}
                  y={node.y - (node.height/2) - 5}
                  width={node.width + 10}
                  height={node.height + 10}
                  rx="10"
                  ry="10"
                  fill="black"
                  opacity="0.7"
                /> 
                : null
            ))}
          </mask>
        )}
      </defs>
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
  
  /* Éviter les saccades pendant la transition des éléments filtrés */
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
  }
  
  .highlight-path {
    mask: url(var(--path-mask)) !important;
  }
  
  /* Effet de fondu lorsqu'un lien traverse un nœud qui n'est pas sa source ou sa cible */
  .react-flow__edge:not(.selected) .react-flow__edge-path {
    transition: stroke-opacity 0.3s ease;
  }
  
  /* Crée un effet d'atténuation lorsqu'un lien passe près d'un nœud */
  .react-flow__node:hover ~ .react-flow__edge:not(.selected) .react-flow__edge-path {
    stroke-opacity: 0.3;
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
  
  // Ajouter une référence au conteneur de défilement
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef<number>(0);
  const containerHeightRef = useRef<number>(0);
  
  // Fonction pour générer un nom alphabétique basé sur un index
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
  
  // Fonction pour créer et attribuer des groupes d'analyse
  const assignAnalysisGroups = (paths: {name: string, path: PathSegment[]}[]): {name: string, path: PathSegment[], group: string}[] => {
    const groupedPaths: {name: string, path: PathSegment[], group: string}[] = [];
    const groups: {[key: string]: {name: string, paths: number[]}} = {};
    
    // Regrouper les parcours en fonction de leurs premières réponses
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
    
    // Créer les groupes d'analyse
    let groupIndex = 0;
    Object.entries(pathsByFirstQuestion).forEach(([key, pathIndices]) => {
      const groupName = `Group ${String.fromCharCode(65 + groupIndex)}`;
      const groupId = `group-${groupIndex}`;
      
      groups[groupId] = {
        name: groupName,
        paths: pathIndices
      };
      
      // Assigner le groupe à chaque parcours
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
  
  // Fonction pour extraire tous les chemins complets de l'arbre
  const extractAllPaths = (survey: any, responses: any[]) => {
    // Créer la Map de questions
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
    
    // Créer la structure de données pour suivre les nœuds
    const nodeMap = new Map<string, any>();
    nodeMap.set('root', { count: responses.length, children: new Map() });
    
    // Parcourir chaque réponse pour construire l'arbre
    responses.forEach(response => {
      let currentNodeId = 'root';
      let yOffset = 0;
      
      // Traiter chaque réponse dans l'ordre
      if (response.answers && Array.isArray(response.answers)) {
      response.answers.forEach((answer: any, index: number) => {
        const question = questionsMap.get(answer.questionId);
        if (!question) return;
        
        const answerText = answer.answer || 'Sans réponse';
        const childNodeId = `${currentNodeId}-${answer.questionId}-${answerText}`;
        
        // Vérifier que le nœud parent existe dans la carte
          if (!nodeMap.has(currentNodeId)) {
            console.log(`Création du nœud parent manquant: ${currentNodeId}`);
            nodeMap.set(currentNodeId, { count: 1, children: new Map() });
          }
          
        const currentNode = nodeMap.get(currentNodeId);
        if (!currentNode) {
          return;
        }
        
        // Initialiser children si nécessaire
        if (!currentNode.children) {
          currentNode.children = new Map();
        }
        
        // Vérifier si ce nœud existe déjà dans l'arbre
        if (!currentNode.children.has(childNodeId)) {
          // Créer un nouveau nœud
          currentNode.children.set(childNodeId, {
            count: 1,
            children: new Map()
          });
        } else {
          // Incrémenter le compteur du nœud existant
          const childNode = currentNode.children.get(childNodeId);
          childNode.count++;
        }
        
        // Passer au nœud enfant pour la prochaine réponse
        currentNodeId = childNodeId;
      });
      }
    });
    
    const completePaths: {name: string, path: PathSegment[]}[] = [];
    
    // Fonction récursive pour parcourir l'arbre et collecter les chemins
    const traversePath = (nodeId: string, currentPath: PathSegment[], depth: number = 0) => {
      const node = nodeMap.get(nodeId);
      
      if (!node || !node.children || node.children.size === 0) {
        // C'est un nœud terminal, on sauvegarde le chemin complet
        if (currentPath.length > 0) {
          completePaths.push({
            name: `Path ${getAlphabeticName(completePaths.length)}`,
            path: [...currentPath]
          });
        }
        return;
      }
      
      // Pour chaque enfant, continuer à construire le chemin
      node.children.forEach((childNode: any, childId: string) => {
        // Extraire questionId et answer du format de l'ID (parentId-questionId-answer)
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
            
            // Ajouter ce segment au chemin et continuer à traverser
            traversePath(childId, [...currentPath, pathSegment], depth + 1);
          }
        }
      });
    };
    
    // Commencer la traversée à partir de la racine
    traversePath('root', []);
    
    // Assigner des groupes d'analyse aux parcours et retourner le résultat correctement typé
    return assignAnalysisGroups(completePaths);
  };
  
  // Définition des types de nœuds personnalisés
  const nodeTypes: NodeTypes = {
    questionNode: QuestionNode,
  };
  
  // Fonction pour convertir l'arbre des chemins en nœuds et arêtes pour ReactFlow
  const processPathTree = (survey: any, responses: any[]) => {
    if (!survey || responses.length === 0) {
      return { nodes: [], edges: [], paths: [] };
    }
    
    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];
    
    // Créer un Map pour stocker les questions
    const questionMap = new Map<string, any>();
    const questionsArray: any[] = [];
    
    // Si c'est un sondage dynamique, collecter les nœuds
    if (survey.isDynamic && survey.nodes) {
      survey.nodes.forEach((node: any) => {
        if (node.id !== 'root' && node.data) {
          questionMap.set(node.id, {
            id: node.id,
            text: node.data.text || node.data.label || 'Question',
            type: node.data.questionType || node.data.type || 'text',
            count: 0,
            children: [] // Pour stocker les IDs des questions enfants
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
      
      // Détecter les questions critiques (qui ont plusieurs enfants)
      if (survey.edges) {
        // Construire une map des relations parent-enfant
        const parentChildMap = new Map<string, string[]>();
        
        survey.edges.forEach((edge: any) => {
          if (!parentChildMap.has(edge.source)) {
            parentChildMap.set(edge.source, []);
          }
          parentChildMap.get(edge.source)?.push(edge.target);
          
          // Ajouter cette relation à notre questionMap
          const question = questionMap.get(edge.source);
          if (question) {
            question.children.push(edge.target);
          }
        });
        
        // Marquer les questions critiques (qui ont plus d'un enfant)
        parentChildMap.forEach((children, parentId) => {
          const question = questionMap.get(parentId);
          if (question && children.length > 1) {
            question.isCritical = true;
          }
        });
      }
    } else if (survey.questions) {
      // Pour les sondages standards, utiliser le tableau de questions
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
    
    // Compter les réponses pour chaque question
    responses.forEach((response: any) => {
      response.answers.forEach((answer: { questionId: string, answer: string }) => {
        const question = questionMap.get(answer.questionId);
        if (question) {
          question.count = (question.count || 0) + 1;
        }
      });
    });
    
    // Positionner les questions
    let xPos = 0;
    let yPos = 0;
    const xGap = 450; // Augmenter l'espacement horizontal
    const yGap = 250; // Augmenter l'espacement vertical
    const usedPositions = new Set<string>(); // Pour éviter les chevauchements
    const processedNodes = new Set<string>(); // Pour éviter de traiter deux fois un nœud
    
    // Fonction pour positionner une question et ses enfants (orientation verticale)
    const positionQuestion = (questionId: string, x: number, y: number) => {
      if (processedNodes.has(questionId)) return;
      processedNodes.add(questionId);
      
      const question = questionMap.get(questionId);
      if (!question) return;
      
      // Créer le nœud pour cette question
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
          answer: question.answer // Si disponible
        },
        position: { x, y },
        style: {
          width: 240,  // Augmenter la largeur pour plus d'espace
          height: 160  // Hauteur adaptée au nouveau design
        }
      };
      
      // S'assurer que la position n'est pas déjà occupée
      let posKey = `${x},${y}`;
      while (usedPositions.has(posKey)) {
        x += xGap;
        posKey = `${x},${y}`;
      }
      usedPositions.add(posKey);
      questionNode.position = { x, y };
      
      flowNodes.push(questionNode);
      
      // Pour les questions critiques, positionner les enfants horizontalement
      if (question.children && question.children.length > 0) {
        if (question.isCritical) {
          // Question critique: enfants au même niveau vertical mais espacés horizontalement
          let childX = x + xGap;
          
          question.children.forEach((childId: string) => {
            // Vérifier que la position n'est pas déjà utilisée
            let childPosKey = `${childX},${y + yGap}`;
            while (usedPositions.has(childPosKey)) {
              childX += xGap;
              childPosKey = `${childX},${y + yGap}`;
            }
            
            positionQuestion(childId, childX, y + yGap);
            
            // Ajouter l'arête
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
          });
        } else {
          // Question normale: positionner l'enfant directement en dessous
          const childId = question.children[0];
          positionQuestion(childId, x, y + yGap);
          
          // Ajouter l'arête
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
    
    // Pour les sondages standards, positionner les questions en séquence verticale
    if (!survey.isDynamic) {
      questionsArray.forEach((question, index) => {
        // Créer le nœud pour la question
        const questionNode: Node = {
          id: question.id,
          type: 'questionNode',
          data: {
            questionId: question.id,
            text: question.text,
            count: question.count || 0,
            isSelected: false,
            isRoot: false,
            selectedPaths: selectedPaths
          },
          position: { x: 400, y: index * yGap },
          style: {
            width: 240,  // Augmenter la largeur pour plus d'espace
            height: 160  // Hauteur adaptée au nouveau design
          }
        };
        
        flowNodes.push(questionNode);
        
        // Connecter à la question précédente
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
      // Pour les sondages dynamiques, trouver les questions de départ
      const childNodes = new Set<string>();
      survey.edges.forEach((edge: any) => {
        childNodes.add(edge.target);
      });
      
      const startingNodes = [...questionMap.keys()].filter(id => !childNodes.has(id));
      
      // Positionner chaque branche à partir des questions de départ
      let startX = 0;
      startingNodes.forEach(nodeId => {
        positionQuestion(nodeId, startX, 0);
        startX += xGap * 2; // Donner plus d'espace entre les branches de départ
      });
      
      // Si aucune question de départ n'est trouvée, positionner toutes les questions en séquence
      if (startingNodes.length === 0 && questionsArray.length > 0) {
        questionsArray.forEach((question, index) => {
          if (!processedNodes.has(question.id)) {
            positionQuestion(question.id, index * xGap, 0);
          }
        });
      }
    }
    
    // Extraire les chemins pour l'affichage dans le panneau latéral
    const paths = extractAllPaths(survey, responses);
    
    return { nodes: flowNodes, edges: flowEdges, paths };
  };
  
  // Générer les nœuds et arêtes au chargement ou lorsque les réponses changent
  useEffect(() => {
    if (survey && responses.length > 0) {
      setLoading(true);
      const { nodes, edges, paths } = processPathTree(survey, responses);
      
      // S'assurer que selectedPaths est correctement passé à chaque arête
      const edgesWithSelection = edges.map(edge => ({
        ...edge,
        data: {
          ...(edge.data || {}),
          selectedPaths: selectedPaths,
          // Ajouter les informations source et target pour faciliter la comparaison
          source: edge.source,
          target: edge.target
        }
      }));
      
      // Ajouter selectedPaths aux données de chaque nœud
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
      
      // Informer le parent des chemins disponibles
      if (onPathsLoad) {
        onPathsLoad(paths);
      }
      
      setLoading(false);
    } else {
      setLoading(false);
      setAllPaths([]);
    }
  }, [survey, responses, selectedPaths]);
  
  // Créez une instance de reactFlowInstance au niveau supérieur du composant
  // Cette variable sera définie après le montage du composant
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  
  // Gérer la sélection d'un nœud
  const onNodeClick = (event: React.MouseEvent, node: Node) => {
    if (node.id === 'root') return;
    
    // Construire le chemin complet jusqu'à ce nœud
    const pathSegments: PathSegment[] = [];
    const buildPath = (nodeId: string) => {
      if (nodeId === 'root') return;
      
      const parts = nodeId.split('-');
      // Le format est: parentId-questionId-answer
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
        
        // Remonter au parent
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
  
  // Version améliorée de toggleFilter
  const toggleFilter = () => {
    // Mémoriser la position de défilement et la hauteur AVANT tout changement
    if (scrollContainerRef.current) {
      scrollPositionRef.current = scrollContainerRef.current.scrollTop;
      containerHeightRef.current = scrollContainerRef.current.scrollHeight;
      
      // Figer la hauteur explicitement pour éviter tout redimensionnement pendant la transition
      scrollContainerRef.current.style.height = `${scrollContainerRef.current.offsetHeight}px`;
      scrollContainerRef.current.classList.add('filtering-transition');
    }
    
    const newFilterState = !filterApplied;
    setFilterApplied(newFilterState);
    
    // Appliquer les filtres...
    if (newFilterState) {
      const filtered = allPaths.filter(pathItem => 
        selectedPaths.some(selectedPath => 
          selectedPath.length === pathItem.path.length && 
          selectedPath.every((segment, i) => 
            segment.questionId === pathItem.path[i].questionId && 
            segment.answer === pathItem.path[i].answer
          )
        )
      );
      setFilteredPaths(filtered);
      updateVisibleElements(true);
      if (onFilterChange) {
        const filteredResponses = getFilteredResponses();
        onFilterChange(true, filteredResponses);
      }
    } else {
      setFilteredPaths([]);
      updateVisibleElements(false);
      if (onFilterChange) {
        onFilterChange(false, responses);
      }
    }
    
    // Utiliser requestAnimationFrame pour s'assurer que le DOM a été mis à jour
    requestAnimationFrame(() => {
      setTimeout(() => {
        if (scrollContainerRef.current) {
          // Libérer la hauteur fixée
          scrollContainerRef.current.style.height = '';
          scrollContainerRef.current.classList.remove('filtering-transition');
          
          // Restaurer la position de défilement
          scrollContainerRef.current.scrollTop = scrollPositionRef.current;
        }
      }, 50); // Petit délai pour s'assurer que le rendu est terminé
    });
  };
  
  // Nouvelle fonction pour identifier les réponses correspondant aux parcours sélectionnés
  const getFilteredResponses = () => {
    if (!selectedPaths || selectedPaths.length === 0) {
      return responses;
    }

    // Filtrer les réponses qui suivent au moins un des chemins sélectionnés
    return responses.filter(response => {
      // Pour chaque chemin sélectionné
      return selectedPaths.some(path => {
        // Vérifier si cette réponse suit ce chemin (toutes les étapes du chemin)
        return path.every(segment => {
          // Chercher la réponse correspondante à cette question
          const answer = response.answers.find((a: { questionId: string; answer: string }) => 
            a.questionId === segment.questionId
          );
          // Si la réponse existe et correspond à la valeur attendue
          return answer && answer.answer === segment.answer;
        });
      });
    });
  };
  
  // Mettre à jour les éléments visibles en fonction du filtre
  const updateVisibleElements = (filtered: boolean) => {
    if (!filtered) {
      // Réinitialiser tous les nœuds et arêtes à leur état d'origine
      const { nodes: originalNodes, edges: originalEdges } = processPathTree(survey, responses);
      
      // Récupérer les positions et dimensions des nœuds pour l'effet d'atténuation
      const nodesPositions = originalNodes.map(node => ({
        id: node.id,
        x: node.position.x,
        y: node.position.y,
        width: node.style?.width ? Number(node.style.width) : 240,
        height: node.style?.height ? Number(node.style.height) : 160
      }));
      
      // S'assurer que selectedPaths et nodesPositions sont correctement passés
      const edgesWithData = originalEdges.map(edge => ({
        ...edge,
        data: {
          ...(edge.data || {}),
          selectedPaths: selectedPaths,
          nodesPositions // Ajouter les positions des nœuds
        }
      }));
      
      // Filtrer les nœuds
      const filteredNodes = originalNodes.filter(node => 
        selectedPaths.some(path => 
          path.some(segment => segment.questionId === node.data.questionId)
        )
      );
      
      // Filtrer les arêtes (celles qui connectent les nœuds des parcours sélectionnés)
      const filteredEdges = originalEdges.filter(edge => {
        // Extraire les IDs des questions source et cible
        const sourceId = edge.source.includes('-') ? edge.source.split('-').slice(-1)[0] : edge.source;
        const targetId = edge.target.includes('-') ? edge.target.split('-').slice(-1)[0] : edge.target;
        
        return selectedPaths.some(path => 
          path.some(segment => segment.questionId === sourceId) &&
          path.some(segment => segment.questionId === targetId)
        );
      });
      
      // Réorganiser les positions des nœuds pour un affichage plus propre
      const reorganizedNodes = reorganizeNodePositions(filteredNodes);
      
      // Mise à jour des nœuds et arêtes filtrés
      setNodes(reorganizedNodes);
      setEdges(edgesWithData);
    } else {
      // Filtrer pour ne montrer que les nœuds et arêtes des parcours sélectionnés
      const questionIdsInSelectedPaths = new Set<string>();
      
      // Collecter tous les IDs de questions dans les parcours sélectionnés
      selectedPaths.forEach(path => {
        path.forEach(segment => {
          questionIdsInSelectedPaths.add(segment.questionId);
        });
      });
      
      // Filtrer les nœuds
      const filteredNodes = nodes.filter(node => 
        questionIdsInSelectedPaths.has(node.data.questionId)
      );
      
      // Filtrer les arêtes (celles qui connectent les nœuds des parcours sélectionnés)
      const filteredEdges = edges.filter(edge => {
        // Extraire les IDs des questions source et cible
        const sourceId = edge.source.includes('-') ? edge.source.split('-').slice(-1)[0] : edge.source;
        const targetId = edge.target.includes('-') ? edge.target.split('-').slice(-1)[0] : edge.target;
        
        return questionIdsInSelectedPaths.has(sourceId) && questionIdsInSelectedPaths.has(targetId);
      });
      
      // Réorganiser les positions des nœuds pour un affichage plus propre
      const reorganizedNodes = reorganizeNodePositions(filteredNodes);
      
      // Ne pas oublier d'ajouter les positions des nœuds ici aussi
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
          nodesPositions: filteredNodesPositions // Ajouter les positions des nœuds filtrés
        }
      }));
      
      // Mise à jour des nœuds et arêtes filtrés
      setNodes(reorganizedNodes);
      setEdges(edgesWithData);
    }
    
    // Ajuster la vue après le filtrage
    if (reactFlowInstance) {
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2 });
      }, 300); // Un délai plus long pour permettre l'animation
    }
  };
  
  // Fonction améliorée pour réorganiser les positions des nœuds
  const reorganizeNodePositions = (filteredNodes: Node[]): Node[] => {
    if (filteredNodes.length === 0) return [];
    
    // Créer une copie profonde des nœuds pour éviter de modifier les originaux
    const nodes = JSON.parse(JSON.stringify(filteredNodes));
    
    // Augmenter l'espacement pour une meilleure lisibilité
    const xGap = 350; // Plus d'espace horizontal entre les nœuds au même niveau
    const yGap = 200; // Plus d'espace vertical entre les niveaux
    const siblingGap = 300; // Espace supplémentaire entre les nœuds frères
    
    // Structure pour traquer les niveaux hiérarchiques des nœuds
    const nodeLevels = new Map<string, number>();
    const nodeChildren = new Map<string, string[]>();
    
    // Identifier les relations parent-enfant
    edges.forEach(edge => {
      if (!nodeChildren.has(edge.source)) {
        nodeChildren.set(edge.source, []);
      }
      nodeChildren.get(edge.source)?.push(edge.target);
    });
    
    // Fonction pour déterminer le niveau hiérarchique de chaque nœud
    const determineNodeLevel = (nodeId: string, level: number = 0) => {
      // Éviter de traiter plusieurs fois le même nœud
      if (nodeLevels.has(nodeId) && nodeLevels.get(nodeId)! >= level) {
        return;
      }
      
      // Mettre à jour le niveau du nœud
      nodeLevels.set(nodeId, level);
      
      // Traiter récursivement les enfants
      const children = nodeChildren.get(nodeId) || [];
      children.forEach(childId => {
        determineNodeLevel(childId, level + 1);
      });
    };
    
    // Identifier les nœuds racines
    const nodeIds = new Set(nodes.map((node: Node) => node.id));
    const childIds = new Set<string>();
    
    edges.forEach(edge => {
      if (nodeIds.has(edge.target)) {
        childIds.add(edge.target);
      }
    });
    
    const rootNodes = nodes.filter((node: Node) => !childIds.has(node.id));
    
    // Déterminer le niveau de chaque nœud
    rootNodes.forEach((root: Node) => {
      determineNodeLevel(root.id);
    });
    
    // Grouper les nœuds par niveau
    const nodesByLevel = new Map<number, Node[]>();
    nodes.forEach((node: Node) => {
      const level = nodeLevels.get(node.id) || 0;
      if (!nodesByLevel.has(level)) {
        nodesByLevel.set(level, []);
      }
      nodesByLevel.get(level)?.push(node);
    });
    
    // Positionner les nœuds par niveau
    let maxWidth = 0;
    
    nodesByLevel.forEach((levelNodes, level) => {
      const levelWidth = levelNodes.length * xGap;
      maxWidth = Math.max(maxWidth, levelWidth);
      
      levelNodes.forEach((node: Node, index) => {
        // Positionner le nœud avec un décalage pour le centrage
        const x = (index * xGap) - (levelWidth / 2) + (xGap / 2);
        const y = level * yGap + 50; // 50px de marge supérieure
        
        // Appliquer un décalage aux nœuds qui ne sont pas en position centrale
        // pour bien les séparer des autres branches
        const offsetX = node.id.includes('-') ? parseInt(node.id.split('-')[0]) * 30 : 0;
        
        node.position = { 
          x: x + offsetX, 
          y 
        };
      });
    });
    
    // Deuxième passe : ajuster les positions des nœuds enfants pour les aligner sous leur parent
    nodes.forEach((node: Node) => {
      const children = nodeChildren.get(node.id) || [];
      if (children.length > 0) {
        // Trouver les nœuds enfants
        const childNodes = nodes.filter((n: Node) => children.includes(n.id));
        
        if (childNodes.length > 0) {
          // Calculer la position centrale des enfants
          const childrenCenterX = childNodes.reduce((sum: number, child: Node) => sum + child.position.x, 0) / childNodes.length;
          const parentX = node.position.x;
          
          // Si la position centrale des enfants est différente de celle du parent,
          // décaler tous les enfants pour les centrer sous le parent
          if (Math.abs(childrenCenterX - parentX) > 10) {
            const offset = parentX - childrenCenterX;
            childNodes.forEach((child: Node) => {
              child.position.x += offset;
            });
          }
          
          // Séparer les frères en fonction de leur nombre
          if (childNodes.length > 1) {
            const totalWidth = (childNodes.length - 1) * siblingGap;
            const startX = parentX - totalWidth / 2;
            
            childNodes.sort((a: Node, b: Node) => a.position.x - b.position.x);
            childNodes.forEach((child: Node, index: number) => {
              child.position.x = startX + index * siblingGap;
            });
          }
        }
      }
    });
    
    // Détection des chevauchements et correction
    const nodeBoundaries = new Map<string, {left: number, right: number, top: number, bottom: number}>();
    
    // Calculer les limites de chaque nœud - correction des erreurs d'opération arithmétique
    nodes.forEach((node: Node) => {
      const nodeWidth = node.style?.width ? Number(node.style.width) : 240;
      const nodeHeight = node.style?.height ? Number(node.style.height) : 160;
      
      // S'assurer que position.x et position.y sont des nombres
      const posX = typeof node.position.x === 'number' ? node.position.x : 0;
      const posY = typeof node.position.y === 'number' ? node.position.y : 0;
      
      nodeBoundaries.set(node.id, {
        left: posX - nodeWidth/2,
        right: posX + nodeWidth/2,
        top: posY - nodeHeight/2,
        bottom: posY + nodeHeight/2
      });
    });
    
    // Détecter et corriger les chevauchements
    let corrections = true;
    let iterations = 0;
    const maxIterations = 10; // Éviter les boucles infinies
    
    while (corrections && iterations < maxIterations) {
      corrections = false;
      iterations++;
      
      nodes.forEach((nodeA: Node) => {
        nodes.forEach((nodeB: Node) => {
          if (nodeA.id !== nodeB.id) {
            const boundA = nodeBoundaries.get(nodeA.id)!;
            const boundB = nodeBoundaries.get(nodeB.id)!;
            
            // Vérifier s'il y a chevauchement
            if (boundA.left < boundB.right && boundA.right > boundB.left &&
                boundA.top < boundB.bottom && boundA.bottom > boundB.top) {
              
              // Calculer le décalage nécessaire
              const xOverlap = Math.min(boundA.right, boundB.right) - Math.max(boundA.left, boundB.left);
              const yOverlap = Math.min(boundA.bottom, boundB.bottom) - Math.max(boundA.top, boundB.top);
              
              // Appliquer le décalage dans la direction qui minimise le déplacement
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
              
              // Mettre à jour les limites
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
    
    // Ajouter une transition fluide
    return nodes.map((node: Node) => ({
      ...node,
      style: {
        ...node.style,
        transition: 'all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }
    }));
  };
  
  // Mettre à jour la fonction handlePathSelect pour réinitialiser le filtre lors d'une nouvelle sélection
  const handlePathSelect = (path: PathSegment[]) => {
    console.log("Path selected:", path);
    
    // Si le filtre est appliqué, le désactiver pour une nouvelle sélection
    if (filterApplied) {
      setFilterApplied(false);
    }
    
    // Appeler la fonction onPathSelect pour mettre à jour selectedPaths
    onPathSelect(path);
    
    // Forcer la mise à jour complète des nœuds et des arêtes
    if (path.length > 0) {
      // Créer une nouvelle référence de selectedPaths pour s'assurer que la mise à jour est détectée
      const newSelectedPaths = [path];
      
      // Mettre à jour toutes les arêtes avec les nouveaux chemins sélectionnés
      const updatedEdges = edges.map(edge => ({
        ...edge,
        data: {
          ...(edge.data || {}),
          selectedPaths: newSelectedPaths
        }
      }));
      
      // Mettre à jour tous les nœuds avec les nouveaux chemins sélectionnés
      const updatedNodes = nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          selectedPaths: newSelectedPaths
        }
      }));
      
      // Appliquer les mises à jour
      setEdges(updatedEdges);
      setNodes(updatedNodes);
    }
    
    // Utiliser l'instance pour accéder à fitView
    if (reactFlowInstance) {
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2 });
      }, 200); // Augmenter légèrement le délai pour permettre le rendu des changements
    }
  };
  
  // Options ReactFlow
  const defaultViewport = { x: 0, y: 0, zoom: 0.8 };
  
  return (
    <Paper 
      sx={{ 
        width: '100%', 
        height: '100%', 
        p: 2, 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      <Typography variant="h6" component="h2" gutterBottom>
        Response Path Analysis
      </Typography>
      
      <Box sx={{ 
        display: 'flex',
        flexDirection: 'row',
        gap: 2,
        height: 'calc(100% - 60px)'
      }}>
        {/* Panneau principal - Arborescence */}
        <Box sx={{ 
          flex: 3, 
        border: '1px solid rgba(0, 0, 0, 0.1)', 
        borderRadius: '4px',
          position: 'relative',
          minHeight: '500px',
      }}>
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
            panOnScrollMode={'free' as any}
            nodesDraggable={false}
            elementsSelectable={true}
            selectNodesOnDrag={false}
          >
            <Controls 
              position="top-right" 
              showInteractive={true} 
              fitViewOptions={{ padding: 0.3 }}
            />
            <MiniMap
              nodeStrokeWidth={3}
              nodeColor={(node) => {
                const isSelected = node.data.selectedPaths && node.data.selectedPaths.some((path: PathSegment[]) => 
                  path.some((segment: PathSegment) => segment.questionId === node.data.questionId)
                );
                return isSelected ? '#3949ab' : '#667eea';
              }}
              zoomable
              pannable
                position="bottom-right"
              style={{ background: 'rgba(255, 255, 255, 0.9)' }}
            />
            <Background 
              color="#f0f4ff" 
              gap={20} 
              size={1.5}
              variant={'dots' as any}
            />
          </ReactFlow>
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
      
        {/* Panneau latéral - Liste alphabétique de tous les parcours */}
        <Box sx={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid rgba(0, 0, 0, 0.1)',
          borderRadius: '4px',
          p: 2,
          height: '100%',  // Assure que la Box prend toute la hauteur disponible
          maxHeight: 'calc(100vh - 120px)',  // Limite la hauteur maximale
          overflow: 'hidden'  // Cache les débordements
        }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Complete Paths
          </Typography>
          
          {allPaths.length > 0 ? (
            <Box 
              ref={scrollContainerRef}
              className={`path-list-container ${filterApplied ? 'filtering-active' : ''}`}
              sx={{ 
                overflowY: 'auto',
                overflowX: 'hidden',
                flex: 1,
                height: 'calc(100% - 30px)',
                position: 'relative', // Important pour le positionnement absolu
                '&::-webkit-scrollbar': {
                  width: '8px',
                },
                '&::-webkit-scrollbar-track': {
                  background: '#f1f1f1',
                  borderRadius: '4px',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: '#888',
                  borderRadius: '4px',
                },
                '&::-webkit-scrollbar-thumb:hover': {
                  background: '#555',
                }
              }}
            >
              {/* Bouton d'application du filtre si des parcours sont sélectionnés */}
              {selectedPaths.length > 0 && (
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Button
                    variant={filterApplied ? "contained" : "outlined"}
                    color={filterApplied ? "primary" : "inherit"}
                    size="small"
                    onClick={toggleFilter}
                    sx={{ width: '100%' }}
                  >
                    {filterApplied ? "Show all paths" : "Filter on selected paths"}
                  </Button>
                </Box>
              )}
              
              {(filterApplied ? filteredPaths : allPaths).map((pathItem, index) => {
                // Déterminer si ce parcours est sélectionné
                const isSelected = selectedPaths.some(p => 
                  p.length === pathItem.path.length && 
                  p.every((segment, i) => 
                    segment.questionId === pathItem.path[i].questionId && 
                    segment.answer === pathItem.path[i].answer
                  )
                );
                
                // Trouver l'index du parcours sélectionné pour déterminer sa couleur
                const selectedPathIndex = selectedPaths.findIndex(p => 
                  p.length === pathItem.path.length && 
                  p.every((segment, i) => 
                    segment.questionId === pathItem.path[i].questionId && 
                    segment.answer === pathItem.path[i].answer
                  )
                );
                
                // Déterminer la couleur à utiliser pour ce parcours
                const pathColor = isSelected 
                  ? HIGHLIGHT_COLORS[selectedPathIndex % HIGHLIGHT_COLORS.length] 
                  : 'divider';
                
                // Déterminer la couleur de fond
                const backgroundColor = isSelected 
                  ? `${HIGHLIGHT_COLORS[selectedPathIndex % HIGHLIGHT_COLORS.length]}20` // Version semi-transparente
                  : 'background.paper';
                
                return (
                <Box 
                  key={index}
                  sx={{
                    p: 1,
                    mb: 1,
                    border: '1px solid',
                      borderColor: isSelected ? pathColor : 'divider',
                    borderRadius: 1,
                      backgroundColor: backgroundColor,
                    cursor: 'pointer',
                    '&:hover': {
                        backgroundColor: isSelected 
                          ? `${HIGHLIGHT_COLORS[selectedPathIndex % HIGHLIGHT_COLORS.length]}30` // Légèrement plus foncé au survol
                          : 'action.hover',
                      },
                      transition: 'all 0.3s ease'
                    }}
                    onClick={() => handlePathSelect(pathItem.path)}
                  >
                    {/* Afficher un indicateur de couleur à côté du nom du parcours */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {isSelected && (
                        <Box 
                          sx={{ 
                            width: 12, 
                            height: 12, 
                            borderRadius: '50%', 
                            backgroundColor: HIGHLIGHT_COLORS[selectedPathIndex % HIGHLIGHT_COLORS.length],
                            boxShadow: `0 0 4px ${HIGHLIGHT_COLORS[selectedPathIndex % HIGHLIGHT_COLORS.length]}80`
                          }} 
                        />
                      )}
                      <Typography variant="body2" fontWeight="bold" color={isSelected ? pathColor : 'text.primary'}>
                    {pathItem.name} ({pathItem.path.length} steps)
                  </Typography>
                    </Box>
                    
                  <Box sx={{ mt: 1 }}>
                    {pathItem.path.map((segment, segIdx) => (
                      <Box key={segIdx} sx={{ display: 'flex', mb: 0.5, fontSize: '0.8rem' }}>
                        <Typography variant="caption" sx={{ mr: 1 }}>
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
        </Box>
      </Box>
      <style>{styles}</style>
      <style>{hierarchyStyles}</style>
      <style>{scrollStyles}</style>
      <style>{linkStyles}</style>
    </Paper>
  );
};