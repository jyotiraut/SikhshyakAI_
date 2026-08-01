import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import axios from '@/lib/axios';
import type { ClassRE } from '@/pages/dashboard/teacher/courses/course-outline-create-form';

const updateClass = async ({
  title,
  totalPeriods,
  description,
  pace,
  language,
  periodDurationMinutes,
  id,
  department,
}: Omit<ClassRE, 'outlinePdf'> & { id: string }) => {
  const formData = new FormData();
  formData.append('title', title);
  formData.append('description', description);
  formData.append('totalPeriods', String(totalPeriods));
  formData.append('pace', pace);
  formData.append('periodDurationMinutes', String(periodDurationMinutes));

  if (language) {
    formData.append('language', language);
  }
  if (department) {
    formData.append('department', department);
  }

  const response = await axios.patch(`/courses/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const useUpdateClass = () => {
  const navigate = useNavigate();

  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateClass,
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      navigate(-1);
    },
    onError: (error) => {
      if (error instanceof AxiosError) {
        toast.error(error.response?.data?.message || 'Error occurred while updating class');
      } else {
        toast.error('Failed to update class');
      }
    },
  });
};
