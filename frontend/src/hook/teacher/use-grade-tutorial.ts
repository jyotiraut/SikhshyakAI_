import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import axios from '@/lib/axios';

interface GradeTutorialRequest {
  submissionId: string;
  score: number;
  maxScore: number;
  feedback: string;
}

interface GradeTutorialResponse {
  status: 'success';
  data: {
    submission: {
      _id: string;
      tutorial: string;
      course: string;
      unit: string;
      submittedBy: string;
      answers: any[];
      fileUrl: string;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      grading: {
        gradedBy: string;
        score: number;
        maxScore: number;
        feedback: string;
        gradedAt: string;
      };
      createdAt: string;
      updatedAt: string;
    };
  };
}

async function gradeTutorial({
  submissionId,
  score,
  maxScore,
  feedback,
}: GradeTutorialRequest): Promise<GradeTutorialResponse> {
  const { data } = await axios.put<GradeTutorialResponse>(`/teachers/tutorial-submissions/${submissionId}/grade`, {
    score,
    maxScore,
    feedback,
  });
  return data;
}

export const useGradeTutorial = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: gradeTutorial,
    onSuccess: (data) => {
      // Invalidate and refetch tutorial submissions
      queryClient.invalidateQueries({
        queryKey: ['tutorial-submissions'],
      });

      toast.success('Submission graded successfully', {
        description: `Score: ${data.data.submission.grading.score}/${data.data.submission.grading.maxScore}`,
      });
    },
    onError: (error: any) => {
      toast.error('Failed to grade submission', {
        description: error.response?.data?.message || 'An error occurred while grading.',
      });
    },
  });
};
