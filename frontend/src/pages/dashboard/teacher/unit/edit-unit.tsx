import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router';
import z from 'zod';
import { Button } from '@/components/ui/button';
import { DropzoneField } from '@/components/ui/file-upload-zone';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { type CourseDetailsApiResponse, useGetCourse } from '@/hook/class/use-get-course';
import { useUpdateUnitFile, useUpdateUnitText } from '@/hook/unit/update-unit';

const FileFormSchema = z.object({
  unitfile: z.array(z.file()),
});

export const TextUpdateFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(1, 'Description is required'),
  learningObjectives: z
    .array(z.string().min(1, 'Learning objective cannot be empty'))
    .min(1, 'At least one learning objective is required'),
  teachingPlan: z.object({
    overview: z.string().min(1, 'Overview is required'),
    methods: z.array(
      z.object({
        value: z.string().min(1, 'Method cannot be empty'),
      }),
    ),
    activities: z.array(
      z.object({
        value: z.string().min(1, 'Activity cannot be empty'),
      }),
    ),
  }),
  estimatedTime: z.object({
    totalMinutes: z.number().min(1, 'Total time must be at least 1 minute'),
    theoryMinutes: z.number().min(0, 'Theory time cannot be negative'),
    practicalMinutes: z.number().min(0, 'Practical time cannot be negative'),
  }),
  status: z.enum(['draft', 'published', 'generated']),
});

export type TextEditType = z.infer<typeof TextUpdateFormSchema>;

export type EditType = z.infer<typeof FileFormSchema>;
type TabValues = 'updatewithfile' | 'updateunittext';

export function EditUnitPage() {
  const { id } = useParams();
  const { unitid } = useParams();
  const { data, isLoading } = useGetCourse(id!);
  const unitToEdit = data?.units.find((unit) => unit._id === unitid);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!unitToEdit) {
    return <div>Unit not found</div>;
  }
  return <UpdateUnitTextForm unitData={unitToEdit} />;
}

