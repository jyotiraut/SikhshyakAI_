import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router';
import * as z from 'zod';
import roleselection from '@/assets/assistant.png';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useGetDepartmentsPublic } from '@/hook/admin/use-get-departments';
import { useRegisterUser } from '@/hook/auth/use-register-user';
import { useGetVerifiedSchools } from '@/hook/superadmin/use-get-all-school';
import { passwordSchema } from '@/lib/schema/password.schema';
import type { Role } from '@/lib/types/role';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const baseFormSchema = z.object({
  fullName: z.string().min(5, 'first name must be at least 2 characters.'),
  email: z.email('Email is required'),
  password: passwordSchema,
  confirmPassword: z.string(),
});

const studentFormSchema = baseFormSchema
  .extend({
    schoolId: z.string().min(1, 'School is required'),
    collegeRollNo: z.string().min(1, 'College roll number is required'),
    department: z.string().min(1, 'Department is required'),
  })
  .refine((val) => val.password === val.confirmPassword, { error: 'Password and confirm password should match' });

const teacherFormSchema = baseFormSchema
  .extend({
    schoolId: z.string().min(1, 'School is required'),
  })
  .refine((val) => val.password === val.confirmPassword, { error: 'Password and confirm password should match' });

type StudentFormData = z.infer<typeof studentFormSchema>;
type TeacherFormData = z.infer<typeof teacherFormSchema>;

export function RegistrationForm() {
  const { mutate, isPending } = useRegisterUser();
  const { data: schoolsData, isLoading: schoolsLoading } = useGetVerifiedSchools();
  const [searchParams, _setSearchParams] = useSearchParams();
  const selectedRole = searchParams.get('role') as Role;

  const isStudent = selectedRole === 'student';
  const isTeacher = selectedRole === 'teacher';

  if (isStudent) {
    return (
      <StudentRegistrationForm
        mutate={mutate}
        isPending={isPending}
        schoolsData={schoolsData}
        schoolsLoading={schoolsLoading}
      />
    );
  }

  if (isTeacher) {
    return (
      <TeacherRegistrationForm
        mutate={mutate}
        isPending={isPending}
        schoolsData={schoolsData}
        schoolsLoading={schoolsLoading}
      />
    );
  }

  // Default fallback
  return (
    <TeacherRegistrationForm
      mutate={mutate}
      isPending={isPending}
      schoolsData={schoolsData}
      schoolsLoading={schoolsLoading}
    />
  );
}

