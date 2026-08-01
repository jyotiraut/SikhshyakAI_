import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { AlertCircle, Calendar, CheckCircle, Clock, ExternalLink, FileText } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetCourses } from '@/hook/class/use-get-all-course';
import { type TutorialSubmission, useTutorialSubmissions } from '@/hook/teacher/use-get-tutorial-submissions';
import { GradeDialog } from './grading-modal';

export const TutorialSubmissions = () => {
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');

  const { data: coursesData, isLoading: coursesLoading } = useGetCourses();
  const {
    data: submissionsData,
    isLoading: submissionsLoading,
    isError,
  } = useTutorialSubmissions({
    courseId: selectedCourseId,
    page: 1,
    limit: 100,
  });

  const courses = coursesData?.data?.courses || [];
  const submissions = submissionsData?.data?.submissions || [];
  const pagination = submissionsData?.data;

  // Get grading status badge
  const getGradingBadge = (submission: TutorialSubmission) => {
    if (submission.grading) {
      const percentage = (submission.grading.score / submission.grading.maxScore) * 100;
      let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'default';

      if (percentage >= 80) variant = 'default';
      else if (percentage >= 60) variant = 'secondary';
      else variant = 'destructive';

      return (
        <Badge variant={variant} className='gap-1'>
          <CheckCircle className='h-3 w-3' />
          {submission.grading.score}/{submission.grading.maxScore}
        </Badge>
      );
    }
    return (
      <Badge variant='outline' className='gap-1'>
        <Clock className='h-3 w-3' />
        Pending
      </Badge>
    );
  };

  // Table columns
  const columns: ColumnDef<TutorialSubmission>[] = [
    {
      accessorKey: 'submittedBy',
      header: 'Student',
      cell: ({ row }) => (
        <div className='flex items-center gap-2'>
          <div>
            <p className='font-medium text-sm text-primary'>{row.original.submittedBy.fullName}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'fileName',
      header: 'Submission',
      cell: ({ row }) => (
        <div className='space-y-1'>
          <div className='flex items-center gap-2'>
            <FileText className='h-4 w-4 text-muted-foreground' />
            <span className='text-sm font-medium truncate max-w-[200px]'>{row.original.fileName}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Submitted At',
      cell: ({ row }) => (
        <div className='flex items-center gap-2 text-sm'>
          <Calendar className='h-4 w-4 text-muted-foreground' />
          <div>
            <p className='font-medium'>{format(new Date(row.original.createdAt), 'MMM dd, yyyy')}</p>
            <p className='text-xs text-muted-foreground'>{format(new Date(row.original.createdAt), 'hh:mm a')}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'grading',
      header: 'Grade',
      cell: ({ row }) => (
        <div className='space-y-2'>
          {getGradingBadge(row.original)}
          {row.original.grading?.feedback && (
            <p className='text-xs text-muted-foreground max-w-[200px] truncate'>{row.original.grading.feedback}</p>
          )}
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => window.open(row.original.fileUrl, '_blank')}
            className='gap-1'
          >
            <ExternalLink className='h-3 w-3' />
            View
          </Button>
          <GradeDialog submissionId={row.original._id} />
        </div>
      ),
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
              <FileText className='h-6 w-6 text-muted-foreground' />
            </div>
            <h3 className='font-semibold text-lg'>No Courses Found</h3>
            <p className='text-sm text-muted-foreground max-w-md mx-auto'>
              You don't have any courses yet. Create a course to start receiving submissions.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Header Section */}
      <Card className=' shadow-none border-0 bg-background'>
        <CardHeader>
          <div>
            <div className='flex justify-between'>
              <div>
                <CardTitle className='flex items-center gap-2'>Tutorial Submissions</CardTitle>
                <CardDescription>View and manage tutorial submissions from your students</CardDescription>
              </div>
              <div className='space-y-2'>
                <label className='text-sm font-medium'>Select Course</label>
                <Select
                  value={selectedCourseId}
                  onValueChange={(value) => {
                    setSelectedCourseId(value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Choose a course to view submissions' />
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
          </div>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            {/* Stats */}
            {selectedCourseId && pagination && (
              <div className='grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg'>
                <div className='space-y-1'>
                  <p className='text-xs text-muted-foreground'>Total Submissions</p>
                  <p className='text-2xl font-bold'>{pagination.total}</p>
                </div>
                <div className='space-y-1'>
                  <p className='text-xs text-muted-foreground'>Graded</p>
                  <p className='text-2xl font-bold'>{submissions.filter((s) => s.grading).length}</p>
                </div>
                <div className='space-y-1'>
                  <p className='text-xs text-muted-foreground'>Pending</p>
                  <p className='text-2xl font-bold'>{submissions.filter((s) => !s.grading).length}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Submissions Table */}
      {selectedCourseId && (
        <Card className=''>
          <CardContent className='pt-6'>
            {submissionsLoading ? (
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
                <h3 className='font-semibold text-lg'>Failed to Load Submissions</h3>
                <p className='text-sm text-muted-foreground'>Unable to fetch submissions. Please try again later.</p>
              </div>
            ) : submissions.length === 0 ? (
              <div className='text-center space-y-3 py-12'>
                <div className='mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center'>
                  <FileText className='h-6 w-6 text-muted-foreground' />
                </div>
                <h3 className='font-semibold text-lg'>No Submissions Yet</h3>
                <p className='text-sm text-muted-foreground'>This course doesn't have any tutorial submissions yet.</p>
              </div>
            ) : (
              <DataTable columns={columns} data={submissions} />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
