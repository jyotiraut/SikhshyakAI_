import { zodResolver } from '@hookform/resolvers/zod';
import { Award, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useGradeTutorial } from '@/hook/teacher/use-grade-tutorial';

// Zod Schema
const gradeFormSchema = z
  .object({
    score: z
      .string()
      .min(1, 'Score is required')
      .refine((val) => !Number.isNaN(Number(val)), 'Score must be a number')
      .refine((val) => Number(val) >= 0, 'Score must be positive'),
    maxScore: z
      .string()
      .min(1, 'Max score is required')
      .refine((val) => !Number.isNaN(Number(val)), 'Max score must be a number')
      .refine((val) => Number(val) > 0, 'Max score must be greater than 0'),
    feedback: z.string().max(500, 'Feedback must be less than 500 characters').optional().or(z.literal('')),
  })
  .refine((data) => Number(data.score) <= Number(data.maxScore), {
    message: 'Score cannot be greater than max score',
    path: ['score'],
  });

type GradeFormValues = z.infer<typeof gradeFormSchema>;

interface GradeDialogProps {
  submissionId: string;
  trigger?: React.ReactNode;
}

export const GradeDialog = ({ submissionId, trigger }: GradeDialogProps) => {
  const [open, setOpen] = useState(false);
  const { mutate: gradeTutorial, isPending } = useGradeTutorial();

  const form = useForm<GradeFormValues>({
    resolver: zodResolver(gradeFormSchema),
    defaultValues: {
      score: '',
      maxScore: '10',
      feedback: '',
    },
  });

  const handleSubmit = (values: GradeFormValues) => {
    gradeTutorial(
      {
        submissionId,
        score: Number(values.score),
        maxScore: Number(values.maxScore),
        feedback: values.feedback || '',
      },
      {
        onSuccess: () => {
          setOpen(false);
          form.reset();
        },
      },
    );
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      form.reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant='outline' size='sm'>
            <Award className='h-4 w-4 mr-1' />
            Grade
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Grade Submission</DialogTitle>
          <DialogDescription>Enter the grade details for this submission</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-4'>
            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='score'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Score <span className='text-destructive'>*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type='number' step='0.5' placeholder='e.g., 8' disabled={isPending} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='maxScore'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Max Score <span className='text-destructive'>*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type='number' step='0.5' placeholder='e.g., 10' disabled={isPending} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name='feedback'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Feedback</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder='Enter your feedback here...'
                      className='resize-none'
                      rows={4}
                      disabled={isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Optional feedback for the student (max 500 characters)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type='button' variant='outline' onClick={() => handleOpenChange(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type='submit' disabled={isPending}>
                {isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                Submit Grade
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
