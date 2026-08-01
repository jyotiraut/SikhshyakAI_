import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useParams } from 'react-router';
import z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGetQuizById } from '@/hook/quizzes/use-get-unit-wise-quize';
import { useUnitQuizzes } from '@/hook/student/course/use-quiz-by-unit';
import { useSubmitQuiz } from '@/hook/student/course/use-submit-quiz';
export function UnitWiseQuiz() {
  const { unitid } = useParams();
  const { data, isLoading } = useUnitQuizzes(unitid!);
  const quizzes = data?.data.quizzes;
  if (isLoading) {
    return <div>Loading......</div>;
  }
  if (!quizzes || quizzes.length === 0) {
    return <div>No quizzes for this unit</div>;
  }

  return (
    <div>
      <Tabs defaultValue={quizzes.at(0)?._id}>
        <TabsList>
          {quizzes.map((quiz) => {
            return (
              <TabsTrigger value={quiz._id} key={quiz._id}>
                {quiz.title}
              </TabsTrigger>
            );
          })}
        </TabsList>
        {quizzes.map((quiz) => {
          return (
            <TabsContent value={quiz._id} key={quiz._id}>
              <QuizQuestion quizid={quiz._id} />
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

type Props = {
  quizid: string;
};

export const quizAnswerSchema = z.object({
  questionIndex: z.number().int().nonnegative(),

  answerIndex: z.number().int().nonnegative(),
});

export const submitQuizSchema = z.object({
  answers: z.array(quizAnswerSchema).min(1, 'You must answer at least one question'),
});
export type SubmitQuizFormValues = z.infer<typeof submitQuizSchema>;

function QuizQuestion({ quizid }: Props) {
  const form = useForm<SubmitQuizFormValues>({
    resolver: zodResolver(submitQuizSchema),
    defaultValues: {
      answers: [],
    },
  });

  const { data, isLoading } = useGetQuizById({ quizId: quizid });
  const { mutate: submitQuiz, isPending } = useSubmitQuiz();

  const questions = data?.data.quiz.questions;

  const onSubmit = (formData: SubmitQuizFormValues) => {
    submitQuiz({
      quizId: quizid,
      payload: formData,
    });
  };

  if (isLoading) {
    return <div>loading...</div>;
  }

  if (!questions || questions.length === 0) {
    return <div>No questions yet</div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
        <div className='space-y-4'>
          {questions.map((qn, questionIndex) => {
            return (
              <div key={questionIndex} className='space-y-3'>
                <p className='font-medium'>
                  Q.{questionIndex + 1} {qn.question}
                </p>

                <FormField
                  control={form.control}
                  name={`answers.${questionIndex}`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          onValueChange={(value) => {
                            const currentAnswers = form.getValues('answers') || [];
                            const newAnswers = [...currentAnswers];
                            newAnswers[questionIndex] = {
                              questionIndex,
                              answerIndex: parseInt(value, 10),
                            };
                            form.setValue('answers', newAnswers);
                          }}
                          value={field.value?.answerIndex?.toString()}
                          className='space-y-3'
                        >
                          {qn.options.map((option, optionIndex) => {
                            const id = `q${questionIndex}-option${optionIndex}`;
                            return (
                              <div className='flex items-center gap-3 border border-primary p-3' key={optionIndex}>
                                <RadioGroupItem value={optionIndex.toString()} id={id} />
                                <Label htmlFor={id}>{option}</Label>
                              </div>
                            );
                          })}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            );
          })}
        </div>

        <Button type='submit' disabled={isPending}>
          {isPending ? 'Submitting...' : 'Submit Quiz'}
        </Button>
      </form>
    </Form>
  );
}
