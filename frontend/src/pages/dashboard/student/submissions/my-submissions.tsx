import type { ColumnDef } from '@tanstack/react-table';
import { ExternalLink, FileText } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import {
  type TutorialSubmissionListItem,
  useMyTutorialSubmissions,
} from '@/hook/student/submission-details/submissions';

export function MyTutorialSubmissions() {
  const [page, _setPage] = useState(1);
  const limit = 10;

  const { data, isLoading, error } = useMyTutorialSubmissions(page, limit);

  const columns: ColumnDef<TutorialSubmissionListItem>[] = [
    {
      accessorKey: 'course.title',
      header: 'Course',
      cell: ({ row }) => <div className='font-medium'>{row.original.course.title}</div>,
    },
    {
      accessorKey: 'unit.title',
      header: 'Unit',
      cell: ({ row }) => (
        <div>
          <div className='font-medium'>{row.original.unit.title}</div>
          <div className='text-xs text-muted-foreground'>Unit {row.original.unit.unitNumber}</div>
        </div>
      ),
    },
    {
      accessorKey: 'tutorial.title',
      header: 'Tutorial',
      cell: ({ row }) => (
        <div>
          <div className='font-medium'>{row.original.tutorial.title}</div>
          <div className='text-xs text-muted-foreground'>{row.original.tutorial.totalQuestions} questions</div>
        </div>
      ),
    },
    {
      accessorKey: 'grading.isGraded',
      header: 'Status',
      cell: ({ row }) => {
        const grading = row.original.grading;
        return (
          <div className='space-y-1'>
            <Badge variant={grading.isGraded ? 'default' : 'secondary'}>
              {grading.isGraded ? 'Graded' : 'Pending'}
            </Badge>
            {grading.isGraded && (
              <div className='text-xs text-muted-foreground'>
                {grading.score}/{grading.maxScore} ({grading.percentage}%)
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'submission.answeredAt',
      header: 'Submitted',
      cell: ({ row }) => (
        <div className='text-sm text-muted-foreground'>
          {new Date(row.original.submission.answeredAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const submission = row.original;
        return (
          <div className='flex items-center gap-2'>
            <Button variant='ghost' size='sm' asChild>
              <Link to={`/student/dashboard/submissions/${submission.id}`}>
                <ExternalLink className='w-4 h-4' />
              </Link>
            </Button>
          </div>
        );
      },
    },
  ];

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-lg text-gray-500'>Loading submissions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='max-w-6xl mx-auto p-6'>
        <div className='rounded-md border border-destructive/50 p-4 text-center text-destructive'>
          Error loading submissions. Please try again.
        </div>
      </div>
    );
  }

  const submissions = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className=' mx-auto p-6 space-y-6'>
      <Card className='bg-background shadow-none border-none'>
        <CardHeader>
          <CardTitle>My Tutorial Submissions</CardTitle>
          <CardDescription>View and manage all your tutorial submissions</CardDescription>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <div className='text-center py-12'>
              <FileText className='w-12 h-12 text-muted-foreground mx-auto mb-4' />
              <p className='text-muted-foreground'>No submissions yet</p>
            </div>
          ) : (
            <div className='space-y-4'>
              <div className='flex items-center justify-between'>
                <p className='text-sm text-muted-foreground'>
                  Showing {submissions.length} of {pagination?.total} submissions
                </p>
              </div>

              <DataTable
                columns={columns}
                data={submissions}
                pagination={true}
                // options={{
                //     manualPagination: true,
                //     pageCount: pagination?.totalPages || 1,
                //     state: {
                //         pagination: {
                //             pageIndex: page - 1,
                //             pageSize: limit,
                //         },
                //     },
                //     onPaginationChange: (updater) => {
                //         if (typeof updater === 'function') {
                //             const newState = updater({
                //                 pageIndex: page - 1,
                //                 pageSize: limit,
                //             });
                //             setPage(newState.pageIndex + 1);
                //         }
                //     },
                // }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
