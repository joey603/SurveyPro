export interface Survey {
  _id: string;
  title: string;
  description?: string;
  questions: Question[];
  responses?: SurveyResponse[];
  createdAt: string;
  isDynamic?: boolean;
}

export interface Question {
  id: string;
  text: string;
  type: string;
  options?: string[];
}

export interface SurveyResponse {
  _id: string;
  answers: Answer[];
  submittedAt: string;
}

export interface Answer {
  questionId: string;
  value: string | number | boolean;
}

export interface SurveyFilters {
  search: string;
  date: Date | null;
  responses: number | null;
}