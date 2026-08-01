import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import axios from '@/lib/axios';

export interface CreateDepartmentPayload {
  name: string;
  school: string;
  description: string;
}

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

export interface CreateDepartmentResponse {
  status: 'success' | 'error';
  data: {
    department: Department;
  };
  message?: string;
}

export const createDepartment = async (payload: CreateDepartmentPayload): Promise<CreateDepartmentResponse> => {
  const { data } = await axios.post<CreateDepartmentResponse>('/departments/', payload);
  return data;
};

export const useCreateDepartment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createDepartment,
    onSuccess: (data) => {
      toast.success(`Department ${data.data.department.name} created successfully!`);
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: (error) => {
      if (error instanceof AxiosError) {
        toast.error(error.response?.data?.message || 'Failed to create department');
      } else {
        toast.error('Unexpected error — please try again.');
      }
    },
  });
};
