"use client";

import React, { useState, useCallback, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
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
import { IconButton, Fab, Button, Tooltip } from '@mui/material';

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
  const [isMobile, setIsMobile] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const flowContainerRef = useRef<HTMLDivElement>(null);
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: 'error' | 'warning' | 'info' | 'success';
  }>({
    show: false,
    message: '',
    type: 'info'
  });

  // Ajouter un useEffect pour détecter la taille de l'écran
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    // Vérifier au chargement
    checkMobile();

    // Ajouter un écouteur d'événements pour les changements de taille
    window.addEventListener('resize', checkMobile);

    // Nettoyer l'écouteur
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
      const element = flowContainerRef.current;
      if (element) {
        if (element.requestFullscreen) {
          element.requestFullscreen();
        } else if ((element as any).webkitRequestFullscreen) {
          (element as any).webkitRequestFullscreen();
        } else if ((element as any).webkitEnterFullscreen) {
          (element as any).webkitEnterFullscreen();
        }
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).webkitCancelFullscreen) {
        (document as any).webkitCancelFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  // Ajouter un écouteur pour détecter la sortie du mode plein écran
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFullscreenActive = !!(
        document.fullscreenElement || 
        (document as any).webkitFullscreenElement ||
        (document as any).webkitIsFullScreen
      );
      setIsFullscreen(isFullscreenActive);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitbeginfullscreen', handleFullscreenChange);
    document.addEventListener('webkitendfullscreen', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitbeginfullscreen', handleFullscreenChange);
      document.removeEventListener('webkitendfullscreen', handleFullscreenChange);
    };
  }, []);

  const handleNodeChange = useCallback((nodeId: string, newData: any) => {
    setNodes(prevNodes => {
      const filteredData = { ...newData };
      if ('_editingState' in filteredData) {
        delete filteredData._editingState;
      }
      
      const updatedNodes = prevNodes.map(node => 
        node.id === nodeId 
          ? { ...node, data: { ...node.data, ...filteredData } }
          : node
      );

      const editedNode = updatedNodes.find(n => n.id === nodeId);
      if (editedNode && '_editingState' in newData) {
        const isEditing = newData._editingState;
        const EDITING_HEIGHT_INCREASE = 400;
        
        // Utiliser les mêmes constantes que dans reorganizeFlow pour la cohérence
        const BASE_VERTICAL_SPACING = 200;
        const EXTRA_SPACING_FOR_CRITICAL = 50;
        const EXTRA_SPACING_FOR_IMAGE = 50;
        const BASE_NODE_HEIGHT = 100;
        
        // Vérifier si un nœud est dans la même branche/colonne que le nœud édité
        const isInSameColumn = (node: Node, editedNode: Node) => {
          // On considère qu'un nœud est dans la même colonne s'il est dans un intervalle de +/- 100px en X
          const xDiff = Math.abs(node.position.x - editedNode.position.x);
          return xDiff < 100;
        };
        
        const isNodeBelow = (node1: Node, node2: Node) => {
          return node1.position.y > node2.position.y;
        };
        
        const isChildOfEditedNode = (node: Node) => {
          return edges.some(edge => edge.source === editedNode.id && edge.target === node.id);
        };
        
        const isParentOfEditedNode = (node: Node) => {
          return edges.some(edge => edge.source === node.id && edge.target === editedNode.id);
        };
        
        const isDescendantOfEditedNode = (node: Node, visited = new Set<string>()) => {
          if (visited.has(node.id)) return false;
          visited.add(node.id);
          
          // Vérifier si c'est un enfant direct
          if (isChildOfEditedNode(node)) return true;
          
          // Vérifier récursivement pour les enfants directs
          const childEdges = edges.filter(edge => edge.source === editedNode.id);
          for (const edge of childEdges) {
            const childNode = updatedNodes.find(n => n.id === edge.target);
            if (childNode && isDescendantOfEditedNode(childNode, new Set(visited))) {
              return true;
            }
          }
          
          return false;
        };
        
        if (isEditing) {
          return updatedNodes.map(node => {
            if (node.id === nodeId) return node;
            
            const isChild = isChildOfEditedNode(node);
            const isBelow = isNodeBelow(node, editedNode);
            const isSameColumn = isInSameColumn(node, editedNode);
            
            // Déplacer vers le bas uniquement les nœuds qui sont:
            // 1. Directement en dessous dans la même colonne, ou
            // 2. Des enfants directs du nœud édité
            if ((isBelow && isSameColumn) || isChild) {
              return {
                ...node,
                data: {
                  ...node.data,
                  _originalPosition: { ...node.position }
                },
                position: {
                  ...node.position,
                  y: node.position.y + EDITING_HEIGHT_INCREASE
                }
              };
            }
            return node;
          });
        } else {
          return updatedNodes.map(node => {
            if (node.id === nodeId) return node;
            
            if (node.data._originalPosition) {
              const originalPos = node.data._originalPosition;
              const newData = { ...node.data };
              delete newData._originalPosition;
              
              const isDirectChild = isChildOfEditedNode(node);
              const isDirectParent = isParentOfEditedNode(node);
              
              // Si c'est un enfant direct, appliquer la même logique que reorganizeFlow
              if (isDirectChild) {
                // Calculer l'espacement comme dans reorganizeFlow
                let baseSpacing = BASE_VERTICAL_SPACING;
                
                // Si le nœud édité est critique, ajuster l'espacement
                if (editedNode.data.isCritical) {
                  baseSpacing = BASE_VERTICAL_SPACING + 30;
                  baseSpacing += EXTRA_SPACING_FOR_CRITICAL;
                }
                
                // Ajouter un espacement supplémentaire si la question a une image
                if (editedNode.data.mediaUrl && editedNode.data.mediaUrl.length > 0) {
                  baseSpacing += EXTRA_SPACING_FOR_IMAGE;
                }
                
                return {
                  ...node,
                  data: newData,
                  position: {
                    ...originalPos,
                    y: editedNode.position.y + baseSpacing
                  }
                };
              }
              
              return {
                ...node,
                data: newData,
                position: originalPos
              };
            }
            return node;
          });
        }
      }
      
      return updatedNodes;
    });
  }, [edges]);

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
    
    // Utiliser exactement les mêmes constantes que dans reorganizeFlow
    const BASE_VERTICAL_SPACING = 200;
    const HORIZONTAL_SPACING = 450;
    const EXTRA_SPACING_FOR_CRITICAL = 50;
    const EXTRA_SPACING_FOR_IMAGE = 50;
    const EXTRA_SPACING_FOR_NESTED = 120;
    const BASE_NODE_HEIGHT = 100;
    
    // Calculer l'espacement vertical en appliquant exactement la même logique que reorganizeFlow
    // Initialiser l'espacement de base
    let baseSpacing;
    
    // Vérifier si le nœud source est critique
    const isSourceCritical = sourceNode.data.isCritical || false;
    
    // Cas où le nœud parent est critique (ajout direct d'enfants à un nœud critique)
    if (isSourceCritical) {
      // Utiliser exactement la même logique que dans calculateVerticalSpacing pour "parentIsCritical && !isCurrentNodeCritical"
      baseSpacing = Math.max(BASE_VERTICAL_SPACING + 30, BASE_NODE_HEIGHT + 30);
      
      // Ajouter l'espacement supplémentaire pour les questions critiques
      baseSpacing += EXTRA_SPACING_FOR_CRITICAL;
    } 
    // Cas standard (non critique)
    else {
      baseSpacing = Math.max(BASE_VERTICAL_SPACING, BASE_NODE_HEIGHT + 50);
    }
    
    // Ajouter un espacement supplémentaire si la question a une image
    if (sourceNode.data.mediaUrl && sourceNode.data.mediaUrl.length > 0) {
      baseSpacing += EXTRA_SPACING_FOR_IMAGE;
    }
    
    // Calculer l'espacement horizontal réel comme dans reorganizeFlow
    // Si le nœud est critique ou a plusieurs options, on utilise un espacement horizontal complet
    const shouldBranch = isSourceCritical || options.length > 1;
    const horizontalSpacing = shouldBranch ? HORIZONTAL_SPACING : 0;

    // Calculate the total width and starting position
    const totalWidth = (options.length - 1) * horizontalSpacing;
    const startX = sourceNode.position.x - (totalWidth / 2);

    options.forEach((option, index) => {
      // Normalize the option for the node ID
      const normalizedOption = option.trim().toLowerCase().replace(/\s+/g, '_');
      const newNodeId = `${sourceId}_${normalizedOption}`;
      
      // Calculate the absolute X position for each node, en cohérence avec reorganizeFlow
      const xPosition = options.length === 1 
        ? sourceNode.position.x // If there's only one node, center it
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
          y: sourceNode.position.y + baseSpacing,
        },
        style: {
          width: 450, // Utiliser la même largeur que dans reorganizeFlow (ligne 1081)
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

    // Adjust the view after adding new nodes
    setNodes(prevNodes => [...prevNodes, ...newNodes]);
    setEdges(prevEdges => [...prevEdges, ...newEdges]);

    // Check if this is an initial creation or modifying existing options
    // If nodes didn't exist before, adjust the view
    const existingPathNodes = nodes.some(node => node.id.startsWith(`${sourceId}_`));
    if (!existingPathNodes && reactFlowInstance) {
      setTimeout(() => {
        reactFlowInstance.fitView({
          padding: 0.4,
          duration: 800,
          minZoom: 0.1,
          maxZoom: 1,
        });
      }, 100);
    }

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
      // Check for potential cycle
      const hasCycle = (sourceId: string, targetId: string, visited = new Set<string>()): boolean => {
        if (sourceId === targetId) return true;
        if (visited.has(targetId)) return false;
        
        visited.add(targetId);
        
        // Check existing connections
        const connectedEdges = edges.filter(edge => edge.source === targetId);
        return connectedEdges.some(edge => hasCycle(sourceId, edge.target, new Set(visited)));
      };

      // Check if the new connection would create a cycle
      if (hasCycle(params.source!, params.target!)) {
        setNotification({
          show: true,
          message: 'Cannot create a loop in the flow',
          type: 'error'
        });
        
        // Hide notification after 3 seconds
        setTimeout(() => {
          setNotification(prev => ({ ...prev, show: false }));
        }, 3000);
        
        return edges;
      }

      // Check if the source node already exists in a connection
      const sourceNode = nodes.find(n => n.id === params.source);
      if (!sourceNode?.data.isCritical) {
        const existingConnection = edges.find(edge => edge.source === params.source);
        if (existingConnection) {
          return edges; // Don't add new connection
        }
      }

      // Add new connection if no cycle is detected
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
    // Prevent deleting question 1
    if (nodeId === '1') {
      setNotification({
        show: true,
        message: 'The first question cannot be deleted',
        type: 'warning'
      });
      setTimeout(() => {
        setNotification(prev => ({ ...prev, show: false }));
      }, 3000);
      return;
    }

    // Ajouter des styles de transition pour l'animation de suppression
    const addDeleteTransitionStyles = () => {
      const styleElement = document.createElement('style');
      styleElement.id = 'delete-transition-styles';
      styleElement.textContent = `
        .react-flow__node {
          transition: transform 0.5s ease, opacity 0.5s ease !important;
        }
        .react-flow__edge {
          transition: opacity 0.5s ease !important;
        }
      `;
      document.head.appendChild(styleElement);

      // Supprimer les styles après l'animation
      setTimeout(() => {
        const existingStyle = document.getElementById('delete-transition-styles');
        if (existingStyle) {
          existingStyle.remove();
        }
      }, 1000);
    };

    addDeleteTransitionStyles();

    // Trouver le nœud à supprimer
    const nodeToDelete = nodes.find(node => node.id === nodeId);
    
    // Trouver les arêtes connectées à ce nœud
    const connectedEdges = edges.filter(edge => 
      edge.source === nodeId || edge.target === nodeId
    );
    
    // Animer la disparition du nœud et des arêtes
    setNodes(prevNodes => 
      prevNodes.map(node => 
        node.id === nodeId 
          ? { ...node, style: { ...node.style, opacity: 0 } } 
          : node
      )
    );
    
    setEdges(prevEdges => 
      prevEdges.map(edge => 
        connectedEdges.some(e => e.id === edge.id)
          ? { ...edge, style: { ...edge.style, opacity: 0 } } 
          : edge
      )
    );
    
    // Attendre que l'animation se termine avant de supprimer réellement
    setTimeout(async () => {
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

          // Delete media from Cloudinary
          await dynamicSurveyService.deleteMedia(nodeToDelete.data.media, token);
        } catch (error) {
          console.error('Error deleting media:', error);
          setNotification({
            show: true,
            message: 'Error while deleting media',
            type: 'error'
          });
        }
      }

      // Delete node and its connections
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

      // Hide notification after 3 seconds
      setTimeout(() => {
        setNotification(prev => ({ ...prev, show: false }));
      }, 3000);
    }, 500); // Attendre que l'animation de disparition se termine
  }, [nodes, edges]);

  const onEdgeDelete = useCallback((edgeId: string) => {
    // Check if the edge is connected to a critical question
    const edge = edges.find(e => e.id === edgeId);
    if (edge) {
      const sourceNode = nodes.find(node => node.id === edge.source);
      if (sourceNode?.data?.isCritical) {
        return; // Don't delete edges from critical questions
      }
    }
    
    // Ajouter des styles de transition pour l'animation
    const addEdgeDeleteTransitionStyles = () => {
      const styleElement = document.createElement('style');
      styleElement.id = 'edge-delete-transition-styles';
      styleElement.textContent = `
        .react-flow__edge {
          transition: opacity 0.5s ease !important;
        }
      `;
      document.head.appendChild(styleElement);

      // Supprimer les styles après l'animation
      setTimeout(() => {
        const existingStyle = document.getElementById('edge-delete-transition-styles');
        if (existingStyle) {
          existingStyle.remove();
        }
      }, 1000);
    };

    addEdgeDeleteTransitionStyles();
    
    // Animer la disparition de l'arête
    setEdges(prevEdges => 
      prevEdges.map(e => 
        e.id === edgeId 
          ? { ...e, style: { ...e.style, opacity: 0 } } 
          : e
      )
    );
    
    // Supprimer l'arête après que l'animation soit terminée
    setTimeout(() => {
      setEdges(prevEdges => prevEdges.filter(edge => edge.id !== edgeId));
    }, 500);
  }, [edges, nodes]);

  const onEdgeUpdate = useCallback((oldEdge: Edge, newConnection: Connection) => {
    // Check for potential cycle with the new connection
    const hasCycle = (sourceId: string, targetId: string, visited = new Set<string>()): boolean => {
      if (sourceId === targetId) return true;
      if (visited.has(targetId)) return false;
      
      visited.add(targetId);
      
      // Check existing connections
      const connectedEdges = edges.filter(edge => edge.source === targetId);
      return connectedEdges.some(edge => hasCycle(sourceId, edge.target, new Set(visited)));
    };

    // If the new connection would create a cycle, prevent it
    if (newConnection.source && newConnection.target && 
        hasCycle(newConnection.source, newConnection.target)) {
      setNotification({
        show: true,
        message: 'Cannot create a loop in the flow',
        type: 'error'
      });
      
      // Hide notification after 3 seconds
      setTimeout(() => {
        setNotification(prev => ({ ...prev, show: false }));
      }, 3000);
      
      return; // Keep original edges unchanged
    }

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
  }, [edges]);

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    // Check if the edge is connected to a critical question
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

  const nodesWithCallbacks = nodes.map(node => {
    // Find the parent node
    const parentEdge = edges.find(edge => edge.target === node.id);
    const parentNode = parentEdge ? nodes.find(n => n.id === parentEdge.source) : null;
    const isChildOfCritical = parentNode?.data?.isCritical;

    return {
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
        width: 450,
      }
    };
  });

  const DeleteButton = () => {
    if (!selectedEdge && !selectedNode) return null;
    
    // Prevent showing the delete button for question 1
    if (selectedNode === '1') return null;

    return (
      <Button
        variant="contained"
        color="error"
        startIcon={
          <svg 
            width="18" 
            height="18" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
          >
            <path d="M6 6l12 12M6 18L18 6" />
          </svg>
        }
        sx={{
          position: 'absolute',
          top: '70px',
          left: '20px',
          zIndex: 1000,
          backgroundColor: '#ff4444',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          '&:hover': {
            backgroundColor: '#ff0000',
          },
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
        TouchRippleProps={{
          classes: {
            child: 'touch-ripple-child',
          },
        }}
      >
        Delete {selectedEdge ? 'Connection' : 'Question'}
      </Button>
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
    const EXTRA_SPACING_FOR_IMAGE = 50;
    const EXTRA_SPACING_FOR_CRITICAL = 50;
    const EXTRA_SPACING_FOR_NESTED = 120; // Espacement pour les nœuds imbriqués (C)
    
    const containerWidth = 1200;
    const CENTER_X = containerWidth / 2;
    
    const nodeLevels = new Map<string, number>();
    const nodeColumns = new Map<string, number>();
    const nodeHeights = new Map<string, number>();
    const parentIds = new Map<string, string>();
    const nodeDepths = new Map<string, number>(); // Pour calculer la profondeur des nœuds
    
    // Calculate the height of each node
    const calculateNodeHeight = (node: Node): number => {
      const hasMedia = node.data.mediaUrl && node.data.mediaUrl.length > 0;
      return hasMedia ? BASE_NODE_HEIGHT + IMAGE_HEIGHT : BASE_NODE_HEIGHT;
    };
    
    // Vérifier si un nœud est descendant d'un nœud critique
    const isDescendantOfCritical = (nodeId: string, depth = 0, visited = new Set<string>()): { result: boolean, depth: number } => {
      if (depth > 10 || visited.has(nodeId)) return { result: false, depth: 0 }; // Éviter les boucles infinies
      visited.add(nodeId);
      
      // Trouver le parent du nœud
      const parentId = parentIds.get(nodeId);
      if (!parentId) return { result: false, depth: 0 };
      
      // Vérifier si le parent est critique
      const parentNode = nodes.find(n => n.id === parentId);
      if (parentNode?.data.isCritical) {
        return { result: true, depth: 1 };
      }
      
      // Récursion: vérifier les ancêtres
      const ancestorResult = isDescendantOfCritical(parentId, depth + 1, visited);
      if (ancestorResult.result) {
        return { result: true, depth: ancestorResult.depth + 1 };
      }
      
      return { result: false, depth: 0 };
    };
    
    // Calculate the vertical spacing needed between two levels
    const calculateVerticalSpacing = (currentLevel: number, nodeId: string): number => {
      const currentLevelNodes = nodes.filter(node => nodeLevels.get(node.id) === currentLevel);
      const nextLevelNodes = nodes.filter(node => nodeLevels.get(node.id) === currentLevel + 1);
      
      const maxCurrentHeight = Math.max(
        ...currentLevelNodes.map(node => nodeHeights.get(node.id) || BASE_NODE_HEIGHT),
        BASE_NODE_HEIGHT
      );
      const maxNextHeight = Math.max(
        ...nextLevelNodes.map(node => nodeHeights.get(node.id) || BASE_NODE_HEIGHT),
        BASE_NODE_HEIGHT
      );

      // Check if the parent has an image
      const parentId = parentIds.get(nodeId);
      const parentNode = parentId ? nodes.find(n => n.id === parentId) : null;
      const parentHasImage = parentNode?.data.mediaUrl && parentNode.data.mediaUrl.length > 0;
      const parentIsCritical = parentNode?.data.isCritical || false;
      
      // Vérifier si le nœud courant est critique ou son parent
      const currentNode = nodes.find(n => n.id === nodeId);
      const isCurrentNodeCritical = currentNode?.data.isCritical || false;
      
      // Vérifier si le nœud est un descendant d'un nœud critique (cas B ou C)
      const descentInfo = isDescendantOfCritical(nodeId);
      const isDescendant = descentInfo.result;
      const descentDepth = descentInfo.depth;
      
      // Vérifier si le parent est un enfant d'une question critique (cas B)
      // Si oui, son parent est une question critique
      const parentDescentInfo = parentId ? isDescendantOfCritical(parentId) : { result: false, depth: 0 };
      const isParentDescendantOfCritical = parentDescentInfo.result;
      const parentDescentDepth = parentDescentInfo.depth;
      
      // Calculer l'espacement vertical de base en fonction du contexte
      let baseSpacing;
      
      // Cas où le parent est un descendant d'une question critique (B, C, D, etc.)
      // et le nœud actuel n'est pas critique lui-même
      if (isParentDescendantOfCritical && !isCurrentNodeCritical && parentDescentDepth >= 1) {
        // Appliquer le même espacement standardisé pour tous les descendants
        // à partir du niveau C et au-delà
        baseSpacing = Math.max(BASE_VERTICAL_SPACING + 80, (maxCurrentHeight + maxNextHeight) / 2 + 50);
      }
      // Si ni le nœud courant ni son parent ne sont critiques ou descendants de critiques
      else if (!isCurrentNodeCritical && !parentIsCritical && !isParentDescendantOfCritical) {
        baseSpacing = Math.max(BASE_VERTICAL_SPACING, (maxCurrentHeight + maxNextHeight) / 2 + 50);
      } 
      // Cas où le parent est critique - réduire légèrement l'espacement
      else if (parentIsCritical && !isCurrentNodeCritical) {
        baseSpacing = Math.max(BASE_VERTICAL_SPACING + 30, (maxCurrentHeight + maxNextHeight) / 2 + 50);
      }
      // Sinon, utiliser l'espacement standard
      else {
        baseSpacing = Math.max(BASE_VERTICAL_SPACING + 50, (maxCurrentHeight + maxNextHeight) / 2 + 50);
      }
      
      // Add extra spacing for images
      if (parentHasImage) {
        baseSpacing += EXTRA_SPACING_FOR_IMAGE;
      }
      
      // Add extra spacing for critical questions, mais pas si le parent est déjà un descendant d'une question critique
      if (parentIsCritical && !isParentDescendantOfCritical) {
        baseSpacing += EXTRA_SPACING_FOR_CRITICAL;
      }
      
      return baseSpacing;
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

      // Build parent-child relationships
      edges.forEach(edge => {
        parentIds.set(edge.target, edge.source);
      });
      
      const processNode = (nodeId: string, level: number, startColumn: number, depth: number = 0): number => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node || processedNodes.has(nodeId)) return startColumn;
        
        processedNodes.add(nodeId);
        nodeLevels.set(nodeId, level);
        nodeDepths.set(nodeId, depth);  // Stocker la profondeur
        
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
            currentColumn = processNode(edge.target, level + 1, currentColumn, depth + 1);
          });
          
          return startColumn + totalWidth;
        } else {
          nodeColumns.set(nodeId, startColumn);
          let maxColumn = startColumn;
          childEdges.forEach(edge => {
            maxColumn = Math.max(maxColumn, processNode(edge.target, level + 1, startColumn, depth + 1));
          });
          return maxColumn;
        }
      };

      processNode('1', 0, 0);
    };
    
    // Function to get all nodes in traversal order
    const getOrderedNodes = () => {
      const orderedNodes: string[] = [];
      const visited = new Set<string>();

      const traverse = (nodeId: string) => {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);
        orderedNodes.push(nodeId);

        // Sort edges for consistent order
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

      traverse('1'); // Start from root node
      return orderedNodes;
    };

    calculateLayout();
    const orderedNodeIds = getOrderedNodes();

    // Ajouter des styles de transition pour l'animation
    const addTransitionStyles = () => {
      const styleElement = document.createElement('style');
      styleElement.id = 'node-transition-styles';
      styleElement.textContent = `
        .react-flow__node {
          transition: transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
        }
        .react-flow__edge {
          transition: all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
        }
        .react-flow__edge-path {
          transition: all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
        }
      `;
      document.head.appendChild(styleElement);

      // Supprimer les styles après l'animation
      setTimeout(() => {
        const existingStyle = document.getElementById('node-transition-styles');
        if (existingStyle) {
          existingStyle.remove();
        }
      }, 1500);
    };

    // Ajouter les styles de transition
    addTransitionStyles();

    // Update question numbers and positions
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
            questionNumber: index + 1 // Update question number
          }
        };
      }).filter((node): node is Node => node !== null);
    });

    // Adjust zoom and view position
    if (reactFlowInstance) {
      setTimeout(() => {
        reactFlowInstance.fitView({
          padding: 0.2,
          duration: 800,
          minZoom: 0.1,
          maxZoom: 1,
        });
      }, 1000); // Attendre que l'animation soit presque terminée
    }
  }, [nodes, edges, reactFlowInstance]);

  // Add data-intro attribute to reorganize button
  const ReorganizeButton = () => (
    <Button
      variant="contained"
      startIcon={
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 4h16v16H4z" />
          <path d="M4 12h16M12 4v16" />
        </svg>
      }
      sx={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 1000,
        backgroundColor: '#667eea',
        color: 'white',
        padding: '8px 16px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        '&:hover': {
          backgroundColor: '#4c5ec4',
        },
      }}
      onClick={reorganizeFlow}
      TouchRippleProps={{
        classes: {
          child: 'touch-ripple-child',
        },
      }}
    >
      Reorganize Flow
    </Button>
  );

  const addNewQuestion = () => {
      const newNodeId = (nodes.length + 1).toString();
      const selectedNodeData = selectedNode ? nodes.find(n => n.id === selectedNode) : null;

      // Check if the selected question already has a connection
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

      // If the selected question is critical, don't create a connection
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

      // Ajouter des styles de transition pour l'animation
      const addTransitionStyles = () => {
        const styleElement = document.createElement('style');
        styleElement.id = 'new-node-transition-styles';
        styleElement.textContent = `
          .react-flow__node {
            transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.5s ease !important;
          }
          .react-flow__edge {
            transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.5s ease !important;
          }
          .react-flow__edge-path {
            transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
          }
        `;
        document.head.appendChild(styleElement);

        // Supprimer les styles après l'animation
        setTimeout(() => {
          const existingStyle = document.getElementById('new-node-transition-styles');
          if (existingStyle) {
            existingStyle.remove();
          }
        }, 1000);
      };

      // Ajouter les styles de transition
      addTransitionStyles();

    // Calculer la position Y en fonction des nœuds existants
    let maxY = 0;
    let editingNodeY = 0;
    let isEditingMode = false;
    const BASE_SPACING = 200; // Correspond à BASE_VERTICAL_SPACING dans reorganizeFlow
    const EDITING_SPACING = 400; // Maintenu pour le mode édition

    nodes.forEach(node => {
      if (node.position.y > maxY) {
        maxY = node.position.y;
      }
      // Vérifier si le nœud est en mode édition
      if (node.data._editingState) {
        editingNodeY = node.position.y;
        isEditingMode = true;
      }
    });

    // Calculer la position Y de la nouvelle question
    let newY;
    if (selectedNode) {
      const selectedNodeY = nodes.find(n => n.id === selectedNode)?.position.y || 0;
      if (isEditingMode && selectedNode === nodes.find(n => n.data._editingState)?.id) {
        // Si le nœud sélectionné est en mode édition, placer la nouvelle question en dessous avec l'espacement d'édition
        newY = selectedNodeY + EDITING_SPACING;
      } else {
        // Sinon, placer la nouvelle question en dessous avec l'espacement normal
        newY = selectedNodeY + BASE_SPACING;
      }
    } else {
      newY = maxY + BASE_SPACING;
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
        y: newY
        },
        style: {
          opacity: 0 // Commencer avec une opacité de 0 pour l'animation
        }
      };

      // Ajouter le nouveau nœud avec animation
      setNodes(prevNodes => [...prevNodes, newNode]);

      // Animer l'apparition du nœud après un court délai
      setTimeout(() => {
        setNodes(prevNodes => 
          prevNodes.map(node => 
            node.id === newNodeId 
              ? { ...node, style: { ...node.style, opacity: 1 } } 
              : node
          )
        );
      }, 50);

      // Create a connection only if a non-critical question is selected
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
            opacity: 0, // Commencer avec une opacité de 0 pour l'animation
          },
        };
        
        // Ajouter l'arête avec animation
        setEdges(prevEdges => [...prevEdges, newEdge]);
        
        // Animer l'apparition de l'arête après un court délai
        setTimeout(() => {
          setEdges(prevEdges => 
            prevEdges.map(edge => 
              edge.id === newEdge.id 
                ? { ...edge, style: { ...edge.style, opacity: 1 } } 
                : edge
            )
          );
        }, 100);
      }

      // Ajuster la vue après l'ajout du nouveau nœud
      if (reactFlowInstance) {
        setTimeout(() => {
          reactFlowInstance.fitView({
            padding: 0.4,
            duration: 800,
            minZoom: 0.1,
            maxZoom: 1,
          });
        }, 300);
      }
  };

  useEffect(() => {
    onEdgesChange(edges);
  }, [edges, onEdgesChange]);

  useImperativeHandle(ref, () => ({
    resetFlow: () => {
      // Créer un tout nouveau nœud avec isCritical explicitement à false
      const brandNewNode: Node = {
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
          onCreatePaths: createPathsFromNode,
          onChange: (newData: any) => handleNodeChange('1', newData)
        },
        position: { x: 400, y: 50 },
      };
      
      // Remplacer tous les nœuds par ce nouveau nœud
      setNodes([brandNewNode]);
      setEdges([]);
      
      // Forcer une mise à jour explicite via handleNodeChange
      setTimeout(() => {
        handleNodeChange('1', { 
          isCritical: false,
          type: 'text',
          options: []
        });
        
        // Suppression explicite des chemins
        createPathsFromNode('1', []);
        
        // Log pour debug
        console.log("Reset flow: node data forced update", brandNewNode);
      }, 100);
      
      // Ajouter une animation de transition pour l'effet visuel
      const addTransitionStyles = () => {
        const styleElement = document.createElement('style');
        styleElement.id = 'reset-transition-styles';
        styleElement.textContent = `
          .react-flow__node {
            transition: transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.7s ease !important;
          }
        `;
        document.head.appendChild(styleElement);

        // Supprimer les styles après l'animation
        setTimeout(() => {
          const existingStyle = document.getElementById('reset-transition-styles');
          if (existingStyle) {
            existingStyle.remove();
          }
        }, 1500);
      };
      
      addTransitionStyles();
      
      // Afficher une notification de confirmation
      setNotification({
        show: true,
        message: 'Flow has been reset successfully',
        type: 'success'
      });
      
      // Masquer la notification après quelques secondes
      setTimeout(() => {
        setNotification(prev => ({ ...prev, show: false }));
      }, 3000);
      
      // Réorganiser le flux après un court délai pour l'animation
      setTimeout(() => {
        reorganizeFlow();
      }, 300);
    },
    getNodes: () => nodes,
    addNewQuestion: addNewQuestion,
    setNodes: (newNodes: Node[]) => {
      setNodes(newNodes);
    },
    reorganizeFlow: reorganizeFlow,
  }));

  // Ajouter un composant pour les notifications
  const NotificationMessage = () => {
    if (!notification.show) return null;

    return (
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 99999,
          padding: '10px 20px',
          borderRadius: '8px',
          backgroundColor: notification.type === 'error' ? '#ff4444' : 
                         notification.type === 'warning' ? '#ffbb33' : 
                         notification.type === 'success' ? '#00C851' : '#667eea',
          color: 'white',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          minWidth: '200px',
          justifyContent: 'center',
          animation: 'slideDown 0.3s ease-out',
          pointerEvents: 'auto',
        }}
      >
        {notification.message}
      </div>
    );
  };

  return (
    <>
      <GlobalStyles />
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <div 
          ref={flowContainerRef}
          style={{ 
            width: '100%', 
            height: '100%',
            position: 'relative',
            transition: 'all 0.3s ease',
            ...(isFullscreen && {
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              zIndex: 9999,
              backgroundColor: 'white',
              WebkitOverflowScrolling: 'touch', // Pour le défilement fluide sur iOS
              overflow: 'auto'
            })
          }}
        >
          <NotificationMessage />
          <DeleteButton />
          <ReorganizeButton />
          <div
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              zIndex: 10000,
            }}
            className="custom-tooltip-container"
          >
            <IconButton
              onClick={toggleFullscreen}
              sx={{
                backgroundColor: 'white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                '&:hover': {
                  backgroundColor: '#f5f5f5',
                },
                position: 'relative',
              }}
              TouchRippleProps={{
                classes: {
                  child: 'touch-ripple-child',
                },
              }}
              aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                </svg>
              )}
            </IconButton>
            <div className="custom-tooltip">
              {isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            </div>
          </div>
          {isFullscreen && (
            <Fab
              color="primary"
              aria-label="add question"
              onClick={addNewQuestion}
              sx={{
                position: 'absolute',
                bottom: 24,
                right: 24,
                zIndex: 1000,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                },
              }}
              TouchRippleProps={{
                classes: {
                  child: 'touch-ripple-child',
                },
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </Fab>
          )}
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
              markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 20,
                height: 20,
                color: '#667eea',
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
            {!isMobile && <MiniMap />}
          </ReactFlow>
        </div>
      </div>
      <style jsx global>{`
        @keyframes slideDown {
          from {
            transform: translate(-50%, -100%);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
        .react-flow__attribution {
          display: none !important;
        }
        
        /* Styles pour l'infobulle personnalisée */
        .custom-tooltip-container {
          position: relative;
        }
        
        .custom-tooltip {
          position: absolute;
          right: 48px;
          top: 50%;
          transform: translateY(-50%);
          background-color: rgba(97, 97, 97, 0.92);
          color: white;
          padding: 8px 10px;
          border-radius: 4px;
          font-size: 12px;
          font-family: "Roboto", "Helvetica", "Arial", sans-serif;
          font-weight: 500;
          line-height: 1.4em;
          white-space: nowrap;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.2s, visibility 0.2s;
          z-index: 30000;
          visibility: hidden;
          max-width: 300px;
          box-shadow: 0 3px 6px rgba(0, 0, 0, 0.16);
          letter-spacing: 0.03em;
        }
        
        .custom-tooltip::after {
          content: "";
          position: absolute;
          top: 50%;
          right: -8px;
          transform: translateY(-50%);
          border-width: 8px 0 8px 8px;
          border-style: solid;
          border-color: transparent transparent transparent rgba(97, 97, 97, 0.92);
        }
        
        .custom-tooltip-container:hover .custom-tooltip {
          opacity: 1;
          visibility: visible;
          transition-delay: 0.4s;
        }
      `}</style>
    </>
  );
});

export default SurveyFlow; 