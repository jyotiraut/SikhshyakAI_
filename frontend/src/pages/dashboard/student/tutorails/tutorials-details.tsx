import { ArrowLeft, BookOpen, Calendar, FileText, Upload } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropzoneField } from '@/components/ui/file-upload-zone';
import { Separator } from '@/components/ui/separator';
import { useSubmitTutorial, useTutorial } from '@/hook/student/use-tutorials-by-unit';

export function TutorialDetailPage() {
  const { id, unitid, tutorialId } = useParams();
  const [files, setFiles] = useState<File[]>([]);

  const { data, isLoading, error } = useTutorial(tutorialId!);
  const submitMutation = useSubmitTutorial();

  const handleSubmit = async () => {
    if (files.length === 0) {
      toast.error('Please upload a file before submitting');
      return;
    }

    try {
      await submitMutation.mutateAsync({
        tutorialId: tutorialId!,
        file: files[0],
      });

      toast.success('Tutorial submitted successfully!');
      setFiles([]);
    } catch (_error) {
      toast.error('Failed to submit tutorial. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-lg text-gray-500'>Loading tutorial...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='max-w-4xl mx-auto p-6'>
        <div className='rounded-md border border-destructive/50 p-4 text-center text-destructive'>
          Error loading tutorial. Please try again.
        </div>
      </div>
    );
  }

  const tutorial = data?.data.tutorial;

  if (!tutorial) {
    return (
      <div className='max-w-4xl mx-auto p-6'>
        <div className='text-center text-gray-500'>Tutorial not found</div>
      </div>
    );
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'mid':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case 'numerical-problem':
        return 'Numerical Problem';
      case 'short-answer':
        return 'Short Answer';
      case 'multiple-choice':
        return 'Multiple Choice';
      default:
        return type;
    }
  };

  return (
    <div className='max-w-5xl mx-auto p-6 space-y-6'>
      {/* Back Button */}
      <Button asChild variant='ghost' size='sm'>
        <Link to={`/student/dashboard/courses/${id}/tutorials/${unitid}`} className='flex items-center gap-2'>
          <ArrowLeft className='w-4 h-4' />
          Back to Tutorials
        </Link>
      </Button>

      {/* Tutorial Header */}
      <Card>
        <CardHeader>
          <div className='flex items-start justify-between'>
            <div className='space-y-2'>
              <div className='flex items-center gap-2'>
                <Badge variant='outline'>Unit {tutorial.unitNumber}</Badge>
                <Badge variant='secondary'>
                  {tutorial.questions.length} {tutorial.questions.length === 1 ? 'Question' : 'Questions'}
                </Badge>
              </div>
              <CardTitle className='text-3xl'>{tutorial.title}</CardTitle>
            </div>
          </div>

          <div className='flex items-center gap-4 text-sm text-muted-foreground pt-2'>
            <div className='flex items-center gap-1'>
              <Calendar className='w-4 h-4' />
              <span>Created: {new Date(tutorial.createdAt).toLocaleDateString()}</span>
            </div>
            <div className='flex items-center gap-1'>
              <BookOpen className='w-4 h-4' />
              <span>Tutorial ID: {tutorial._id.slice(-8)}</span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Questions */}
      <div className='space-y-4'>
        <h2 className='text-2xl font-semibold'>Questions</h2>

        {tutorial.questions.map((question, index) => (
          <Card key={index}>
            <CardHeader>
              <div className='flex items-start justify-between gap-4'>
                <div className='flex-1'>
                  <div className='flex items-center gap-2 mb-2'>
                    <Badge variant='outline'>Question {index + 1}</Badge>
                    <Badge className={getDifficultyColor(question.difficulty)}>
                      {question.difficulty.toUpperCase()}
                    </Badge>
                    <Badge variant='secondary'>{getQuestionTypeLabel(question.type)}</Badge>
                  </div>
                  <CardDescription className='whitespace-pre-wrap text-base text-foreground'>
                    {question.question}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            {question.solutionApproach && (
              <CardContent>
                <Separator className='mb-4' />
                <div className='space-y-2'>
                  <h4 className='font-medium text-sm text-muted-foreground'>Solution Approach:</h4>
                  <p className='text-sm text-gray-700'>{question.solutionApproach}</p>
                </div>
              </CardContent>
            )}

            {question.options && question.options.length > 0 && (
              <CardContent>
                <Separator className='mb-4' />
                <div className='space-y-2'>
                  <h4 className='font-medium text-sm text-muted-foreground'>Options:</h4>
                  <ul className='space-y-1'>
                    {question.options.map((option, optIdx) => (
                      <li key={optIdx} className='text-sm text-gray-700'>
                        {String.fromCharCode(65 + optIdx)}. {option}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Submit Section */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Upload className='w-5 h-5' />
            Submit Your Work
          </CardTitle>
          <CardDescription>
            Upload your completed tutorial as a PDF or image file. Maximum 1 file allowed.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <DropzoneField
            value={files}
            onChange={setFiles}
            maxFiles={1}
            placeholder='PDF or Images only'
            options={{
              accept: {
                'application/pdf': ['.pdf'],
                'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
              },
            }}
          />

          <Button
            onClick={handleSubmit}
            disabled={files.length === 0 || submitMutation.isPending}
            className='w-full'
            size='lg'
          >
            <FileText className='w-4 h-4 mr-2' />
            {submitMutation.isPending ? 'Submitting...' : 'Submit Tutorial'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
