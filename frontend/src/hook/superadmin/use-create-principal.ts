import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import axios from '@/lib/axios';

export interface CreateAdminPayload {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  designation: string;
}

export interface Admin {
  _id: string;
  fullName: string;
  email: string;
  designation: string;
  schoolId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdminResponse {
  status: 'success' | 'error';
  data: {
    admin: Admin;
  };
  message?: string;
}

export const createAdmin = async ({
  schoolId,
  payload,
}: {
  schoolId: string;
  payload: CreateAdminPayload;
}): Promise<CreateAdminResponse> => {
  const { data } = await axios.post<CreateAdminResponse>(`/schools/${schoolId}/admins`, payload);
  return data;
};

// --------------------
// React Query Hook
// --------------------
export const useCreateAdmin = () => {
  return useMutation({
    mutationFn: ({ schoolId, payload }: { schoolId: string; payload: CreateAdminPayload }) =>
      createAdmin({ schoolId, payload }),
    onSuccess: (data) => {
      toast.success(`Admin ${data.data.admin.fullName} created successfully!`);
    },
    onError: (error) => {
      if (error instanceof AxiosError) {
        toast.error(error.response?.data?.message || 'Failed to create admin');
      } else {
        toast.error('Unexpected error — please try again.');
      }
    },
  });
};
