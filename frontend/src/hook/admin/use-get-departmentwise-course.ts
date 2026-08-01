import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';

export interface Course {
  _id: string;
  title: string;
  description: string;
  outlineText: string;
  teacher: {
    _id: string;
    fullName: string;
  };
  school: string;
  department: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
  enrollmentCode: string;
  outlinePdfUrl: string;
  teacherProvided?: {
    periodDurationMinutes: number;
    totalPeriods: number;
    pace: string;
  };
}

export interface GetDepartmentCoursesResponse {
  status: 'success';
  results: number;
  page: number;
  limit: number;
  data: {
    courses: Course[];
  };
}

export function useGetDepartmentCourses(departmentId: string) {
  return useQuery({
    queryKey: ['department-courses', departmentId],
    queryFn: async () => {
      const res = await axios.get<GetDepartmentCoursesResponse>(`/departments/${departmentId}/courses`);
      return res.data.data.courses;
    },
    enabled: !!departmentId,
  });
}
