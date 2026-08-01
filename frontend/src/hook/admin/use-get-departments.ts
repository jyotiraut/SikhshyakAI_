import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';

export interface Department {
  _id: string;
  name: string;
  school: string;
  description: string;
  head?: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface GetDepartmentsResponse {
  status: 'success' | 'error';
  results: number;
  data: {
    departments: Department[];
  };
}

async function getDepartments(schoolId: string): Promise<GetDepartmentsResponse> {
  const { data } = await axios.get<GetDepartmentsResponse>(`/departments/school/${schoolId}`);
  return data;
}

async function getDepartmentsPublic(schoolId: string): Promise<GetDepartmentsResponse> {
  const { data } = await axios.get<GetDepartmentsResponse>(`/departments/public/school/${schoolId}`);
  return data;
}

export const useGetDepartments = (schoolId: string) => {
  return useQuery({
    queryKey: ['departments', schoolId],
    queryFn: () => getDepartments(schoolId),
    enabled: !!schoolId,
  });
};

export const useGetDepartmentsPublic = (schoolId: string) => {
  return useQuery({
    queryKey: ['departments-public', schoolId],
    queryFn: () => getDepartmentsPublic(schoolId),
    enabled: !!schoolId,
  });
};
