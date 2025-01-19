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
  }: EdgeProps) => {
    const [edgePath, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
    });

    return (
      <>
        <path
          id={id}
          style={style}
          className="react-flow__edge-path"
          d={edgePath}
          markerEnd={markerEnd}
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
    custom: CustomEdge,
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