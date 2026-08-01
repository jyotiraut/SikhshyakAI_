import { Award, BarChart3, BookOpen, Building2, ClipboardList, Crown, School, UserCheck, Users } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useSuperAdminStats } from '@/hook/superadmin/use-get-stats';

export function SuperAdminDashboardStats() {
  const { data, isLoading, error } = useSuperAdminStats();

  if (isLoading) {
    return <SuperAdminStatsLoading />;
  }

  if (error) {
    return (
      <div className='rounded-md border border-destructive/50 p-4 text-center text-destructive'>
        Error loading platform stats. Please try again.
      </div>
    );
  }

  const stats = data?.data;

  if (!stats) {
    return null;
  }

  const _activeSchoolRate =
    stats.schools.total > 0 ? Math.round((stats.schools.active / stats.schools.total) * 100) : 0;

  const _completionRate =
    stats.enrollments.total > 0 ? Math.round((stats.enrollments.completed / stats.enrollments.total) * 100) : 0;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className='space-y-8'>
      {/* Top Level Stats */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        {/* Total Schools */}
        <Card className='overflow-hidden relative border-l-4 border-l-blue-500'>
          <div className='absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full -mr-12 -mt-12' />
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Schools</CardTitle>
            <Building2 className='h-4 w-4 text-blue-500' />
          </CardHeader>
          <CardContent>
            <div className='text-3xl font-bold'>{stats.schools.total}</div>
            <p className='text-xs text-muted-foreground mt-1'>{stats.schools.active} active</p>
          </CardContent>
        </Card>

        {/* Total Users */}
        <Card className='overflow-hidden relative border-l-4 border-l-purple-500'>
          <div className='absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full -mr-12 -mt-12' />
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Users</CardTitle>
            <Users className='h-4 w-4 text-purple-500' />
          </CardHeader>
          <CardContent>
            <div className='text-3xl font-bold'>{stats.users.total - 1}</div>
            <p className='text-xs text-muted-foreground mt-1'>
              {stats.users.teachers} teachers · {stats.users.students} students · {stats.users.hods} Hods ·{' '}
              {stats.users.admins} Principals ·
            </p>
          </CardContent>
        </Card>

        {/* Total Courses */}
        <Card className='overflow-hidden relative border-l-4 border-l-green-500'>
          <div className='absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-full -mr-12 -mt-12' />
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Courses</CardTitle>
            <BookOpen className='h-4 w-4 text-green-500' />
          </CardHeader>
          <CardContent>
            <div className='text-3xl font-bold'>{stats.courses.total}</div>
            <p className='text-xs text-muted-foreground mt-1'>{stats.courses.published} published</p>
          </CardContent>
        </Card>

        {/* Total Departments */}
        <Card className='overflow-hidden relative border-l-4 border-l-pink-500'>
          <div className='absolute top-0 right-0 w-24 h-24 bg-pink-500/10 rounded-full -mr-12 -mt-12' />
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Departments</CardTitle>
            <ClipboardList className='h-4 w-4 text-pink-500' />
          </CardHeader>
          <CardContent>
            <div className='text-3xl font-bold'>{stats.departments.total}</div>
            <p className='text-xs text-muted-foreground mt-1'>{stats.quizzes.total} total quizzes</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats Grid */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {/* User Roles Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <UserCheck className='h-5 w-5' />
              User Distribution
            </CardTitle>
            <CardDescription>Platform-wide user roles</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <div className='h-2 w-2 rounded-full bg-red-500' />
                  <span className='text-sm font-medium'>Admins</span>
                </div>
                <div className='flex items-center gap-2'>
                  <Badge variant='secondary'>{stats.users.admins}</Badge>
                </div>
              </div>
            </div>

            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <div className='h-2 w-2 rounded-full bg-blue-500' />
                  <span className='text-sm font-medium'>Teachers</span>
                </div>
                <div className='flex items-center gap-2'>
                  <Badge variant='secondary'>{stats.users.teachers}</Badge>
                </div>
              </div>
            </div>

            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <div className='h-2 w-2 rounded-full bg-green-500' />
                  <span className='text-sm font-medium'>Students</span>
                </div>
                <div className='flex items-center gap-2'>
                  <Badge variant='secondary'>{stats.users.students}</Badge>
                </div>
              </div>
            </div>

            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <div className='h-2 w-2 rounded-full bg-purple-500' />
                  <span className='text-sm font-medium'>HODs</span>
                </div>
                <div className='flex items-center gap-2'>
                  <Badge variant='secondary'>{stats.users.hods}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Course Status */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <BarChart3 className='h-5 w-5' />
              Course Analytics
            </CardTitle>
            <CardDescription>Status breakdown</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <div className='h-2 w-2 rounded-full bg-green-500' />
                  <span className='text-sm font-medium'>Published</span>
                </div>
                <div className='flex items-center gap-2'>
                  <Badge variant='secondary'>{stats.courses.published}</Badge>
                </div>
              </div>
            </div>

            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <div className='h-2 w-2 rounded-full bg-yellow-500' />
                  <span className='text-sm font-medium'>Draft</span>
                </div>
                <div className='flex items-center gap-2'>
                  <Badge variant='secondary'>{stats.courses.draft}</Badge>
                </div>
              </div>
            </div>

            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <div className='h-2 w-2 rounded-full bg-blue-500' />
                  <span className='text-sm font-medium'>Generated</span>
                </div>
                <div className='flex items-center gap-2'>
                  <Badge variant='secondary'>{stats.courses.generated}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Schools by Users */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Award className='h-5 w-5' />
              Top Schools
            </CardTitle>
            <CardDescription>By user count</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              {stats.topSchools.length > 0 ? (
                stats.topSchools.map((school, index) => (
                  <div key={school._id} className='flex items-center gap-3'>
                    <div className='relative'>
                      <Avatar className='h-10 w-10'>
                        <AvatarFallback className='bg-primary/10 text-primary font-semibold'>
                          {getInitials(school.schoolName)}
                        </AvatarFallback>
                      </Avatar>
                      {index === 0 && <Crown className='absolute -top-1 -right-1 h-4 w-4 text-yellow-500' />}
                    </div>
                    <div className='flex-1 min-w-0'>
                      <p className='text-sm font-medium truncate'>{school.schoolName}</p>
                      <p className='text-xs text-muted-foreground'>
                        {school.userCount} {school.userCount === 1 ? 'user' : 'users'}
                      </p>
                    </div>
                    <Badge variant='secondary'>{index + 1}</Badge>
                  </div>
                ))
              ) : (
                <p className='text-sm text-muted-foreground text-center py-4'>No schools yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Courses by School */}
      {stats.coursesBySchool.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <School className='h-5 w-5' />
              Courses by Institution
            </CardTitle>
            <CardDescription>Course creation across schools</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
              {stats.coursesBySchool.map((school) => (
                <div
                  key={school._id}
                  className='flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors'
                >
                  <div className='space-y-1'>
                    <p className='font-medium'>{school.schoolName}</p>
                    <p className='text-sm text-muted-foreground'>
                      {school.courseCount} {school.courseCount === 1 ? 'course' : 'courses'}
                    </p>
                  </div>
                  <div className='flex h-12 w-12 items-center justify-center rounded-full bg-primary/10'>
                    <BookOpen className='h-6 w-6 text-primary' />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Loading Skeleton Component
function SuperAdminStatsLoading() {
  return (
    <div className='space-y-8'>
      <div className='space-y-2'>
        <div className='flex items-center gap-3'>
          <Skeleton className='h-12 w-12 rounded-xl' />
          <div className='space-y-2'>
            <Skeleton className='h-10 w-64' />
            <Skeleton className='h-5 w-48' />
          </div>
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-5'>
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <Skeleton className='h-4 w-20' />
              <Skeleton className='h-4 w-4 rounded' />
            </CardHeader>
            <CardContent>
              <Skeleton className='h-9 w-16 mb-2' />
              <Skeleton className='h-1 w-full mb-1' />
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
                {[...Array(4)].map((_, j) => (
                  <Skeleton key={j} className='h-12 w-full' />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
