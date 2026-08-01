import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import axios from '@/lib/axios';

export const verifySchool = async (schoolId: string): Promise<{ status: 'success' | 'error' }> => {
  const { data } = await axios.post(`/schools/${schoolId}/verify`, {
    verified: true,
  });
  return data;
};

export const useVerifySchool = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: verifySchool,
    onSuccess: () => {
      toast.success('School verify successfully!');
      queryClient.invalidateQueries({ queryKey: ['schools'] });
    },
    onError: (error) => {
      if (error instanceof AxiosError) {
        toast.error(error.response?.data?.message || 'Failed to verify school');
      } else {
        toast.error('Unexpected error — please try again.');
      }
    },
  });
};
