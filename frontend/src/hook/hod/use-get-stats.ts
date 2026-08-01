import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';

export interface HodStats {
  department: {
    id: string;
    name: string;
    school: {
      _id: string;
      name: string;
    };
  };
  users: {
    total: number;
    teachers: number;
    students: number;
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
  topTeachers: Array<{
    _id: string;
    courseCount: number;
    teacherName: string;
    teacherEmail: string;
  }>;
  courseStatusBreakdown: Array<{
    _id: string;
    count: number;
  }>;
}

interface GetHodStatsResponse {
  status: 'success' | 'error';
  data: HodStats;
}

const getHodStats = async (): Promise<GetHodStatsResponse> => {
  const { data } = await axios.get<GetHodStatsResponse>('/admin/dashboard/hod-stats');
  return data;
};

export const useHodStats = () => {
  return useQuery<GetHodStatsResponse>({
    queryKey: ['hod-stats'],
    queryFn: getHodStats,
  });
};
