import { zodResolver } from '@hookform/resolvers/zod';
import { memo, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useParams } from 'react-router';
import z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { TutorialQuestion } from '@/hook/tutorial/use-generate-tutorial';
import { useGetTutorialById } from '@/hook/tutorial/use-get-tuorial-by-id';
import { useUpdateTutorial } from '@/hook/tutorial/use-update-tutorial';
import { TutorialQuestionCard } from './tutorial-question-card';

// Schema for individual tutorial question
export const tutorialQuestionSchema = z.object({
  question: z.string().min(1, 'Question is required'),
  type: z.enum(['numerical-problem', 'short-answer']),
  options: z.null(),
  correctAnswer: z.null(),
  difficulty: z.enum(['low', 'mid', 'high']),
  learningObjectiveIndex: z.number().nullable(),
  solutionApproach: z.string().nullable(),
});

export type TutorialFormValues = z.infer<typeof tutorialQuestionSchema>;

type FormProps = {
  questionToEdit: TutorialFormValues;
  title: string;
  previousQuestions: TutorialQuestion[];
  selectedQuestionIndex: number;
};

// Form component for editing a single question
function EditTutorialQuestionForm({ questionToEdit, title, previousQuestions, selectedQuestionIndex }: FormProps) {
  const { mutate, isPending } = useUpdateTutorial();
  const { tutorialid } = useParams();

  const form = useForm<TutorialFormValues>({
    resolver: zodResolver(tutorialQuestionSchema),
    defaultValues: questionToEdit,
  });

  const getUpdatedQuestions = (index: number, updatedQuestion: TutorialQuestion) => {
    const newQuestions = [...previousQuestions];
    newQuestions.splice(index, 1, updatedQuestion);
    return newQuestions;
  };

  const onSubmit = (values: TutorialFormValues) => {
    mutate({
      tutorialId: tutorialid!,
      data: {
        title: title,
        questions: getUpdatedQuestions(selectedQuestionIndex, values),
      },
    });
  };

  useEffect(() => {
    form.reset(questionToEdit);
  }, [questionToEdit, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
        <div className='rounded-xl border p-4 space-y-4'>
          <h3 className='font-semibold'>Edit Question</h3>

          <FormField
            control={form.control}
            name='question'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Question</FormLabel>
                <FormControl>
                  <Textarea placeholder='Enter your question here...' className='min-h-[150px]' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='type'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Question Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder='Select question type' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value='numerical-problem'>Numerical Problem</SelectItem>
                    <SelectItem value='short-answer'>Short Answer</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='difficulty'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Difficulty</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder='Select difficulty' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value='low'>Low</SelectItem>
                    <SelectItem value='mid'>Medium</SelectItem>
                    <SelectItem value='high'>High</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='learningObjectiveIndex'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Learning Objective Index (Optional)</FormLabel>
                <FormControl>
                  <Input
                    type='number'
                    min={0}
                    placeholder='Enter index or leave empty'
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(value === '' ? null : parseInt(value, 10));
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='solutionApproach'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Solution Approach (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder='Enter solution approach or explanation...'
                    className='min-h-[100px]'
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value || null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type='submit' disabled={isPending}>
          {isPending ? 'Updating...' : 'Update Question'}
        </Button>
      </form>
    </Form>
  );
}

const MemoizedForm = memo(EditTutorialQuestionForm);

export function EditTutorialSet() {
  const { tutorialid } = useParams();
  const { data, isLoading } = useGetTutorialById({ tutorialId: tutorialid! });
  const [questionToEdit, setQuestionToEdit] = useState<TutorialFormValues>();
  const [selectedQnIndex, setSelectedQnIndex] = useState<number>();

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-lg text-gray-500'>Loading tutorial...</div>
      </div>
    );
  }

  if (!data?.data.tutorial) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-lg text-gray-500'>No tutorial found.</div>
      </div>
    );
  }

  return (
    <div className='max-w-7xl mx-auto p-6'>
      <div className='mb-6'>
        <h1 className='text-3xl font-bold text-gray-900'>{data.data.tutorial.title}</h1>
        <p className='text-gray-600 mt-1'>Edit tutorial questions</p>
      </div>

      <div className='flex gap-6'>
        {/* Questions Sidebar */}
        <div className='w-[280px] flex-shrink-0 space-y-3'>
          <div className='flex justify-between items-center'>
            <p className='font-semibold text-gray-900'>Questions ({data.data.tutorial.questions.length})</p>
          </div>

          <div className='space-y-2'>
            {data.data.tutorial.questions.map((qn, index) => (
              <TutorialQuestionCard
                key={index}
                question={qn}
                selectQuestion={() => {
                  setQuestionToEdit({
                    question: qn.question,
                    type: qn.type,
                    options: null,
                    correctAnswer: null,
                    difficulty: qn.difficulty,
                    learningObjectiveIndex: qn.learningObjectiveIndex,
                    solutionApproach: qn.solutionApproach,
                  });
                  setSelectedQnIndex(index);
                }}
                isActive={selectedQnIndex === index}
              />
            ))}
          </div>
        </div>

        {/* Edit Form */}
        <div className='flex-1'>
          {questionToEdit ? (
            <MemoizedForm
              questionToEdit={questionToEdit}
              title={data.data.tutorial.title}
              previousQuestions={data.data.tutorial.questions}
              selectedQuestionIndex={selectedQnIndex || 0}
            />
          ) : (
            <div className='flex items-center justify-center min-h-[400px]'>
              <div className='text-center space-y-2 max-w-sm'>
                <p className='text-sm font-medium text-muted-foreground'>No question selected</p>
                <p className='text-xs text-muted-foreground'>
                  Choose a question from the list on the left to start editing.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
