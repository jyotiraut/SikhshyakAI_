import type { ColumnDef } from '@tanstack/react-table';
import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { type Tutorial, useUnitTutorials } from '@/hook/student/use-tutorials-by-unit';

interface UnitTutorialsTableProps {
  unitId: string;
  courseId: string;
}

export function UnitTutorialsTable({ unitId, courseId }: UnitTutorialsTableProps) {
  const { data, isLoading, error } = useUnitTutorials(unitId);

  const columns: ColumnDef<Tutorial>[] = [
    {
      accessorKey: 'unitNumber',
      header: 'Unit',
      cell: ({ row }) => <div className='font-medium'>Unit {row.getValue('unitNumber')}</div>,
    },
    {
      accessorKey: 'title',
      header: 'Tutorial Title',
      cell: ({ row }) => <div className='font-medium'>{row.getValue('title')}</div>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        return <Badge variant={status === 'published' ? 'default' : 'secondary'}>{status}</Badge>;
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const tutorial = row.original;
        return (
          <Button variant='ghost' size='sm' asChild>
            <Link to={`/student/dashboard/courses/${courseId}/tutorials/${unitId}/${tutorial._id}`}>
              View Tutorial
              <ExternalLink className='ml-2 h-4 w-4' />
            </Link>
          </Button>
        );
      },
    },
  ];

  if (isLoading) {
    return <div className='flex justify-center p-8'>Loading tutorials...</div>;
  }

  if (error) {
    return (
      <div className='rounded-md border border-destructive/50 p-4 text-center text-destructive'>
        Error loading tutorials. Please try again.
      </div>
    );
  }

  const tutorials = data?.data.tutorials || [];

  if (tutorials.length === 0) {
    return (
      <div className='rounded-md border p-8 text-center'>
        <p className='text-muted-foreground'>No tutorials available for this unit yet.</p>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h2 className='text-2xl font-bold'>Unit Tutorials</h2>
        <p className='text-sm text-muted-foreground'>
          {tutorials.length} {tutorials.length === 1 ? 'tutorial' : 'tutorials'} available
        </p>
      </div>
      <DataTable columns={columns} data={tutorials} />
    </div>
  );
}
