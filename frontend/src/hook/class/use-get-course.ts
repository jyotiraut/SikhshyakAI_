import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';

export type CourseDetailsApiResponse = {
  status: 'success';
  data: {
    course: Course;
    units: Unit[];
    unitsCount: number;
  };
};

export type Course = {
  _id: string;
  title: string;
  description: string;

  teacherProvided: {
    periodDurationMinutes: number;
    totalPeriods: number;
    pace: 'slow' | 'normal' | 'fast';
  };

  teacher: {
    _id: string;
    fullName: string;
    email: string;
  };

  department: string;

  status: 'draft' | 'generated';

  outlinePdfUrl: string;
  outlinePreview: string;

  createdAt: string;
  updatedAt: string;
  __v: number;
};

export type Unit = {
  _id: string;
  unitNumber: number;
  title: string;
  description: string;

  teachingPlan: TeachingPlan;
  estimatedTime: EstimatedTime;

  learningObjectives: string[];

  status: 'draft' | 'generated';

  createdAt: string;
  updatedAt: string;
  fileUrl: string;
};

export type TeachingPlan = {
  overview: string;
  methods: string[];
  activities: string[];
};

export type EstimatedTime = {
  totalMinutes: number;
  theoryMinutes: number;
  practicalMinutes: number;
};

async function getCourses(id: string) {
  const response = await axios.get<CourseDetailsApiResponse>(`/courses/${id}`);
  return response.data.data;
}

export function useGetCourse(id: string) {
  return useQuery({
    queryKey: ['course'],
    queryFn: () => getCourses(id),
  });
}
