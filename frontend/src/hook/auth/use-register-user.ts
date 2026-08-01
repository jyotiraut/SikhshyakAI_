type SignupUser = {
  fullName: string;
  email: string;
  password: string;
  role: Role;
  confirmPassword: string;
  school?: string;
  collegeRollNo?: string;
};
type SignupResponse = {
  status: string;
  message: string;
};

import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import axios from '@/lib/axios';
import type { Role } from '@/lib/types/role';
export const signupUser = async ({
  fullName,
  email,
  password,
  role,
  confirmPassword,
  school,
  collegeRollNo,
}: SignupUser) => {
  const response = await axios.post<SignupResponse>('/auth/signup', {
    fullName,
    email,
    password,
    role,
    confirmPassword,
    ...(school && { school }),
    ...(collegeRollNo && { collegeRollNo }),
  });
  console.log(response);
  return response.data;
};

export const useRegisterUser = () =>
  useMutation({
    mutationFn: signupUser,
    onSuccess: (data) => {
      toast.success(data.message);
    },
    onError: (error) => {
      if (error instanceof AxiosError) {
        toast.error(error.response?.data.message || 'An error occurred during registration. Please try again.');
      } else {
        toast.error('Failed to register user. Please try again.');
      }
    },
  });
