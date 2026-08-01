import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import axios from '@/lib/axios';

type DeleteTutorialResponse = {
  status: 'success' | 'error';
  message: string;
};

const deleteTutorial = async (tutorialId: string): Promise<DeleteTutorialResponse> => {
  const response = await axios.delete<DeleteTutorialResponse>(`/tutorials/${tutorialId}`);
  return response.data;
};

export const useDeleteTutorial = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTutorial,
    onSuccess: (_data) => {
      toast.success('Tutorial deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['tutorials'] });
    },
    onError: (error) => {
      if (error instanceof AxiosError) {
        toast.error(error.response?.data?.message || 'Error occurred while deleting tutorial');
      } else {
        toast.error('Failed to delete tutorial');
      }
    },
  });
};