type Props = {
  unitData: CourseDetailsApiResponse['data']['units'][number];
};
function UpdateUnitTextForm({ unitData }: Props) {
  const navigate = useNavigate();

  const { unitid } = useParams();
  const { mutate: updateMutate } = useUpdateUnitText(unitid!);

  const { mutate: updateFileMutate, isPending: isFilePending } = useUpdateUnitFile(unitid!);

  const [activeTab, setActiveTab] = useState<TabValues>('updatewithfile');

  const form = useForm<EditType>({
    resolver: zodResolver(FileFormSchema),
    defaultValues: {},
  });

  const formtext = useForm<TextEditType>({
    resolver: zodResolver(TextUpdateFormSchema),
    defaultValues: {
      title: unitData.title,
      description: unitData.description,
      learningObjectives: unitData.learningObjectives,
      teachingPlan: {
        overview: unitData.teachingPlan.overview,
        methods: unitData.teachingPlan.methods.map((value) => ({ value })),
        activities: unitData.teachingPlan.activities.map((value) => ({ value })),
      },
      estimatedTime: {
        totalMinutes: unitData.estimatedTime.totalMinutes,
        theoryMinutes: unitData.estimatedTime.theoryMinutes,
        practicalMinutes: unitData.estimatedTime.practicalMinutes,
      },
      status: unitData.status,
    },
  });

  function handleSubmitFile(data: EditType) {
    const file = data.unitfile[0];

    updateFileMutate(file, {
      onSuccess: () => setActiveTab('updateunittext'),
    });
  }

  function handleSubmitText(data: TextEditType) {
    console.log('Submitting update:', data);
    updateMutate(data);
    navigate(-1);
  }
  const {
    fields: methodFields,
    append: appendMethod,
    remove: removeMethod,
  } = useFieldArray({
    control: formtext.control,
    name: 'teachingPlan.methods',
  });

  const {
    fields: activityFields,
    append: appendActivity,
    remove: removeActivity,
  } = useFieldArray({
    control: formtext.control,
    name: 'teachingPlan.activities',
  });
  return (
    <div className='space-y-4'>
      <h1 className='font-semibold'>Update Unit </h1>
      <Tabs value={activeTab}>
        <TabsContent value='updatewithfile'>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmitFile)} className='space-y-4'>
              <FormField
                control={form.control}
                name='unitfile'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Upload unit file</FormLabel>
                    <FormControl>
                      <DropzoneField
                        className='min-h-[250px] '
                        value={field.value}
                        onChange={field.onChange}
                        maxFiles={1}
                        placeholder='PDF or image'
                        options={{
                          accept: {
                            'application/pdf': [],
                            'image/*': [],
                          },
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className='flex justify-end'>
                <Button type='submit' disabled={isFilePending}>
                  Next
                </Button>
              </div>
            </form>
          </Form>
        </TabsContent>
        <TabsContent value='updateunittext'>
          <Form {...formtext}>
            <form onSubmit={formtext.handleSubmit(handleSubmitText)} className='space-y-4'>
              <FormField
                name='title'
                control={formtext.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder='unit title' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={formtext.control}
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

              <FormField
                control={formtext.control}
                name='learningObjectives'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Learning Objectives</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='Enter objectives separated by commas'
                        value={field.value.join(', ')}
                        onChange={(e) => field.onChange(e.target.value.split(',').map((obj) => obj.trim()))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className='space-y-4 border p-4 rounded'>
                <h2 className='font-semibold'>Teaching Plan</h2>

                <FormField
                  control={formtext.control}
                  name='teachingPlan.overview'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Overview</FormLabel>
                      <FormControl>
                        <Textarea placeholder='Provide an overview of the teaching plan' {...field} rows={4} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className='space-y-2'>
                  <FormLabel>Teaching Methods</FormLabel>
                  {methodFields.map((field, index) => (
                    <div key={field.id} className='flex gap-2'>
                      <FormField
                        control={formtext.control}
                        name={`teachingPlan.methods.${index}.value`}
                        render={({ field }) => (
                          <FormItem className='flex-1'>
                            <FormControl>
                              <Input placeholder='e.g., Lecture' {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type='button' variant='outline' size='icon' onClick={() => removeMethod(index)}>
                        <X className='h-4 w-4' />
                      </Button>
                    </div>
                  ))}
                  <Button type='button' variant='outline' onClick={() => appendMethod({ value: '' })}>
                    + Add Method
                  </Button>
                </div>

                <div className='space-y-2'>
                  <FormLabel>Activities</FormLabel>
                  {activityFields.map((field, index) => (
                    <div key={field.id} className='flex gap-2'>
                      <FormField
                        control={formtext.control}
                        name={`teachingPlan.activities.${index}.value`}
                        render={({ field }) => (
                          <FormItem className='flex-1'>
                            <FormControl>
                              <Textarea placeholder='Describe the activity' {...field} rows={2} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type='button' variant='outline' size='icon' onClick={() => removeActivity(index)}>
                        <X className='h-4 w-4' />
                      </Button>
                    </div>
                  ))}
                  <Button type='button' variant='outline' onClick={() => appendActivity({ value: '' })}>
                    + Add Activity
                  </Button>
                </div>
              </div>

              <div className='space-y-4 border p-4 rounded'>
                <h2 className='font-semibold'>Estimated Time</h2>

                <FormField
                  control={formtext.control}
                  name='estimatedTime.totalMinutes'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Minutes</FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          min={1}
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={formtext.control}
                  name='estimatedTime.theoryMinutes'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Theory Minutes</FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          min={0}
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={formtext.control}
                  name='estimatedTime.practicalMinutes'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Practical Minutes</FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          min={0}
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={formtext.control}
                name='status'
                render={({ field: { onChange, ...field } }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <Select onValueChange={onChange} {...field}>
                        <SelectTrigger className='w-[300px]'>
                          <SelectValue placeholder='select status' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='draft'>Draft</SelectItem>
                          <SelectItem value='published'>Published</SelectItem>
                          <SelectItem value='generated'>Generated</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className='flex justify-between  mt-4'>
                <Button
                  type='button'
                  onClick={() => {
                    setActiveTab('updatewithfile');
                  }}
                >
                  Previous
                </Button>
                <Button type='submit'>Update Unit</Button>
              </div>
            </form>
          </Form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
