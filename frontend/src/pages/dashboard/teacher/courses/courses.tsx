import { PlusCircle, Trash } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useDeleteCourse } from '@/hook/class/use-delete-course';
import { useGetCourses } from '@/hook/class/use-get-all-course';
import { usePublishCourse } from '@/hook/class/use-publish-course';

export function CoursesPage() {
  return (
    <div className='space-y-3'>
      <div className='flex justify-between items-center'>
        <h1 className='text-primary font-semibold'>All Courses</h1>
        <Button asChild>
          <Link to={'create-new'}>Create new Course</Link>
        </Button>
      </div>

      <Courses />
    </div>
  );
}

function Courses() {
  const { mutate: publishMutate, isPending: isPublishing } = usePublishCourse();
  const { mutate, isPending: isDeleting } = useDeleteCourse();
  const { data } = useGetCourses();

  const courses = data?.data.courses;
  if (!courses?.length) {
    return (
      <div
        className='flex flex-col items-center justify-center gap-4 py-24
                    rounded-xl border border-dashed bg-muted/30'
      >
        <PlusCircle className='h-10 w-10 text-muted-foreground' />

        <p className='text-muted-foreground text-sm'>You haven’t created any courses yet</p>

        <Button asChild>
          <Link to='create-new'>Create your first course</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
      {courses.map((course) => (
        <Card
          key={course._id}
          className='group p-5 rounded-xl border bg-background
                     transition-all hover:shadow-md hover:border-primary/30'
        >
          {/* Header */}
          <div className='flex justify-between items-start'>
            <div>
              <Link
                to={`${course._id}`}
                className='text-lg font-semibold text-foreground
                           hover:text-primary transition'
              >
                {course.title}
              </Link>

              <p className='text-xs text-muted-foreground mt-1'>Code: {course.enrollmentCode}</p>
            </div>

            {/* Status Badge */}
            <span
              className={`text-xs px-2 py-1 rounded-full font-medium
                ${course.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}
            >
              {course.status}
            </span>
          </div>

          {/* Description */}
          <p className='mt-3 text-sm text-muted-foreground line-clamp-3'>{course.description}</p>

          {/* Actions */}
          <div className='mt-4 flex items-center gap-2'>
            <Button variant='outline' size='sm' asChild>
              <Link to={`edit/${course._id}`}>Edit</Link>
            </Button>

            {course.status !== 'published' && (
              <Button size='sm' onClick={() => publishMutate({ id: course._id })} disabled={isPublishing}>
                Publish
              </Button>
            )}

            <Button
              size='icon'
              variant='ghost'
              className='ml-auto text-destructive hover:bg-destructive/10'
              onClick={() => mutate({ id: course._id })}
              disabled={isDeleting}
            >
              <Trash className='h-4 w-4' />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
