export type QuizGenerationResponse = {
  status: 'success' | 'error';
  data: {
    quiz: Quiz;
  };
};

export type Quiz = {
  _id: string;
  course: string;
  unit: string;
  unitNumber: number;
  title: string;
  questions: QuizQuestion[];
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  __v: number;
};

export type QuizQuestion = {
  question: string;
  type: 'mcq'; // can be extended later (e.g., "true_false", "short_answer")
  options: string[];
  correctAnswer: number; // index of the correct option
  difficulty: 'low' | 'mid' | 'high';
  learningObjectiveIndex: number;
  solutionApproach: string | null;
};

import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import axios from '@/lib/axios';

type GenerateQuizParams = {
  courseId: string;
  unitId: string;
  assessmentType: 'quiz' | 'assignment';
  questionCount: number;
  difficultyMix: {
    low: number;
    mid: number;
    high: number;
  };
};

const generateQuiz = async ({
  courseId,
  unitId,
  assessmentType,
  questionCount,
  difficultyMix,
}: GenerateQuizParams): Promise<QuizGenerationResponse> => {
  const response = await axios.post<QuizGenerationResponse>('/quizzes/generate', {
    courseId,
    unitId,
    assessmentType,
    questionCount,
    difficultyMix,
  });
  return response.data;
};

export const useGenerateQuiz = () =>
  useMutation({
    mutationFn: generateQuiz,
    onSuccess: (_data) => {
      toast.success('Quiz generated successfully');
    },
    onError: (error) => {
      if (error instanceof AxiosError) {
        toast.error(error.response?.data?.message || 'Error occurred while generating quiz');
      } else {
        toast.error('Failed to generate quiz');
      }
    },
  });
