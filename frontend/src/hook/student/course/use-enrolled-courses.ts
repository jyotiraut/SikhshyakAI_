import { useQuery } from '@tanstack/react-query';
import type { Course } from '@/hook/class/use-get-course';
import axios from '@/lib/axios';

type ApiResponse = {
  status: 'success';
  data: {
    courses: Course[];
  };
};

type Params = {
  page: number;
  limit: number;
};

async function getEnrolledCourses({ page, limit }: Params) {
  const response = await axios.get<ApiResponse>(`/students/my/courses?page=${page}&limit=${limit}`);
  return response.data;
}

export const useGetEnrolledCourses = (page: number, limit: number) => {
  return useQuery({
    queryKey: ['enrollledcourses', page, limit],
    queryFn: () => getEnrolledCourses({ page, limit }),
  });
};
