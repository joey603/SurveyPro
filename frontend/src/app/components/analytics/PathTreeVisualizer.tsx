import React, { useRef, useEffect, useState } from 'react';
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
}

// Composant personnalisé pour les nœuds de question avec mise en évidence améliorée
const QuestionNode = ({ data }: { data: any }) => {
  // Vérification précise pour déterminer si ce nœud fait partie d'un parcours sélectionné
  const isInSelectedPath = data.selectedPaths && data.selectedPaths.length > 0 && 
    data.selectedPaths.some((path: PathSegment[]) => 
      path.some((segment: PathSegment) => 
        segment.questionId === data.questionId
      )
    );

  console.log("Node:", data.questionId, "isSelected:", isInSelectedPath); // Débogage

  // Calculer la taille du cercle basée sur le nombre de répondants avec un min et max
  const minSize = 26;
  const maxSize = 50;
  const size = Math.min(maxSize, Math.max(minSize, 26 + (data.count * 1.5)));

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
      {/* Conteneur principal - forme et ombre avec effet de pulsation pour les items sélectionnés */}
      <div style={{
        position: 'absolute',
        top: '5px',
        left: '5px',
        right: '5px',
        bottom: '5px',
        backgroundColor: isInSelectedPath ? 'rgba(138, 43, 226, 0.15)' : 'rgba(255, 255, 255, 0.95)',
        borderRadius: '12px',
        border: `${isInSelectedPath ? 4 : 2}px solid ${isInSelectedPath ? '#8A2BE2' : 'rgba(102, 126, 234, 0.2)'}`,
        boxShadow: isInSelectedPath 
          ? '0 0 15px 5px rgba(138, 43, 226, 0.3)'
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

      {/* Cercle avec le nombre de réponses */}
      <div 
        style={{ 
          width: `${isInSelectedPath ? size * 1.1 : size}px`,
          height: `${isInSelectedPath ? size * 1.1 : size}px`,
          borderRadius: '50%',
          backgroundColor: isInSelectedPath 
            ? "#1976d2" 
            : "rgba(102, 126, 234, 0.7)",
          border: `2px solid ${isInSelectedPath ? "#ffffff" : "rgba(255, 255, 255, 0.8)"}`,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontWeight: 'bold',
          color: '#ffffff',
          fontSize: isInSelectedPath ? '14px' : '12px',
          boxShadow: isInSelectedPath ? '0 4px 8px rgba(25, 118, 210, 0.3)' : '0 2px 6px rgba(0, 0, 0, 0.15)',
          transition: 'all 0.3s ease',
          zIndex: 3,
          position: 'relative'
        }}
      >
        {data.count}
      </div>
      
      {/* Handles - ajustés pour être bien positionnés */}
      <Handle 
        type="target" 
        position={Position.Top} 
        style={{ 
          background: isInSelectedPath ? '#1976d2' : '#667eea',
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
          background: isInSelectedPath ? '#1976d2' : '#667eea',
          width: isInSelectedPath ? '10px' : '8px',
          height: isInSelectedPath ? '10px' : '8px',
          bottom: '-5px',
          borderRadius: '50%',
          border: '2px solid white',
          zIndex: 10
        }} 
      />

      {/* Indicateur visuel supplémentaire pour les nœuds sélectionnés */}
      {isInSelectedPath && (
        <div style={{
          position: 'absolute',
          top: '-8px',
          right: '-8px',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: '#8A2BE2',
          border: '2px solid white',
          zIndex: 20,
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }} />
      )}
    </div>
  );
};

// Composant d'arête personnalisé avec mise en évidence correcte
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
  // Vérification précise pour déterminer si ce lien fait partie d'un parcours sélectionné
  const isInSelectedPath = data && data.selectedPaths && data.selectedPaths.length > 0 && 
    data.selectedPaths.some((path: PathSegment[]) => {
      // Chercher si source et target apparaissent consécutivement dans le parcours
      for (let i = 0; i < path.length - 1; i++) {
        const sourceId = source.split('-').slice(-1)[0]; // Extraire l'ID de la question source
        const targetId = target.split('-').slice(-1)[0]; // Extraire l'ID de la question cible
        
        if (path[i].questionId === sourceId && path[i+1].questionId === targetId) {
          return true;
        }
      }
      return false;
    });

  console.log("Edge:", id, "isSelected:", isInSelectedPath); // Débogage

  // Style standard pour les liaisons non sélectionnées, style contrasté pour les sélectionnées
  const customStyle = {
    stroke: isInSelectedPath ? "#8A2BE2" : "#667eea", // Couleur bleue plus foncée pour les liens non sélectionnés
    strokeWidth: isInSelectedPath ? 6 : 2.5, // Épaisseur augmentée pour les liens non sélectionnés
    strokeDasharray: isInSelectedPath ? "" : "6 4",
    filter: isInSelectedPath ? 'drop-shadow(0 0 8px rgba(138, 43, 226, 0.8))' : 'none',
    transition: 'all 0.4s ease',
    strokeLinecap: "round" as const,
    opacity: isInSelectedPath ? 1 : 0.8, // Opacité augmentée pour les liens non sélectionnés
  };

  if (!sourceX || !sourceY || !targetX || !targetY) {
    return null;
  }

  // Calculer le chemin entre les points source et cible
  const path = `M${sourceX},${sourceY} C${sourceX},${sourceY + (targetY - sourceY) / 3} ${targetX},${targetY - (targetY - sourceY) / 3} ${targetX},${targetY}`;

  // N'afficher l'effet de halo que pour les liens sélectionnés
  return (
    <>
      {isInSelectedPath && (
        <path
          id={`${id}-glow`}
          style={{
            stroke: "rgba(138, 43, 226, 0.3)", // Violet au lieu de rouge
            strokeWidth: 8,
            fillOpacity: 0,
            strokeLinecap: "round" as const,
          }}
          className="react-flow__edge-path"
          d={path}
        />
      )}
      <path
        id={id}
        style={customStyle}
        className="react-flow__edge-path"
        d={path}
      />
    </>
  );
};

