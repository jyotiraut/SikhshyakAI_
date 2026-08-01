import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';

import * as z from 'zod';
import roleselection from '@/assets/assistant.png';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useLoginUser } from '@/hook/auth/use-login-user';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';

const formSchema = z.object({
  email: z.email('Email is required'),
  password: z.string(),
});

export function LoginForm() {
  const { mutate } = useLoginUser();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: '',
      email: '',
    },
  });

  function handleSubmit(values: z.infer<typeof formSchema>) {
    mutate({
      email: values.email,
      password: values.password,
    });
  }

  return (
    <div className='container  p-3 mt-10 grid md:grid-cols-2 gap-3'>
      <div>
        <img src={roleselection} alt='image' className='size-full object-contain rounded-xl' />
      </div>
      <Card className='shadow-none border-0 '>
        <CardHeader>
          <CardTitle className='text-4xl mx-auto'>
            <Link to='/' className=''>
              <img src='/logo.png' alt='Sikshyaak AI' className='-ml-2 size-50 ' />
            </Link>
          </CardTitle>
          <CardDescription className='text-lg'>
            Let's get you all set up so you can access your personal account
          </CardDescription>
        </CardHeader>
        <CardContent className='shadow-none'>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-1'>
              <FormField
                control={form.control}
                name='email'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder='Enter your email address' className='h-12' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='password'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type='password' placeholder='Enter password..' className='h-12' {...field} />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type='submit' size='lg' className='w-full h-12 rounded-full'>
                Login
              </Button>
            </form>
          </Form>
          <p className='text-center mt-4'>
            New to here ?
            <Link to='/role-selection' className='text-primary'>
              signup
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
