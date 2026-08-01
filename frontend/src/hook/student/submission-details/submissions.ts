import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';

// Tutorial Submission List Item
export interface TutorialSubmissionListItem {
  id: string;
  tutorial: {
    id: string;
    title: string;
    unitNumber: number;
    totalQuestions: number;
  };
  unit: {
    id: string;
    title: string;
    unitNumber: number;
  };
  course: {
    id: string;
    title: string;
  };
  submission: {
    totalQuestionsAttempted: number;
    answeredAt: string;
    lastUpdated: string;
    fileUrl: string;
    fileName: string;
  };
  grading: {
    isGraded: boolean;
    score: number;
    maxScore: number;
    percentage: number;
    feedback: string;
    gradedBy: string | null;
    gradedAt: string | null;
  };
}

interface GetMySubmissionsResponse {
  status: 'success' | 'error';
  results: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  data: TutorialSubmissionListItem[];
}

// Detailed Submission
export interface TutorialSubmissionDetail {
  id: string;
  tutorial: {
    id: string;
    title: string;
    unitNumber: number;
    totalQuestions: number;
  };
  unit: {
    id: string;
    title: string;
    unitNumber: number;
    description: string;
  };
  course: {
    id: string;
    title: string;
    description: string;
  };
  submission: {
    totalQuestionsAttempted: number;
    totalQuestions: number;
    answers: any[];
    fileUrl: string;
    fileName: string;
    submittedAt: string;
    lastUpdated: string;
  };
  grading: {
    isGraded: boolean;
    score: number;
    maxScore: number;
    percentage: number;
    feedback: string;
    gradedBy: string | null;
    gradedAt: string | null;
  };
}

interface GetSubmissionDetailResponse {
  status: 'success' | 'error';
  data: TutorialSubmissionDetail;
}

// Get my submissions with pagination
const getMySubmissions = async (page: number = 1, limit: number = 10): Promise<GetMySubmissionsResponse> => {
  const { data } = await axios.get<GetMySubmissionsResponse>(`/tutorials/submissions/my?page=${page}&limit=${limit}`);
  return data;
};

export const useMyTutorialSubmissions = (page: number = 1, limit: number = 10) => {
  return useQuery<GetMySubmissionsResponse>({
    queryKey: ['my-tutorial-submissions', page, limit],
    queryFn: () => getMySubmissions(page, limit),
  });
};

// Get single submission detail
const getSubmissionDetail = async (submissionId: string): Promise<GetSubmissionDetailResponse> => {
  const { data } = await axios.get<GetSubmissionDetailResponse>(`/tutorials/submissions/${submissionId}`);
  return data;
};

export const useTutorialSubmissionDetail = (submissionId: string) => {
  return useQuery<GetSubmissionDetailResponse>({
    queryKey: ['tutorial-submission', submissionId],
    queryFn: () => getSubmissionDetail(submissionId),
    enabled: !!submissionId,
  });
};
