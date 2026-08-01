import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import axios from '@/lib/axios';

export interface QuizAnswerPayload {
  questionIndex: number;
  answerIndex: number;
}

export interface SubmitQuizPayload {
  answers: QuizAnswerPayload[];
}

export interface SubmitQuizResponse {
  status: 'success' | 'error';
  message?: string;
  data: {
    marks: {
      score: number;
      total: number;
    };
  };
}

export const submitQuiz = async ({
  quizId,
  payload,
}: {
  quizId: string;
  payload: SubmitQuizPayload;
}): Promise<SubmitQuizResponse> => {
  const { data } = await axios.post<SubmitQuizResponse>(`students/quizzes/${quizId}/submit`, payload);

  return data;
};

export const useSubmitQuiz = () => {
  return useMutation({
    mutationFn: submitQuiz,
    onSuccess: (data) => {
      toast.success(`your score is ${data.data.marks.score} out of ${data.data.marks.total}`);
    },
    onError: (error) => {
      if (error instanceof AxiosError) {
        toast.error(error.response?.data?.message || 'Something went wrong during quiz submission');
      } else {
        toast.error('Unexpected error — please try again.');
      }
    },
  });
};
