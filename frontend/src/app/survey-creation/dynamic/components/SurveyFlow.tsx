"use client";

import React, { useState, useCallback, useEffect } from 'react';
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
} from 'reactflow';
import 'reactflow/dist/style.css';
import QuestionNode from './QuestionNode';

interface SurveyFlowProps {
  onAddNode: () => void;
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

const SurveyFlow: React.FC<SurveyFlowProps> = ({ onAddNode }) => {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
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

  useEffect(() => {
    addNewQuestion();
  }, [onAddNode]);

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
          rx: 4,
        },
      };
      newEdges.push(newEdge);
    });

    setNodes(nodes => [...nodes, ...newNodes]);
    setEdges(edges => [...edges, ...newEdges]);
  }, [nodes]);

  const nodesWithCallbacks = nodes.map(node => ({
    ...node,
    data: {
      ...node.data,
      onCreatePaths: createPathsFromNode
    }
  }));

  return (
    <ReactFlow
      nodes={nodesWithCallbacks}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      connectionMode={ConnectionMode.Loose}
      defaultEdgeOptions={{
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
          rx: 4,
        },
      }}
      fitView
    >
      <Background />
      <Controls />
      <MiniMap />
    </ReactFlow>
  );
};

export default SurveyFlow; 