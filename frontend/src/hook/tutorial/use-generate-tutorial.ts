import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import axios from '@/lib/axios';

export type TutorialGenerationResponse = {
  status: 'success' | 'error';
  data: {
    tutorial: Tutorial;
  };
};

export type Tutorial = {
  _id: string;
  course: string;
  unit: string;
  unitNumber: number;
  title: string;
  questions: TutorialQuestion[];
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  __v: number;
};

export type TutorialQuestion = {
  question: string;
  type: 'numerical-problem' | 'short-answer'; // can be extended later
  options: null;
  correctAnswer: null;
  difficulty: 'low' | 'mid' | 'high';
  learningObjectiveIndex: number | null;
  solutionApproach: string | null;
};

type GenerateTutorialParams = {
  courseId: string;
  unitId: string;
  assessmentType: 'tutorial';
  difficultyMix: {
    low: number;
    mid: number;
    high: number;
  };
};

const generateTutorial = async ({
  courseId,
  unitId,
  assessmentType,
  difficultyMix,
}: GenerateTutorialParams): Promise<TutorialGenerationResponse> => {
  const response = await axios.post<TutorialGenerationResponse>('/tutorials/generate', {
    courseId,
    unitId,
    assessmentType,
    difficultyMix,
  });
  return response.data;
};

export const useGenerateTutorial = () =>
  useMutation({
    mutationFn: generateTutorial,
    onSuccess: (_data) => {
      toast.success('Tutorial generated successfully');
    },
    onError: (error) => {
      if (error instanceof AxiosError) {
        toast.error(error.response?.data?.message || 'Error occurred while generating tutorial');
      } else {
        toast.error('Failed to generate tutorial');
      }
    },
  });
