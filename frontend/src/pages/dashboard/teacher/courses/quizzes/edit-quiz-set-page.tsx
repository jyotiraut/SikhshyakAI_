import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, X } from 'lucide-react';
import { memo, useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { useParams } from 'react-router';
import z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { type QuizQuestion, useGetQuizById } from '@/hook/quizzes/use-get-unit-wise-quize';
import { useUpdateQuiz } from '@/hook/quizzes/use-update-quiz';
import { QuestionCard } from './questions-card';

// Schema for individual question
export const questionSchema = z.object({
  question: z.string().min(1, 'Question is required'),
  type: z.literal('mcq'),
  options: z.array(z.object({ option: z.string() })).min(4, 'At least 4 options required'),
  correctAnswer: z.number().min(0, 'Correct answer index required'),
  difficulty: z.enum(['low', 'mid', 'high']),
  learningObjectiveIndex: z.number().min(0),
  solutionApproach: z.string(),
});

export type FormValues = z.infer<typeof questionSchema>;

type FormProps = {
  questionToEdit: FormValues;
  title: string;
  previousQuestion: QuizQuestion[]; //update garna lai quiz vitra ko sabai qn pathaunu parera
  selectedQuestionIndex: number;
};

// Form component for editing a single question
function EditQuestionForm({ questionToEdit, title, previousQuestion, selectedQuestionIndex }: FormProps) {
  const { mutate, isPending } = useUpdateQuiz();
  const { quizid } = useParams();
  const form = useForm<FormValues>({
    resolver: zodResolver(questionSchema),
    defaultValues: questionToEdit,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'options',
  });
  const getUpdatedQuestions = (index: number, updatedQuestion: QuizQuestion) => {
    previousQuestion.splice(index, 1, updatedQuestion);
    return previousQuestion;
  };
  const onSubmit = (values: FormValues) => {
    mutate({
      quizId: quizid!,
      data: {
        title: title,
        questions: getUpdatedQuestions(selectedQuestionIndex, {
          ...values,
          options: values.options.map((item) => item.option),
        }),
      },
    });
    console.log('Question Payload:', values);
  };
  useEffect(() => {
    form.reset(questionToEdit);
  }, [questionToEdit, form.reset]);

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
                  <Input placeholder='What is cloud computing?' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Options using useFieldArray */}
          <div className='space-y-2'>
            <div className='flex justify-between items-center'>
              <FormLabel>Options</FormLabel>
              <Button type='button' variant='outline' size='sm' onClick={() => append({ option: '' })}>
                <Plus className='h-4 w-4 mr-1' />
                Add Option
              </Button>
            </div>

            {fields.map((field, index) => (
              <FormField
                key={field.id}
                control={form.control}
                name={`options.${index}.option`}
                render={({ field }) => (
                  <FormItem>
                    <div className='flex gap-2'>
                      <FormControl>
                        <Input placeholder={`Option ${index + 1}`} {...field} />
                      </FormControl>
                      {fields.length > 4 && (
                        <Button type='button' variant='ghost' size='icon' onClick={() => remove(index)}>
                          <X className='h-4 w-4' />
                        </Button>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>

          <FormField
            control={form.control}
            name='correctAnswer'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Correct Answer Index (0-{fields.length - 1})</FormLabel>
                <FormControl>
                  <Input
                    type='number'
                    min={0}
                    max={fields.length - 1}
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                  />
                </FormControl>
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
                <FormLabel>Learning Objective Index</FormLabel>
                <FormControl>
                  <Input
                    type='number'
                    min={0}
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
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
                <FormLabel>Solution Approach</FormLabel>
                <FormControl>
                  <Textarea placeholder='Enter solution approach' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type='submit' disabled={isPending}>
          Update Question
        </Button>
      </form>
    </Form>
  );
}

const MemoizedForm = memo(EditQuestionForm);

export function EditQuizSet() {
  const { quizid } = useParams();
  const { data } = useGetQuizById({ quizId: quizid! });
  const [questionToEdit, setQuestionToEdit] = useState<FormValues>();
  const [selectedQnIndex, setSelectedQnIndex] = useState<number>();

  if (!data) {
    return <div>No Quiz Yet..</div>;
  }

  return (
    <div>
      <div className='flex gap-2'>
        <div className='max-w-[250px] flex-1 space-y-3.5'>
          <div className='flex justify-between items-center'>
            <p className='font-semibold'>Questions ({data.data.quiz?.questions?.length})</p>
          </div>
          {data.data.quiz.questions.map((qn, index) => (
            <QuestionCard
              key={index}
              question={qn}
              selectQuestion={() => {
                setQuestionToEdit({
                  question: qn.question,
                  type: 'mcq',
                  options: qn.options.map((item) => ({ option: item })),
                  correctAnswer: qn.correctAnswer,
                  difficulty: qn.difficulty,
                  learningObjectiveIndex: qn.learningObjectiveIndex,
                  solutionApproach: qn.solutionApproach || '',
                });
                setSelectedQnIndex(index);
              }}
              isActive={selectedQnIndex === index}
            />
          ))}
        </div>
        <div className='flex-1'>
          {questionToEdit ? (
            <MemoizedForm
              questionToEdit={questionToEdit}
              title={data.data.quiz.title}
              previousQuestion={data.data.quiz.questions}
              selectedQuestionIndex={selectedQnIndex || 0}
            />
          ) : (
            <div className='flex items-center justify-center min-h-screen'>
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
