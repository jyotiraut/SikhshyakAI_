import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import axios from '@/lib/axios';

const deleteCourse = async ({ id }: { id: string }) => {
  const response = await axios.delete(`/courses/${id}`);
  return response.data;
};

export function useDeleteCourse() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: deleteCourse,
    onSuccess: () => {
      toast.success('course deleted sucessfully');
      client.invalidateQueries({ queryKey: ['courses'] });
    },
    onError: (error) => {
      if (error instanceof AxiosError) {
        toast.error(error.response?.data?.message || 'Error occur while deleting class');
      } else {
        toast.error('Failed to delete class');
      }
    },
  });
}
