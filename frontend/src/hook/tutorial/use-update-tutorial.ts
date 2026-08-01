import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import axios from '@/lib/axios';
import type { TutorialQuestion } from './use-generate-tutorial';

export interface UpdateTutorialPayload {
  title: string;
  questions: TutorialQuestion[];
}

async function updateTutorial(tutorialId: string, data: UpdateTutorialPayload) {
  const res = await axios.put(`/tutorials/${tutorialId}`, data);
  return res.data;
}

export function useUpdateTutorial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tutorialId, data }: { tutorialId: string; data: UpdateTutorialPayload }) =>
      updateTutorial(tutorialId, data),

    onSuccess: (_, { tutorialId }) => {
      toast.success('Tutorial updated successfully');
      queryClient.invalidateQueries({
        queryKey: ['tutorial', tutorialId],
      });
      queryClient.invalidateQueries({
        queryKey: ['tutorials'],
      });
    },
    onError: (error) => {
      if (error instanceof AxiosError) {
        toast.error(error.response?.data?.message || 'Error occurred while updating tutorial');
      } else {
        toast.error('Failed to update tutorial');
      }
    },
  });
}
