import { Node } from 'reactflow';

export interface SurveyFlowRef {
  resetFlow: () => void;
  getNodes: () => Node[];
  addNewQuestion: () => void;
  setNodes: (nodes: Node[]) => void;
  reorganizeFlow: () => void;
} 