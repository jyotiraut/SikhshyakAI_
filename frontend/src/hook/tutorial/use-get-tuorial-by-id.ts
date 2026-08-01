import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';
import type { Tutorial } from './use-generate-tutorial';

export interface GetTutorialResponse {
  status: 'success';
  data: {
    tutorial: Tutorial;
  };
}

async function getTutorialById({ tutorialId }: { tutorialId: string }) {
  const response = await axios.get<GetTutorialResponse>(`/tutorials/${tutorialId}`);
  return response.data;
}

export function useGetTutorialById({ tutorialId }: { tutorialId: string }) {
  return useQuery({
    queryKey: ['tutorial', tutorialId],
    queryFn: () => getTutorialById({ tutorialId }),
    enabled: !!tutorialId,
  });
}
