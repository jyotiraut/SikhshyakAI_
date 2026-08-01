import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';

type ApiResponse = {
  status: 'success';
  data: {
    courses: Course[];
  };
};

type Course = {
  enrollmentCode: string;

  _id: string;
  title: string;
  description: string;
  teacher: Teacher;
  status: 'draft' | 'generated' | 'published';
};

type Teacher = {
  _id: string;
  fullName: string;
};

async function getCourses() {
  const response = await axios.get<ApiResponse>('/courses/my-courses');
  return response.data;
}

export const useGetCourses = () => {
  return useQuery({
    queryKey: ['courses'],
    queryFn: getCourses,
  });
};
