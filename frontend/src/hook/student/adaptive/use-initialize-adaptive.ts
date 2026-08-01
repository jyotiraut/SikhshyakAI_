import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import axios from '@/lib/axios';

export interface AdaptiveLearningData {
  student: string;
  course: string;
  currentUnit: string;
  recommendedUnit: string;
  masteryScore: number;
  paceScore: number;
  difficultyLevel: 'low' | 'mid' | 'high';
  difficultyDistribution: {
    low: number;
    mid: number;
    high: number;
  };
  quizStats: QuizStat[];
  createdAt: string;
  updatedAt: string;
  _id: string;
}

export interface QuizStat {
  unit: string;
  learningObjectiveIndex: number;
  attemptedQuestions: number;
  correctAnswers: number;
  difficulty: 'low' | 'mid' | 'high';
  masteryScore: number;
}

export interface InitializeAdaptiveLearningResponse {
  status: 'success' | 'error';
  data: {
    message: string;
    adaptive_learning: AdaptiveLearningData;
  };
}

export const initializeAdaptiveLearning = async (courseId: string): Promise<InitializeAdaptiveLearningResponse> => {
  const { data } = await axios.post<InitializeAdaptiveLearningResponse>('/students/adaptive/initialize', { courseId });
  return data;
};

export const useInitializeAdaptiveLearning = () => {
  return useMutation({
    mutationFn: initializeAdaptiveLearning,
    onSuccess: (data) => {
      toast.success(data.data.message);
    },
    onError: (error) => {
      console.error('Initialize Adaptive Learning Error:', error);
      if (error instanceof AxiosError) {
        console.error('API Error Response:', error.response?.data);
        toast.error(error.response?.data?.message || 'Failed to initialize adaptive learning');
      } else {
        console.error('Unknown Error:', error);
        toast.error('Unexpected error — please try again.');
      }
    },
  });
};
