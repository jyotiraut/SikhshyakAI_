import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';

interface CompleteCourseResponse {
  status: 'success' | 'error';
  message: string;
  data: {
    enrollment: {
      _id: string;
      course: {
        _id: string;
        title: string;
      };
      student: {
        _id: string;
        fullName: string;
      };
      completedUnits: string[];
      completed: boolean;
      enrolledAt: string;
      createdAt: string;
      updatedAt: string;
      __v: number;
    };
  };
}

const completeCourse = async (courseId: string): Promise<CompleteCourseResponse> => {
  const { data } = await axios.patch<CompleteCourseResponse>(`/enrollments/${courseId}/complete`);
  return data;
};

export const useCompleteCourse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: completeCourse,
    onSuccess: (_data, courseId) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['course', courseId] });
      queryClient.invalidateQueries({ queryKey: ['published-courses'] });
      queryClient.invalidateQueries({ queryKey: ['student-enrollments'] });
    },
  });
};
