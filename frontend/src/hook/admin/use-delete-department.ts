import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import axios from '@/lib/axios';

export const deleteDepartment = async (departmentId: string): Promise<{ status: 'success' | 'error' }> => {
  const { data } = await axios.delete(`/departments/${departmentId}`);
  return data;
};

export const useDeleteDepartment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteDepartment,
    onSuccess: () => {
      toast.success('Department deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: (error) => {
      if (error instanceof AxiosError) {
        toast.error(error.response?.data?.message || 'Failed to delete department');
      } else {
        toast.error('Unexpected error — please try again.');
      }
    },
  });
};
