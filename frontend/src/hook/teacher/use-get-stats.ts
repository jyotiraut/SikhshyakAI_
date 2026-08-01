import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';

export interface TeacherStats {
  teacher: {
    id: string;
    fullName: string;
    email: string;
    school: {
      _id: string;
      name: string;
    };
    joinedAt: string;
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
  courseStatusBreakdown: Array<{
    status: string;
    count: number;
  }>;
}

interface GetTeacherStatsResponse {
  status: 'success' | 'error';
  data: TeacherStats;
}

const getTeacherStats = async (): Promise<GetTeacherStatsResponse> => {
  const { data } = await axios.get<GetTeacherStatsResponse>('/admin/dashboard/teacher-stats');
  return data;
};

export const useTeacherStats = () => {
  return useQuery<GetTeacherStatsResponse>({
    queryKey: ['teacher-stats'],
    queryFn: getTeacherStats,
  });
};
