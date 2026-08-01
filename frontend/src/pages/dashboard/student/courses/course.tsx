import { BookOpen, Clock, Target } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { ChatbotWidget } from '@/components/chatbot/chatbot-widget';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { useGetCourse } from '@/hook/class/use-get-course';

export default function Course() {
  const { id } = useParams();
  const { data } = useGetCourse(id!);

  if (!data) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-lg text-gray-500'>Loading course details...</div>
      </div>
    );
  }

  const { course, units } = data;

  return (
    <div className='max-w-5xl mx-auto p-6 space-y-8'>
      {/* Course Header */}
      <div className='space-y-4'>
        <h1 className='text-4xl font-bold text-gray-900'>{course.title}</h1>
        <p className='text-lg text-gray-600'>{course.description}</p>

        <div className='flex flex-wrap gap-6 text-sm text-gray-600 pt-4'>
          <div className='flex items-center gap-2'>
            <BookOpen className='w-4 h-4' />
            <span>{units.length} Units</span>
          </div>
          <div className='flex items-center gap-2'>
            <Clock className='w-4 h-4' />
            <span>
              {course.teacherProvided.totalPeriods} Periods ({course.teacherProvided.periodDurationMinutes} min each)
            </span>
          </div>
          <div className='flex items-center gap-2'>
            <span className='font-medium'>Pace:</span>
            <span className='capitalize'>{course.teacherProvided.pace}</span>
          </div>
        </div>

        <div className='pt-2 border-t'>
          <p className='text-sm text-gray-600'>
            <span className='font-medium'>Instructor:</span> {course.teacher.fullName}
          </p>
        </div>
      </div>

      {/* Units Accordion */}
      <div className='space-y-4'>
        <h2 className='text-2xl font-semibold text-gray-900'>Course Units</h2>

        <Accordion type='single' collapsible className='space-y-3'>
          {units.map((unit) => (
            <AccordionItem
              key={unit._id}
              value={unit._id}
              className='border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow'
            >
              <AccordionTrigger className='px-6 py-4 hover:no-underline'>
                <div className='flex items-start gap-4 text-left w-full'>
                  <div className='shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-sm'>
                    {unit.unitNumber}
                  </div>
                  <div className='flex-1 min-w-0'>
                    <h3 className='font-semibold text-gray-900'>{unit.title}</h3>
                    <p className='text-sm text-gray-600 mt-1'>{unit.description}</p>
                    <div className='flex items-center gap-4 mt-2 text-xs text-gray-500'>
                      <span className='flex items-center gap-1'>
                        <Clock className='w-3 h-3' />
                        {unit.estimatedTime.totalMinutes} min
                      </span>
                      <span>Theory: {unit.estimatedTime.theoryMinutes} min</span>
                      <span>Practical: {unit.estimatedTime.practicalMinutes} min</span>
                      <span>Status: {unit.status}</span>
                    </div>
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className='px-6 pb-6 pt-2'>
                <div className='space-y-6'>
                  {/* Teaching Plan Overview */}
                  <div>
                    <h4 className='font-medium text-gray-900 mb-2'>Overview</h4>
                    <p className='text-gray-700 text-sm'>{unit.teachingPlan.overview}</p>
                  </div>

                  {/* Learning Objectives */}
                  <div>
                    <h4 className='font-medium text-gray-900 mb-2 flex items-center gap-2'>
                      <Target className='w-4 h-4 text-blue-600' />
                      Learning Objectives
                    </h4>
                    <ul className='space-y-2'>
                      {unit.learningObjectives.map((objective, idx) => (
                        <li key={idx} className='flex items-start gap-2 text-sm text-gray-700'>
                          <span className='text-blue-600 mt-0.5'>•</span>
                          <span>{objective}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Action Buttons */}
                  <div className='flex gap-3 pt-4 border-t'>
                    <Button asChild variant='default'>
                      <Link to={`quiz/${unit._id}`}>View Quiz</Link>
                    </Button>
                    <Button asChild variant='outline'>
                      <Link to={`tutorials/${unit._id}`}>View Tutorials</Link>
                    </Button>
                    <Button asChild variant='secondary'>
                      <Link to={`adaptive/${unit._id}`}>Adaptive Learning</Link>
                    </Button>
                    {unit.fileUrl && (
                      <Button asChild>
                        <Link to={unit.fileUrl}>Note</Link>
                      </Button>
                    )}
                    {unit.fileUrl && <ChatbotWidget unitId={unit._id} unitTitle={unit.title} />}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}
