import type { ColumnDef } from '@tanstack/react-table';
import { Trash, Trophy } from 'lucide-react';
import { Link } from 'react-router';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { useDeleteDepartment } from '@/hook/admin/use-delete-department';
import { type Department, useGetDepartments } from '@/hook/admin/use-get-departments';
import { useAuth } from '@/lib/provider/use-auth-provider';
import { AddDepartmentDialog } from './add-department-dialog';
import { AssignHodDialog } from './assign-hod-dialog';

export function DepartmentsPage() {
  const { schoolId } = useAuth();
  const { data, isLoading, error, refetch } = useGetDepartments(schoolId || '');
  const { mutate: deleteDepartment } = useDeleteDepartment();

  if (isLoading) return <p>Loading departments...</p>;
  if (error) return <p>Error loading departments</p>;

  const columns: ColumnDef<Department>[] = [
    {
      header: 'Name',
      accessorKey: 'name',
    },
    {
      header: 'Description',
      accessorKey: 'description',
    },
    {
      header: 'HOD Status',
      accessorKey: 'head',
      cell: ({ row }) =>
        row.original.head ? (
          <span className='text-green-600 font-medium'>HOD Assigned</span>
        ) : (
          <span className='text-red-600 font-medium'>Not Assigned</span>
        ),
    },
    {
      header: 'Created At',
      accessorKey: 'createdAt',
      cell: ({ getValue }) => new Date(getValue() as string).toLocaleDateString(),
    },
    {
      header: 'Actions',
      cell: ({ row }) => {
        const hasHod = !!row.original.head;

        return (
          <div className='flex space-x-2'>
            {/* View Leaderboard */}
            <Button size='sm' variant='default' asChild>
              <Link to={`/admin/dashboard/departments/${row.original._id}/leaderboard`}>
                <Trophy size={16} className='mr-1' />
                Leaderboard
              </Link>
            </Button>

            {/* Edit Department */}
            <AddDepartmentDialog department={row.original} onSuccess={refetch} />

            <AssignHodDialog hasHOD={hasHod} departmentId={row.original._id} departmentName={row.original.name} />

            {/* Delete */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size='sm' variant='destructive'>
                  <Trash size={16} />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the department "{row.original.name}" and
                    remove all associated data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteDepartment(row.original._id)}
                    className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        );
      },
    },
  ];

  return (
    <div className='space-y-4'>
      <div className='flex justify-between items-center'>
        <h1 className='text-lg font-semibold'>Departments</h1>
        <AddDepartmentDialog />
      </div>

      <DataTable data={data?.data.departments || []} columns={columns} />
    </div>
  );
}
