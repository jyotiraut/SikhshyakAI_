import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';

export interface Tutorial {
  _id: string;
  course: string;
  unit: string;
  unitNumber: number;
  title: string;
  status: 'published' | 'draft' | string;
}

export interface TutorialsData {
  tutorials: Tutorial[];
  count: number;
}

interface GetUnitTutorialsResponse {
  status: 'success' | 'error';
  data: TutorialsData;
}

const getUnitTutorials = async (unitId: string): Promise<GetUnitTutorialsResponse> => {
  const { data } = await axios.get<GetUnitTutorialsResponse>(`/students/units/${unitId}/tutorials`);

  return data;
};

export const useUnitTutorials = (unitId: string) => {
  return useQuery<GetUnitTutorialsResponse>({
    queryKey: ['unit-tutorials', unitId],
    queryFn: () => getUnitTutorials(unitId),
  });
};

import { useMutation, useQueryClient } from '@tanstack/react-query';

// Tutorial Question Types
export interface TutorialQuestion {
  question: string;
  type: 'numerical-problem' | 'short-answer' | 'multiple-choice';
  options: string[] | null;
  correctAnswer: string | null;
  difficulty: 'low' | 'mid' | 'high';
  learningObjectiveIndex: number | null;
  solutionApproach: string | null;
}

// Single Tutorial
export interface TutorialDetail {
  _id: string;
  course: string;
  unit: string;
  unitNumber: number;
  title: string;
  questions: TutorialQuestion[];
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface GetTutorialResponse {
  status: 'success' | 'error';
  data: {
    tutorial: TutorialDetail;
  };
}

// Tutorial Submission
export interface TutorialSubmission {
  tutorial: string;
  course: {
    _id: string;
    status: string;
  };
  unit: string;
  submittedBy: string;
  answers: any[];
  fileUrl: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  grading: {
    score: number;
    maxScore: number;
    feedback: string;
  };
  _id: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface SubmitTutorialResponse {
  status: 'success' | 'error';
  data: {
    submission: TutorialSubmission;
  };
}

// Get single tutorial
const getTutorial = async (tutorialId: string): Promise<GetTutorialResponse> => {
  const { data } = await axios.get<GetTutorialResponse>(`/tutorials/${tutorialId}`);
  return data;
};

export const useTutorial = (tutorialId: string) => {
  return useQuery<GetTutorialResponse>({
    queryKey: ['tutorial', tutorialId],
    queryFn: () => getTutorial(tutorialId),
    enabled: !!tutorialId,
  });
};

// Submit tutorial
const submitTutorial = async ({
  tutorialId,
  file,
}: {
  tutorialId: string;
  file: File;
}): Promise<SubmitTutorialResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await axios.post<SubmitTutorialResponse>(`/students/tutorials/${tutorialId}/submit`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return data;
};

export const useSubmitTutorial = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: submitTutorial,
    onSuccess: (_data, variables) => {
      // Invalidate and refetch tutorial data
      queryClient.invalidateQueries({ queryKey: ['tutorial', variables.tutorialId] });
      queryClient.invalidateQueries({ queryKey: ['unit-tutorials'] });
    },
  });
};
