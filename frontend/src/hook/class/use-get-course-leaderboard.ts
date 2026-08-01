import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';

interface LeaderboardEntry {
  userId: string;
  fullName: string;
  score: number;
  max: number;
  attempts: number;
}

interface LeaderboardResponse {
  status: 'success' | 'error';
  data: {
    leaderboard: LeaderboardEntry[];
    page: number;
    limit: number;
  };
}

interface UseLeaderboardParams {
  courseId: string;
  page?: number;
  limit?: number;
}

async function getLeaderboard({ courseId, page = 1, limit = 20 }: UseLeaderboardParams): Promise<LeaderboardResponse> {
  const { data } = await axios.get<LeaderboardResponse>(`/teachers/courses/${courseId}/leaderboard`, {
    params: { page, limit },
  });
  return data;
}

export const useLeaderboard = ({ courseId, page = 1, limit = 20 }: UseLeaderboardParams) => {
  return useQuery<LeaderboardResponse>({
    queryKey: ['leaderboard', courseId, page, limit],
    queryFn: () => getLeaderboard({ courseId, page, limit }),
    enabled: !!courseId,
    staleTime: 30 * 1000,
  });
};
