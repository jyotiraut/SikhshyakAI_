import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';

interface Student {
  id: string;
  fullName: string;
  email: string;
  collegeRollNo: string;
  school: {
    _id: string;
    name: string;
  };
  joinedAt: string;
}

interface Teacher {
  _id: string;
  fullName: string;
  email: string;
}

interface School {
  _id: string;
  name: string;
}

interface EnrolledCourse {
  courseId: string;
  title: string;
  description: string;
  status: 'draft' | 'generated' | 'published';
  teacher: Teacher;
  school: School;
  completedUnits: string[];
  completed: boolean;
  enrolledAt: string;
}

interface StudentStats {
  student: Student;
  enrollments: {
    total: number;
    completed: number;
    inProgress: number;
  };
  performance: {
    averageProgressPercentage: number;
    completionRate: number;
  };
  enrollmentStatusBreakdown: Array<{
    status: string;
    count: number;
  }>;
  enrolledCourses: EnrolledCourse[];
}

interface StudentStatsResponse {
  status: 'success' | 'error';
  data: StudentStats;
}

async function getStudentStats(): Promise<StudentStatsResponse> {
  const { data } = await axios.get<StudentStatsResponse>('/admin/dashboard/student-stats');
  return data;
}

export const useStudentStats = () => {
  return useQuery<StudentStatsResponse>({
    queryKey: ['student-stats'],
    queryFn: getStudentStats,
    staleTime: 5 * 60 * 1000,
  });
};
