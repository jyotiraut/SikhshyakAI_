import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import axios from '@/lib/axios';

export interface UpdateDepartmentPayload {
  name?: string;
  description?: string;
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

export interface UpdateDepartmentResponse {
  status: 'success' | 'error';
  data: {
    department: Department;
  };
  message?: string;
}

export const updateDepartment = async ({
  departmentId,
  payload,
}: {
  departmentId: string;
  payload: UpdateDepartmentPayload;
}): Promise<UpdateDepartmentResponse> => {
  const { data } = await axios.patch<UpdateDepartmentResponse>(`/departments/${departmentId}`, payload);
  return data;
};

export const useUpdateDepartment = () => {
  return useMutation({
    mutationFn: updateDepartment,
    onSuccess: (data) => {
      toast.success(`Department ${data.data.department.name} updated successfully!`);
    },
    onError: (error) => {
      if (error instanceof AxiosError) {
        toast.error(error.response?.data?.message || 'Failed to update department');
      } else {
        toast.error('Unexpected error — please try again.');
      }
    },
  });
};
