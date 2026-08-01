import { ArrowRight, BookOpen, Calendar, FileCheck, Plus, Users } from 'lucide-react';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useTeacherStats } from '@/hook/teacher/use-get-stats';

export function TeacherDashboardStats() {
  const { data, isLoading, error } = useTeacherStats();

  if (isLoading) {
    return <TeacherStatsLoading />;
  }

  if (error) {
    return (
      <div className='rounded-md border border-destructive/50 p-4 text-center text-destructive'>
        Error loading stats. Please try again.
      </div>
    );
  }

  const stats = data?.data;

  if (!stats) {
    return null;
  }

  // If no courses exist, show empty state
  if (stats.courses.total === 0) {
    return <NoCourseState teacher={stats.teacher} />;
  }

  const publishedRate = stats.courses.total > 0 ? Math.round((stats.courses.published / stats.courses.total) * 100) : 0;

  return (
    <div className='space-y-6'>
      {/* Welcome Section */}
      <div className='space-y-2'>
        <h1 className='text-3xl font-bold tracking-tight'>Welcome back, {stats.teacher.fullName}!</h1>
        <p className='text-muted-foreground'>
          Here's an overview of your teaching activity at {stats.teacher.school.name}
        </p>
      </div>

      {/* Stats Grid */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {/* Total Courses */}
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Courses</CardTitle>
            <BookOpen className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{stats.courses.total}</div>
            <p className='text-xs text-muted-foreground mt-1'>
              {stats.courses.published} published, {stats.courses.draft} draft
            </p>
          </CardContent>
        </Card>

        {/* Published Courses */}
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Published Courses</CardTitle>
            <FileCheck className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{stats.courses.published}</div>
            <Progress value={publishedRate} className='mt-2' />
            <p className='text-xs text-muted-foreground mt-1'>{publishedRate}% of total courses</p>
          </CardContent>
        </Card>

        {/* Total Enrollments */}
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Enrollments</CardTitle>
            <Users className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{stats.enrollments.total}</div>
            <p className='text-xs text-muted-foreground mt-1'>Across all your courses</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Course Breakdown */}
      <div className='grid gap-4 md:grid-cols-2'>
        {/* Course Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Course Status</CardTitle>
            <CardDescription>Distribution of your courses by status</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <div className='h-3 w-3 rounded-full bg-green-500' />
                  <span className='text-sm font-medium'>Published</span>
                </div>
                <Badge variant='secondary'>{stats.courses.published}</Badge>
              </div>
              <Progress value={(stats.courses.published / stats.courses.total) * 100} className='h-2' />
            </div>

            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <div className='h-3 w-3 rounded-full bg-yellow-500' />
                  <span className='text-sm font-medium'>Draft</span>
                </div>
                <Badge variant='secondary'>{stats.courses.draft}</Badge>
              </div>
              <Progress value={(stats.courses.draft / stats.courses.total) * 100} className='h-2' />
            </div>

            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <div className='h-3 w-3 rounded-full bg-blue-500' />
                  <span className='text-sm font-medium'>Generated</span>
                </div>
                <Badge variant='secondary'>{stats.courses.generated}</Badge>
              </div>
              <Progress value={(stats.courses.generated / stats.courses.total) * 100} className='h-2' />
            </div>
          </CardContent>
        </Card>

        {/* Teacher Info */}
        <Card>
          <CardHeader>
            <CardTitle>Your Information</CardTitle>
            <CardDescription>Account details and institution</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <p className='text-sm font-medium text-muted-foreground'>Full Name</p>
              <p className='text-lg font-semibold'>{stats.teacher.fullName}</p>
            </div>

            <div className='space-y-2'>
              <p className='text-sm font-medium text-muted-foreground'>Email</p>
              <p className='text-sm'>{stats.teacher.email}</p>
            </div>

            <div className='space-y-2'>
              <p className='text-sm font-medium text-muted-foreground'>Institution</p>
              <div className='flex items-center gap-2'>
                <Badge variant='outline'>{stats.teacher.school.name}</Badge>
              </div>
            </div>

            <div className='space-y-2'>
              <p className='text-sm font-medium text-muted-foreground'>Member Since</p>
              <div className='flex items-center gap-2'>
                <Calendar className='h-4 w-4 text-muted-foreground' />
                <p className='text-sm'>
                  {new Date(stats.teacher.joinedAt).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// No Course State Component
function NoCourseState({ teacher }: { teacher: any }) {
  return (
    <div className='space-y-6'>
      {/* Welcome Section */}
      <div className='space-y-2'>
        <h1 className='text-3xl font-bold tracking-tight'>Welcome, {teacher.fullName}!</h1>
        <p className='text-muted-foreground'>Get started with your teaching journey at {teacher.school.name}</p>
      </div>

      <div className='flex space-x-3'>
        {/* Empty State Card */}
        <Card className='border-dashed shadow-none border-0'>
          <CardContent className='flex flex-col items-center justify-center py-16'>
            <div className='rounded-full bg-primary/10 p-6 mb-6'>
              <BookOpen className='h-12 w-12 text-primary' />
            </div>
            <h3 className='text-2xl font-semibold mb-2'>No courses yet</h3>
            <p className='text-muted-foreground text-center mb-6 max-w-md'>
              Start creating engaging courses for your students. You can create a new course from scratch or generate
              one using AI.
            </p>
            <div className='flex gap-3'>
              <Button asChild size='lg'>
                <Link to='/teacher/dashboard/courses/create-new'>
                  <Plus className='h-4 w-4 mr-2' />
                  Create Course
                </Link>
              </Button>
              <Button asChild variant='outline' size='lg'>
                <Link to='/teacher/dashboard/courses'>
                  <ArrowRight className='h-4 w-4 mr-2' />
                  View All Courses
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Getting Started Tips */}
        <Card className='bg-background shadow-none  border-0'>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>Quick tips to help you begin</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              <div className='flex gap-4'>
                <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10'>
                  <span className='text-sm font-semibold text-primary'>1</span>
                </div>
                <div className='space-y-1'>
                  <p className='font-medium'>Create your first course</p>
                  <p className='text-sm text-muted-foreground'>
                    Set up course structure, units, and learning objectives
                  </p>
                </div>
              </div>

              <div className='flex gap-4'>
                <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10'>
                  <span className='text-sm font-semibold text-primary'>2</span>
                </div>
                <div className='space-y-1'>
                  <p className='font-medium'>Add content and materials</p>
                  <p className='text-sm text-muted-foreground'>Create quizzes, tutorials, and learning resources</p>
                </div>
              </div>

              <div className='flex gap-4'>
                <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10'>
                  <span className='text-sm font-semibold text-primary'>3</span>
                </div>
                <div className='space-y-1'>
                  <p className='font-medium'>Publish and share</p>
                  <p className='text-sm text-muted-foreground'>Make your course available to students</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Loading Skeleton Component
function TeacherStatsLoading() {
  return (
    <div className='space-y-6'>
      <div className='space-y-2'>
        <Skeleton className='h-9 w-64' />
        <Skeleton className='h-5 w-96' />
      </div>

      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <Skeleton className='h-4 w-24' />
              <Skeleton className='h-4 w-4 rounded' />
            </CardHeader>
            <CardContent>
              <Skeleton className='h-8 w-16 mb-2' />
              <Skeleton className='h-3 w-32' />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <Card>
          <CardHeader>
            <Skeleton className='h-6 w-32 mb-2' />
            <Skeleton className='h-4 w-48' />
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className='h-12 w-full' />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className='h-6 w-32 mb-2' />
            <Skeleton className='h-4 w-48' />
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className='h-16 w-full' />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
