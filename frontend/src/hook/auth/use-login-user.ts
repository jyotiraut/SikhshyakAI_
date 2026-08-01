import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import axios from '@/lib/axios';
import { useAuth } from '@/lib/provider/use-auth-provider';
import type { LoginSchema } from '@/lib/schema/login.schema';
export const loginUser = async ({ email, password }: LoginSchema) => {
  const response = await axios.post('/auth/login', {
    email,
    password,
  });

  return response.data;
};

export const useLoginUser = () => {
  const navigate = useNavigate();
  const { setRole, setUser, setSchoolId, setDepartmentId } = useAuth();
  const client = useQueryClient();
  return useMutation({
    mutationFn: loginUser,
    onSuccess: (data) => {
      toast.success(data.message || 'Logged in successfully!');

      if (data.token) {
        localStorage.setItem('authToken', data.token);
      }
      console.log('Logged in user data:', data);
      localStorage.setItem('currentUser', JSON.stringify(data.user));
      localStorage.setItem('role', data.role);
      localStorage.setItem('schoolId', data.user.schoolId);
      if (data.user.departmentId) {
        localStorage.setItem('departmentId', data.user.departmentId);
        setDepartmentId(data.user.departmentId);
      } else {
        // Clear a stale value from a previous session, otherwise a user without
        // a department inherits the last one that was stored.
        localStorage.removeItem('departmentId');
        setDepartmentId(undefined);
      }
      setRole(data.role);
      setUser(data.user);
      setSchoolId(data.user.schoolId);
      client.invalidateQueries();
      navigate(`/${data.role}/dashboard`);
    },

    onError: (error) => {
      if (error instanceof AxiosError) {
        toast.error(error.response?.data?.message || 'Something went wrong during login.');
      } else {
        toast.error('Unexpected error — please try again.');
      }
    },
  });
};
