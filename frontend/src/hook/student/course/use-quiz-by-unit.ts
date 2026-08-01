import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';
// Quiz item
export interface Quiz {
  _id: string;
  course: string;
  unit: string;
  unitNumber: number;
  title: string;
  status: 'published' | 'draft' | string;
}

export interface QuizzesData {
  quizzes: Quiz[];
  count: number;
}

interface GetUnitQuizzesResponse {
  status: 'success' | 'error';
  data: QuizzesData;
}

const getUnitQuizzes = async (unitId: string): Promise<GetUnitQuizzesResponse> => {
  const { data } = await axios.get<GetUnitQuizzesResponse>(`/students/units/${unitId}/quizzes`);

  return data;
};

export const useUnitQuizzes = (unitId: string) => {
  return useQuery<GetUnitQuizzesResponse>({
    queryKey: ['unit-quizzes', unitId],
    queryFn: () => getUnitQuizzes(unitId),
  });
};
