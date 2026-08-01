import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import axios from '@/lib/axios';

/**
 * Note: `correctAnswer` is deliberately absent. The server withholds the answer
 * key until the question has been submitted, so it cannot be read out of the
 * network response.
 */
export interface GeneratedQuestion {
  question: string;
  type: 'mcq';
  options: string[];
  difficulty: 'low' | 'mid' | 'high';
  learningObjectiveIndex: number;
}

export interface AdaptiveContext {
  current_unit: string;
  current_lo: number;
  mastery_score: number;
  objective_mastery: number;
  difficulty_level: 'low' | 'mid' | 'high';
  learning_action: string;
  focus_areas: string[];
}

export interface GenerateQuizResponse {
  status: 'success' | 'error';
  data: {
    message: string;
    quiz_id: string;
    question: GeneratedQuestion;
    adaptive_context: AdaptiveContext;
  };
}

export const generateAdaptiveQuiz = async (courseId: string, unitId: string): Promise<GenerateQuizResponse> => {
  const { data } = await axios.post<GenerateQuizResponse>('/students/adaptive/generate-quiz', { courseId, unitId });
  return data;
};

export const useGenerateAdaptiveQuiz = () => {
  return useMutation({
    mutationFn: ({ courseId, unitId }: { courseId: string; unitId: string }) => generateAdaptiveQuiz(courseId, unitId),
    onSuccess: (data) => {
      toast.success(data.data.message);
    },
    onError: (error) => {
      console.error('Generate Quiz Error:', error);
      if (error instanceof AxiosError) {
        console.error('API Error Response:', error.response?.data);
        toast.error(error.response?.data?.message || 'Failed to generate quiz');
      } else {
        console.error('Unknown Error:', error);
        toast.error('Unexpected error — please try again.');
      }
    },
  });
};
