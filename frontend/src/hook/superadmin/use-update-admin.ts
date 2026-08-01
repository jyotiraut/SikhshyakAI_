import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import axios from '@/lib/axios';

export interface UpdateAdminPayload {
  fullName: string;
  email: string;
  designation: string;
  password?: string;
  confirmPassword?: string;
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

export interface UpdateAdminResponse {
  status: 'success' | 'error';
  data: {
    admin: Admin;
  };
  message?: string;
}

export const updateAdmin = async ({
  schoolId,
  adminId,
  payload,
}: {
  schoolId: string;
  adminId: string;
  payload: UpdateAdminPayload;
}): Promise<UpdateAdminResponse> => {
  const { data } = await axios.put<UpdateAdminResponse>(`/schools/${schoolId}/admins/${adminId}`, payload);
  return data;
};

export const useUpdateAdmin = () => {
  return useMutation({
    mutationFn: ({ schoolId, adminId, payload }: { schoolId: string; adminId: string; payload: UpdateAdminPayload }) =>
      updateAdmin({ schoolId, adminId, payload }),
    onSuccess: (data) => {
      toast.success(`Admin ${data.data.admin.fullName} updated successfully!`);
    },
    onError: (error) => {
      if (error instanceof AxiosError) {
        toast.error(error.response?.data?.message || 'Failed to update admin');
      } else {
        toast.error('Unexpected error — please try again.');
      }
    },
  });
};
