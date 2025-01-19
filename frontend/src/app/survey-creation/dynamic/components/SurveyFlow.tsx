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
      questionNumber: 1,
      type: 'text',
      text: '',
      options: [],
      media: '',
    },
    position: { x: 250, y: 0 },
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

  const addNewQuestion = useCallback(() => {
    const newNode: Node = {
      id: (nodes.length + 1).toString(),
      type: 'questionNode',
      data: { 
        questionNumber: nodes.length + 1,
        type: 'text',
        text: '',
        options: [],
        media: '',
      },
      position: { 
        x: 250,
        y: nodes.length * 150,
      },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [nodes.length]);

  const createPathsFromNode = useCallback((sourceId: string, options: string[]) => {
    setNodes(nodes => nodes.filter(node => !node.id.startsWith(`${sourceId}-`)));
    setEdges(edges => edges.filter(edge => !edge.source.startsWith(sourceId)));

    const sourceNode = nodes.find(n => n.id === sourceId);
    if (!sourceNode) return;

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    const spacing = 200;

    options.forEach((option, index) => {
      const newNode: Node = {
        id: `${sourceId}-${index}`,
        type: 'questionNode',
        data: { 
          id: `${sourceId}-${index}`,
          questionNumber: nodes.length + newNodes.length + 1,
          type: 'text',
          text: '',
          options: [],
          media: '',
          mediaUrl: '',
          isCritical: false,
        },
        position: { 
          x: sourceNode.position.x + spacing,
          y: sourceNode.position.y + (index - (options.length - 1) / 2) * spacing,
        },
      };
      newNodes.push(newNode);

      const newEdge: Edge = {
        id: `e-${sourceId}-${index}`,
        source: sourceId,
        target: newNode.id,
        label: option,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#667eea' },
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

    setNodes(nodes => [...nodes, ...newNodes]);
    setEdges(edges => [...edges, ...newEdges]);
  }, [nodes]);

  const handleNodeChange = useCallback((nodeId: string, newData: any) => {
    setNodes(prevNodes => 
      prevNodes.map(node => 
        node.id === nodeId 
          ? { ...node, data: { ...node.data, ...newData } }
          : node
      )
    );
  }, []);

  const nodesWithCallbacks = nodes.map(node => ({
    ...node,
    data: {
      ...node.data,
      onChange: (newData: any) => handleNodeChange(node.id, newData),
      onCreatePaths: createPathsFromNode
    }
  }));

  const onEdgeDelete = useCallback((edgeId: string) => {
    setEdges((eds) => eds.filter((edge) => edge.id !== edgeId));
  }, []);

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

  interface CustomEdgeProps {
    id: string;
    sourceX: number;
    sourceY: number;
    targetX: number;
    targetY: number;
    label?: string;
    style?: React.CSSProperties;
    markerEnd?: string;
  }

  const edgeOptions = {
    type: 'step',
    animated: true,
    style: { stroke: '#667eea', strokeWidth: 2 },
    labelStyle: { 
      fill: '#667eea', 
      fontWeight: 600,
      fontSize: 12,
    },
    labelBgStyle: { 
      fill: 'white',
      fillOpacity: 0.9,
    },
    deletable: true,
    updatable: true,
    interactionWidth: 60,
    data: {
      deleteIcon: true,
    },
  };

  const CustomEdge: React.FC<CustomEdgeProps> = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    label,
    style = {},
    markerEnd,
  }) => {
    const isSelected = selectedEdge === id;
    const midY = (sourceY + targetY) / 2;
    const midX = (sourceX + targetX) / 2;
    const edgePath = `M ${sourceX},${sourceY} 
                      L ${sourceX},${midY} 
                      L ${targetX},${midY} 
                      L ${targetX},${targetY}`;

    return (
      <g
        onClick={(e) => {
          e.stopPropagation();
          setSelectedEdge(isSelected ? null : id);
        }}
        className="react-flow__edge"
      >
        {/* Zone cliquable large et invisible */}
        <path
          className="react-flow__edge-hitbox"
          d={edgePath}
          strokeWidth={40}
          stroke="transparent"
          fill="none"
        />
        
        {/* Tracé visible */}
        <path
          id={id}
          className="react-flow__edge-path"
          d={edgePath}
          style={{
            ...style,
            strokeWidth: isSelected ? 3 : 2,
            stroke: isSelected ? '#ff4444' : '#667eea',
            pointerEvents: 'none',
          }}
          markerEnd={markerEnd}
        />
        {label && (
          <text style={{ pointerEvents: 'none' }}>
            <textPath 
              href={`#${id}`} 
              style={{ fontSize: '12px' }} 
              startOffset="50%" 
              textAnchor="middle"
            >
              {label}
            </textPath>
          </text>
        )}
      </g>
    );
  };

  const edgeTypes = {
    custom: CustomEdge as unknown as React.ComponentType<EdgeProps>,
  };

  const GlobalStyles = () => (
    <style jsx global>{`
      .react-flow__edge {
        cursor: pointer;
      }
      .react-flow__edge-hitbox {
        pointer-events: all;
        stroke-opacity: 0;
      }
      .react-flow__edge-hitbox:hover + .react-flow__edge-path {
        stroke: #ff4444;
        stroke-width: 3px;
      }
      .react-flow__edge-path {
        pointer-events: none;
        transition: all 0.2s ease;
      }
    `}</style>
  );

  // Bouton de suppression flottant
  const DeleteButton = () => {
    if (!selectedEdge) return null;

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
          onEdgeDelete(selectedEdge);
          setSelectedEdge(null);
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
        Delete Connection
      </div>
    );
  };

  // Gestionnaire de clic sur le fond pour désélectionner
  const handlePaneClick = () => {
    setSelectedEdge(null);
  };

  // Mettre à jour le parent quand les edges changent
  useEffect(() => {
    onEdgesChange(edges);
  }, [edges, onEdgesChange]);

  // Expose la fonction de reset au parent
  useImperativeHandle(ref, () => ({
    resetFlow: () => {
      setNodes(initialNodes);
      setEdges(initialEdges);
    },
    getNodes: () => nodes,
    addNewQuestion
  }));

  return (
    <>
      <GlobalStyles />
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <DeleteButton />
        <ReactFlow
          nodes={nodesWithCallbacks}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChangeCallback}
          onConnect={onConnect}
          onEdgeUpdate={onEdgeUpdate}
          onPaneClick={handlePaneClick}
          connectionMode={ConnectionMode.Loose}
          defaultEdgeOptions={{
            ...edgeOptions,
            type: 'custom',
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