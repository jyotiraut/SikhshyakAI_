import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';
import type { Tutorial } from './use-generate-tutorial';

export type GetUnitWiseTutorialResponse = {
  status: 'success' | 'error';
  data: {
    tutorials: Tutorial[];
    count: number;
  };
};

const getUnitWiseTutorial = async (unitId: string): Promise<GetUnitWiseTutorialResponse> => {
  const response = await axios.get<GetUnitWiseTutorialResponse>(`/tutorials/unit/${unitId}`);
  return response.data;
};

export const useGetUnitWiseTutorial = ({ unitId }: { unitId: string }) => {
  return useQuery({
    queryKey: ['tutorials', 'unit', unitId],
    queryFn: () => getUnitWiseTutorial(unitId),
    enabled: !!unitId,
  });
};
