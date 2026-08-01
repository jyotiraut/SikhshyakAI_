import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { AlertCircle, BookOpen, Calendar, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Skeleton } from '@/components/ui/skeleton';
import { type Course, useDepartmentCourses } from '@/hook/hod/use-get-departmentwise-course';
import { useAuth } from '@/lib/provider/use-auth-provider';

export const DepartmentCourses = () => {
  const { departmentId } = useAuth();
  const {
    data: coursesData,
    isLoading: coursesLoading,
    isError,
  } = useDepartmentCourses({
    departmentId: departmentId!,
    page: 1,
    limit: 1000,
  });

  const courses = coursesData?.data?.courses || [];

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusMap = {
      published: { variant: 'default' as const, label: 'Published' },
      draft: { variant: 'secondary' as const, label: 'Draft' },
      generated: { variant: 'outline' as const, label: 'Generated' },
    };
    const config = statusMap[status as keyof typeof statusMap] || statusMap.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Table columns
  const columns: ColumnDef<Course>[] = [
    {
      accessorKey: 'title',
      header: 'Course Title',
      cell: ({ row }) => (
        <div className='flex items-center gap-3'>
          <div className='h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center'>
            <BookOpen className='h-5 w-5 text-primary' />
          </div>
          <div className='max-w-md'>
            <p className='font-medium'>{row.original.title}</p>
            {row.original.enrollmentCode && (
              <p className='text-xs text-muted-foreground'>Code: {row.original.enrollmentCode}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'teacher',
      header: 'Teacher',
      cell: ({ row }) => (
        <div className='flex items-center gap-2'>
          <User className='h-4 w-4 text-muted-foreground' />
          <div>
            <p className='text-sm font-medium'>{row.original.teacher.fullName}</p>
            <p className='text-xs text-muted-foreground'>{row.original.teacher.email}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
    {
      accessorKey: 'createdAt',
      header: 'Created Date',
      cell: ({ row }) => (
        <div className='flex items-center gap-2 text-sm'>
          <Calendar className='h-4 w-4 text-muted-foreground' />
          <span>{format(new Date(row.original.createdAt), 'MMM dd, yyyy')}</span>
        </div>
      ),
    },
  ];

  return (
    <div className='space-y-6'>
      {/* Header Section */}
      <Card className='bg-background shadow-none border-0'>
        <CardHeader>
          <div className='flex justify-between'>
            <div className='space-y-2'>
              <CardTitle className='flex items-center gap-2'>Department Courses</CardTitle>
              <CardDescription>Manage and view courses in your department</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Courses Table */}
      <Card className='shadow-none'>
        <CardContent className='pt-6'>
          {coursesLoading ? (
            <div className='space-y-3'>
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className='h-16 w-full' />
              ))}
            </div>
          ) : isError ? (
            <div className='text-center space-y-3 py-12'>
              <div className='mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center'>
                <AlertCircle className='h-6 w-6 text-destructive' />
              </div>
              <h3 className='font-semibold text-lg'>Failed to Load Courses</h3>
              <p className='text-sm text-muted-foreground'>Unable to fetch courses. Please try again later.</p>
            </div>
          ) : courses.length === 0 ? (
            <div className='text-center space-y-3 py-12'>
              <div className='mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center'>
                <BookOpen className='h-6 w-6 text-muted-foreground' />
              </div>
              <h3 className='font-semibold text-lg'>No Courses Yet</h3>
              <p className='text-sm text-muted-foreground'>This department doesn't have any courses yet.</p>
            </div>
          ) : (
            <DataTable columns={columns} data={courses} />
          )}
        </CardContent>
      </Card>
    </div>
  );
};
