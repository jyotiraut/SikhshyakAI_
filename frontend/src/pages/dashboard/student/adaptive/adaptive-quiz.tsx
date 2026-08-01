import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useParams } from 'react-router';
import z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useGenerateAdaptiveQuiz } from '@/hook/student/adaptive/use-generate-quiz';
import { useGetCourseProgress } from '@/hook/student/adaptive/use-get-course-progress';
import { useInitializeAdaptiveLearning } from '@/hook/student/adaptive/use-initialize-adaptive';
import { useSubmitAdaptiveQuiz } from '@/hook/student/adaptive/use-submit-quiz';

const submitAnswerSchema = z.object({
  selectedOption: z.number().int().nonnegative(),
});

type SubmitAnswerFormValues = z.infer<typeof submitAnswerSchema>;

export function AdaptiveQuizPage() {
  const { id: courseId, unitid: unitId } = useParams<{ id: string; unitid: string }>();
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [currentQuizId, setCurrentQuizId] = useState<string | null>(null);
  const [quizResult, setQuizResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);
  const [progress, setProgress] = useState<any>(null);
  const [pendingQuestion, setPendingQuestion] = useState<any>(null);
  const [adaptiveNote, setAdaptiveNote] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const { mutate: initializeAdaptive, isPending: isInitializing } = useInitializeAdaptiveLearning();
  const { mutate: generateQuiz, isPending } = useGenerateAdaptiveQuiz();
  const { mutate: submitQuiz, isPending: isSubmitting } = useSubmitAdaptiveQuiz();
  const { refetch: refetchProgress } = useGetCourseProgress(courseId);
  const form = useForm<SubmitAnswerFormValues>({
    resolver: zodResolver(submitAnswerSchema),
    defaultValues: {
      selectedOption: -1,
    },
  });

  const handleInitialize = () => {
    initializeAdaptive(courseId!, {
      onSuccess: () => {
        handleGenerateQuiz();
      },
    });
  };

  const handleGenerateQuiz = () => {
    setGenerationError(null);
    generateQuiz(
      { courseId: courseId!, unitId: unitId! },
      {
        onSuccess: (data) => {
          if (data.data?.question) {
            setCurrentQuestion(data.data.question);
            setCurrentQuizId(data.data.quiz_id);
            setShowResult(false);
            setPendingQuestion(null);
            setAdaptiveNote(null);
            form.reset();
          } else {
            setGenerationError('No question was returned. Please try again.');
          }
        },
      },
    );
  };

  const handleSubmit = (formData: SubmitAnswerFormValues) => {
    if (!currentQuizId) return;

    submitQuiz(
      {
        quizId: currentQuizId,
        courseId: courseId!,
        answers: [{ questionIndex: 0, selectedOption: formData.selectedOption }],
      },
      {
        onSuccess: (data) => {
          setQuizResult(data.data.result);
          setProgress(data.data.progress);
          setShowResult(true);
          refetchProgress();

          // Hold the next question until the student has read the feedback.
          // Auto-advancing after 2s meant the explanation was never read, which
          // is the part that actually teaches.
          if (data.data.next_question) {
            setPendingQuestion(data.data.next_question);
            setAdaptiveNote(data.data.next_question.context?.reason ?? null);
            setGenerationError(null);
          } else {
            setPendingQuestion(null);
            setGenerationError(
              data.data.next_question_error ??
                'Your answer was saved, but the next question could not be generated.',
            );
          }
        },
      },
    );
  };

  const handleContinue = () => {
    if (!pendingQuestion) return;
    setCurrentQuestion(pendingQuestion.question);
    setCurrentQuizId(pendingQuestion.quiz_id);
    setPendingQuestion(null);
    setShowResult(false);
    setQuizResult(null);
    form.reset();
  };

  return (
    <div className='max-w-4xl mx-auto p-6 space-y-8'>
      {/* Header */}
      <div className='space-y-4'>
        <h1 className='text-3xl font-bold text-gray-900'>Adaptive Learning Quiz</h1>
        <p className='text-gray-600'>
          Answer questions that adapt to your learning progress. Your performance will determine the difficulty level of
          subsequent questions.
        </p>
      </div>

      {/* Progress Overview */}
      {/* {courseProgress && (
        <Card>
          <CardHeader>
            <CardTitle>Learning Progress</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              <div>
                <Label className='text-sm text-gray-600'>Mastery Score</Label>
                <div className='text-2xl font-bold'>
                  {Math.round((courseProgress.data?.data?.mastery_score ?? 0) * 100)}%
                </div>
                <Progress value={(courseProgress.data?.data?.mastery_score ?? 0) * 100} className='mt-2' />
              </div>
              <div>
                <Label className='text-sm text-gray-600'>Difficulty Level</Label>
                <div className={`text-2xl font-bold capitalize`}>{courseProgress.data?.data?.difficulty_level}</div>
                <div className='text-sm text-gray-500 mt-1'>
                  Low: {courseProgress.data?.data?.difficulty_distribution?.low ?? 0}% | Mid:{' '}
                  {courseProgress.data?.data?.difficulty_distribution?.mid ?? 0}% | High:{' '}
                  {courseProgress.data?.data?.difficulty_distribution?.high ?? 0}%
                </div>
              </div>
              <div>
                <Label className='text-sm text-gray-600'>Pace Score</Label>
                <div className='text-2xl font-bold'>
                  {Math.round((courseProgress.data?.data?.pace_score ?? 0) * 100)}%
                </div>
                <Progress value={(courseProgress.data?.data?.pace_score ?? 0) * 100} className='mt-2' />
              </div>
            </div>
          </CardContent>
        </Card>
      )} */}

      {/* Quiz Container */}
      <Card>
        <CardHeader>
          <CardTitle>{currentQuestion ? 'Current Question' : 'Start Adaptive Learning'}</CardTitle>
        </CardHeader>
        <CardContent>
          {!currentQuestion ? (
            <div className='text-center py-12'>
              <p className='text-gray-600 mb-6'>
                Click below to start your adaptive learning journey. The first question will be at a low difficulty
                level.
              </p>
              <Button onClick={handleInitialize} disabled={isInitializing || isPending} className='px-8 py-3 text-lg'>
                {isInitializing ? 'Initializing...' : 'Start Learning'}
              </Button>
            </div>
          ) : (
            <div className='space-y-6'>
              {/* Question Display */}
              <div className='space-y-4'>
                <div className='flex items-center gap-2'>
                  <span className='px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium'>
                    {currentQuestion.difficulty}
                  </span>
                  <span className='px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium'>
                    LO: {currentQuestion.learningObjectiveIndex + 1}
                  </span>
                </div>
                <h3 className='text-xl font-semibold text-gray-900'>{currentQuestion.question}</h3>
              </div>

              {/* Answer Form */}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-6'>
                  <FormField
                    control={form.control}
                    name='selectedOption'
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <RadioGroup
                            onValueChange={(value) => field.onChange(parseInt(value, 10))}
                            value={field.value >= 0 ? field.value.toString() : ''}
                            className='space-y-3'
                          >
                            {(currentQuestion.options ?? []).map((option: string, optionIndex: number) => (
                              <div
                                key={optionIndex}
                                className='flex items-center gap-3 border border-gray-300 p-3 rounded-lg hover:border-blue-500 transition-colors'
                              >
                                <RadioGroupItem value={optionIndex.toString()} id={`option-${optionIndex}`} />
                                <Label htmlFor={`option-${optionIndex}`} className='flex-1'>
                                  {option}
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type='submit'
                    disabled={form.watch('selectedOption') < 0 || isSubmitting || showResult}
                    className='w-full'
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Answer'}
                  </Button>
                </form>
              </Form>

              {/* Feedback */}
              {showResult && quizResult && (
                <div
                  className={`p-4 rounded-lg space-y-2 ${
                    quizResult.is_correct ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}
                >
                  <h4 className={`font-semibold ${quizResult.is_correct ? 'text-green-800' : 'text-red-800'}`}>
                    {quizResult.is_correct ? 'Correct!' : 'Not quite'}
                  </h4>

                  {!quizResult.is_correct && quizResult.correct_answer_text && (
                    <p className='text-sm text-gray-700'>
                      Correct answer: <span className='font-medium'>{quizResult.correct_answer_text}</span>
                    </p>
                  )}

                  {quizResult.explanation && <p className='text-sm text-gray-700'>{quizResult.explanation}</p>}

                  {progress && (
                    <p className='text-xs text-gray-500 pt-1'>
                      Objective mastery {Math.round((progress.current_lo_mastery ?? 0) * 100)}% · mastered{' '}
                      {progress.mastered_objectives ?? 0}/{progress.total_objectives ?? 0} objectives · next level{' '}
                      {progress.difficulty_level}
                    </p>
                  )}

                  {adaptiveNote && <p className='text-sm text-blue-700 pt-1'>{adaptiveNote}</p>}

                  {pendingQuestion && (
                    <Button onClick={handleContinue} className='w-full mt-2'>
                      Next question
                    </Button>
                  )}
                </div>
              )}

              {generationError && (
                <div className='p-4 rounded-lg bg-amber-50 border border-amber-200 space-y-2'>
                  <p className='text-sm text-amber-800'>{generationError}</p>
                  <Button variant='outline' onClick={handleGenerateQuiz} disabled={isPending}>
                    {isPending ? 'Retrying...' : 'Try again'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Course Units Progress */}
      {/* {courseProgress && (
        <Card>
          <CardHeader>
            <CardTitle>Course Units</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              {(courseProgress.data?.data?.units ?? []).map((unit: any) => (
                <div
                  key={unit.unit_id}
                  className={`p-4 rounded-lg ${
                    unit.is_current_unit ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-gray-200'
                  }`}
                >
                  <div className='flex items-center justify-between mb-2'>
                    <h4 className='font-semibold text-gray-900'>Unit {unit.unit_id}</h4>
                    <span className='text-sm text-gray-500'>Accuracy: {Math.round((unit.accuracy ?? 0) * 100)}%</span>
                  </div>
                  <div className='flex items-center gap-2 mb-2'>
                    {unit.is_current_unit && (
                      <span className='px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium'>Current</span>
                    )}
                    {unit.is_recommended_unit && (
                      <span className='px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium'>
                        Recommended
                      </span>
                    )}
                  </div>
                  <Progress value={(unit.accuracy ?? 0) * 100} className='h-2' />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )} */}
    </div>
  );
}