export const PathTreeVisualizer: React.FC<PathTreeVisualizerProps> = ({
  survey,
  responses,
  onPathSelect,
  selectedPaths
}) => {
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [allPaths, setAllPaths] = useState<{name: string, path: PathSegment[], group: string}[]>([]);
  const [analysisGroups, setAnalysisGroups] = useState<{[key: string]: {name: string, paths: number[]}}>({}); 
  
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
      const groupName = `Groupe ${String.fromCharCode(65 + groupIndex)}`;
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
            name: `Parcours ${getAlphabeticName(completePaths.length)}`,
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
      
      // Ajouter selectedPaths aux données de chaque nœud
      const nodesWithSelection = nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          selectedPaths: selectedPaths
        }
      }));
      
      // Ajouter selectedPaths aux données de chaque arête
      const edgesWithSelection = edges.map(edge => ({
        ...edge,
        data: {
          ...edge.data || {},
          selectedPaths: selectedPaths
        }
      }));
      
      setNodes(nodesWithSelection);
      setEdges(edgesWithSelection);
      setAllPaths(paths);
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
  
  // Gérer la sélection d'un parcours depuis la liste
  const handlePathSelect = (path: PathSegment[]) => {
    console.log("Path selected:", path);
    
    // Appeler la fonction onPathSelect pour mettre à jour selectedPaths
    onPathSelect(path);
    
    // Utiliser l'instance pour accéder à fitView
    if (reactFlowInstance) {
      // Laisser un peu de temps pour que ReactFlow mette à jour les styles des nœuds
      setTimeout(() => {
        console.log("Fitting view with selected paths:", selectedPaths);
        reactFlowInstance.fitView({ padding: 0.2 });
      }, 100); // Augmenter légèrement le délai
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
      <Typography variant="subtitle1" gutterBottom>
        Arborescence des parcours ({responses.length} répondants)
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
              Aucune réponse disponible pour visualiser l'arborescence des parcours.
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
          <Typography variant="subtitle2" gutterBottom>
            Parcours complets ({allPaths.length})
          </Typography>
          
          {allPaths.length > 0 ? (
            <Box 
              sx={{ 
                overflowY: 'auto',  // Barre de défilement verticale quand nécessaire
                overflowX: 'hidden',  // Masquer le défilement horizontal
                flex: 1,
                height: 'calc(100% - 30px)',  // Hauteur calculée en fonction du titre
                '&::-webkit-scrollbar': {
                  width: '8px',  // Largeur de la barre de défilement
                },
                '&::-webkit-scrollbar-track': {
                  background: '#f1f1f1',  // Couleur de fond de la piste
                  borderRadius: '4px',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: '#888',  // Couleur de la glissière
                  borderRadius: '4px',
                },
                '&::-webkit-scrollbar-thumb:hover': {
                  background: '#555',  // Couleur au survol
                }
              }}
            >
              {allPaths.map((pathItem, index) => (
                <Box 
                  key={index}
                  sx={{
                    p: 1,
                    mb: 1,
                    border: '1px solid',
                    borderColor: selectedPaths.some(p => 
                      p.length === pathItem.path.length && 
                      p.every((segment, i) => 
                        segment.questionId === pathItem.path[i].questionId && 
                        segment.answer === pathItem.path[i].answer
                      )
                    ) ? 'primary.main' : 'divider',
                    borderRadius: 1,
                    backgroundColor: selectedPaths.some(p => 
                      p.length === pathItem.path.length && 
                      p.every((segment, i) => 
                        segment.questionId === pathItem.path[i].questionId && 
                        segment.answer === pathItem.path[i].answer
                      )
                    ) ? 'rgba(57, 73, 171, 0.1)' : 'background.paper',
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                    transition: 'all 0.3s ease'
                  }}
                  onClick={() => handlePathSelect(pathItem.path)}
                >
                  <Typography variant="body2" fontWeight="bold">
                    {pathItem.name} ({pathItem.path.length} étapes)
                  </Typography>
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
              ))}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Aucun parcours disponible.
            </Typography>
          )}
        </Box>
      </Box>
    </Paper>
  );
};