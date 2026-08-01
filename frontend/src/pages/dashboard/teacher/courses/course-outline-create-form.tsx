import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useGetDepartmentsPublic } from '@/hook/admin/use-get-departments';
import { useCreateClass } from '@/hook/class/use-create-course';
import { useUpdateClass } from '@/hook/class/use-update-class';
import { useAuth } from '@/lib/provider/use-auth-provider';

const formSchema = z.object({
  title: z.string().min(1, 'Course title is required'),
  description: z.string().min(1, 'Description is required'),
  periodDurationMinutes: z.string().regex(/^[0-9]+$/, 'Must be a number in minutes'),

  totalPeriods: z.string().regex(/^[0-9]+$/, 'Must be a number '),

  pace: z.string(),
  outlinePdf: z.file(),
  language: z.string().min(1, 'Language is required'),
  department: z.string().min(1, 'Department is required'),
});
export type ClassRE = z.infer<typeof formSchema>;

type Edit = {
  mode: 'edit';
  values: Omit<ClassRE, 'outlinePdf' | 'language'>;
  id: string;
};

type Create = {
  mode: 'create';
};

type Props = Edit | Create;

export function CreateOutlineForm(props: Props) {
  const { mutate: updateMutate } = useUpdateClass();
  const { mutate, isPending } = useCreateClass();
  const { schoolId } = useAuth();
  const { data: departmentsData } = useGetDepartmentsPublic(schoolId!);

  const form = useForm<ClassRE>({
    resolver: zodResolver(formSchema),

    defaultValues:
      props.mode === 'create'
        ? {
            title: '',
            description: '',
            periodDurationMinutes: ' ',
            totalPeriods: ' ',
            pace: 'normal',
            language: 'English',
            department: '',
          }
        : props.values,
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (props.mode === 'create') {
      mutate({
        title: values.title,
        description: values.description,
        language: values.language,
        outlinePdf: values.outlinePdf,
        pace: values.pace,
        totalPeriods: values.totalPeriods,
        periodDurationMinutes: values.periodDurationMinutes,
        department: values.department,
      });
    } else {
      updateMutate({
        title: values.title,
        description: values.description,
        language: values.language,
        pace: values.pace,
        totalPeriods: values.totalPeriods,
        periodDurationMinutes: values.periodDurationMinutes,
        id: props.id,
        department: values.department,
      });
    }
  }

  return (
    <Card className='shadow-none border-0 bg-background'>
      <CardHeader>
        <CardTitle>{props.mode === 'create' ? 'Create' : 'Edit'} Course Outline</CardTitle>
        <CardDescription>Provide details for the course outline</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='title'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder='Course outline title' {...field} />
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
                      <Textarea placeholder='Short description' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
              <FormField
                control={form.control}
                name='periodDurationMinutes'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Period duration (minutes)</FormLabel>
                    <FormControl>
                      <Input type='number' placeholder='45' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='totalPeriods'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total periods</FormLabel>
                    <FormControl>
                      <Input type='number' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='pace'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pace</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger className='w-full'>
                          <SelectValue placeholder='Select pace' />
                        </SelectTrigger>

                        <SelectContent>
                          <SelectItem value='slow'>Slow</SelectItem>
                          <SelectItem value='normal'>Normal</SelectItem>
                          <SelectItem value='fast'>Fast</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className='grid grid-cols-1 md:grid-cols-3 gap-5'>
              <FormField
                control={form.control}
                name='language'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Language</FormLabel>
                    <FormControl>
                      <Input placeholder='English' {...field} />
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
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger className='w-full'>
                          <SelectValue placeholder='Select department' />
                        </SelectTrigger>
                        <SelectContent>
                          {departmentsData?.data.departments.map((dept) => (
                            <SelectItem key={dept._id} value={dept._id}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='outlinePdf'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Outline PDF</FormLabel>
                    <FormControl>
                      <Input type='file' onChange={(e) => field.onChange(e.target.files?.[0])} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className='flex justify-end'>
              <Button type='submit' disabled={isPending}>
                {props.mode === 'create' ? 'Create' : 'Edit'}Outline
              </Button>
            </div>
            {isPending && <div>Creating ouline....</div>}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
