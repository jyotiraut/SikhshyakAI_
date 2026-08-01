import { zodResolver } from '@hookform/resolvers/zod';
import { Edit, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCreateDepartment } from '@/hook/admin/use-create-department';
import { useUpdateDepartment } from '@/hook/admin/use-update-department';
import { useAuth } from '@/lib/provider/use-auth-provider';

const departmentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
});

type DepartmentFormData = z.infer<typeof departmentSchema>;

interface DepartmentDialogProps {
  department?: {
    _id: string;
    name: string;
    description: string;
  };
  onSuccess?: () => void;
}

export function AddDepartmentDialog({ department, onSuccess }: DepartmentDialogProps = {}) {
  const { schoolId } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const isEdit = !!department;

  const form = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  useEffect(() => {
    if (department) {
      form.reset({
        name: department.name,
        description: department.description,
      });
    } else {
      form.reset({
        name: '',
        description: '',
      });
    }
  }, [department, form]);

  const { mutate: createDepartment, isPending: isCreating } = useCreateDepartment();
  const { mutate: updateDepartment, isPending: isUpdating } = useUpdateDepartment();

  const onSubmit = (values: DepartmentFormData) => {
    if (isEdit && department) {
      updateDepartment(
        {
          departmentId: department._id,
          payload: {
            name: values.name,
            description: values.description,
          },
        },
        {
          onSuccess: () => {
            setIsOpen(false);
            onSuccess?.();
          },
        },
      );
    } else {
      createDepartment(
        {
          name: values.name,
          school: schoolId!,
          description: values.description,
        },
        {
          onSuccess: () => {
            form.reset();
            setIsOpen(false);
            onSuccess?.();
          },
        },
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size='sm' variant={isEdit ? 'outline' : 'default'}>
          {isEdit ? <Edit size={16} /> : <Plus size={16} className='mr-2' />}
          {isEdit ? 'Edit' : 'Add Department'}
        </Button>
      </DialogTrigger>

      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Department' : 'Add Department'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department Name</FormLabel>
                  <FormControl>
                    <Input placeholder='Computer Science' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='description'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder='Department description...' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='flex justify-end gap-2'>
              <Button type='button' variant='outline' onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type='submit' disabled={isCreating || isUpdating}>
                {isCreating || isUpdating ? 'Saving...' : isEdit ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
