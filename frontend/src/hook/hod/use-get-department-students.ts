// hooks/useDepartmentStudents.ts
import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';

export interface Student {
  _id: string;
  fullName: string;
  email: string;
  collegeRollNo?: string;
  department?: {
    _id: string;
    name: string;
  };
  school?: {
    _id: string;
    name: string;
  };
  isBlocked?: boolean;
  createdAt: string;
}

export interface GetDepartmentStudentsResponse {
  status: 'success' | 'error';
  results: number;
  page: number;
  limit: number;
  data: {
    students: Student[];
  };
}

interface UseDepartmentStudentsParams {
  departmentId: string;
  page?: number;
  limit?: number;
}

async function getDepartmentStudents({
  departmentId,
  page = 1,
  limit = 20,
}: UseDepartmentStudentsParams): Promise<GetDepartmentStudentsResponse> {
  const { data } = await axios.get<GetDepartmentStudentsResponse>(`/departments/${departmentId}/students`, {
    params: { page, limit },
  });
  return data;
}

export const useDepartmentStudents = ({ departmentId, page = 1, limit = 20 }: UseDepartmentStudentsParams) => {
  return useQuery<GetDepartmentStudentsResponse>({
    queryKey: ['department-students', departmentId, page, limit],
    queryFn: () => getDepartmentStudents({ departmentId, page, limit }),
    enabled: !!departmentId,
    staleTime: 30 * 1000, // 30 seconds
  });
};