function StudentRegistrationForm({
  mutate,
  isPending,
  schoolsData,
  schoolsLoading,
}: {
  mutate: any;
  isPending: boolean;
  schoolsData: any;
  schoolsLoading: boolean;
}) {
  const form = useForm<StudentFormData>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      fullName: '',
      email: '',
      schoolId: '',
      collegeRollNo: '',
      department: '',
    },
  });

  const schoolId = form.watch('schoolId');
  const { data: departmentsData, isLoading: departmentsLoading } = useGetDepartmentsPublic(schoolId);

  function handleSubmit(values: StudentFormData) {
    mutate({
      fullName: values.fullName,
      email: values.email,
      password: values.password,
      role: 'student',
      confirmPassword: values.confirmPassword,
      school: values.schoolId,
      collegeRollNo: values.collegeRollNo,
      department: values.department,
    });
  }

  return (
    <div className='container  p-3 mt-7 grid md:grid-cols-2 gap-3'>
      <div className='flex flex-col gap-3'>
        <div className=' mx-auto'>
          <Link to='/' className=''>
            <img src='/logo.png' alt='Sikshyaak AI' className='-ml-2 size-50 ' />
          </Link>
        </div>
        <img src={roleselection} alt='image' className=' object-contain rounded-xl' />
      </div>
      <Card className='shadow-none border-0 '>
        <CardHeader>
          <CardTitle className='text-3xl text-primary font-bold'>Student Registration</CardTitle>
          <CardDescription className='text-md '>
            Let's get you all set up so you can access your personal account
          </CardDescription>
        </CardHeader>
        <CardContent className='shadow-none'>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-1'>
              <FormField
                control={form.control}
                name='fullName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder='Enter your full name' className='h-12' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                name='schoolId'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>School</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={schoolsLoading}>
                      <FormControl>
                        <SelectTrigger className='h-12'>
                          <SelectValue placeholder={schoolsLoading ? 'Loading schools...' : 'Select your school'} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {schoolsData?.data?.schools?.map((school: any) => (
                          <SelectItem key={school._id} value={school._id}>
                            {school.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='collegeRollNo'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>College Roll Number</FormLabel>
                    <FormControl>
                      <Input placeholder='Enter your college roll number' className='h-12' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='department'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={departmentsLoading || !schoolId}
                    >
                      <FormControl>
                        <SelectTrigger className='h-12'>
                          <SelectValue
                            placeholder={
                              departmentsLoading
                                ? 'Loading departments...'
                                : !schoolId
                                  ? 'Select school first'
                                  : 'Select your department'
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departmentsData?.data?.departments?.map((dept: any) => (
                          <SelectItem key={dept._id} value={dept._id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

              <FormField
                control={form.control}
                name='confirmPassword'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type='password' placeholder='Confirm password..' className='h-12' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type='submit' size='lg' className='w-full h-12 rounded-full' disabled={isPending}>
                Sign Up as Student
              </Button>
            </form>
          </Form>
          <p className='text-center mt-4'>
            Already have an account?{' '}
            <Link to='/login' className='text-primary'>
              Login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function TeacherRegistrationForm({
  mutate,
  isPending,
  schoolsData,
  schoolsLoading,
}: {
  mutate: any;
  isPending: boolean;
  schoolsData: any;
  schoolsLoading: boolean;
}) {
  const form = useForm<TeacherFormData>({
    resolver: zodResolver(teacherFormSchema),
    defaultValues: {
      fullName: '',
      email: '',
      schoolId: '',
    },
  });

  function handleSubmit(values: TeacherFormData) {
    mutate({
      fullName: values.fullName,
      email: values.email,
      password: values.password,
      role: 'teacher',
      confirmPassword: values.confirmPassword,
      school: values.schoolId,
    });
  }

  return (
    <div className='container  p-3 mt-7 grid md:grid-cols-2 gap-3'>
      <div className='flex flex-col gap-3'>
        <div className=' mx-auto'>
          <Link to='/' className=''>
            <img src='/logo.png' alt='Sikshyaak AI' className='-ml-2 size-50 ' />
          </Link>
        </div>
        <img src={roleselection} alt='image' className=' object-contain rounded-xl' />
      </div>
      <Card className='shadow-none border-0 '>
        <CardHeader>
          <CardTitle className='text-3xl text-primary font-bold'>Teacher Registration</CardTitle>
          <CardDescription className='text-md '>
            Let's get you all set up so you can access your personal account
          </CardDescription>
        </CardHeader>
        <CardContent className='shadow-none'>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-1'>
              <FormField
                control={form.control}
                name='fullName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder='Enter your full name' className='h-12' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                name='schoolId'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>School</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={schoolsLoading}>
                      <FormControl>
                        <SelectTrigger className='h-12'>
                          <SelectValue placeholder={schoolsLoading ? 'Loading schools...' : 'Select your school'} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {schoolsData?.data.schools.map((school: any) => (
                          <SelectItem key={school._id} value={school._id}>
                            {school.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

              <FormField
                control={form.control}
                name='confirmPassword'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type='password' placeholder='Confirm password..' className='h-12' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type='submit' size='lg' className='w-full h-12 rounded-full' disabled={isPending}>
                Sign Up as Teacher
              </Button>
            </form>
          </Form>
          <p className='text-center mt-4'>
            Already have an account?{' '}
            <Link to='/login' className='text-primary'>
              Login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
