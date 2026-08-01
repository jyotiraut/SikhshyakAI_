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
import { useGenerateTutorial } from '@/hook/tutorial/use-generate-tutorial';

const numberSchema = z.string().refine(
  (val) => {
    const num = Number(val);
    return !Number.isNaN(num) && Number.isInteger(num) && num >= 0;
  },
  {
    message: 'Must be a non-negative integer',
  },
);

const formSchema = z.object({
  lowDifficultyCount: numberSchema,
  midDifficultyCount: numberSchema,
  highDifficultyCount: numberSchema,
});

type FormValues = z.infer<typeof formSchema>;

export default function GenerateTutorial({ unitId }: { unitId: string }) {
  const { id: courseId } = useParams();
  const { mutate, isPending } = useGenerateTutorial();

  const handleGenerateTutorial = (values: FormValues) => {
    mutate({
      courseId: courseId!,
      unitId: unitId,
      assessmentType: 'tutorial',
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
      lowDifficultyCount: '10',
      midDifficultyCount: '15',
      highDifficultyCount: '25',
    },
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant='outline'>Generate Tutorial</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Tutorial</DialogTitle>
          <DialogDescription>Configure the difficulty distribution for tutorial questions.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleGenerateTutorial)} className='space-y-4 mt-4'>
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
              {isPending ? 'Generating...' : 'Generate Tutorial'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
