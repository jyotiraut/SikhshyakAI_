import type { QuizQuestion } from '@/hook/quizzes/use-get-unit-wise-quize';
import { cn } from '@/lib/utils';

type Props = {
  question: QuizQuestion;
  selectQuestion: () => void;
  isActive: boolean;
};

export function QuestionCard({ question, selectQuestion, isActive }: Props) {
  return (
    <div
      className={cn('flex gap-3 border border-gray-300 px-3 py-4 rounded-md', isActive && 'bg-primary text-amber-50')}
      onClick={() => selectQuestion()}
    >
      <div className='flex-1 min-w-0'>
        <p className='line-clamp-2 text-sm font-medium'>{question?.question}</p>
        <p className={cn('text-xs text-muted-foreground mt-1', isActive && 'text-gray-300')}>
          Difficulty: <span className='capitalize'>{question?.difficulty}</span>
        </p>
      </div>
    </div>
  );
}
