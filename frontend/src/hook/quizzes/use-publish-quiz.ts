import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import axios from '@/lib/axios';

async function publishQuiz(quizId: string) {
  const res = await axios.post(`/quizzes/${quizId}/publish`);
  return res.data;
}

export function usePublishQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (quizId: string) => publishQuiz(quizId),
    onSuccess: () => {
      toast.success('Quiz published successfully!');
      queryClient.invalidateQueries({
        queryKey: ['unit', 'quiz'],
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to publish quiz');
    },
  });
}
