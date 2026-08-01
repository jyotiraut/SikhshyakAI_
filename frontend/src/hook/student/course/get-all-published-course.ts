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

async function getCourses({ page, limit }: Params) {
  const response = await axios.get<ApiResponse>(`/students/courses?page=${page}&limit=${limit}`);
  return response.data;
}

export const useGetPublishCourses = (page: number, limit: number) => {
  return useQuery({
    queryKey: ['courses', page, limit],
    queryFn: () => getCourses({ page, limit }),
  });
};
