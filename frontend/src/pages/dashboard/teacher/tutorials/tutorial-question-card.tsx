import type { TutorialQuestion } from '@/hook/tutorial/use-generate-tutorial';

type QuestionCardProps = {
  question: TutorialQuestion;
  selectQuestion: () => void;
  isActive: boolean;
};

export function TutorialQuestionCard({ question, selectQuestion, isActive }: QuestionCardProps) {
  return (
    <button
      onClick={selectQuestion}
      className={`w-full text-left p-3 rounded-lg border transition-all ${
        isActive ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <div className='space-y-2'>
        {/* Question Preview */}
        <p className='text-sm font-medium text-gray-900 line-clamp-2'>{question.question}</p>

        {/* Metadata */}
        <div className='flex gap-2 items-center flex-wrap'>
          {/* Difficulty Badge */}
          <span
            className={`px-2 py-0.5 rounded text-xs font-medium ${
              question.difficulty === 'low'
                ? 'bg-green-100 text-green-700'
                : question.difficulty === 'mid'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700'
            }`}
          >
            {question.difficulty.toUpperCase()}
          </span>

          {/* Type Badge */}
          <span className='px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium'>
            {question.type === 'numerical-problem' ? 'Numerical' : 'Short Answer'}
          </span>
        </div>
      </div>
    </button>
  );
}
