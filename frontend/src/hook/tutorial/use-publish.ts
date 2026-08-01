import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import axios from '@/lib/axios';

type PublishTutorialResponse = {
  status: 'success' | 'error';
  message: string;
};

const publishTutorial = async (tutorialId: string): Promise<PublishTutorialResponse> => {
  const response = await axios.post<PublishTutorialResponse>(`/tutorials/${tutorialId}/publish`);
  return response.data;
};

export const usePublishTutorial = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: publishTutorial,
    onSuccess: (_data) => {
      toast.success('Tutorial published successfully');
      queryClient.invalidateQueries({ queryKey: ['tutorials'] });
    },
    onError: (error) => {
      if (error instanceof AxiosError) {
        toast.error(error.response?.data?.message || 'Error occurred while publishing tutorial');
      } else {
        toast.error('Failed to publish tutorial');
      }
    },
  });
};
