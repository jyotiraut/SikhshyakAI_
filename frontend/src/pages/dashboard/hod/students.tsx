import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { AlertCircle, Calendar, Mail, UserCheck, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Skeleton } from '@/components/ui/skeleton';
import { type Student, useDepartmentStudents } from '@/hook/hod/use-get-department-students';
import { useAuth } from '@/lib/provider/use-auth-provider';

export const DepartmentStudents = () => {
  const { departmentId } = useAuth();
  const {
    data: studentsData,
    isLoading: studentsLoading,
    isError,
  } = useDepartmentStudents({
    departmentId: departmentId!,
    page: 1,
    limit: 1000, // Large limit to get all students
  });

  const students = studentsData?.data?.students || [];
  const pagination = studentsData;

  // Table columns
  const columns: ColumnDef<Student>[] = [
    {
      accessorKey: 'fullName',
      header: 'Student Name',
      cell: ({ row }) => (
        <div className='flex items-center gap-3'>
          <div className='h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center'>
            <UserCheck className='h-5 w-5 text-primary' />
          </div>
          <div>
            <p className='font-medium'>{row.original.fullName}</p>
            {row.original.collegeRollNo && (
              <p className='text-xs text-muted-foreground'>Roll: {row.original.collegeRollNo}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => (
        <div className='flex items-center gap-2'>
          <Mail className='h-4 w-4 text-muted-foreground' />
          <span className='text-sm'>{row.original.email}</span>
        </div>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Joined Date',
      cell: ({ row }) => (
        <div className='flex items-center gap-2 text-sm'>
          <Calendar className='h-4 w-4 text-muted-foreground' />
          <span>{format(new Date(row.original.createdAt), 'MMM dd, yyyy')}</span>
        </div>
      ),
    },
    {
      accessorKey: 'isBlocked',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.isBlocked ? 'destructive' : 'default'}>
          {row.original.isBlocked ? 'Blocked' : 'Active'}
        </Badge>
      ),
    },
  ];

  return (
    <div className='space-y-6'>
      {/* Header Section */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Users className='h-5 w-5' />
            Department Students
          </CardTitle>
          <CardDescription>Manage and view students in your department</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            {/* Stats */}
            {students.length > 0 && (
              <div className='grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg'>
                <div className='space-y-1'>
                  <p className='text-xs text-muted-foreground'>Total Students</p>
                  <p className='text-2xl font-bold'>{pagination?.results || 0}</p>
                </div>
                <div className='space-y-1'>
                  <p className='text-xs text-muted-foreground'>Active</p>
                  <p className='text-2xl font-bold'>{students.filter((s) => !s.isBlocked).length}</p>
                </div>
                <div className='space-y-1'>
                  <p className='text-xs text-muted-foreground'>Blocked</p>
                  <p className='text-2xl font-bold'>{students.filter((s) => s.isBlocked).length}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardContent className='pt-6'>
          {studentsLoading ? (
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
              <h3 className='font-semibold text-lg'>Failed to Load Students</h3>
              <p className='text-sm text-muted-foreground'>Unable to fetch students. Please try again later.</p>
            </div>
          ) : students.length === 0 ? (
            <div className='text-center space-y-3 py-12'>
              <div className='mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center'>
                <Users className='h-6 w-6 text-muted-foreground' />
              </div>
              <h3 className='font-semibold text-lg'>No Students Yet</h3>
              <p className='text-sm text-muted-foreground'>This department doesn't have any students yet.</p>
            </div>
          ) : (
            <DataTable columns={columns} data={students} />
          )}
        </CardContent>
      </Card>
    </div>
  );
};
