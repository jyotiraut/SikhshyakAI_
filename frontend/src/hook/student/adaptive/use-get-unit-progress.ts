import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';
import type { LearningObjective } from './use-get-overall-progress';

export interface UnitProgressResponse {
  status: 'success' | 'error';
  data: {
    success: boolean;
    data: {
      student_id: string;
      course_id: string;
      unit_id: string;
      is_current_unit: boolean;
      is_recommended_unit: boolean;
      total_attempted: number;
      total_correct: number;
      accuracy: number;
      mastery_score: number;
      mastery_status: 'not_started' | 'needs_improvement' | 'in_progress' | 'mastered';
      completion_percentage: number;
      mastery_percentage: number;
      learning_objectives_overview: {
        total: number;
        started: number;
        mastered: number;
        in_progress: number;
      };
      learning_objectives: LearningObjective[];
      strengths: LearningObjective[];
      needs_improvement: LearningObjective[];
    };
  };
}

export const getUnitProgress = async (courseId: string, unitId: string): Promise<UnitProgressResponse> => {
  const { data } = await axios.get<UnitProgressResponse>(
    `/students/adaptive/progress/course/${courseId}/unit/${unitId}`,
  );
  return data;
};

export const useGetUnitProgress = (courseId: string | undefined, unitId: string | undefined) => {
  return useQuery<UnitProgressResponse>({
    queryKey: ['adaptive-progress', 'course', courseId, 'unit', unitId],
    queryFn: () => getUnitProgress(courseId!, unitId!),
    enabled: !!courseId && !!unitId,
  });
};
