import type { ColumnDef } from '@tanstack/react-table';
import type { Tutorial } from '@/hook/tutorial/use-generate-tutorial';

export const tutorialColumns: ColumnDef<Tutorial>[] = [
  {
    accessorKey: 'title',
    header: 'Title',
    cell: ({ row }) => {
      return <div className='font-medium text-gray-900'>{row.original.title}</div>;
    },
  },
  {
    accessorKey: 'unitNumber',
    header: 'Unit',
    cell: ({ row }) => {
      return (
        <div className='flex items-center gap-2'>
          <div className='w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-sm'>
            {row.original.unitNumber}
          </div>
        </div>
      );
    },
  },
  {
    id: 'questionCount',
    header: 'Questions',
    cell: ({ row }) => {
      const questions = row.original.questions;
      const lowCount = questions.filter((q) => q.difficulty === 'low').length;
      const midCount = questions.filter((q) => q.difficulty === 'mid').length;
      const highCount = questions.filter((q) => q.difficulty === 'high').length;

      return (
        <div className='space-y-1'>
          <div className='font-semibold text-gray-900'>Total: {questions.length}</div>
          <div className='flex gap-2 text-xs'>
            <span className='px-2 py-0.5 bg-green-100 text-green-700 rounded'>Low: {lowCount}</span>
            <span className='px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded'>Mid: {midCount}</span>
            <span className='px-2 py-0.5 bg-red-100 text-red-700 rounded'>High: {highCount}</span>
          </div>
        </div>
      );
    },
  },
  {
    id: 'questionTypes',
    header: 'Question Types',
    cell: ({ row }) => {
      const questions = row.original.questions;
      const numericalCount = questions.filter((q) => q.type === 'numerical-problem').length;
      const shortAnswerCount = questions.filter((q) => q.type === 'short-answer').length;

      return (
        <div className='flex gap-2 text-xs'>
          {numericalCount > 0 && (
            <span className='px-2 py-1 bg-purple-100 text-purple-700 rounded'>Numerical: {numericalCount}</span>
          )}
          {shortAnswerCount > 0 && (
            <span className='px-2 py-1 bg-blue-100 text-blue-700 rounded'>Short Answer: {shortAnswerCount}</span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ row }) => {
      const date = new Date(row.original.createdAt);
      return (
        <div className='text-sm text-gray-600'>
          {date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </div>
      );
    },
  },
];
