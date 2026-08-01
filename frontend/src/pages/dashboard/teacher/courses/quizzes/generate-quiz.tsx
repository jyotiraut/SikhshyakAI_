import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useParams } from 'react-router';
import z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useGenerateQuiz } from '@/hook/quizzes/use-generate';

const numberSchema = z.string().refine(
  (val) => {
    const num = Number(val);
    return !Number.isNaN(num) && Number.isInteger(num) && num >= 0;
  },
  {
    error: 'Must be a non-negative integer',
  },
);

const formSchema = z
  .object({
    questionCount: numberSchema,
    lowDifficultyCount: numberSchema,
    midDifficultyCount: numberSchema,
    highDifficultyCount: numberSchema,
  })
  .refine(
    (data) =>
      Number(data.lowDifficultyCount) + Number(data.midDifficultyCount) + Number(data.highDifficultyCount) ===
      Number(data.questionCount),
    {
      error: 'Total questions must be equal to question count',
      path: ['questionCount'],
    },
  );

type FormValues = z.infer<typeof formSchema>;

export default function GenerateQuiz({ unitId }: { unitId: string }) {
  const { id: courseId } = useParams();
  const { mutate, isPending } = useGenerateQuiz();
  const handleGenerateQuizzes = (values: FormValues) => {
    mutate({
      courseId: courseId!,
      unitId: unitId,
      assessmentType: 'quiz',
      questionCount: Number(values.questionCount),
      difficultyMix: {
        low: Number(values.lowDifficultyCount),
        mid: Number(values.midDifficultyCount),
        high: Number(values.highDifficultyCount),
      },
    });
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      questionCount: '5',
      lowDifficultyCount: '2',
      midDifficultyCount: '2',
      highDifficultyCount: '1',
    },
  });
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Generate Quiz</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Quiz</DialogTitle>
          <DialogDescription>Click the button below to generate a quiz for this unit.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleGenerateQuizzes)} className='space-y-4 mt-4'>
            <FormField
              control={form.control}
              name='questionCount'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Questions</FormLabel>
                  <FormControl>
                    <Input type='number' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='lowDifficultyCount'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Low Difficulty Questions</FormLabel>
                  <FormControl>
                    <Input type='number' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='midDifficultyCount'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of Mid Difficulty Questions</FormLabel>
                  <FormControl>
                    <Input type='number' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='highDifficultyCount'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Number of High Difficulty Questions</FormLabel>
                  <FormControl>
                    <Input type='number' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type='submit' disabled={isPending}>
              Generate Quiz
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
