import { format } from 'date-fns';
import { AlertCircle, BookOpen, Calendar, CheckCircle, Clock, GraduationCap, Mail, School, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useStudentStats } from '@/hook/student/use-get-stats';

export const StudentStats = () => {
  const { data, isLoading, isError } = useStudentStats();

  if (isLoading) {
    return (
      <div className='space-y-6 p-6'>
        <div className='space-y-2'>
          <Skeleton className='h-8 w-48' />
          <Skeleton className='h-4 w-32' />
        </div>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className='h-4 w-24' />
              </CardHeader>
              <CardContent>
                <Skeleton className='h-8 w-16' />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <Card className='w-full max-w-md'>
          <CardContent className='pt-6'>
            <div className='text-center space-y-3'>
              <div className='mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center'>
                <AlertCircle className='h-6 w-6 text-destructive' />
              </div>
              <h3 className='font-semibold text-lg'>Failed to Load Stats</h3>
              <p className='text-sm text-muted-foreground'>
                Unable to fetch student statistics. Please try again later.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = data.data;

  const getStatusBadge = (status: string) => {
    const statusMap = {
      published: { variant: 'default' as const, label: 'Published' },
      draft: { variant: 'secondary' as const, label: 'Draft' },
      generated: { variant: 'outline' as const, label: 'Generated' },
    };
    const config = statusMap[status as keyof typeof statusMap] || statusMap.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className='space-y-6 p-6'>
      {/* Student Header */}
      <div className='space-y-3'>
        <div className='flex items-start justify-between'>
          <div>
            <h1 className='text-3xl font-bold text-gray-900 tracking-tight'>{stats.student.fullName}</h1>
            <div className='flex items-center gap-3 mt-2 flex-wrap'>
              <span className='text-sm text-muted-foreground inline-flex items-center gap-1.5'>
                <Mail className='h-3.5 w-3.5' />
                {stats.student.email}
              </span>
              <span className='text-sm text-muted-foreground inline-flex items-center gap-1.5'>
                <School className='h-3.5 w-3.5' />
                {stats.student.school.name}
              </span>
              <span className='text-sm text-muted-foreground inline-flex items-center gap-1.5'>
                <Calendar className='h-3.5 w-3.5' />
                Joined {format(new Date(stats.student.joinedAt), 'MMM dd, yyyy')}
              </span>
            </div>
          </div>
          <div className='px-4 py-2 bg-primary/10 rounded-lg'>
            <p className='text-xs text-muted-foreground'>College Roll No.</p>
            <p className='text-lg font-bold text-primary'>{stats.student.collegeRollNo}</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        <Card className='border-l-4 border-l-blue-500'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium text-muted-foreground'>Total Enrollments</CardTitle>
            <div className='p-2 rounded-lg bg-blue-50'>
              <BookOpen className='h-5 w-5 text-blue-600' />
            </div>
          </CardHeader>
          <CardContent>
            <div className='text-3xl font-bold'>{stats.enrollments.total}</div>
            <p className='text-xs text-muted-foreground mt-1'>Courses enrolled</p>
          </CardContent>
        </Card>

        <Card className='border-l-4 border-l-green-500'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium text-muted-foreground'>Completed</CardTitle>
            <div className='p-2 rounded-lg bg-green-50'>
              <CheckCircle className='h-5 w-5 text-green-600' />
            </div>
          </CardHeader>
          <CardContent>
            <div className='text-3xl font-bold'>{stats.enrollments.completed}</div>
            <p className='text-xs text-muted-foreground mt-1'>Courses completed</p>
          </CardContent>
        </Card>

        <Card className='border-l-4 border-l-orange-500'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium text-muted-foreground'>In Progress</CardTitle>
            <div className='p-2 rounded-lg bg-orange-50'>
              <Clock className='h-5 w-5 text-orange-600' />
            </div>
          </CardHeader>
          <CardContent>
            <div className='text-3xl font-bold'>{stats.enrollments.inProgress}</div>
            <p className='text-xs text-muted-foreground mt-1'>Ongoing courses</p>
          </CardContent>
        </Card>
      </div>

      {/* Enrolled Courses */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <GraduationCap className='h-5 w-5' />
            Enrolled Courses
          </CardTitle>
          <CardDescription>All courses currently enrolled by the student</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.enrolledCourses.length > 0 ? (
            <div className='space-y-4'>
              {stats.enrolledCourses.map((course) => (
                <div
                  key={course.courseId}
                  className='p-4 border rounded-lg hover:shadow-md transition-shadow bg-gradient-to-r from-white to-gray-50'
                >
                  <div className='flex items-start justify-between gap-4'>
                    <div className='flex-1 space-y-2'>
                      <div className='flex items-center gap-2 flex-wrap'>
                        <h3 className='font-semibold text-lg'>{course.title}</h3>
                        {getStatusBadge(course.status)}
                        {course.completed && (
                          <Badge variant='default' className='gap-1'>
                            <CheckCircle className='h-3 w-3' />
                            Completed
                          </Badge>
                        )}
                      </div>

                      <p className='text-sm text-muted-foreground line-clamp-2'>{course.description}</p>

                      <div className='flex items-center gap-4 flex-wrap text-sm'>
                        <div className='flex items-center gap-1.5'>
                          <User className='h-4 w-4 text-muted-foreground' />
                          <span className='text-muted-foreground'>{course.teacher.fullName}</span>
                        </div>
                        <div className='flex items-center gap-1.5'>
                          <School className='h-4 w-4 text-muted-foreground' />
                          <span className='text-muted-foreground'>{course.school.name}</span>
                        </div>
                        <div className='flex items-center gap-1.5'>
                          <Calendar className='h-4 w-4 text-muted-foreground' />
                          <span className='text-muted-foreground'>
                            Enrolled {format(new Date(course.enrolledAt), 'MMM dd, yyyy')}
                          </span>
                        </div>
                      </div>

                      {course.completedUnits.length > 0 && (
                        <div className='pt-2'>
                          <p className='text-xs text-muted-foreground'>
                            Completed Units: {course.completedUnits.length}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className='text-center py-12'>
              <div className='mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3'>
                <BookOpen className='h-6 w-6 text-muted-foreground' />
              </div>
              <h3 className='font-semibold text-lg'>No Enrolled Courses</h3>
              <p className='text-sm text-muted-foreground mt-1'>Student hasn't enrolled in any courses yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
