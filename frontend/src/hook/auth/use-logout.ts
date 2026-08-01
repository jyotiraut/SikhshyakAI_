import { useNavigate } from 'react-router';

export function useLogout() {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('role');
    localStorage.removeItem('schoolId');
    navigate('/login');
  };

  return logout;
}
