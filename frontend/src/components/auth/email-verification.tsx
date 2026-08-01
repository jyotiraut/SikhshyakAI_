import { Link, useNavigate, useParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useVerifyEmail } from '@/hook/auth/use-verify-email';

export function VerifyEmail() {
  const params = useParams();
  const token = params?.token;
  const navigate = useNavigate();

  const { isLoading, isError, error, isSuccess } = useVerifyEmail(token);

  return (
    <div className='container p-3 mt-10 flex justify-center'>
      <Card className='max-w-lg w-full'>
        <CardHeader>
          <CardTitle className='text-3xl'>Verify Email</CardTitle>
          <CardDescription>We'll verify your account with the token we received.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && <p>Verifying your email, please wait...</p>}

          {isSuccess && (
            <div>
              <p className='mb-4'>Your email has been verified successfully.</p>

              <Button asChild>
                <Link to='/login'>Go to Login</Link>
              </Button>
            </div>
          )}

          {isError && (
            <div>
              <p className='text-destructive mb-4'>{error.message || 'Verification failed.'}</p>
              <div className='flex gap-2'>
                <Button variant='outline' onClick={() => navigate('/')}>
                  Home
                </Button>
                <Button asChild>
                  <Link to='/login'>Go to Login</Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
