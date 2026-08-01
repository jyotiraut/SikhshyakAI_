import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import axios from '@/lib/axios';

export interface CreateHODPayload {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  designation: string;
}

export interface HOD {
  _id: string;
  fullName: string;
  email: string;
  password: string;
  role: 'hod';
  school: string;
  department: string;
  designation: string;
  isEmailVerified: boolean;
  isBlocked: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface CreateHODResponse {
  status: 'success' | 'error';
  data: {
    hod: HOD;
    department: {
      _id: string;
      name: string;
      school: string;
      description: string;
      head: string;
      createdAt: string;
      updatedAt: string;
      __v: number;
    };
  };
  message?: string;
}

export const createHOD = async ({
  departmentId,
  payload,
}: {
  departmentId: string;
  payload: CreateHODPayload;
}): Promise<CreateHODResponse> => {
  const { data } = await axios.post<CreateHODResponse>(`/departments/${departmentId}/hod`, payload);
  return data;
};

export const useCreateHOD = () => {
  return useMutation({
    mutationFn: createHOD,
    onSuccess: (data) => {
      toast.success(`HOD ${data.data.hod.fullName} created successfully!`);
    },
    onError: (error) => {
      if (error instanceof AxiosError) {
        toast.error(error.response?.data?.message || 'Failed to create HOD');
      } else {
        toast.error('Unexpected error — please try again.');
      }
    },
  });
};
