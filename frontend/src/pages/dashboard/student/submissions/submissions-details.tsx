import { ArrowLeft, Calendar, CheckCircle2, Clock, Download, FileText } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useTutorialSubmissionDetail } from '@/hook/student/submission-details/submissions';

export function SubmissionDetailPage() {
  const { submissionId } = useParams();
  const { data, isLoading, error } = useTutorialSubmissionDetail(submissionId!);

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-lg text-gray-500'>Loading submission details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='max-w-4xl mx-auto p-6'>
        <div className='rounded-md border border-destructive/50 p-4 text-center text-destructive'>
          Error loading submission. Please try again.
        </div>
      </div>
    );
  }

  const submission = data?.data;

  if (!submission) {
    return (
      <div className='max-w-4xl mx-auto p-6'>
        <div className='text-center text-gray-500'>Submission not found</div>
      </div>
    );
  }

  return (
    <div className='space-y-3'>
      {/* Back Button */}
      <Button asChild variant='ghost' size='sm'>
        <Link to='/student/dashboard/submissions' className='flex items-center gap-2'>
          <ArrowLeft className='w-4 h-4' />
          Back to Submissions
        </Link>
      </Button>

      {/* Submission Overview */}
      <Card className=' shadow-none bg-background border-none'>
        <CardHeader>
          <div className='flex items-start justify-between'>
            <div className='space-y-2'>
              <CardTitle className='text-3xl'>{submission.tutorial.title}</CardTitle>
              <CardDescription>{submission.course.title}</CardDescription>
            </div>
          </div>

          <div className='flex items-center gap-6 text-sm text-muted-foreground pt-4'>
            <div className='flex items-center gap-1'>
              <Calendar className='w-4 h-4' />
              <span>Submitted: {new Date(submission.submission.submittedAt).toLocaleDateString()}</span>
            </div>
            <div className='flex items-center gap-1'>
              <Clock className='w-4 h-4' />
              <span>Last Updated: {new Date(submission.submission.lastUpdated).toLocaleDateString()}</span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Submission Details */}
      <Card className=' shadow-none bg-background border-none'>
        <CardHeader></CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-3'>
            <p className='text-sm font-medium'>Submitted File</p>
            <div className='flex items-center justify-between p-4 border rounded-lg bg-muted/30'>
              <div className='flex items-center gap-3'>
                <FileText className='w-8 h-8 text-muted-foreground' />
                <div>
                  <p className='font-medium'>{submission.submission.fileName}</p>
                  <p className='text-xs text-muted-foreground'>
                    Uploaded on {new Date(submission.submission.submittedAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <Button variant='outline' size='sm' asChild>
                <a
                  href={submission.submission.fileUrl}
                  download={submission.submission.fileName}
                  className='flex items-center gap-2 _blank'
                >
                  <Download className='w-4 h-4' />
                  Download
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grading Information */}
      <Card className=' shadow-none bg-background border-none'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            {submission.grading.isGraded ? (
              <CheckCircle2 className='w-5 h-5 text-green-600' />
            ) : (
              <Clock className='w-5 h-5 text-yellow-600' />
            )}
            Grading Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {submission.grading.isGraded ? (
            <div className='space-y-4'>
              <div className='grid gap-4 md:grid-cols-3'>
                <div className='space-y-2'>
                  <p className='text-sm font-medium text-muted-foreground'>Score</p>
                  <p className='text-3xl font-bold'>
                    {submission.grading.score}/{submission.grading.maxScore}
                  </p>
                </div>
                <div className='space-y-2'>
                  <p className='text-sm font-medium text-muted-foreground'>Percentage</p>
                  <p className='text-3xl font-bold'>{submission.grading.percentage}%</p>
                </div>
                <div className='space-y-2'>
                  <p className='text-sm font-medium text-muted-foreground'>Graded On</p>
                  <p className='text-lg font-medium'>
                    {submission.grading.gradedAt ? new Date(submission.grading.gradedAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>

              {submission.grading.feedback && (
                <>
                  <Separator />
                  <div className='space-y-2'>
                    <p className='font-medium'>Instructor Feedback</p>
                    <div className='p-4 bg-muted/30 rounded-lg'>
                      <p className='text-sm whitespace-pre-wrap'>{submission.grading.feedback}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className='text-center py-8'>
              <Clock className='w-12 h-12 text-muted-foreground mx-auto mb-4' />
              <p className='text-lg font-medium'>Pending Review</p>
              <p className='text-sm text-muted-foreground mt-2'>Your submission is being reviewed by the instructor</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
