import type { ColumnDef } from '@tanstack/react-table';
import { AlertCircle, Trophy } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetDepartmentCourses } from '@/hook/admin/use-get-departmentwise-course';
import { useDepartmentCourseLeaderboard } from '@/hook/admin/use-get-stats';

interface LeaderboardEntry {
  userId: string;
  fullName: string;
  score: number;
  max: number;
  attempts: number;
}

export const DepartmentCourseLeaderboard = () => {
  const { departmentId } = useParams<{ departmentId: string }>();
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 10;

  const { data: coursesData, isLoading: coursesLoading } = useGetDepartmentCourses(departmentId || '');
  const {
    data: leaderboardData,
    isLoading: leaderboardLoading,
    isError,
  } = useDepartmentCourseLeaderboard({
    departmentId: departmentId || '',
    courseId: selectedCourseId,
    page: currentPage,
    limit,
  });

  const courses = coursesData || [];
  const leaderboard = leaderboardData?.data?.leaderboard || [];

  // Calculate percentage
  const getPercentage = (score: number, max: number): number => {
    if (max === 0) return 0;
    return Math.round((score / max) * 100);
  };

  // Get performance badge
  const getPerformanceBadge = (percentage: number) => {
    if (percentage >= 90) {
      return <Badge className='bg-green-600'>Excellent</Badge>;
    } else if (percentage >= 75) {
      return <Badge className='bg-blue-600'>Good</Badge>;
    } else if (percentage >= 60) {
      return <Badge className='bg-yellow-600'>Average</Badge>;
    } else {
      return <Badge variant='destructive'>Needs Improvement</Badge>;
    }
  };

  // Table columns
  const columns: ColumnDef<LeaderboardEntry>[] = [
    {
      id: 'rank',
      header: 'Rank',
      cell: ({ row }) => {
        const rank = (currentPage - 1) * limit + row.index + 1;
        return rank;
      },
    },
    {
      accessorKey: 'fullName',
      header: 'Student',
      cell: ({ row }) => {
        return (
          <div className='flex items-center gap-2'>
            <div className='flex items-center gap-2'>
              <span className='font-medium'>{row.original.fullName}</span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'score',
      header: 'Score',
      cell: ({ row }) => (
        <div className='flex items-center gap-2'>
          <span className='font-semibold'>
            {row.original.score}/{row.original.max}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'attempts',
      header: 'Attempts',
      cell: ({ row }) => (
        <div className='flex items-center gap-2'>
          <span>{row.original.attempts}</span>
        </div>
      ),
    },
    {
      id: 'percentage',
      header: 'Performance',
      cell: ({ row }) => {
        const percentage = getPercentage(row.original.score, row.original.max);
        return (
          <div className='space-y-2'>
            <div className='flex items-center gap-2'>
              <span className='text-2xl font-bold text-primary'>{percentage}%</span>
              {getPerformanceBadge(percentage)}
            </div>
            <div className='w-full bg-muted rounded-full h-2 overflow-hidden'>
              <div
                className={`h-full transition-all ${
                  percentage >= 90
                    ? 'bg-green-600'
                    : percentage >= 75
                      ? 'bg-blue-600'
                      : percentage >= 60
                        ? 'bg-yellow-600'
                        : 'bg-red-600'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      },
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
              <Trophy className='h-6 w-6 text-muted-foreground' />
            </div>
            <h3 className='font-semibold text-lg'>No Courses Found</h3>
            <p className='text-sm text-muted-foreground max-w-md mx-auto'>
              This department doesn't have any courses yet.
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
          <div className=' flex gap-3 justify-between'>
            <div>
              <CardTitle className='flex items-center gap-2 text-2xl'>Department Course Leaderboard</CardTitle>
              <CardDescription>View top performing students in department courses</CardDescription>
            </div>

            <div className='space-y-2'>
              <label className='text-sm font-medium'>Select Course</label>
              <Select
                value={selectedCourseId}
                onValueChange={(value) => {
                  setSelectedCourseId(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className=''>
                  <SelectValue placeholder='Choose a course to view leaderboard' />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course._id} value={course._id}>
                      <div className='flex items-center gap-2'>
                        <span className='font-medium'>{course.title}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            {/* Stats */}
            {selectedCourseId && leaderboard.length > 0 && (
              <div className='grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg'>
                <div className='space-y-1'>
                  <p className='text-xs text-muted-foreground'>Total Students</p>
                  <p className='text-2xl font-bold'>{leaderboard.length}</p>
                </div>
                <div className='space-y-1'>
                  <p className='text-xs text-muted-foreground'>Avg Score</p>
                  <p className='text-2xl font-bold'>
                    {Math.round(
                      leaderboard.reduce((acc, entry) => acc + getPercentage(entry.score, entry.max), 0) /
                        leaderboard.length,
                    )}
                    %
                  </p>
                </div>
                <div className='space-y-1'>
                  <p className='text-xs text-muted-foreground'>Top Score</p>
                  <p className='text-2xl font-bold'>
                    {leaderboard.length > 0 ? getPercentage(leaderboard[0].score, leaderboard[0].max) : 0}%
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard Table */}
      {selectedCourseId && (
        <Card>
          <CardContent className='pt-6'>
            {leaderboardLoading ? (
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
                <h3 className='font-semibold text-lg'>Failed to Load Leaderboard</h3>
                <p className='text-sm text-muted-foreground'>Unable to fetch leaderboard. Please try again later.</p>
              </div>
            ) : leaderboard.length === 0 ? (
              <div className='text-center space-y-3 py-12'>
                <div className='mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center'>
                  <Trophy className='h-6 w-6 text-muted-foreground' />
                </div>
                <h3 className='font-semibold text-lg'>No Data Yet</h3>
                <p className='text-sm text-muted-foreground'>This course doesn't have any quiz attempts yet.</p>
              </div>
            ) : (
              <DataTable columns={columns} data={leaderboard} />
            )}

            {/* Pagination Info */}
            {leaderboard.length > 0 && (
              <div className='mt-4 text-center text-sm text-muted-foreground'>
                Showing {(currentPage - 1) * limit + 1} to {(currentPage - 1) * limit + leaderboard.length} students
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
