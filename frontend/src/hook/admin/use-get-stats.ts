import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';

export interface AdminStats {
  school: {
    id: string;
    name: string;
    type: string;
    isVerified: boolean;
    isBlocked: boolean;
  };
  users: {
    total: number;
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
  topTeachers: Array<{
    _id: string;
    courseCount: number;
    teacherName: string;
  }>;
  departmentStats: Array<{
    _id: string;
    userCount: number;
    departmentName: string;
  }>;
}

interface GetAdminStatsResponse {
  status: 'success' | 'error';
  data: AdminStats;
}

const getAdminStats = async (): Promise<GetAdminStatsResponse> => {
  const { data } = await axios.get<GetAdminStatsResponse>('/admin/dashboard/admin-stats');
  return data;
};

export const useAdminStats = () => {
  return useQuery<GetAdminStatsResponse>({
    queryKey: ['admin-stats'],
    queryFn: getAdminStats,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

// Department Course Leaderboard Types
export interface LeaderboardEntry {
  userId: string;
  fullName: string;
  score: number;
  max: number;
  attempts: number;
}

export interface DepartmentCourseLeaderboardResponse {
  status: 'success' | 'error';
  data: {
    leaderboard: LeaderboardEntry[];
    page: number;
    limit: number;
  };
}

export interface UseDepartmentCourseLeaderboardParams {
  departmentId: string;
  courseId: string;
  page?: number;
  limit?: number;
}

const getDepartmentCourseLeaderboard = async ({
  departmentId,
  courseId,
  page = 1,
  limit = 10,
}: UseDepartmentCourseLeaderboardParams): Promise<DepartmentCourseLeaderboardResponse> => {
  const { data } = await axios.get<DepartmentCourseLeaderboardResponse>(
    `/departments/${departmentId}/courses/${courseId}/leaderboard`,
    {
      params: { page, limit },
    },
  );
  return data;
};

export const useDepartmentCourseLeaderboard = ({
  departmentId,
  courseId,
  page = 1,
  limit = 10,
}: UseDepartmentCourseLeaderboardParams) => {
  return useQuery<DepartmentCourseLeaderboardResponse>({
    queryKey: ['department-course-leaderboard', departmentId, courseId, page, limit],
    queryFn: () => getDepartmentCourseLeaderboard({ departmentId, courseId, page, limit }),
    enabled: !!departmentId && !!courseId,
    staleTime: 30 * 1000,
  });
};
