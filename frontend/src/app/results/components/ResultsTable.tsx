import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import { Survey, SurveyResponse } from '../types';

interface ResultsTableProps {
  survey: Survey;
  responses: SurveyResponse[];
}

export const ResultsTable: React.FC<ResultsTableProps> = ({
  survey,
  responses
}) => {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            {survey.questions.map((question) => (
              <TableCell key={question.id}>{question.text}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {responses.map((response) => (
            <TableRow key={response._id}>
              <TableCell>
                {new Date(response.submittedAt).toLocaleDateString()}
              </TableCell>
              {survey.questions.map((question) => {
                const answer = response.answers.find(
                  (a) => a.questionId === question.id
                );
                return (
                  <TableCell key={question.id}>
                    {answer ? String(answer.value) : '-'}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}; 