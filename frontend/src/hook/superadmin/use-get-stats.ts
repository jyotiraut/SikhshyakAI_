import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';

export interface SuperAdminStats {
  schools: {
    total: number;
    active: number;
    blocked: number;
  };
  users: {
    total: number;
    admins: number;
    teachers: number;
    students: number;
    hods: number;
    hodAssistants: number;
    blocked: number;
  };
  courses: {
    total: number;
    draft: number;
    published: number;
    generated: number;
  };
  enrollments: {
    total: number;
    completed: number;
  };
  quizzes: {
    total: number;
  };
  departments: {
    total: number;
  };
  topSchools: Array<{
    _id: string;
    userCount: number;
    schoolName: string;
  }>;
  coursesBySchool: Array<{
    _id: string;
    courseCount: number;
    schoolName: string;
  }>;
}

interface GetSuperAdminStatsResponse {
  status: 'success' | 'error';
  data: SuperAdminStats;
}

const getSuperAdminStats = async (): Promise<GetSuperAdminStatsResponse> => {
  const { data } = await axios.get<GetSuperAdminStatsResponse>('/admin/dashboard/stats');
  return data;
};

export const useSuperAdminStats = () => {
  return useQuery<GetSuperAdminStatsResponse>({
    queryKey: ['super-admin-stats'],
    queryFn: getSuperAdminStats,
  });
};
