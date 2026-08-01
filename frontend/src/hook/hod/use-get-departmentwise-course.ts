// hooks/useDepartmentCourses.ts
import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';

export interface Teacher {
  _id: string;
  fullName: string;
  email: string;
}

export interface Department {
  _id: string;
  name: string;
}

export interface School {
  _id: string;
  name: string;
}

export interface Course {
  _id: string;
  title: string;
  description: string;
  status: 'draft' | 'generated' | 'published';
  teacher: Teacher;
  department?: Department;
  school?: School;
  enrollmentCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetDepartmentCoursesResponse {
  status: 'success' | 'error';
  results: number;
  page: number;
  limit: number;
  data: {
    courses: Course[];
  };
}

interface UseDepartmentCoursesParams {
  departmentId: string;
  page?: number;
  limit?: number;
}

async function getDepartmentCourses({
  departmentId,
  page = 1,
  limit = 20,
}: UseDepartmentCoursesParams): Promise<GetDepartmentCoursesResponse> {
  const { data } = await axios.get<GetDepartmentCoursesResponse>(`/departments/${departmentId}/courses`, {
    params: { page, limit },
  });
  return data;
}

export const useDepartmentCourses = ({ departmentId, page = 1, limit = 20 }: UseDepartmentCoursesParams) => {
  return useQuery<GetDepartmentCoursesResponse>({
    queryKey: ['department-courses', departmentId, page, limit],
    queryFn: () => getDepartmentCourses({ departmentId, page, limit }),
    enabled: !!departmentId,
    staleTime: 30 * 1000, // 30 seconds
  });
};
