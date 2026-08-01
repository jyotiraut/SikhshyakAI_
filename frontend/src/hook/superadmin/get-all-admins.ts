import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';

export type Principal = {
  _id: string;
  fullName: string;
  email: string;
  role: 'admin';
  school: {
    _id: string;
    name?: string;
  };
  designation: string;
  isEmailVerified: boolean;
  isBlocked: boolean;
  createdAt: string;
  updatedAt: string;
  blockedAt?: string;
  __v: number;
};

type GetPrincipalsResponse = {
  status: 'success';
  results: number;
  data: {
    admins: Principal[];
  };
};

async function getPrincipals() {
  const response = await axios.get<GetPrincipalsResponse>('/schools/admins');
  return response.data;
}

export const useGetPrincipals = () => {
  return useQuery({
    queryKey: ['principals'],
    queryFn: getPrincipals,
  });
};
