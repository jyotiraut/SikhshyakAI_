// hooks/useTutorialSubmissions.ts
import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';

export interface TutorialSubmission {
  _id: string;
  tutorial: string;
  course: string;
  unit: string;
  submittedBy: {
    _id: string;
    fullName: string;
  };
  answers: any[];
  fileUrl: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  grading?: {
    gradedBy: string;
    score: number;
    maxScore: number;
    feedback: string;
    gradedAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface TutorialSubmissionsResponse {
  status: 'success';
  data: {
    submissions: TutorialSubmission[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface UseTutorialSubmissionsParams {
  courseId: string;
  page?: number;
  limit?: number;
}

async function getTutorialSubmissions({ courseId, page = 1, limit = 20 }: UseTutorialSubmissionsParams) {
  const response = await axios.get<TutorialSubmissionsResponse>(`/teachers/courses/${courseId}/tutorial-submissions`, {
    params: { page, limit },
  });
  return response.data;
}

export const useTutorialSubmissions = ({ courseId, page = 1, limit = 20 }: UseTutorialSubmissionsParams) => {
  return useQuery({
    queryKey: ['tutorial-submissions', courseId, page, limit],
    queryFn: () => getTutorialSubmissions({ courseId, page, limit }),
    enabled: !!courseId,
    staleTime: 30 * 1000, // 30 seconds
  });
};
