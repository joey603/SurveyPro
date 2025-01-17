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

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      connectionMode={ConnectionMode.Loose}
      fitView
    >
      <Background />
      <Controls />
      <MiniMap />
    </ReactFlow>
  );
};

export default SurveyFlow; 