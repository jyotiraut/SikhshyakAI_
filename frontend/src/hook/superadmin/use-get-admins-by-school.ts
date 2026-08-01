import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';

export type Admin = {
  _id: string;
  fullName: string;
  email: string;
  role: 'admin' | string;
  school: string;
  designation: 'Principal' | 'Vice Principal';
  isEmailVerified: boolean;
  isBlocked: boolean;
  blockedAt?: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
};

export type GetAdminsBySchoolResponse = {
  status: 'success' | 'error';
  results: number;
  data: {
    admins: Admin[];
  };
};

async function getAdminsBySchool(schoolId: string): Promise<GetAdminsBySchoolResponse> {
  const { data } = await axios.get<GetAdminsBySchoolResponse>(`/schools/${schoolId}/admins`);
  return data;
}

export const useGetAdminsBySchool = (schoolId: string) => {
  return useQuery({
    queryKey: ['admins', schoolId],
    queryFn: () => getAdminsBySchool(schoolId),
    enabled: !!schoolId,
  });
};
