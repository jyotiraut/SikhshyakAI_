import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import axios from '@/lib/axios';

export const deleteAdmin = async ({
  schoolId,
  adminId,
}: {
  schoolId: string;
  adminId: string;
}): Promise<{ status: 'success' | 'error' }> => {
  const { data } = await axios.delete(`/schools/${schoolId}/admins/${adminId}`);
  return data;
};

export const useDeleteAdmin = () => {
  return useMutation({
    mutationFn: deleteAdmin,
    onSuccess: () => {
      toast.success('Admin deleted successfully!');
    },
    onError: (error) => {
      if (error instanceof AxiosError) {
        toast.error(error.response?.data?.message || 'Failed to delete admin');
      } else {
        toast.error('Unexpected error — please try again.');
      }
    },
  });
};
