// components/admin/AdminDashboard.tsx

import {
  Award,
  BarChart3,
  BookOpen,
  Building2,
  FileText,
  GraduationCap,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminStats } from '@/hook/admin/use-get-stats';

export const AdminDashboard = () => {
  const { data, isLoading, isError } = useAdminStats();

  if (isLoading) {
    return (
      <div className='space-y-6 p-6'>
        <div className='space-y-2'>
          <Skeleton className='h-8 w-48' />
          <Skeleton className='h-4 w-32' />
        </div>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className='h-4 w-24' />
              </CardHeader>
              <CardContent>
                <Skeleton className='h-8 w-16 mb-2' />
                <Skeleton className='h-3 w-32' />
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
                <BarChart3 className='h-6 w-6 text-destructive' />
              </div>
              <h3 className='font-semibold text-lg'>Failed to Load Dashboard</h3>
              <p className='text-sm text-muted-foreground'>
                Unable to fetch dashboard statistics. Please try again later.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = data.data;

  const statCards = [
    {
      title: 'Total Users',
      value: stats.users.total,
      icon: Users,
      description: `${stats.users.teachers} Teachers • ${stats.users.students} Students`,
      subStats: [
        { label: 'HODs', value: stats.users.hods },
        { label: 'Blocked', value: stats.users.blocked },
      ],
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    {
      title: 'Total Courses',
      value: stats.courses.total,
      icon: BookOpen,
      description: `${stats.courses.published} Published • ${stats.courses.draft} Draft`,
      subStats: [{ label: 'Generated', value: stats.courses.generated }],
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
    {
      title: 'Enrollments',
      value: stats.enrollments.total,
      icon: GraduationCap,
      description: `${stats.enrollments.completed} Completed`,
      subStats: [
        {
          label: 'In Progress',
          value: stats.enrollments.total - stats.enrollments.completed,
        },
      ],
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
    },
    {
      title: 'Total Quizzes',
      value: stats.quizzes.total,
      icon: FileText,
      description: 'Active quizzes',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
    },
    {
      title: 'Departments',
      value: stats.departments.total,
      icon: Building2,
      description: 'Active departments',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200',
    },
    {
      title: 'HOD Team',
      value: stats.users.hods,
      icon: UserCheck,
      description: `${stats.users.hodAssistants} Assistants`,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      borderColor: 'border-pink-200',
    },
  ];

  return (
    <div className='space-y-8 p-6'>
      {/* Header Section */}
      <div className='space-y-3'>
        <div className='flex items-start justify-between'>
          <div>
            <h1 className='text-3xl font-bold text-gray-900 tracking-tight'>{stats.school.name}</h1>
            <div className='flex items-center gap-3 mt-2'>
              <span className='text-sm text-muted-foreground capitalize inline-flex items-center gap-1.5'>
                <Building2 className='h-3.5 w-3.5' />
                {stats.school.type}
              </span>
              {stats.school.isVerified && (
                <span className='px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full inline-flex items-center gap-1'>
                  <svg className='h-3 w-3' fill='currentColor' viewBox='0 0 20 20'>
                    <path
                      fillRule='evenodd'
                      d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                      clipRule='evenodd'
                    />
                  </svg>
                  Verified
                </span>
              )}
              {stats.school.isBlocked && (
                <span className='px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full'>Blocked</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              className={`hover:shadow-lg transition-all duration-200 border-l-4 ${stat.borderColor}`}
            >
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-3'>
                <CardTitle className='text-sm font-medium text-muted-foreground'>{stat.title}</CardTitle>
                <div className={`p-2.5 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent className='space-y-2'>
                <div className='text-3xl font-bold tracking-tight'>{stat.value}</div>
                <p className='text-xs text-muted-foreground'>{stat.description}</p>
                {stat.subStats && (
                  <div className='flex gap-3 pt-2 border-t'>
                    {stat.subStats.map((subStat) => (
                      <div key={subStat.label} className='text-xs'>
                        <span className='text-muted-foreground'>{subStat.label}: </span>
                        <span className='font-semibold'>{subStat.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Bottom Section - Top Teachers & Department Stats */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {/* Top Teachers */}
        <Card className='border-t-4 border-t-yellow-500'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-lg'>
              <div className='p-2 rounded-lg bg-yellow-50'>
                <TrendingUp className='h-5 w-5 text-yellow-600' />
              </div>
              Top Teachers by Courses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topTeachers.length > 0 ? (
              <div className='space-y-3'>
                {stats.topTeachers.map((teacher, index) => (
                  <div
                    key={teacher._id}
                    className='flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg hover:shadow-md transition-shadow border border-gray-100'
                  >
                    <div className='flex items-center gap-4'>
                      <div
                        className={`
                        flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm
                        ${
                          index === 0
                            ? 'bg-yellow-100 text-yellow-700'
                            : index === 1
                              ? 'bg-gray-100 text-gray-700'
                              : 'bg-orange-100 text-orange-700'
                        }
                      `}
                      >
                        #{index + 1}
                      </div>
                      <div>
                        <p className='font-semibold text-gray-900'>{teacher.teacherName}</p>
                        <p className='text-xs text-muted-foreground'>Instructor</p>
                      </div>
                    </div>
                    <div className='text-right'>
                      <p className='text-2xl font-bold text-gray-900'>{teacher.courseCount}</p>
                      <p className='text-xs text-muted-foreground'>
                        {teacher.courseCount === 1 ? 'course' : 'courses'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className='text-center py-12'>
                <Award className='h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30' />
                <p className='text-muted-foreground text-sm'>No teachers found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Department Statistics */}
        <Card className='border-t-4 border-t-indigo-500'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-lg'>
              <div className='p-2 rounded-lg bg-indigo-50'>
                <Building2 className='h-5 w-5 text-indigo-600' />
              </div>
              Department Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.departmentStats.length > 0 ? (
              <div className='space-y-3'>
                {stats.departmentStats.map((dept) => (
                  <div
                    key={dept._id}
                    className='flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-white rounded-lg hover:shadow-md transition-shadow border border-indigo-100'
                  >
                    <div className='flex items-center gap-3'>
                      <div className='p-2 rounded-lg bg-indigo-100'>
                        <Building2 className='h-5 w-5 text-indigo-600' />
                      </div>
                      <div>
                        <p className='font-semibold text-gray-900'>{dept.departmentName}</p>
                        <p className='text-xs text-muted-foreground'>Department</p>
                      </div>
                    </div>
                    <div className='text-right'>
                      <p className='text-2xl font-bold text-gray-900'>{dept.userCount}</p>
                      <p className='text-xs text-muted-foreground'>{dept.userCount === 1 ? 'user' : 'users'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className='text-center py-12'>
                <Building2 className='h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30' />
                <p className='text-muted-foreground text-sm'>No departments found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
