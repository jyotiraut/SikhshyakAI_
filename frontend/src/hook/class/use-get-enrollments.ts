import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';

export type EnrollmentStudent = {
  _id: string;
  fullName: string;
};

export type EnrollmentCourse = {
  _id: string;
  title: string;
};

export type Enrollment = {
  _id: string;
  course: EnrollmentCourse;
  student: EnrollmentStudent;
  completedUnits: string[];
  completed: boolean;
  enrolledAt: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
};

export type EnrollmentsResponse = {
  status: 'success';
  data: {
    enrollments: Enrollment[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    count: number;
  };
};

type Params = {
  courseId: string;
  page: number;
  limit: number;
};

async function getEnrollments({ courseId, page, limit }: Params) {
  const response = await axios.get<EnrollmentsResponse>(`/enrollments?${courseId}=null&page=${page}&limit=${limit}`);
  return response.data;
}

export const useGetEnrollments = ({ courseId, page, limit }: Params) => {
  return useQuery({
    queryKey: ['enrollments', courseId, page, limit],
    queryFn: () => getEnrollments({ courseId, page, limit }),
    enabled: !!courseId,
  });
};
