import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';

export interface LearningObjective {
  learningObjectiveIndex: number;
  attempted: number;
  correct: number;
  accuracy: number;
  mastery: number;
  difficulty: 'low' | 'mid' | 'high';
  mastery_status?: 'not_started' | 'needs_improvement' | 'in_progress' | 'mastered';
  progress_percentage?: number;
}

export interface UnitProgress {
  unit_id: string;
  is_current_unit: boolean;
  is_recommended_unit: boolean;
  total_attempted: number;
  total_correct: number;
  accuracy: number;
  learning_objectives: LearningObjective[];
  mastery_status?: 'not_started' | 'needs_improvement' | 'in_progress' | 'mastered';
}

export interface CourseProgress {
  course_id: string;
  current_unit: string;
  recommended_unit: string;
  mastery_score: number;
  pace_score: number;
  difficulty_level: 'low' | 'mid' | 'high';
  difficulty_distribution: {
    low: number;
    mid: number;
    high: number;
  };
  total_attempted: number;
  total_correct: number;
  accuracy: number;
  units: UnitProgress[];
  created_at: string;
  last_updated: string;
}

export interface OverallProgressResponse {
  status: 'success' | 'error';
  data: {
    success: boolean;
    data: {
      student_id: string;
      course_id: string | null;
      total_questions_attempted: number;
      total_correct_answers: number;
      overall_accuracy: number;
      mastery_score: number;
      pace_score: number;
      difficulty_level: 'low' | 'mid' | 'high';
      difficulty_distribution: {
        low: number;
        mid: number;
        high: number;
      };
      total_courses: number;
      progress_by_course: CourseProgress[];
    };
  };
}

export const getOverallProgress = async (): Promise<OverallProgressResponse> => {
  const { data } = await axios.get<OverallProgressResponse>('/students/adaptive/progress');
  return data;
};

export const useGetOverallProgress = () => {
  return useQuery<OverallProgressResponse>({
    queryKey: ['adaptive-progress', 'overall'],
    queryFn: getOverallProgress,
  });
};
