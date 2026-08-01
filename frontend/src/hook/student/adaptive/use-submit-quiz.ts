import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import axios from '@/lib/axios';

export interface QuizAnswer {
  questionIndex: number;
  selectedOption: number;
}

export interface SubmitQuizPayload {
  quizId: string;
  courseId: string;
  answers: QuizAnswer[];
}

export interface QuizResult {
  is_correct: boolean;
  correct_answer: number;
  correct_answer_text: string;
  selected_answer_text: string;
  /** Generated feedback explaining why the answer is right or wrong. */
  explanation: string;
}

export interface QuizProgress {
  current_lo_mastery: number;
  current_lo_accuracy: number;
  current_lo_attempts: number;
  current_lo_correct: number;
  overall_mastery_score: number;
  /** Share of the course's objectives the student has started. */
  coverage_score: number;
  pace_score: number;
  difficulty_level: 'low' | 'mid' | 'high';
  difficulty_distribution: {
    low: number;
    mid: number;
    high: number;
  };
  mastered_objectives: number;
  total_objectives: number;
}

export type LearningAction = 'BEGIN' | 'PRACTICE' | 'ADVANCE' | 'REVIEW' | 'REINFORCE' | 'MASTER';

export interface NextQuestion {
  quiz_id: string;
  question: {
    question: string;
    type: 'mcq';
    options: string[];
    difficulty: 'low' | 'mid' | 'high';
    learningObjectiveIndex: number;
  };
  context: {
    unit_id: string;
    learning_objective_index: number;
    difficulty: 'low' | 'mid' | 'high';
    reason: string;
    learning_action: LearningAction;
    current_mastery: number;
    current_accuracy: number;
  };
}

export interface SubmitQuizResponse {
  status: 'success' | 'error';
  data: {
    message: string;
    result: QuizResult;
    progress: QuizProgress;
    /** Null when the answer was saved but the follow-up could not be generated. */
    next_question: NextQuestion | null;
    next_question_error?: string;
  };
}

export const submitAdaptiveQuiz = async (payload: SubmitQuizPayload): Promise<SubmitQuizResponse> => {
  const { data } = await axios.post<SubmitQuizResponse>('/students/adaptive/submit-quiz', payload);
  return data;
};

export const useSubmitAdaptiveQuiz = () => {
  return useMutation({
    mutationFn: submitAdaptiveQuiz,
    onSuccess: (data) => {
      toast.success(data.data.message);
    },
    onError: (error) => {
      console.error('Submit Quiz Error:', error);
      if (error instanceof AxiosError) {
        console.error('API Error Response:', error.response?.data);
        toast.error(error.response?.data?.message || 'Failed to submit quiz');
      } else {
        console.error('Unknown Error:', error);
        toast.error('Unexpected error — please try again.');
      }
    },
  });
};
