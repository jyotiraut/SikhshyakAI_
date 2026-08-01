// use-verify-email.ts

import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';

type verifyEmailParams = {
  token: string;
};

async function verifyEmail({ token }: verifyEmailParams) {
  return await axios.get(`/auth/verifyemail/${token}`);
}

export function useVerifyEmail(token: string | undefined) {
  return useQuery({
    queryKey: ['verify-email', token],
    queryFn: () => verifyEmail({ token: token as string }),
    staleTime: 0,
    retry: false,
  });
}
