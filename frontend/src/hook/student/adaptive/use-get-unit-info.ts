import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';

export interface UnitInfoResponse {
  status: 'success' | 'error';
  data: {
    _id: string;
    title: string;
    description: string;
    unitNumber: number;
    course: {
      _id: string;
      title: string;
    };
    learningObjectives: string[];
    estimatedTime: {
      totalMinutes: number;
      theoryMinutes: number;
      practicalMinutes: number;
    };
  };
}

export const getUnitInfo = async (unitId: string): Promise<UnitInfoResponse> => {
  const { data } = await axios.get<UnitInfoResponse>(`/students/unit/${unitId}`);
  return data;
};

export const useGetUnitInfo = (unitId: string | undefined) => {
  return useQuery<UnitInfoResponse>({
    queryKey: ['unit-info', unitId],
    queryFn: () => getUnitInfo(unitId!),
    enabled: !!unitId,
    staleTime: 5 * 60 * 1000,
  });
};
