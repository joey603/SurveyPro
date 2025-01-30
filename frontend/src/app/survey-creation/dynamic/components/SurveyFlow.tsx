"use client";

import React, { useState, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  Connection,
  addEdge,
  NodeChange,
  EdgeChange,
  ConnectionMode,
  applyNodeChanges,
  applyEdgeChanges,
  EdgeProps,
  getBezierPath,
  MarkerType,
  ReactFlowInstance,
  Viewport,
} from 'reactflow';
import 'reactflow/dist/style.css';
import QuestionNode from './QuestionNode';
import { dynamicSurveyService } from '@/utils/dynamicSurveyService';
import { SurveyFlowRef } from '../types/SurveyFlowTypes';

interface SurveyFlowProps {
  onAddNode: () => void;
  onEdgesChange: (edges: Edge[]) => void;
}

const nodeTypes = {
  questionNode: QuestionNode,
};

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'questionNode',
    data: { 
      id: '1',
      questionNumber: 1,
      type: 'text',
      text: '',
      options: [],
      media: '',
      mediaUrl: '',
      isCritical: false,
    },
    position: { x: 400, y: 50 },
  },
];

const initialEdges: Edge[] = [];

const SurveyFlow = forwardRef<SurveyFlowRef, SurveyFlowProps>(({ onAddNode, onEdgesChange }, ref) => {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: 'error' | 'warning' | 'info' | 'success';
  }>({
    show: false,
    message: '',
    type: 'info'
  });

  const handleNodeChange = useCallback((nodeId: string, newData: any) => {
    setNodes(prevNodes => 
      prevNodes.map(node => 
        node.id === nodeId 
          ? { ...node, data: { ...node.data, ...newData } }
          : node
      )
    );
  }, []);

  const createPathsFromNode = useCallback((sourceId: string, options: string[]) => {
    console.log("Creating paths for node:", sourceId, "with options:", options);
    
    const sourceNode = nodes.find(n => n.id === sourceId);
    if (!sourceNode) {
      console.log("Source node not found");
      return;
    }

    // Remove old nodes and edges
    setNodes(prevNodes => prevNodes.filter(node => !node.id.startsWith(`${sourceId}_`)));
    setEdges(prevEdges => prevEdges.filter(edge => edge.source !== sourceId));

    if (options.length === 0) return;

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    const verticalSpacing = 300; // Augmenté à 300px
    const horizontalSpacing = 800; // Augmenté à 800px pour un espacement beaucoup plus large

    // Calculer la largeur totale et la position de départ
    const totalWidth = (options.length - 1) * horizontalSpacing;
    const startX = sourceNode.position.x - (totalWidth / 2);

    options.forEach((option, index) => {
      // Normaliser l'option pour l'ID du nœud
      const normalizedOption = option.trim().toLowerCase().replace(/\s+/g, '_');
      const newNodeId = `${sourceId}_${normalizedOption}`;
      
      // Calculer la position X absolue pour chaque nœud
      const xPosition = options.length === 1 
        ? sourceNode.position.x // Si un seul nœud, le centrer
        : startX + (index * horizontalSpacing);

      const newNode: Node = {
        id: newNodeId,
        type: 'questionNode',
        data: { 
          id: newNodeId,
          questionNumber: nodes.length + newNodes.length + 1,
          type: 'text',
          text: `Question for "${option}"`,
          options: [],
          media: '',
          mediaUrl: '',
          isCritical: false,
          onCreatePaths: createPathsFromNode,
          onChange: (newData: any) => handleNodeChange(newNodeId, newData)
        },
        position: { 
          x: xPosition,
          y: sourceNode.position.y + verticalSpacing,
        },
        style: {
          width: 350, // Largeur fixe pour tous les nœuds
        }
      };
      newNodes.push(newNode);

      const newEdge: Edge = {
        id: `e${sourceId}-${normalizedOption}`,
        source: sourceId,
        target: newNodeId,
        label: option,
        type: 'default',
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
        style: { 
          strokeWidth: 2,
          stroke: '#667eea',
        },
        labelStyle: { 
          fill: '#667eea', 
          fontWeight: 600,
          fontSize: 12,
        },
        labelBgStyle: { 
          fill: 'white',
          fillOpacity: 0.9,
        },
      };
      newEdges.push(newEdge);
    });

    // Ajuster la vue après l'ajout des nouveaux nœuds
    setNodes(prevNodes => [...prevNodes, ...newNodes]);
    setEdges(prevEdges => [...prevEdges, ...newEdges]);

    // Ajuster la vue après un court délai
    setTimeout(() => {
      if (reactFlowInstance) {
        reactFlowInstance.fitView({
          padding: 0.4,
          duration: 800,
          minZoom: 0.1,
          maxZoom: 1,
        });
      }
    }, 100);

  }, [nodes, handleNodeChange, reactFlowInstance]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChangeCallback = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (params: Connection) => {
      // Vérifier s'il y a une boucle potentielle
      const hasCycle = (sourceId: string, targetId: string, visited = new Set<string>()): boolean => {
        if (sourceId === targetId) return true;
        if (visited.has(targetId)) return false;
        
        visited.add(targetId);
        
        // Vérifier les connexions existantes
        const connectedEdges = edges.filter(edge => edge.source === targetId);
        return connectedEdges.some(edge => hasCycle(sourceId, edge.target, new Set(visited)));
      };

      // Vérifier si la nouvelle connexion créerait une boucle
      if (hasCycle(params.source!, params.target!)) {
        setNotification({
          show: true,
          message: 'Impossible de créer une boucle dans le flow',
          type: 'error'
        });
        
        // Masquer la notification après 3 secondes
        setTimeout(() => {
          setNotification(prev => ({ ...prev, show: false }));
        }, 3000);
        
        return edges;
      }

      // Vérifier si le nœud source existe déjà dans une connexion
      const sourceNode = nodes.find(n => n.id === params.source);
      if (!sourceNode?.data.isCritical) {
        const existingConnection = edges.find(edge => edge.source === params.source);
        if (existingConnection) {
          return edges; // Ne pas ajouter de nouvelle connexion
        }
      }

      // Ajouter la nouvelle connexion si aucune boucle n'est détectée
      return setEdges((eds) => addEdge(params, eds));
    },
    [edges, nodes]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    event.stopPropagation();
    setSelectedNode(node.id);
    setSelectedEdge(null);
  }, []);

  const onDeleteNode = useCallback(async (nodeId: string) => {
    // Empêcher la suppression de la question 1
    if (nodeId === '1') {
      setNotification({
        show: true,
        message: 'La première question ne peut pas être supprimée',
        type: 'warning'
      });
      setTimeout(() => {
        setNotification(prev => ({ ...prev, show: false }));
      }, 3000);
      return;
    }

    if (window.confirm('Are you sure you want to delete this question?')) {
      // Trouver le nœud à supprimer
      const nodeToDelete = nodes.find(node => node.id === nodeId);
      
      if (nodeToDelete?.data?.media) {
        try {
          const token = localStorage.getItem('accessToken');
          if (!token) {
            setNotification({
              show: true,
              message: 'Authentication token not found',
              type: 'error'
            });
            return;
          }

          // Supprimer le média de Cloudinary
          await dynamicSurveyService.deleteMedia(nodeToDelete.data.media, token);
        } catch (error) {
          console.error('Erreur lors de la suppression du média:', error);
          setNotification({
            show: true,
            message: 'Error while deleting media',
            type: 'error'
          });
        }
      }

      // Supprimer le nœud et ses connexions
      setNodes(prevNodes => prevNodes.filter(node => node.id !== nodeId));
      setEdges(prevEdges => prevEdges.filter(edge => 
        edge.source !== nodeId && edge.target !== nodeId
      ));
      setSelectedNode(null);

      setNotification({
        show: true,
        message: 'Question deleted successfully',
        type: 'success'
      });

      // Masquer la notification après 3 secondes
      setTimeout(() => {
        setNotification(prev => ({ ...prev, show: false }));
      }, 3000);
    }
  }, [nodes]);

  const onEdgeDelete = useCallback((edgeId: string) => {
    // Vérifier si l'edge est connectée à une question critique
    const edge = edges.find(e => e.id === edgeId);
    if (edge) {
      const sourceNode = nodes.find(node => node.id === edge.source);
      if (sourceNode?.data?.isCritical) {
        return; // Ne pas supprimer les edges des questions critiques
      }
    }
    setEdges((eds) => eds.filter((edge) => edge.id !== edgeId));
  }, [edges, nodes]);

  const onEdgeUpdate = useCallback((oldEdge: Edge, newConnection: Connection) => {
    setEdges((els) => {
      const updatedEdges = els.filter((edge) => edge.id !== oldEdge.id);
      if (newConnection) {
        const newEdge = {
          ...oldEdge,
          source: newConnection.source || oldEdge.source,
          target: newConnection.target || oldEdge.target,
        };
        updatedEdges.push(newEdge);
      } 
      return updatedEdges;
    });
  }, []);

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    // Vérifier si l'edge est connectée à une question critique
    const sourceNode = nodes.find(node => node.id === edge.source);
    if (sourceNode?.data?.isCritical) return;
    
    setSelectedEdge(edge.id);
    setSelectedNode(null);
  }, [nodes]);

  const CustomEdge = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    label,
    labelStyle,
    labelBgStyle,
    style = {},
    markerEnd,
    source,
  }: EdgeProps & { source: string }) => {
    const [edgePath, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
    });

    const isSelected = id === selectedEdge;
    const sourceNode = nodes.find(node => node.id === source);
    const isCritical = sourceNode?.data?.isCritical;

    return (
      <>
        <path
          id={id}
          style={{
            ...style,
            strokeDasharray: isSelected ? '5,5' : 'none',
            stroke: isCritical ? '#667eea' : (isSelected ? '#ff4444' : style.stroke),
            strokeWidth: isSelected ? '3' : style.strokeWidth,
            cursor: isCritical ? 'not-allowed' : 'pointer',
          }}
          className="react-flow__edge-path"
          d={edgePath}
          markerEnd={markerEnd}
        />
        <path
          d={edgePath}
          fill="none"
          strokeWidth="20"
          stroke="transparent"
          className="react-flow__edge-interaction"
          style={{
            cursor: isCritical ? 'not-allowed' : 'pointer',
          }}
        />
        {label && (
          <g transform={`translate(${labelX},${labelY})`}>
            <rect
              x="-20"
              y="-10"
              width="40"
              height="20"
              rx="5"
              ry="5"
              style={labelBgStyle}
            />
            <text
              style={labelStyle}
              dominantBaseline="middle"
              textAnchor="middle"
              fill="#000"
            >
              {label}
            </text>
          </g>
        )}
      </>
    );
  };

  const edgeTypes = {
    default: CustomEdge,
  };

  const GlobalStyles = () => (
    <style jsx global>{`
      .react-flow__edge {
        cursor: pointer;
      }
      .react-flow__edge-interaction {
        pointer-events: all;
        stroke-opacity: 0;
      }
      .react-flow__edge-interaction:hover + .react-flow__edge-path:not([style*="not-allowed"]) {
        stroke: #ff4444;
        stroke-width: 3px;
      }
      .react-flow__edge-path {
        pointer-events: none;
        transition: all 0.2s ease;
      }
    `}</style>
  );

  const nodesWithCallbacks = nodes.map(node => ({
    ...node,
    data: {
      ...node.data,
      onChange: (newData: any) => handleNodeChange(node.id, newData),
      onCreatePaths: createPathsFromNode,
      isSelected: node.id === selectedNode
    },
    style: {
      ...node.style,
      border: node.id === selectedNode ? '2px solid #ff4444' : undefined,
    }
  }));

  const DeleteButton = () => {
    if (!selectedEdge && !selectedNode) return null;
    
    // Empêcher l'affichage du bouton de suppression pour la question 1
    if (selectedNode === '1') return null;

    return (
      <div
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          zIndex: 1000,
          backgroundColor: '#ff4444',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '8px',
          cursor: 'pointer'
        }}
        onClick={() => {
          if (selectedEdge) {
            onEdgeDelete(selectedEdge);
            setSelectedEdge(null);
          }
          if (selectedNode) {
            onDeleteNode(selectedNode);
          }
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#ff0000';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#ff4444';
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 6l12 12M6 18L18 6" />
        </svg>
        Delete {selectedEdge ? 'Connection' : 'Question'}
      </div>
    );
  };

  const handlePaneClick = () => {
    setSelectedEdge(null);
    setSelectedNode(null);
  };

  const reorganizeFlow = useCallback(() => {
    const BASE_VERTICAL_SPACING = 200;
    const HORIZONTAL_SPACING = 450;
    const START_Y = 50;
    const IMAGE_HEIGHT = 200;
    const BASE_NODE_HEIGHT = 100;
    const EXTRA_SPACING_FOR_IMAGE = 50; // Espacement supplémentaire pour les parents avec image
    
    const containerWidth = 1200;
    const CENTER_X = containerWidth / 2;
    
    const nodeLevels = new Map<string, number>();
    const nodeColumns = new Map<string, number>();
    const nodeHeights = new Map<string, number>();
    const parentIds = new Map<string, string>(); // Pour tracker les relations parent-enfant
    
    // Calculer la hauteur de chaque nœud
    const calculateNodeHeight = (node: Node): number => {
      const hasMedia = node.data.mediaUrl && node.data.mediaUrl.length > 0;
      return hasMedia ? BASE_NODE_HEIGHT + IMAGE_HEIGHT : BASE_NODE_HEIGHT;
    };
    
    // Calculer l'espacement vertical nécessaire entre deux niveaux
    const calculateVerticalSpacing = (currentLevel: number, nodeId: string): number => {
      const currentLevelNodes = nodes.filter(node => nodeLevels.get(node.id) === currentLevel);
      const nextLevelNodes = nodes.filter(node => nodeLevels.get(node.id) === currentLevel + 1);
      
      const maxCurrentHeight = Math.max(
        ...currentLevelNodes.map(node => nodeHeights.get(node.id) || BASE_NODE_HEIGHT)
      );
      const maxNextHeight = Math.max(
        ...nextLevelNodes.map(node => nodeHeights.get(node.id) || BASE_NODE_HEIGHT)
      );

      // Vérifier si le parent a une image
      const parentId = parentIds.get(nodeId);
      const parentNode = parentId ? nodes.find(n => n.id === parentId) : null;
      const parentHasImage = parentNode?.data.mediaUrl && parentNode.data.mediaUrl.length > 0;
      
      const baseSpacing = Math.max(BASE_VERTICAL_SPACING, (maxCurrentHeight + maxNextHeight) / 2 + 50);
      return parentHasImage ? baseSpacing + EXTRA_SPACING_FOR_IMAGE : baseSpacing;
    };

    const shouldBranchNode = (node: Node) => {
      return node.data.type === 'Yes/No' || 
             node.data.type === 'dropdown' || 
             node.data.isCritical;
    };
    
    const calculateBranchWidth = (nodeId: string, processedNodes = new Set<string>()): number => {
      if (processedNodes.has(nodeId)) return 0;
      processedNodes.add(nodeId);
      
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return 0;
      
      const childEdges = edges.filter(edge => edge.source === nodeId);
      if (childEdges.length === 0) return 1;
      
      if (shouldBranchNode(node)) {
        return childEdges.reduce((sum, edge) => {
          return sum + calculateBranchWidth(edge.target, new Set(processedNodes));
        }, 0);
      }
      
      return 1;
    };

    const calculateLayout = () => {
      let processedNodes = new Set<string>();
      
      nodes.forEach(node => {
        nodeHeights.set(node.id, calculateNodeHeight(node));
      });

      // Construire les relations parent-enfant
      edges.forEach(edge => {
        parentIds.set(edge.target, edge.source);
      });
      
      const processNode = (nodeId: string, level: number, startColumn: number): number => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node || processedNodes.has(nodeId)) return startColumn;
        
        processedNodes.add(nodeId);
        nodeLevels.set(nodeId, level);
        
        const childEdges = edges.filter(edge => edge.source === nodeId);
        if (childEdges.length === 0) {
          nodeColumns.set(nodeId, startColumn);
          return startColumn + 1;
        }

        if (shouldBranchNode(node)) {
          const totalWidth = calculateBranchWidth(nodeId, new Set());
          const centerColumn = startColumn + (totalWidth - 1) / 2;
          nodeColumns.set(nodeId, centerColumn);
          
          let currentColumn = startColumn;
          childEdges.forEach(edge => {
            currentColumn = processNode(edge.target, level + 1, currentColumn);
          });
          
          return startColumn + totalWidth;
        } else {
          nodeColumns.set(nodeId, startColumn);
          let maxColumn = startColumn;
          childEdges.forEach(edge => {
            maxColumn = Math.max(maxColumn, processNode(edge.target, level + 1, startColumn));
          });
          return maxColumn;
        }
      };

      processNode('1', 0, 0);
    };
    
    // Fonction pour obtenir tous les nœuds dans l'ordre de parcours
    const getOrderedNodes = () => {
      const orderedNodes: string[] = [];
      const visited = new Set<string>();

      const traverse = (nodeId: string) => {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);
        orderedNodes.push(nodeId);

        // Trier les edges pour garantir un ordre cohérent
        const childEdges = edges
          .filter(edge => edge.source === nodeId)
          .sort((a, b) => {
            const aColumn = nodeColumns.get(a.target) || 0;
            const bColumn = nodeColumns.get(b.target) || 0;
            return aColumn - bColumn;
          });

        childEdges.forEach(edge => {
          traverse(edge.target);
        });
      };

      traverse('1'); // Commencer par le nœud racine
      return orderedNodes;
    };

    calculateLayout();
    const orderedNodeIds = getOrderedNodes();

    // Mettre à jour les numéros de questions
    setNodes(prevNodes => {
      const nodeMap = new Map(prevNodes.map(node => [node.id, node]));
      return orderedNodeIds.map((nodeId, index) => {
        const node = nodeMap.get(nodeId);
        if (!node) return null;

        return {
          ...node,
          position: {
            x: CENTER_X + (nodeColumns.get(nodeId) || 0) * HORIZONTAL_SPACING,
            y: (() => {
              let y = START_Y;
              const level = nodeLevels.get(nodeId) || 0;
              for (let i = 0; i < level; i++) {
                y += calculateVerticalSpacing(i, nodeId);
              }
              return y;
            })()
          },
          data: {
            ...node.data,
            questionNumber: index + 1 // Mettre à jour le numéro de question
          }
        };
      }).filter((node): node is Node => node !== null);
    });

    // Ajuster le zoom et la position de la vue
    if (reactFlowInstance) {
      setTimeout(() => {
        reactFlowInstance.fitView({
          padding: 0.2,
          duration: 800,
          minZoom: 0.1,
          maxZoom: 1,
        });
      }, 50);
    }
  }, [nodes, edges, reactFlowInstance]);

  // Ajouter le bouton de réorganisation
  const ReorganizeButton = () => (
    <div
      style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 1000,
        backgroundColor: '#667eea',
        color: 'white',
        padding: '8px 16px',
        borderRadius: '8px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
      }}
      onClick={reorganizeFlow}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#4c5ec4';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#667eea';
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 4h16v16H4z" />
        <path d="M4 12h16M12 4v16" />
      </svg>
      Reorganize Flow
    </div>
  );

  useEffect(() => {
    onEdgesChange(edges);
  }, [edges, onEdgesChange]);

  useImperativeHandle(ref, () => ({
    resetFlow: () => {
      setNodes(initialNodes);
      setEdges(initialEdges);
    },
    getNodes: () => nodes,
    addNewQuestion: () => {
      const newNodeId = (nodes.length + 1).toString();
      const selectedNodeData = selectedNode ? nodes.find(n => n.id === selectedNode) : null;

      // Vérifier si la question sélectionnée a déjà une connexion
      if (selectedNode) {
        const existingConnection = edges.find(edge => edge.source === selectedNode);
        if (existingConnection && !selectedNodeData?.data.isCritical) {
          setNotification({
            show: true,
            message: 'This question already has a connection',
            type: 'warning'
          });
          
          setTimeout(() => {
            setNotification(prev => ({ ...prev, show: false }));
          }, 3000);
          
          return;
        }
      }

      // Si la question sélectionnée est critique, ne pas créer de connexion
      if (selectedNodeData?.data.isCritical) {
        setNotification({
          show: true,
          message: 'Cannot add connection to a critical question',
          type: 'warning'
        });
        
        setTimeout(() => {
          setNotification(prev => ({ ...prev, show: false }));
        }, 3000);
        
        return;
      }

      const newNode: Node = {
        id: newNodeId,
        type: 'questionNode',
        data: { 
          id: newNodeId,
          questionNumber: nodes.length + 1,
          type: 'text',
          text: '',
          options: [],
          media: '',
          mediaUrl: '',
          isCritical: false,
          onCreatePaths: createPathsFromNode,
          onChange: (newData: any) => handleNodeChange(newNodeId, newData)
        },
        position: { 
          x: selectedNode 
            ? nodes.find(n => n.id === selectedNode)?.position.x || 250
            : 250, 
          y: selectedNode 
            ? (nodes.find(n => n.id === selectedNode)?.position.y || 0) + 150
            : nodes.length * 150 
        },
      };

      setNodes(prevNodes => [...prevNodes, newNode]);

      // Créer une connexion uniquement si une question non critique est sélectionnée
      if (selectedNode && !selectedNodeData?.data.isCritical) {
        const newEdge: Edge = {
          id: `e${selectedNode}-${newNodeId}`,
          source: selectedNode,
          target: newNodeId,
          type: 'default',
          markerEnd: {
            type: MarkerType.ArrowClosed,
          },
          style: { 
            strokeWidth: 2,
            stroke: '#667eea',
          },
        };
        setEdges(prevEdges => [...prevEdges, newEdge]);
      }
    },
    setNodes: (newNodes: Node[]) => {
      setNodes(newNodes);
    },
    reorganizeFlow: reorganizeFlow,
  }));

  return (
    <>
      <GlobalStyles />
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        {notification.show && (
          <div
            style={{
              position: 'absolute',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1000,
              padding: '10px 20px',
              borderRadius: '4px',
              backgroundColor: notification.type === 'error' ? '#ff4444' : notification.type === 'success' ? '#66cc66' : '#667eea',
              color: 'white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            }}
          >
            {notification.message}
          </div>
        )}
        <DeleteButton />
        <ReorganizeButton />
        <ReactFlow
          nodes={nodesWithCallbacks}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChangeCallback}
          onConnect={onConnect}
          onEdgeUpdate={onEdgeUpdate}
          onEdgeClick={onEdgeClick}
          onNodeClick={onNodeClick}
          onPaneClick={handlePaneClick}
          connectionMode={ConnectionMode.Loose}
          minZoom={0.1}
          defaultEdgeOptions={{
            type: 'default',
            style: {
              strokeWidth: 2,
              stroke: '#667eea',
            },
          }}
          fitView
          onInit={setReactFlowInstance}
          onMove={(event, viewport) => {
            setReactFlowInstance((prev) => ({
              ...prev!,
              viewportInitialized: true,
              viewport,
            } as ReactFlowInstance));
          }}
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    </>
  );
});

export default SurveyFlow; 