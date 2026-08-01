import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';
import type { QuizQuestion } from './use-get-unit-wise-quize';

export interface UpdateQuizPayload {
  title: string;
  questions: QuizQuestion[];
}

async function updateQuiz(quizId: string, data: UpdateQuizPayload) {
  const res = await axios.put(`/quizzes/${quizId}`, data);
  return res.data;
}

export function useUpdateQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ quizId, data }: { quizId: string; data: UpdateQuizPayload }) => updateQuiz(quizId, data),

    onSuccess: (_, { quizId }) => {
      queryClient.invalidateQueries({
        queryKey: ['unit', 'quiz', quizId],
      });
    },
  });
}
