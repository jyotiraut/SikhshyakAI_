import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { UnitTutorialsTable } from './all-tutorials-unit-wise';

export function UnitTutorialsPage() {
  const { id, unitid } = useParams();

  if (!unitid || !id) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-lg text-gray-500'>Invalid parameters</div>
      </div>
    );
  }

  return (
    <div className='max-w-6xl mx-auto p-6 space-y-6'>
      {/* Back Button */}
      <Button asChild variant='ghost' size='sm'>
        <Link to={`/student/dashboard/courses/${id}`} className='flex items-center gap-2'>
          <ArrowLeft className='w-4 h-4' />
          Back to Course
        </Link>
      </Button>

      {/* Tutorials Table */}
      <UnitTutorialsTable unitId={unitid} courseId={id} />
    </div>
  );
}
