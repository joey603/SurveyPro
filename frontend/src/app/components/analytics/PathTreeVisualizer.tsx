import React, { useRef, useEffect, useState } from 'react';
import { Paper, Typography, Box, CircularProgress, Button } from '@mui/material';
import * as d3 from 'd3';
import ReactFlow, { 
  Background, 
  Controls, 
  Node, 
  Edge, 
  MiniMap, 
  NodeTypes,
  Handle,
  Position
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

// Composant personnalisé pour les nœuds de question
const QuestionNode = ({ data }: { data: any }) => {
  // Définir le style en fonction du type de question
  const borderColor = data.isCritical ? '#ff9800' : (data.isSelected ? '#1976d2' : '#667eea');
  const backgroundColor = data.isCritical ? '#ff9800' : (data.isSelected ? '#1976d2' : '#667eea');
  
  return (
    <div className="question-node">
      <Handle type="target" position={Position.Left} />
      <div className="node-content" style={{
        background: 'white',
        border: `2px solid ${borderColor}`,
        borderRadius: '8px',
        padding: '10px',
        minWidth: '200px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      }}>
        <div className="node-header" style={{
          background: backgroundColor,
          color: 'white',
          padding: '6px 10px',
          borderRadius: '4px',
          marginBottom: '8px',
          fontWeight: 'bold',
        }}>
          {data.text}
        </div>
        <div className="node-stats" style={{
          marginTop: '8px',
          textAlign: 'center',
          fontWeight: 'bold',
          color: '#666',
        }}>
          {data.count} répondants
        </div>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
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
      response.answers.forEach((answer: any, index: number) => {
        const question = questionsMap.get(answer.questionId);
        if (!question) return;
        
        const answerText = answer.answer || 'Sans réponse';
        const childNodeId = `${currentNodeId}-${answer.questionId}-${answerText}`;
        
        // Vérifier que le nœud parent existe dans la carte
        const currentNode = nodeMap.get(currentNodeId);
        if (!currentNode) {
          console.error(`Nœud parent introuvable: ${currentNodeId}`);
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
    const xGap = 400; // Espacement horizontal
    const yGap = 150; // Espacement vertical
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
          isCritical: question.isCritical
        },
        position: { x, y }
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
                strokeWidth: 2
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
              strokeWidth: 2
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
            isRoot: false
          },
          position: { x: 400, y: index * yGap }
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
              strokeWidth: 2
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
      setNodes(nodes);
      setEdges(edges);
      setAllPaths(paths);
      setLoading(false);
    } else {
      setLoading(false);
      setAllPaths([]);
    }
  }, [survey, responses, selectedPaths]);
  
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
            nodeTypes={nodeTypes}
            defaultViewport={defaultViewport}
              minZoom={0.1}
              maxZoom={2.5}
            fitView
              fitViewOptions={{ padding: 0.2 }}
          >
              <Controls position="top-right" />
            <MiniMap
              nodeStrokeWidth={3}
              zoomable
              pannable
                position="bottom-right"
            />
            <Background color="#f8f8f8" gap={16} />
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
          overflow: 'auto'
        }}>
          <Typography variant="subtitle2" gutterBottom>
            Parcours complets ({allPaths.length})
          </Typography>
          
          {allPaths.length > 0 ? (
            <Box sx={{ overflowY: 'auto', flex: 1 }}>
              {allPaths.map((pathItem, index) => (
                <Box 
                  key={index}
                  sx={{
                    p: 1,
                    mb: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    backgroundColor: 'background.paper',
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    }
                  }}
                  onClick={() => onPathSelect(pathItem.path)}
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
                          {segment.questionText.substring(0, 20)}
                          {segment.questionText.length > 20 ? '...' : ''} : 
                          {segment.answer.substring(0, 15)}
                          {segment.answer.length > 15 ? '...' : ''}
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