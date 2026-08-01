import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';
import type { UnitProgress } from './use-get-overall-progress';

export interface CourseProgressResponse {
  status: 'success' | 'error';
  data: {
    success: boolean;
    data: {
      student_id: string;
      course_id: string;
      current_unit: string;
      recommended_unit: string;
      mastery_score?: number;
      pace_score: number;
      difficulty_level: 'low' | 'mid' | 'high';
      difficulty_distribution: {
        low: number;
        mid: number;
        high: number;
      };
      total_questions_attempted: number;
      total_correct_answers: number;
      overall_accuracy: number;
      units: UnitProgress[];
      created_at: string;
      last_updated: string;
    };
  };
}

export const getCourseProgress = async (courseId: string): Promise<CourseProgressResponse> => {
  const { data } = await axios.get<CourseProgressResponse>(`/students/adaptive/progress/course/${courseId}`);
  return data;
};

export const useGetCourseProgress = (courseId: string | undefined) => {
  return useQuery<CourseProgressResponse>({
    queryKey: ['adaptive-progress', 'course', courseId],
    queryFn: () => getCourseProgress(courseId!),
    enabled: !!courseId,
  });
};
