import type { ColumnDef } from '@tanstack/react-table';
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
import type { Principal } from '@/hook/superadmin/get-all-admins';
import { useBlockAdmin } from '@/hook/superadmin/use-block-admin';

export const getPrincipalColumns = (): ColumnDef<Principal>[] => {
  return [
    {
      accessorKey: 'fullName',
      header: 'Name',
    },
    {
      accessorKey: 'email',
      header: 'Email',
    },
    {
      accessorKey: 'designation',
      header: 'Designation',
    },
    {
      header: 'Institution',
      cell: ({ row }) => row.original.school?.name,
    },
    {
      header: 'Email Verified',
      cell: ({ row }) =>
        row.original.isEmailVerified ? (
          <span className='text-green-500'>Yes</span>
        ) : (
          <span className='text-red-500'>No</span>
        ),
    },
    {
      header: 'Blocked',
      cell: ({ row }) =>
        row.original.isBlocked ? (
          <span className='text-red-500'>Blocked</span>
        ) : (
          <span className='text-green-500'>Active</span>
        ),
    },
    {
      header: 'Actions',
      cell: ({ row }) => {
        const { mutate: blockAdmin } = useBlockAdmin();
        const isBlocked = row.original.isBlocked;

        return (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size='sm' variant={isBlocked ? 'default' : 'destructive'}>
                {isBlocked ? 'Unblock' : 'Block'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{isBlocked ? 'Unblock Admin' : 'Block Admin'}</AlertDialogTitle>
                <AlertDialogDescription>
                  {isBlocked
                    ? `Are you sure you want to unblock ${row.original.fullName}? This will allow them to access the system again.`
                    : `Are you sure you want to block ${row.original.fullName}? They will no longer be able to access the system.`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    blockAdmin({
                      schoolId: row.original.school._id,
                      adminId: row.original._id,
                      data: {
                        blocked: !isBlocked,
                        reason: isBlocked ? undefined : 'Suspicious activity',
                      },
                    });
                  }}
                  className={
                    +isBlocked
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  }
                >
                  {isBlocked ? 'Unblock' : 'Block'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        );
      },
    },
  ];
};
