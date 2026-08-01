import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import axios from '@/lib/axios';

export interface CreateSchoolPayload {
  name: string;
  type: 'college' | 'school' | 'university';
  address: string;
}

export interface School {
  name: string;
  type: 'college' | 'school' | 'university';
  address: string;
  isVerified: boolean;
  isBlocked: boolean;
  _id: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface CreateSchoolResponse {
  status: 'success' | 'error';
  data: {
    school: School;
  };
  message?: string;
}

export const createSchool = async (payload: CreateSchoolPayload): Promise<CreateSchoolResponse> => {
  const { data } = await axios.post<CreateSchoolResponse>('/schools', payload);
  return data;
};

export const useCreateSchool = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateSchoolPayload) => createSchool(payload),
    onSuccess: (data: CreateSchoolResponse) => {
      toast.success(`School ${data.data.school.name} created successfully!`);
      queryClient.invalidateQueries({ queryKey: ['schools'] });
    },
    onError: (error) => {
      if (error instanceof AxiosError) {
        toast.error(error.response?.data?.message || 'Something went wrong while creating school');
      } else {
        toast.error('Unexpected error — please try again.');
      }
    },
  });
};
