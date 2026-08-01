import type { ColumnDef } from '@tanstack/react-table';
import { Calendar, CheckCircle2, Clock, Users, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetCourses } from '@/hook/class/use-get-all-course';
import { type Enrollment, useGetEnrollments } from '@/hook/class/use-get-enrollments';

export const CourseEnrollments = () => {
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 20;

  const { data: coursesData, isLoading: coursesLoading } = useGetCourses();
  const {
    data: enrollmentsData,
    isLoading: enrollmentsLoading,
    isError,
  } = useGetEnrollments({
    courseId: selectedCourseId,
    page: currentPage,
    limit,
  });

  const courses = coursesData?.data?.courses || [];
  const enrollments = enrollmentsData?.data?.enrollments || [];
  const totalPages = enrollmentsData?.data?.totalPages || 1;
  const total = enrollmentsData?.data?.total || 0;

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Table columns
  const columns: ColumnDef<Enrollment>[] = [
    {
      accessorKey: 'student.fullName',
      header: 'Student Name',
      cell: ({ row }) => (
        <div className='flex items-center gap-2'>
          <div className='h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center'>
            <span className='text-sm font-semibold text-primary'>
              {row.original.student.fullName.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className='font-medium'>{row.original.student.fullName}</span>
        </div>
      ),
    },
    {
      accessorKey: 'enrolledAt',
      header: 'Enrolled Date',
      cell: ({ row }) => (
        <div className='flex items-center gap-2'>
          <Calendar className='h-4 w-4 text-muted-foreground' />
          <span>{formatDate(row.original.enrolledAt)}</span>
        </div>
      ),
    },

    {
      accessorKey: 'completed',
      header: 'Status',
      cell: ({ row }) => (
        <Badge
          variant={row.original.completed ? 'default' : 'secondary'}
          className={row.original.completed ? 'bg-green-600' : ''}
        >
          {row.original.completed ? <CheckCircle2 className='h-3 w-3 mr-1' /> : <Clock className='h-3 w-3 mr-1' />}
          {row.original.completed ? 'Completed' : 'In Progress'}
        </Badge>
      ),
    },
    {
      id: 'completedUnitsCount',
      header: 'Units Completed',
      cell: ({ row }) => <span className='text-sm'>{row.original.completedUnits.length} units</span>,
    },
  ];

  // Loading state for courses
  if (coursesLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className='h-6 w-48' />
          <Skeleton className='h-4 w-64 mt-2' />
        </CardHeader>
        <CardContent>
          <Skeleton className='h-10 w-full' />
        </CardContent>
      </Card>
    );
  }

  // Empty state for courses
  if (courses.length === 0) {
    return (
      <Card>
        <CardContent className='pt-6'>
          <div className='text-center space-y-3 py-12'>
            <div className='mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center'>
              <Users className='h-6 w-6 text-muted-foreground' />
            </div>
            <h3 className='font-semibold text-lg'>No Courses Found</h3>
            <p className='text-sm text-muted-foreground max-w-md mx-auto'>
              You don't have any courses yet. Create a course to view enrollments.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Header Section */}
      <Card className='bg-background border-0 shadow-none'>
        <CardHeader>
          <div className='flex gap-3 justify-between'>
            <div>
              <CardTitle className='flex items-center gap-2 text-2xl'>Course Enrollments</CardTitle>
              <CardDescription>View and manage student enrollments for your courses</CardDescription>
            </div>

            <div className='space-y-2'>
              <label htmlFor='course-select' className='text-sm font-medium'>
                Select Course
              </label>
              <Select
                value={selectedCourseId}
                onValueChange={(value) => {
                  setSelectedCourseId(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger id='course-select' className='w-[300px]'>
                  <SelectValue placeholder='Choose a course to view enrollments' />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course._id} value={course._id}>
                      <div className='flex items-center gap-2'>
                        <span className='font-medium'>{course.title}</span>
                        <Badge
                          variant={
                            course.status === 'published'
                              ? 'default'
                              : course.status === 'draft'
                                ? 'secondary'
                                : 'outline'
                          }
                        >
                          {course.status}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        {/* Stats Section */}
        {selectedCourseId && enrollments.length > 0 && (
          <CardContent>
            <div className='grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg'>
              <div className='space-y-1'>
                <p className='text-xs text-muted-foreground flex items-center gap-1'>
                  <Users className='h-3 w-3' />
                  Total Enrollments
                </p>
                <p className='text-2xl font-bold'>{total}</p>
              </div>
              <div className='space-y-1'>
                <p className='text-xs text-muted-foreground flex items-center gap-1'>
                  <CheckCircle2 className='h-3 w-3' />
                  Completed
                </p>
                <p className='text-2xl font-bold'>{enrollments.filter((e) => e.completed).length}</p>
              </div>
              <div className='space-y-1'>
                <p className='text-xs text-muted-foreground flex items-center gap-1'>
                  <Clock className='h-3 w-3' />
                  In Progress
                </p>
                <p className='text-2xl font-bold'>{enrollments.filter((e) => !e.completed).length}</p>
              </div>
              <div className='space-y-1'>
                <p className='text-xs text-muted-foreground'>Completion Rate</p>
                <p className='text-2xl font-bold'>
                  {total > 0 ? Math.round((enrollments.filter((e) => e.completed).length / total) * 100) : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Enrollments Table */}
      {selectedCourseId && (
        <Card>
          <CardContent className='pt-6'>
            {enrollmentsLoading ? (
              <div className='space-y-3'>
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className='h-16 w-full' />
                ))}
              </div>
            ) : isError ? (
              <div className='text-center space-y-3 py-12'>
                <div className='mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center'>
                  <XCircle className='h-6 w-6 text-destructive' />
                </div>
                <h3 className='font-semibold text-lg'>Failed to Load Enrollments</h3>
                <p className='text-sm text-muted-foreground'>Unable to fetch enrollments. Please try again later.</p>
              </div>
            ) : enrollments.length === 0 ? (
              <div className='text-center space-y-3 py-12'>
                <div className='mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center'>
                  <Users className='h-6 w-6 text-muted-foreground' />
                </div>
                <h3 className='font-semibold text-lg'>No Enrollments Yet</h3>
                <p className='text-sm text-muted-foreground'>This course doesn't have any enrolled students yet.</p>
              </div>
            ) : (
              <>
                <DataTable columns={columns} data={enrollments} />

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className='mt-4 flex items-center justify-between'>
                    <p className='text-sm text-muted-foreground'>
                      Showing {(currentPage - 1) * limit + 1} to {Math.min(currentPage * limit, total)} of {total}{' '}
                      enrollments
                    </p>
                    <div className='flex gap-2'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <div className='flex items-center gap-1'>
                        <span className='text-sm'>
                          Page {currentPage} of {totalPages}
                        </span>
                      </div>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
