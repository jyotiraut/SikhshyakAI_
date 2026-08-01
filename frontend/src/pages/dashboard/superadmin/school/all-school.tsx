import { Trash } from 'lucide-react';
import { schoolColumns } from '@/components/columns/schooll';
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
import { useDeleteSchool } from '@/hook/superadmin/use-delete-school';
import { useGetSchools } from '@/hook/superadmin/use-get-all-school';
import { useVerifySchool } from '@/hook/superadmin/use-verify-school';
import { AddSchoolDialog } from './add-school-modal';
import { ShowPrincipalModal } from './show-principal-modal';

export function AllSchoolPage() {
  const { data, isLoading, error } = useGetSchools();
  const { mutate: deleteSchool } = useDeleteSchool();
  const { mutate: verifySchool } = useVerifySchool();
  if (isLoading) return <p>Loading schools...</p>;
  if (error) return <p>Error loading schools</p>;

  return (
    <div className='space-y-4'>
      <div className='flex justify-between items-center'>
        <h1 className='text-lg font-semibold'>All Schools</h1>
        <AddSchoolDialog />
      </div>

      <div>
        <DataTable
          data={data?.data.schools || []}
          columns={[
            ...schoolColumns,
            {
              header: 'Actions',
              cell: ({ row }) => {
                const isVerified = row.original.isVerified;
                return (
                  <div className='flex items-center space-x-2'>
                    <ShowPrincipalModal schoolId={row.original._id} />

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
                            This action cannot be undone. This will permanently delete the school "{row.original.name}"
                            and remove all associated data.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => {
                              deleteSchool(row.original._id);
                            }}
                            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    {isVerified ? (
                      <p className='text-green-400'>Verified</p>
                    ) : (
                      <Button onClick={() => verifySchool(row.original._id)}>Verify</Button>
                    )}
                  </div>
                );
              },
            },
          ]}
        />
      </div>
    </div>
  );
}
