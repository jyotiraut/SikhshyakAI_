import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import axios from '@/lib/axios';

type EnrolledAPIResponse = {
  status: string;
  message: string;
};
async function courseEnroll(code: string) {
  const response = await axios.post<EnrolledAPIResponse>('/enrollments/by-code', {
    code,
  });
  return response.data;
}

export function useCourseEnroll() {
  return useMutation({
    mutationFn: courseEnroll,
    onSuccess: (data) => {
      toast.success(data.message);
    },
    onError: (error) => {
      if (error instanceof AxiosError) {
        toast.error(error.response?.data?.message || 'Something went wrong during enrollment.');
      } else {
        toast.error('Unexpected error — please try again.');
      }
    },
  });
}
