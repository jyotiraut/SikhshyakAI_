import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';
export type GetQuizzesResponse = {
  status: 'success' | 'error';
  data: {
    quizzes: Quiz[];
    count: number;
  };
};

export interface GetQuizResponse {
  status: 'success';
  data: {
    quiz: Quiz;
  };
}
export type Quiz = {
  _id: string;
  course: string;
  unit: string;
  unitNumber: number;
  title: string;
  questions: QuizQuestion[];
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
  __v: number;
};
export type QuizQuestion = {
  question: string;
  type: 'mcq'; // extensible
  options: string[];
  correctAnswer: number; // index of correct option
  difficulty: 'low' | 'mid' | 'high';
  learningObjectiveIndex: number;
  solutionApproach: string | null;
};

async function getQuiz({ unitId }: { unitId: string }) {
  const res = await axios.get<GetQuizzesResponse>(`quizzes/unit/${unitId}`);
  return res.data;
}

export function useGetUnitWiseQuiz({ unitId }: { unitId: string }) {
  return useQuery({
    queryKey: ['units', 'quizzes', unitId],
    queryFn: () => getQuiz({ unitId }),
  });
}

async function getQuizById({ quizId }: { quizId: string }) {
  const response = await axios.get<GetQuizResponse>(`quizzes/${quizId}`);
  return response.data;
}

export function useGetQuizById({ quizId }: { quizId: string }) {
  return useQuery({
    queryKey: ['unit', 'quiz', quizId],
    queryFn: () => getQuizById({ quizId }),
  });
}
