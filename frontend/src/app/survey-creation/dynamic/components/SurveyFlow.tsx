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
} from 'reactflow';
import 'reactflow/dist/style.css';
import QuestionNode from './QuestionNode';

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

const SurveyFlow = forwardRef<{ 
  resetFlow: () => void;
  getNodes: () => any[];
  addNewQuestion: () => void;
}, SurveyFlowProps>(({ onAddNode, onEdgesChange }, ref) => {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

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

    // Supprimer les anciens nœuds et edges
    setNodes(prevNodes => prevNodes.filter(node => !node.id.startsWith(`${sourceId}_`)));
    setEdges(prevEdges => prevEdges.filter(edge => edge.source !== sourceId));

    if (options.length === 0) return;

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    const verticalSpacing = 150; // Espacement vertical
    const horizontalSpacing = 200; // Espacement horizontal

    options.forEach((option, index) => {
      const newNodeId = `${sourceId}_${option}`;
      console.log("Creating new node:", newNodeId);

      // Calculer la position en fonction de l'index
      // Pour 2 options (Yes/No), index 0 sera à gauche, index 1 à droite
      const xOffset = index === 0 ? -horizontalSpacing : horizontalSpacing;

      const newNode: Node = {
        id: newNodeId,
        type: 'questionNode',
        data: { 
          id: newNodeId,
          questionNumber: nodes.length + newNodes.length + 1,
          type: 'text',
          text: `Question pour "${option}"`,
          options: [],
          media: '',
          mediaUrl: '',
          isCritical: false,
          onCreatePaths: createPathsFromNode,
          onChange: (newData: any) => handleNodeChange(newNodeId, newData)
        },
        position: { 
          x: sourceNode.position.x + xOffset, // Position gauche ou droite
          y: sourceNode.position.y + verticalSpacing, // Toujours en dessous
        },
      };
      newNodes.push(newNode);

      const newEdge: Edge = {
        id: `e${sourceId}-${option}`,
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

    console.log("New nodes:", newNodes);
    console.log("New edges:", newEdges);

    setNodes(prevNodes => [...prevNodes, ...newNodes]);
    setEdges(prevEdges => [...prevEdges, ...newEdges]);
  }, [nodes, handleNodeChange]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChangeCallback = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    event.stopPropagation();
    if (node.data.isCritical) return;
    setSelectedNode(node.id);
    setSelectedEdge(null);
  }, []);

  const onDeleteNode = useCallback((nodeId: string) => {
    const nodeToDelete = nodes.find(n => n.id === nodeId);
    if (nodeToDelete?.data.isCritical) return;

    setNodes(prevNodes => prevNodes.filter(node => node.id !== nodeId));
    setEdges(prevEdges => prevEdges.filter(edge => 
      edge.source !== nodeId && edge.target !== nodeId
    ));
    setSelectedNode(null);
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
        transition: all 0.3s ease;
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
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
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
    const VERTICAL_SPACING = 150;
    const HORIZONTAL_SPACING = 450;
    const START_Y = 50;
    const CENTER_X = 400;
    
    const nodeLevels = new Map<string, number>();
    const nodeColumns = new Map<string, number>();
    
    const calculateLayout = () => {
      let currentLevel = 0;
      let processedNodes = new Set<string>();
      
      // Traiter d'abord la première question
      const firstNode = nodes.find(n => n.id === '1');
      if (firstNode) {
        nodeLevels.set('1', 0);
        nodeColumns.set('1', 0);
        processedNodes.add('1');
        currentLevel++;
      }
      
      // Fonction pour traiter une branche non critique
      const processNonCriticalBranch = (nodeId: string, startLevel: number, column: number) => {
        const branch: string[] = [];
        let currentBranchLevel = startLevel;
        
        const traverse = (id: string) => {
          const connectedEdges = edges.filter(edge => edge.source === id);
          connectedEdges.forEach(edge => {
            const targetNode = nodes.find(n => n.id === edge.target);
            if (targetNode && !processedNodes.has(targetNode.id) && !targetNode.data.isCritical) {
              branch.push(targetNode.id);
              nodeLevels.set(targetNode.id, currentBranchLevel);
              nodeColumns.set(targetNode.id, column);
              processedNodes.add(targetNode.id);
              currentBranchLevel++;
              traverse(targetNode.id);
            }
          });
        };
        
        traverse(nodeId);
        return currentBranchLevel - startLevel; // Retourne la longueur de la branche
      };
      
      // Traiter les nœuds un par un
      nodes.forEach(node => {
        if (processedNodes.has(node.id)) return;
        
        if (node.data.isCritical) {
          // Positionner la question critique au centre
          nodeLevels.set(node.id, currentLevel);
          nodeColumns.set(node.id, 0);
          processedNodes.add(node.id);
          currentLevel++;
          
          // Traiter les options de la question critique
          const criticalEdges = edges.filter(edge => edge.source === node.id);
          const numOptions = criticalEdges.length;
          
          if (numOptions > 0) {
            // Calculer la position de départ pour centrer les options
            const startX = -(numOptions - 1) / 2;
            
            // Positionner chaque option et sa branche
            criticalEdges.forEach((edge, index) => {
              const targetNode = nodes.find(n => n.id === edge.target);
              if (targetNode && !processedNodes.has(targetNode.id)) {
                const optionColumn = startX + index;
                
                // Positionner l'option
                nodeLevels.set(targetNode.id, currentLevel);
                nodeColumns.set(targetNode.id, optionColumn);
                processedNodes.add(targetNode.id);
                
                // Traiter la branche qui suit cette option
                const branchLength = processNonCriticalBranch(
                  targetNode.id,
                  currentLevel + 1,
                  optionColumn
                );
                
                // Mettre à jour le niveau
                currentLevel += branchLength;
              }
            });
            
            currentLevel++; // Incrémenter le niveau après toutes les options
          }
        } else {
          // Pour les questions non critiques
          nodeLevels.set(node.id, currentLevel);
          nodeColumns.set(node.id, 0);
          processedNodes.add(node.id);
          currentLevel++;
        }
      });
    };
    
    calculateLayout();
    
    // Appliquer les positions
    setNodes(prevNodes => prevNodes.map(node => {
      const level = nodeLevels.get(node.id) || 0;
      const column = nodeColumns.get(node.id) || 0;
      
      return {
        ...node,
        position: {
          x: CENTER_X + column * HORIZONTAL_SPACING,
          y: START_Y + level * VERTICAL_SPACING
        }
      };
    }));
  }, [nodes, edges]);

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
      Réorganiser le flow
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
      const newNode: Node = {
        id: (nodes.length + 1).toString(),
        type: 'questionNode',
        data: { 
          id: (nodes.length + 1).toString(),
          questionNumber: nodes.length + 1,
          type: 'text',
          text: '',
          options: [],
          media: '',
          mediaUrl: '',
          isCritical: false,
          onCreatePaths: createPathsFromNode,
          onChange: (newData: any) => handleNodeChange((nodes.length + 1).toString(), newData)
        },
        position: { x: 250, y: nodes.length * 150 },
      };
      setNodes(prevNodes => [...prevNodes, newNode]);
    }
  }));

  return (
    <>
      <GlobalStyles />
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
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
          defaultEdgeOptions={{
            type: 'default',
            style: {
              strokeWidth: 2,
              stroke: '#667eea',
            },
          }}
          fitView
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