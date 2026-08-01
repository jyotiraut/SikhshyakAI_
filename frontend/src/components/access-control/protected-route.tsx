import { Link } from 'react-router';
import { useAuth } from '@/lib/provider/use-auth-provider';
import type { Role } from '@/lib/types/role';

type Props = {
  allowedRoles: Role[];
  children: React.ReactNode;
};

export function ProtectedRoute({ allowedRoles, children }: Props) {
  const token = localStorage.getItem('authToken');
  const { role } = useAuth();
  console.log('ProtectedRoute user:', role);

  if (!token) {
    return (
      <div className='h-svh grid place-content-center gap-2 text-center'>
        <p className='text-2xl font-medium'>Please Login First</p>
        <Link className='text-blue-600' to='/login'>
          Go back to Login
        </Link>
      </div>
    );
  }
  if (role && !allowedRoles.includes(role)) {
    return (
      <div className='h-svh flex flex-col gap-2 items-center justify-center text-xl'>
        <p>You do not have access to this content.</p>
        <p> Please check your permissions or contact the administrator for assistance.</p>
        <Link className='text-blue-600' to='/login'>
          Go back to Login
        </Link>
      </div>
    );
  }
  return children;
}
