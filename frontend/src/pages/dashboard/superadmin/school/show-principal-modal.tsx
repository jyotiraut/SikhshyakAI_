import { zodResolver } from '@hookform/resolvers/zod';
import { Eye } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type CreateAdminPayload, useCreateAdmin } from '@/hook/superadmin/use-create-principal';
import { useGetAdminsBySchool } from '@/hook/superadmin/use-get-admins-by-school';
import { type UpdateAdminPayload, useUpdateAdmin } from '@/hook/superadmin/use-update-admin';
import { passwordSchema } from '@/lib/schema/password.schema';

const createAdminSchema = z
  .object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    email: z.email('Invalid email address'),
    password: passwordSchema,
    confirmPassword: passwordSchema,
    designation: z.enum(['Principal', 'Vice Principal', 'HOD', 'Teacher']),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const updateAdminSchema = z
  .object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    email: z.email('Invalid email address'),
    password: passwordSchema.optional(),
    confirmPassword: passwordSchema.optional(),
    designation: z.enum(['Principal', 'Vice Principal', 'HOD', 'Teacher']),
  })
  .refine(
    (data) => {
      if (data.password || data.confirmPassword) {
        return data.password === data.confirmPassword;
      }
      return true;
    },
    {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    },
  );

type CreateAdminFormData = z.infer<typeof createAdminSchema>;
type UpdateAdminFormData = z.infer<typeof updateAdminSchema>;

interface ShowPrincipalModalProps {
  schoolId: string;
}

export function ShowPrincipalModal({ schoolId }: ShowPrincipalModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data, isLoading, error, refetch } = useGetAdminsBySchool(schoolId);

  const principal = data?.data.admins.find((admin) => admin.designation === 'Principal');

  const isEdit = !!principal;

  const form = useForm<CreateAdminFormData | UpdateAdminFormData>({
    resolver: zodResolver(isEdit ? updateAdminSchema : createAdminSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      designation: 'Principal',
    },
  });

  useEffect(() => {
    if (principal) {
      form.reset({
        fullName: principal.fullName,
        email: principal.email,
        designation: principal.designation,
        password: '',
        confirmPassword: '',
      });
    } else {
      form.reset({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        designation: 'Principal',
      });
    }
  }, [principal, form]);

  const { mutate: createAdmin, isPending: isLoadingCreate } = useCreateAdmin();
  const { mutate: updateAdmin, isPending: isLoadingUpdate } = useUpdateAdmin();

  const onSubmit = (values: CreateAdminFormData | UpdateAdminFormData) => {
    if (isEdit && principal) {
      const payload: UpdateAdminPayload = {
        fullName: values.fullName,
        email: values.email,
        designation: values.designation,
        ...(values.password && { password: values.password }),
        ...(values.confirmPassword && { confirmPassword: values.confirmPassword }),
      };

      updateAdmin(
        { schoolId, adminId: principal._id, payload },
        {
          onSuccess: () => {
            refetch();
          },
        },
      );
    } else {
      const payload: CreateAdminPayload = {
        fullName: values.fullName,
        email: values.email,
        password: values.password!,
        confirmPassword: values.confirmPassword!,
        designation: values.designation,
      };

      createAdmin(
        { schoolId, payload },
        {
          onSuccess: () => {
            form.reset();
            refetch();
          },
        },
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size='sm'>
          <Eye size={16} />
          View Principal
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Principal' : 'Add Principal'}</DialogTitle>
        </DialogHeader>

        {isLoading && <p>Loading...</p>}
        {error && <p>Error loading principal details</p>}

        {!isLoading && !error && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
              {/* Full Name */}
              <FormField
                control={form.control}
                name='fullName'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder='Priya Kumar' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email */}
              <FormField
                control={form.control}
                name='email'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder='admin@gmail.com' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password */}
              <FormField
                control={form.control}
                name='password'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password {isEdit ? '(leave blank to keep current)' : ''}</FormLabel>
                    <FormControl>
                      <Input type='password' placeholder='********' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Confirm Password */}
              <FormField
                control={form.control}
                name='confirmPassword'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password {isEdit ? '(leave blank to keep current)' : ''}</FormLabel>
                    <FormControl>
                      <Input type='password' placeholder='********' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Designation */}
              <FormField
                control={form.control}
                name='designation'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Designation</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder='Select designation' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='Principal'>Principal</SelectItem>
                          <SelectItem value='Vice Principal'>Vice Principal</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Buttons */}
              <div className='flex justify-end gap-2'>
                <Button type='button' variant='outline' onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type='submit' disabled={isLoadingCreate || isLoadingUpdate}>
                  {isLoadingCreate || isLoadingUpdate ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
