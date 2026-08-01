import { Award, Crown, School, Target, TrendingUp, UserCheck } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useHodStats } from '@/hook/hod/use-get-stats';

export function HodDashboardStats() {
  const { data, isLoading, error } = useHodStats();

  if (isLoading) {
    return <HodStatsLoading />;
  }

  if (error) {
    return (
      <div className='rounded-md border border-destructive/50 p-4 text-center text-destructive'>
        Error loading department stats. Please try again.
      </div>
    );
  }

  const stats = data?.data;

  if (!stats) {
    return null;
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const _getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'published':
        return 'bg-green-500';
      case 'draft':
        return 'bg-yellow-500';
      case 'generated':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className='space-y-8'>
      {/* Header Section */}
      <div className='space-y-4'>
        <div className='flex items-start justify-between'>
          <div className='space-y-1'>
            <h1 className='text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent'>
              {stats.department.name}
            </h1>
            <div className='flex items-center gap-2 text-muted-foreground'>
              <School className='h-4 w-4' />
              <p className='text-sm'>{stats.department.school.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        {/* Total Users */}
        <Card className='overflow-hidden relative border-l-4 border-l-blue-500'>
          <div className='absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full -mr-12 -mt-12' />
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Department Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-3xl font-bold'>{stats.users.total}</div>
            <p className='text-xs text-muted-foreground mt-1'>
              {stats.users.teachers} teachers · {stats.users.students} students
            </p>
          </CardContent>
        </Card>

        {/* Total Courses */}
        <Card className='overflow-hidden relative border-l-4 border-l-purple-500'>
          <div className='absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full -mr-12 -mt-12' />
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Courses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-3xl font-bold'>{stats.courses.total}</div>
            <p className='text-xs text-muted-foreground mt-1'>
              {stats.courses.published} published · {stats.courses.draft} draft
            </p>
          </CardContent>
        </Card>

        {/* Total Enrollments */}
        <Card className='overflow-hidden relative border-l-4 border-l-green-500'>
          <div className='absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-full -mr-12 -mt-12' />
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Enrollments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-3xl font-bold'>{stats.enrollments.total}</div>
            <p className='text-xs text-muted-foreground mt-1'>{stats.enrollments.completed} completed</p>
          </CardContent>
        </Card>

        {/* Total Quizzes */}
        <Card className='overflow-hidden relative border-l-4 border-l-orange-500'>
          <div className='absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full -mr-12 -mt-12' />
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Quizzes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-3xl font-bold'>{stats.quizzes.total}</div>
            <p className='text-xs text-muted-foreground mt-1'>Across all courses</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats Grid */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {/* User Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <UserCheck className='h-5 w-5' />
              Department Members
            </CardTitle>
            <CardDescription>User distribution by role</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex items-center justify-between p-3 rounded-lg border bg-card'>
              <div className='flex items-center gap-3'>
                <span className='text-sm font-medium'>Teachers</span>
              </div>
              <Badge variant='secondary' className='text-base'>
                {stats.users.teachers}
              </Badge>
            </div>

            <div className='flex items-center justify-between p-3 rounded-lg border bg-card'>
              <div className='flex items-center gap-3'>
                <span className='text-sm font-medium'>Students</span>
              </div>
              <Badge variant='secondary' className='text-base'>
                {stats.users.students}
              </Badge>
            </div>

            <div className='flex items-center justify-between p-3 rounded-lg border bg-card'>
              <div className='flex items-center gap-3'>
                <span className='text-sm font-medium'>HOD Assistants</span>
              </div>
              <Badge variant='secondary' className='text-base'>
                {stats.users.hodAssistants}
              </Badge>
            </div>

            {stats.users.blocked > 0 && (
              <div className='flex items-center justify-between p-3 rounded-lg border border-destructive/50 bg-destructive/5'>
                <span className='text-sm font-medium text-destructive'>Blocked Users</span>
                <Badge variant='destructive'>{stats.users.blocked}</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Course Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Target className='h-5 w-5' />
              Course Status
            </CardTitle>
            <CardDescription>Distribution by status</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            {stats.courseStatusBreakdown.length > 0 ? (
              stats.courseStatusBreakdown.map((status) => (
                <div key={status._id} className='flex items-center justify-between p-3 rounded-lg border bg-card'>
                  <div className='flex items-center gap-3'>
                    <span className='text-sm font-medium'>{getStatusLabel(status._id)}</span>
                  </div>
                  <Badge variant='secondary' className='text-base'>
                    {status.count}
                  </Badge>
                </div>
              ))
            ) : (
              <p className='text-sm text-muted-foreground text-center py-4'>No course data available</p>
            )}
          </CardContent>
        </Card>

        {/* Top Teachers */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Award className='h-5 w-5' />
              Top Teachers
            </CardTitle>
            <CardDescription>By course creation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              {stats.topTeachers.length > 0 ? (
                stats.topTeachers.map((teacher, index) => (
                  <div key={teacher._id} className='flex items-start gap-3 p-3 rounded-lg border bg-card'>
                    <div className='relative'>
                      <Avatar className='h-12 w-12'>
                        <AvatarFallback className='bg-primary/10 text-primary font-semibold text-base'>
                          {getInitials(teacher.teacherName)}
                        </AvatarFallback>
                      </Avatar>
                      {index === 0 && <Crown className='absolute -top-1 -right-1 h-5 w-5 text-yellow-500' />}
                    </div>
                    <div className='flex-1 min-w-0 space-y-1'>
                      <div className='flex items-center justify-between gap-2'>
                        <p className='text-sm font-medium truncate'>{teacher.teacherName}</p>
                        <Badge variant='secondary'>{index + 1}</Badge>
                      </div>
                      <div className='flex items-center gap-1 text-xs text-muted-foreground'>
                        <p className='truncate'>{teacher.teacherEmail}</p>
                      </div>
                      <div className='flex items-center gap-1'>
                        <p className='text-xs text-muted-foreground'>
                          {teacher.courseCount} {teacher.courseCount === 1 ? 'course' : 'courses'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className='text-sm text-muted-foreground text-center py-4'>No teachers in this department yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department Overview */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <TrendingUp className='h-5 w-5' />
            Department Performance
          </CardTitle>
          <CardDescription>Key metrics and insights</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid gap-4 md:grid-cols-4'>
            <div className='p-4 rounded-lg border bg-card'>
              <p className='text-sm font-medium text-muted-foreground mb-2'>Published Courses</p>
              <div className='flex items-baseline gap-2'>
                <p className='text-3xl font-bold'>{stats.courses.published}</p>
                <span className='text-sm text-muted-foreground'>/ {stats.courses.total}</span>
              </div>
            </div>

            <div className='p-4 rounded-lg border bg-card'>
              <p className='text-sm font-medium text-muted-foreground mb-2'>Completed Enrollments</p>
              <div className='flex items-baseline gap-2'>
                <p className='text-3xl font-bold'>{stats.enrollments.completed}</p>
                <span className='text-sm text-muted-foreground'>/ {stats.enrollments.total}</span>
              </div>
            </div>

            <div className='p-4 rounded-lg border bg-card'>
              <p className='text-sm font-medium text-muted-foreground mb-2'>Avg Quizzes per Course</p>
              <p className='text-3xl font-bold'>
                {stats.courses.total > 0 ? (stats.quizzes.total / stats.courses.total).toFixed(1) : '0'}
              </p>
            </div>

            <div className='p-4 rounded-lg border bg-card'>
              <p className='text-sm font-medium text-muted-foreground mb-2'>Avg Enrollments per Course</p>
              <p className='text-3xl font-bold'>
                {stats.courses.total > 0 ? (stats.enrollments.total / stats.courses.total).toFixed(1) : '0'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Loading Skeleton Component
function HodStatsLoading() {
  return (
    <div className='space-y-8'>
      <div className='space-y-4'>
        <div className='flex items-start justify-between'>
          <div className='space-y-2'>
            <Skeleton className='h-10 w-96' />
            <Skeleton className='h-5 w-48' />
          </div>
          <Skeleton className='h-10 w-32' />
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <Skeleton className='h-4 w-24' />
              <Skeleton className='h-4 w-4 rounded' />
            </CardHeader>
            <CardContent>
              <Skeleton className='h-9 w-16 mb-2' />
              <Skeleton className='h-3 w-32' />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className='h-6 w-32 mb-2' />
              <Skeleton className='h-4 w-48' />
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                {[...Array(3)].map((_, j) => (
                  <Skeleton key={j} className='h-16 w-full' />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <Skeleton className='h-6 w-48 mb-2' />
          <Skeleton className='h-4 w-64' />
        </CardHeader>
        <CardContent>
          <div className='grid gap-4 md:grid-cols-4'>
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className='h-24 w-full' />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
