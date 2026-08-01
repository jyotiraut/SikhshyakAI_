import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import axios from '@/lib/axios';
import type { ClassRE } from '@/pages/dashboard/teacher/courses/course-outline-create-form';

export type Teacher = {
  _id: string;
  fullName: string;
};

export type Class = {
  _id: string;
  title: string;
  description: string;
  teacher: Teacher;
  status: 'generated' | 'draft' | 'published'; // keep flexible if backend adds more
  enrollmentCode: string;
  outlinePdfUrl?: string;
};

export type CoursesResponse = {
  status: 'success' | 'error';
  data: {
    courses: Class[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

const createClass = async ({
  title,
  totalPeriods,
  description,
  outlinePdf,
  pace,
  language,
  periodDurationMinutes,
  department,
}: ClassRE) => {
  const formData = new FormData();

  formData.append('title', title);
  formData.append('description', description);
  formData.append('totalPeriods', String(totalPeriods));
  formData.append('pace', pace);
  formData.append('periodDurationMinutes', String(periodDurationMinutes));

  if (language) formData.append('language', language);
  if (outlinePdf) formData.append('outlinePdf', outlinePdf);
  if (department) formData.append('department', department);

  const response = await axios.post<CoursesResponse>('/courses', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

export const useCreateClass = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createClass,

    onSuccess: (_data) => {
      toast.success('Course create sucessfully!');
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      navigate(-1);
    },

    onError: (error) => {
      if (error instanceof AxiosError) {
        toast.error(error.response?.data?.message || 'Error occurred while creating class');
      } else {
        toast.error('Failed to create class');
      }
    },
  });
};
