import { RadioGroup } from '@radix-ui/react-radio-group';
import { Edit, Frown } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroupItem } from '@/components/ui/radio-group';
import { useGetUnitWiseQuiz } from '@/hook/quizzes/use-get-unit-wise-quize';
import { usePublishQuiz } from '@/hook/quizzes/use-publish-quiz';
import GenerateQuiz from './generate-quiz';

export default function UnitWiseQuize() {
  const { unitid } = useParams();
  const { data } = useGetUnitWiseQuiz({ unitId: unitid! });
  const { mutate: publishQuiz } = usePublishQuiz();
  if (!data?.data.quizzes || data.data.quizzes.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center py-20 text-center space-y-4'>
        {/* Icon */}
        <div className='flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-600'>
          <Frown className='w-6 h-6' />
        </div>

        {/* Text */}
        <div className='space-y-1'>
          <h3 className='text-lg font-semibold text-gray-900'>No quiz yet</h3>
          <p className='text-sm text-gray-600 max-w-md'>
            This unit doesn’t have a quiz yet. Generate one to assess students’ understanding.
          </p>
        </div>

        {/* Action */}
        <div className='pt-2'>
          <GenerateQuiz unitId={unitid!} />
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-3'>
      {data.data.quizzes.map((quizeset, index) => {
        return (
          <div className='space-y-2 ' key={quizeset._id}>
            <div className='flex gap-3 justify-center items-center'>
              <p className=' text-xl font-bold'>
                {' '}
                Set {index + 1}: {quizeset.title}
              </p>
              <Link
                to={`edit-quiz/${quizeset._id}`}
                className='flex gap-2 justify-center items-center text-blue-600 underline'
              >
                <Edit size={12} />
                Edit quiz set{' '}
              </Link>
              <Button onClick={() => publishQuiz(quizeset._id)} size='sm' variant='outline'>
                Publish Quiz
              </Button>
            </div>

            <div className='space-y-4'>
              {quizeset.questions.map((qn, index) => {
                return (
                  <div key={index}>
                    <p className='font-medium'>
                      {' '}
                      Q.n.{index + 1} {qn.question}
                    </p>
                    <RadioGroup value={String(qn.correctAnswer)} className='space-y-3 mt-3'>
                      {qn.options.map((option, index) => {
                        return (
                          <div className='flex items-center gap-3 border border-primary  p-3' key={index}>
                            <RadioGroupItem value={String(index + 1)} id={index.toString()} />
                            <Label htmlFor={index.toString()}>{option}</Label>
                          </div>
                        );
                      })}
                    </RadioGroup>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
