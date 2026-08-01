import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import z from 'zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useGetPublishCourses } from '@/hook/student/course/get-all-published-course';
import { useCourseEnroll } from '@/hook/student/course/use-course-enroll';
import { useGetEnrolledCourses } from '@/hook/student/course/use-enrolled-courses';

export function CoursesPage() {
  return (
    <div className='space-y-8'>
      <EnrolledCourses />
      <AvailableCourses />
    </div>
  );
}
function EnrolledCourses() {
  const { data, isLoading } = useGetEnrolledCourses(1, 10);
  const courses = data?.data.courses;

  if (isLoading) {
    return <div>Loading enrolled courses...</div>;
  }

  if (!courses || courses.length === 0) {
    return null; // hide section if no enrolled courses
  }

  return (
    <div className='space-y-4'>
      <h1 className='text-lg font-semibold text-primary'>My Courses</h1>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        {courses.map((course) => (
          <Link to={`${course._id}`} key={course._id}>
            <Card key={course._id} className='p-5  bg-primary text-white'>
              <div className='space-y-2'>
                <h2 className='text-base font-semibold'>{course.title}</h2>

                <p className='text-sm  text-white line-clamp-2'>{course.description}</p>

                <p className='text-xs text-gray-300'>Instructor: {course.teacher.fullName}</p>

                <Badge variant={'secondary'}> ✅ Enrolled</Badge>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function AvailableCourses() {
  const { data } = useGetPublishCourses(1, 10);
  const courses = data?.data.courses;

  if (!courses) {
    return <div>Courses not created yet</div>;
  }

  return (
    <div className='space-y-4'>
      <h1 className='text-lg font-semibold text-primary'>Available Courses</h1>

      <p className='text-sm text-muted-foreground'>🔑 You need an enrollment key to join any course.</p>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        {courses.map((course) => (
          <Card key={course._id} className='p-5 flex flex-col justify-between hover:shadow-md transition-shadow'>
            <div className='space-y-2'>
              <h2 className='text-base font-semibold'>{course.title}</h2>

              <p className='text-sm text-muted-foreground line-clamp-3'>{course.description}</p>

              <p className='text-xs text-primary'>Instructor: {course.teacher.fullName}</p>
            </div>

            <div className='pt-4 flex justify-end'>
              <EnrollNowModal />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

const formSchema = z.object({
  code: z.string().min(1, 'Course code is required'),
});

type FormType = z.infer<typeof formSchema>;

function EnrollNowModal() {
  const { mutate } = useCourseEnroll();
  const form = useForm<FormType>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      code: '',
    },
  });

  function onSubmit(values: FormType) {
    mutate(values.code);
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size='sm'>🔒 Enroll Now</Button>
      </DialogTrigger>

      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Enrollment Key</DialogTitle>
          <DialogDescription>Enter the valid enrollment key provided by the instructor.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            <FormField
              control={form.control}
              name='code'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Enrollment Key</FormLabel>
                  <FormControl>
                    <Input placeholder='Enter enrollment key' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className='flex gap-2'>
              <DialogClose asChild>
                <Button variant='outline' type='button'>
                  Cancel
                </Button>
              </DialogClose>

              <Button type='submit' disabled={!form.formState.isValid}>
                Submit
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
