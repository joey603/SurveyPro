import React, { useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';

interface Question {
  id: string;
  type: string;
  text: string;
  options?: string[];
  isCritical?: boolean;
  nextQuestions?: {
    [key: string]: string[];
  };
}

interface SurveyFlowVisualizationProps {
  questions: Question[];
}

const SurveyFlowVisualization = ({ questions }: SurveyFlowVisualizationProps) => {
  // Convertir les questions en nodes
  const initialNodes: Node[] = questions.map((question, index) => ({
    id: question.id,
    data: { 
      label: (
        <div style={{ padding: '10px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
            Q{index + 1}: {question.text || 'Untitled'}
          </div>
          {question.isCritical && (
            <div style={{ color: '#e11d48', fontSize: '12px' }}>
              Critical Question
            </div>
          )}
        </div>
      )
    },
    position: { x: index * 250, y: index * 100 },
    style: {
      background: question.isCritical ? '#fee2e2' : '#ffffff',
      border: '1px solid #ccc',
      borderRadius: '8px',
      minWidth: '200px',
    },
  }));

  // Créer les edges (connexions) entre les questions
  const initialEdges: Edge[] = questions.reduce((edges: Edge[], question, index) => {
    if (question.isCritical && question.nextQuestions) {
      Object.entries(question.nextQuestions).forEach(([option, nextQuestionIds]) => {
        nextQuestionIds.forEach((nextId) => {
          edges.push({
            id: `${question.id}-${option}-${nextId}`,
            source: question.id,
            target: nextId,
            label: option,
            type: 'smoothstep',
            style: { stroke: '#94a3b8' },
            labelStyle: { fill: '#64748b', fontSize: '12px' },
          });
        });
      });
    }
    return edges;
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onLayout = useCallback(() => {
    // Vous pouvez ajouter une logique de mise en page automatique ici
  }, []);

  return (
    <div style={{ width: '100%', height: '500px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
};

export default SurveyFlowVisualization; 