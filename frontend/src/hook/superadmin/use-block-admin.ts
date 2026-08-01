import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';

interface BlockAdminRequest {
  blocked: boolean;
  reason?: string;
}

interface BlockAdminResponse {
  status: 'success';
  data: {
    admin: {
      _id: string;
      fullName: string;
      email: string;
      role: 'admin';
      school: string;
      designation: string;
      isEmailVerified: boolean;
      isBlocked: boolean;
      createdAt: string;
      updatedAt: string;
      blockedAt?: string;
      __v: number;
    };
  };
}

export const blockAdmin = async (
  schoolId: string,
  adminId: string,
  data: BlockAdminRequest,
): Promise<BlockAdminResponse> => {
  const response = await axios.post<BlockAdminResponse>(`/schools/${schoolId}/admins/${adminId}/block`, data);
  return response.data;
};

export const useBlockAdmin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ schoolId, adminId, data }: { schoolId: string; adminId: string; data: BlockAdminRequest }) =>
      blockAdmin(schoolId, adminId, data),
    onSuccess: () => {
      // Invalidate and refetch principals data
      queryClient.invalidateQueries({ queryKey: ['principals'] });
    },
  });
};
