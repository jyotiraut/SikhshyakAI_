import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import axios from '@/lib/axios';

export const deleteSchool = async (schoolId: string): Promise<{ status: 'success' | 'error' }> => {
  const { data } = await axios.delete(`/schools/${schoolId}`);
  return data;
};

export const useDeleteSchool = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSchool,
    onSuccess: () => {
      toast.success('School deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['schools'] });
    },
    onError: (error) => {
      if (error instanceof AxiosError) {
        toast.error(error.response?.data?.message || 'Failed to delete school');
      } else {
        toast.error('Unexpected error — please try again.');
      }
    },
  });
};
