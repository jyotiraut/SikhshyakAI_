import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';

export interface CourseInfoResponse {
  status: 'success' | 'error';
  data: {
    _id: string;
    title: string;
    description: string;
    status: string;
    teacher: {
      _id: string;
      fullName: string;
      email: string;
    };
  };
}

export const getCourseInfo = async (courseId: string): Promise<CourseInfoResponse> => {
  const { data } = await axios.get<CourseInfoResponse>(`/students/course/${courseId}`);
  return data;
};

export const useGetCourseInfo = (courseId: string | undefined) => {
  return useQuery<CourseInfoResponse>({
    queryKey: ['course-info', courseId],
    queryFn: () => getCourseInfo(courseId!),
    enabled: !!courseId,
    staleTime: 5 * 60 * 1000, // cache for 5 minutes since course titles rarely change
  });
};
