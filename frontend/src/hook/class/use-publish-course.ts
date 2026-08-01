import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import axios from '@/lib/axios';

const publishCourse = async ({ id }: { id: string }) => {
  const response = await axios.post(`/courses/${id}/publish`);
  return response.data;
};

export function usePublishCourse() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: publishCourse,
    onSuccess: () => {
      toast.success('course publish  sucessfully');
      client.invalidateQueries({ queryKey: ['courses'] });
    },
    onError: (error) => {
      if (error instanceof AxiosError) {
        toast.error(error.response?.data?.message || 'Error occur while publishing class');
      } else {
        toast.error('Failed to publish class');
      }
    },
  });
}
