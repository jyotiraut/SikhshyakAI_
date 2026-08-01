import type { ColumnDef } from '@tanstack/react-table';
import { Edit, Frown, Send, Trash } from 'lucide-react';
import { Link, useParams } from 'react-router';
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
import { useDeleteTutorial } from '@/hook/tutorial/use-delete-tutorial';
import type { Tutorial } from '@/hook/tutorial/use-generate-tutorial';
import { useGetUnitWiseTutorial } from '@/hook/tutorial/use-get-unitwise-tutorial';
import { usePublishTutorial } from '@/hook/tutorial/use-publish';
import GenerateTutorial from './generate';
import { tutorialColumns } from './tutorials-column';

export default function UnitWiseTutorial() {
  const { unitid } = useParams();
  const { data, isLoading } = useGetUnitWiseTutorial({ unitId: unitid! });
  const { mutate: publishTutorial } = usePublishTutorial();
  const { mutate: deleteTutorial } = useDeleteTutorial();

  const columns: ColumnDef<Tutorial>[] = [
    ...tutorialColumns,
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        return (
          <div className='flex gap-2'>
            {/* Edit Button */}
            <Button asChild size='sm' variant='outline'>
              <Link to={`edit-tutorial/${row.original._id}`}>
                <Edit className='w-4 h-4' />
              </Link>
            </Button>

            {/* Publish Button */}
            <Button size='sm' variant='default' onClick={() => publishTutorial(row.original._id)}>
              <Send className='w-4 h-4' />
            </Button>

            {/* Delete Button with Alert Dialog */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size='sm' variant='destructive'>
                  <Trash className='w-4 h-4' />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the tutorial "{row.original.title}" and
                    remove all associated questions.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteTutorial(row.original._id)}
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

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-20'>
        <div className='text-lg text-gray-500'>Loading tutorials...</div>
      </div>
    );
  }

  if (!data?.data.tutorials || data.data.tutorials.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center py-20 text-center space-y-4'>
        {/* Icon */}
        <div className='flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-600'>
          <Frown className='w-6 h-6' />
        </div>

        {/* Text */}
        <div className='space-y-1'>
          <h3 className='text-lg font-semibold text-gray-900'>No tutorial yet</h3>
          <p className='text-sm text-gray-600 max-w-md'>
            This unit doesn't have a tutorial yet. Generate one to provide practice problems for students.
          </p>
        </div>

        {/* Action */}
        <div className='pt-2'>
          <GenerateTutorial unitId={unitid!} />
        </div>
      </div>
    );
  }

  return (
    <div className='max-w-7xl mx-auto p-6 space-y-6'>
      {/* Header */}
      <div className='flex justify-between items-center'>
        <div>
          <h1 className='text-3xl font-bold text-gray-900'>Unit Tutorials</h1>
          <p className='text-gray-600 mt-1'>Manage and publish tutorial sets for this unit ({data.data.count} total)</p>
        </div>
        <GenerateTutorial unitId={unitid!} />
      </div>

      {/* Data Table */}
      <DataTable columns={columns} data={data.data.tutorials} />
    </div>
  );
}
