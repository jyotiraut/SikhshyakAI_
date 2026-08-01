import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';

type School = {
  _id: string;
  name: string;
  type: 'college' | 'school' | 'university';
  address: string;
  isVerified: boolean;
  isBlocked: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
};

type GetSchoolsResponse = {
  status: 'success';
  results: number;
  data: {
    schools: School[];
  };
};

async function getSchools() {
  const response = await axios.get<GetSchoolsResponse>('/schools');
  return response.data;
}
export const useGetSchools = () => {
  return useQuery({
    queryKey: ['schools'],
    queryFn: getSchools,
  });
};

async function getVerifiedSchools() {
  const response = await axios.get<GetSchoolsResponse>('/users/schools');
  return response.data;
}
export const useGetVerifiedSchools = () => {
  return useQuery({
    queryKey: ['schools'],
    queryFn: getVerifiedSchools,
  });
};
