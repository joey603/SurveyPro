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
  useReactFlow,
  ReactFlowInstance
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
  
  // Utiliser la couleur du parcours si elle est fournie dans les données, sinon utiliser les couleurs par défaut
  const highlightColor = data.pathColor 
    ? data.pathColor 
    : (isInSelectedPath 
        ? HIGHLIGHT_COLORS[primaryPathIndex % HIGHLIGHT_COLORS.length] 
        : 'rgba(102, 126, 234, 0.2)');

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
          maxHeight: '100px',
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

      {/* Handles pour les connexions */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ 
          width: '12px', 
          height: '12px',
          background: isInSelectedPath ? highlightColor : '#667eea',
          border: '2px solid white',
          zIndex: 10
        }}
      />
      
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ 
          width: '12px', 
          height: '12px',
          background: isInSelectedPath ? highlightColor : '#667eea',
          border: '2px solid white',
          zIndex: 10
        }}
      />

      {/* Indicateurs secondaires pour montrer l'appartenance à d'autres parcours */}
      {secondaryIndicatorPositions.map((pos, idx) => (
        <div
          key={idx}
          style={{
            position: 'absolute',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: HIGHLIGHT_COLORS[(primaryPathIndex + idx + 1) % HIGHLIGHT_COLORS.length],
            boxShadow: `0 0 4px ${HIGHLIGHT_COLORS[(primaryPathIndex + idx + 1) % HIGHLIGHT_COLORS.length]}80`,
            border: '2px solid #fff',
            ...pos,
            zIndex: 20
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
          if (srcId === path[j].questionId || source.includes(path[j].questionId)) {
            for (const tgtId of targetIds) {
              if (tgtId === path[j+1].questionId || target.includes(path[j+1].questionId)) {
                pathIndex = i;
                break outerLoop;
              }
            }
          }
        }
      }
      
      // Vérification 2: Les deux questions sont dans le même parcours
      const sourceInPath = path.some((segment: PathSegment) => sourceIds.includes(segment.questionId) || source.includes(segment.questionId));
      const targetInPath = path.some((segment: PathSegment) => targetIds.includes(segment.questionId) || target.includes(segment.questionId));
      
      if (sourceInPath && targetInPath) {
        pathIndex = i;
        break outerLoop;
      }
    }
  }
  
  const isPartOfSelectedPath = pathIndex !== -1;
  
  // Déterminer la couleur du lien: couleur personnalisée du parcours si disponible, 
  // sinon couleur basée sur l'index du parcours, sinon couleur par défaut
  const linkColor = data && data.pathColor 
    ? data.pathColor 
    : (isPartOfSelectedPath 
        ? HIGHLIGHT_COLORS[pathIndex % HIGHLIGHT_COLORS.length] 
        : style?.stroke || 'rgba(102, 126, 234, 0.7)');
        
  const strokeWidth = isPartOfSelectedPath ? 3 : 2;
  const opacity = isPartOfSelectedPath ? 1 : 0.5;
  
  // Génération du chemin avec getStraightPath
  const [edgePath] = getStraightPath({
    sourceX, 
    sourceY,
    targetX,
    targetY,
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
          transition: 'all 0.3s ease',
        }}
      />
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
  const [multipleTreeNodes, setMultipleTreeNodes] = useState<Node[][]>([]);
  const [multipleTreeEdges, setMultipleTreeEdges] = useState<Edge[][]>([]);
  
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
    
    const traversePath = (nodeId: string, currentPath: PathSegment[], depth: number = 0) => {
      const node = nodeMap.get(nodeId);
      
      if (!node || !node.children || node.children.size === 0) {
        if (currentPath.length > 0) {
          completePaths.push({
            name: `Path ${getAlphabeticName(completePaths.length)}`,
            path: [...currentPath]
          });
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
    
    let xPos = 0;
    let yPos = 0;
    const xGap = 450;
    const yGap = 250;
    const usedPositions = new Set<string>();
    const processedNodes = new Set<string>();
    
    const positionQuestion = (questionId: string, x: number, y: number) => {
      if (processedNodes.has(questionId)) return;
      processedNodes.add(questionId);
      
      const question = questionMap.get(questionId);
      if (!question) return;
      
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
      
      let posKey = `${x},${y}`;
      while (usedPositions.has(posKey)) {
        x += xGap;
        posKey = `${x},${y}`;
      }
      usedPositions.add(posKey);
      questionNode.position = { x, y };
      
      flowNodes.push(questionNode);
      
      if (question.children && question.children.length > 0) {
        if (question.isCritical) {
          let childX = x + xGap;
          
          question.children.forEach((childId: string) => {
            let childPosKey = `${childX},${y + yGap}`;
            while (usedPositions.has(childPosKey)) {
              childX += xGap;
              childPosKey = `${childX},${y + yGap}`;
            }
            
            positionQuestion(childId, childX, y + yGap);
            
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
          position: { x: 400, y: index * yGap },
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
      const childNodes = new Set<string>();
      survey.edges.forEach((edge: any) => {
        childNodes.add(edge.target);
      });
      
      const startingNodes = [...questionMap.keys()].filter(id => !childNodes.has(id));
      
      let startX = 0;
      startingNodes.forEach(nodeId => {
        positionQuestion(nodeId, startX, 0);
        startX += xGap * 2;
      });
      
      if (startingNodes.length === 0 && questionsArray.length > 0) {
        questionsArray.forEach((question, index) => {
          if (!processedNodes.has(question.id)) {
            positionQuestion(question.id, index * xGap, 0);
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
      
      if (selectedPaths.length > 0) {
        const multipleNodes: Node[][] = [];
        const multipleEdges: Edge[][] = [];
        
        selectedPaths.forEach((path, pathIndex) => {
          const { nodes: pathNodes, edges: pathEdges } = createSinglePathTree(survey, responses, path, pathIndex);
          multipleNodes.push(pathNodes);
          multipleEdges.push(pathEdges);
        });
        
        setMultipleTreeNodes(multipleNodes);
        setMultipleTreeEdges(multipleEdges);
      }
      
      updateVisibleElements(true);
      if (onFilterChange) {
        const filteredResponses = getFilteredResponses();
        onFilterChange(true, filteredResponses);
      }
    } else {
      setFilteredPaths([]);
      setMultipleTreeNodes([]);
      setMultipleTreeEdges([]);
      updateVisibleElements(false);
      if (onFilterChange) {
        onFilterChange(false, responses);
      }
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
      return responses;
    }

    return responses.filter(response => {
      return selectedPaths.some(path => {
        return path.every(segment => {
          const answer = response.answers.find((a: { questionId: string; answer: string }) => 
            a.questionId === segment.questionId
          );
          return answer && answer.answer === segment.answer;
        });
      });
    });
  };
  
  const updateVisibleElements = (filtered: boolean) => {
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
      const questionIdsInSelectedPaths = new Set<string>();
      
      selectedPaths.forEach(path => {
        path.forEach(segment => {
          questionIdsInSelectedPaths.add(segment.questionId);
        });
      });
      
      const filteredNodes = nodes.filter(node => 
        questionIdsInSelectedPaths.has(node.data.questionId)
      );
      
      const filteredEdges = edges.filter(edge => {
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
    
    const xGap = 350;
    const yGap = 200;
    const siblingGap = 300;
    
    const nodeLevels = new Map<string, number>();
    const nodeChildren = new Map<string, string[]>();
    
    edges.forEach(edge => {
      if (!nodeChildren.has(edge.source)) {
        nodeChildren.set(edge.source, []);
      }
      nodeChildren.get(edge.source)?.push(edge.target);
    });
    
    const determineNodeLevel = (nodeId: string, level: number = 0) => {
      if (nodeLevels.has(nodeId) && nodeLevels.get(nodeId)! >= level) {
        return;
      }
      
      nodeLevels.set(nodeId, level);
      
      const children = nodeChildren.get(nodeId) || [];
      children.forEach(childId => {
        determineNodeLevel(childId, level + 1);
      });
    };
    
    const nodeIds = new Set(nodes.map((node: Node) => node.id));
    const childIds = new Set<string>();
    
    edges.forEach(edge => {
      if (nodeIds.has(edge.target)) {
        childIds.add(edge.target);
      }
    });
    
    const rootNodes = nodes.filter((node: Node) => !childIds.has(node.id));
    
    rootNodes.forEach((root: Node) => {
      determineNodeLevel(root.id);
    });
    
    const nodesByLevel = new Map<number, Node[]>();
    nodes.forEach((node: Node) => {
      const level = nodeLevels.get(node.id) || 0;
      if (!nodesByLevel.has(level)) {
        nodesByLevel.set(level, []);
      }
      nodesByLevel.get(level)?.push(node);
    });
    
    let maxWidth = 0;
    
    nodesByLevel.forEach((levelNodes, level) => {
      const levelWidth = levelNodes.length * xGap;
      maxWidth = Math.max(maxWidth, levelWidth);
      
      levelNodes.forEach((node: Node, index) => {
        const x = (index * xGap) - (levelWidth / 2) + (xGap / 2);
        const y = level * yGap + 50;
        
        const offsetX = node.id.includes('-') ? parseInt(node.id.split('-')[0]) * 30 : 0;
        
        node.position = { 
          x: x + offsetX, 
          y 
        };
      });
    });
    
    nodes.forEach((node: Node) => {
      const children = nodeChildren.get(node.id) || [];
      if (children.length > 0) {
        const childNodes = nodes.filter((n: Node) => children.includes(n.id));
        
        if (childNodes.length > 0) {
          const childrenCenterX = childNodes.reduce((sum: number, child: Node) => sum + child.position.x, 0) / childNodes.length;
          const parentX = node.position.x;
          
          if (Math.abs(childrenCenterX - parentX) > 10) {
            const offset = parentX - childrenCenterX;
            childNodes.forEach((child: Node) => {
              child.position.x += offset;
            });
          }
          
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
      setFilterApplied(false);
    }
    
    onPathSelect(path);
    
    if (path.length > 0) {
      const newSelectedPaths = [path];
      
      const updatedEdges = edges.map(edge => ({
        ...edge,
        data: {
          ...(edge.data || {}),
          selectedPaths: newSelectedPaths
        }
      }));
      
      const updatedNodes = nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          selectedPaths: newSelectedPaths
        }
      }));
      
      setEdges(updatedEdges);
      setNodes(updatedNodes);
    }
    
    if (reactFlowInstance) {
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2 });
      }, 200);
    }
  };
  
  const createSinglePathTree = (survey: any, responses: any[], path: PathSegment[], pathIndex: number) => {
    const questionIdsInPath = new Set<string>();
    path.forEach(segment => {
      questionIdsInPath.add(segment.questionId);
    });
    
    const pathNodes: Node[] = [];
    const pathEdges: Edge[] = [];
    
    // Calculer d'abord le nombre exact de répondants qui ont suivi ce parcours complet
    const respondentsFollowingPath = responses.filter(response => 
      path.every(segment => {
        const answer = response.answers.find((a: { questionId: string; answer: string }) => 
          a.questionId === segment.questionId
        );
        return answer && answer.answer === segment.answer;
      })
    );
    
    // Nombre total de répondants pour ce parcours spécifique
    const totalRespondentsForPath = respondentsFollowingPath.length;
    
    // Couleur du parcours actuel
    const pathColor = HIGHLIGHT_COLORS[pathIndex % HIGHLIGHT_COLORS.length];
    
    path.forEach((segment, index) => {
      const nodeId = `path-${pathIndex}-${segment.questionId}`;
      const questionNode = {
        id: nodeId,
        type: 'questionNode',
        position: { 
          x: index * 300, 
          y: pathIndex * 300
        },
        data: {
          questionId: segment.questionId,
          text: segment.questionText,
          answer: segment.answer,
          count: totalRespondentsForPath,
          highlightLevel: 3,
          selectedPaths: [path],
          pathColor: pathColor // Ajouter la couleur du parcours dans les données
        },
        style: {
          width: 240,
          height: 170,
          backgroundColor: `${pathColor}10`, // Couleur de fond légère basée sur la couleur du parcours
          borderColor: pathColor, // Bordure avec la couleur du parcours
          borderWidth: 2,
          transition: 'all 0.3s ease'
        }
      };
      pathNodes.push(questionNode);
      
      if (index > 0) {
        const sourceId = `path-${pathIndex}-${path[index-1].questionId}`;
        const targetId = nodeId;
        
        const edgeId = `edge-${pathIndex}-${index}`;
        pathEdges.push({
          id: edgeId,
          source: sourceId,
          target: targetId,
          type: 'default',
          animated: false,
          style: { 
            stroke: pathColor, // Utiliser la même couleur pour les arêtes
            strokeWidth: 3
          },
          data: {
            selectedPaths: [path],
            pathColor: pathColor // Ajouter la couleur du parcours dans les données
          }
        });
      }
    });
    
    return { nodes: pathNodes, edges: pathEdges };
  };
  
  // Nouvelle fonction qui compte les répondants ayant suivi exactement un chemin spécifique
  const getRespondentCountForPath = (path: PathSegment[], responses: any[]): number => {
    return responses.filter(response => 
      path.every(segment => {
        const answer = response.answers.find((a: { questionId: string; answer: string }) => 
          a.questionId === segment.questionId
        );
        return answer && answer.answer === segment.answer;
      })
    ).length;
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
        <Box sx={{ 
          flex: 3, 
          border: '1px solid rgba(0, 0, 0, 0.1)', 
          borderRadius: '4px',
          position: 'relative',
          minHeight: '500px',
          overflowY: filterApplied && multipleTreeNodes.length > 0 ? 'auto' : 'hidden',
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
                    overflow: 'hidden'
                  }}
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
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        backgroundColor: 'rgba(255,255,255,0.2)', 
                        px: 1, 
                        py: 0.5, 
                        borderRadius: 1,
                        fontSize: '0.8rem'
                      }}>
                        {selectedPaths[index].length} steps
                      </Box>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        backgroundColor: 'rgba(255,255,255,0.2)', 
                        px: 1, 
                        py: 0.5, 
                        borderRadius: 1,
                        fontSize: '0.8rem',
                        fontWeight: 'bold'
                      }}>
                        {getRespondentCountForPath(selectedPaths[index], responses)} respondents
                      </Box>
                    </Box>
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
                    <Background 
                      color="#f0f4ff" 
                      gap={20} 
                      size={1.5}
                      variant={'dots' as any}
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
                  // Utiliser la couleur spécifique du parcours si disponible
                  if (node.data.pathColor) {
                    return node.data.pathColor;
                  }
                  
                  // Sinon, utiliser le système existant basé sur la sélection
                  const isSelected = node.data.selectedPaths && node.data.selectedPaths.some((path: PathSegment[]) => 
                    path.some((segment: PathSegment) => segment.questionId === node.data.questionId)
                  );
                  
                  if (isSelected) {
                    // Trouver l'index du premier parcours contenant ce nœud
                    const pathIndex = node.data.selectedPaths.findIndex((path: PathSegment[]) => 
                      path.some((segment: PathSegment) => segment.questionId === node.data.questionId)
                    );
                    return HIGHLIGHT_COLORS[pathIndex % HIGHLIGHT_COLORS.length];
                  }
                  
                  return '#667eea';
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
      
        <Box sx={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid rgba(0, 0, 0, 0.1)',
          borderRadius: '4px',
          p: 2,
          height: '100%',
          maxHeight: 'calc(100vh - 120px)',
          overflow: 'hidden'
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
                position: 'relative',
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
                
                const pathColor = isSelected 
                  ? HIGHLIGHT_COLORS[selectedPathIndex % HIGHLIGHT_COLORS.length] 
                  : 'divider';
                
                const backgroundColor = isSelected 
                  ? `${HIGHLIGHT_COLORS[selectedPathIndex % HIGHLIGHT_COLORS.length]}20`
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
                          ? `${HIGHLIGHT_COLORS[selectedPathIndex % HIGHLIGHT_COLORS.length]}30`
                          : 'action.hover',
                      },
                      transition: 'all 0.3s ease'
                    }}
                    onClick={() => handlePathSelect(pathItem.path)}
                  >
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