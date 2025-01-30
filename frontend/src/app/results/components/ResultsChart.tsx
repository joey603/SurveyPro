import React from 'react';
import { Box } from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import { Question, SurveyResponse } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface ResultsChartProps {
  type: 'bar' | 'pie';
  question: Question;
  responses: SurveyResponse[];
}

export const ResultsChart: React.FC<ResultsChartProps> = ({
  type,
  question,
  responses
}) => {
  const data = React.useMemo(() => {
    const answerCounts: Record<string, number> = {};
    
    responses.forEach(response => {
      const answer = response.answers.find(a => a.questionId === question.id);
      if (answer) {
        const value = String(answer.value);
        answerCounts[value] = (answerCounts[value] || 0) + 1;
      }
    });

    return {
      labels: Object.keys(answerCounts),
      datasets: [{
        label: question.text,
        data: Object.values(answerCounts),
        backgroundColor: [
          'rgba(255, 99, 132, 0.5)',
          'rgba(54, 162, 235, 0.5)',
          'rgba(255, 206, 86, 0.5)',
          'rgba(75, 192, 192, 0.5)',
          'rgba(153, 102, 255, 0.5)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
        ],
        borderWidth: 1
      }]
    };
  }, [question, responses]);

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: question.text
      }
    }
  };

  return (
    <Box sx={{ height: 300 }}>
      {type === 'bar' ? (
        <Bar data={data} options={options} />
      ) : (
        <Pie data={data} options={options} />
      )}
    </Box>
  );
}; 