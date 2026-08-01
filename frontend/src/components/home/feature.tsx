import { BrainCog, ChartBar, ChartNoAxesColumnIncreasing, TrendingUp, Trophy } from 'lucide-react';
import { Button } from '../ui/button';

export function Feature() {
  return (
    <div className='space-y-5 mt-8 '>
      <div className='text-center'>
        <h1 className='font-semibold text-3xl'>Powerful Learning Tools</h1>
        <p className='text-muted-foreground'>Everything you need for an exceptional learning experience</p>
      </div>
      <div className=' grid grid-cols-1  md:grid-cols-3 gap-3  md:gap-6 container'>
        <div className='md:col-span-2 p-4 bg-white space-y-3'>
          <BrainCog size={50} className='text-primary' />
          <h1 className='font-bold text-3xl'>AI-Powered Tutor</h1>
          <p className='text-muted-foreground '>
            {' '}
            Get personalized help from our intelligent AI tutor available 24/7. Ask questions, get explanations, and
            receive practice problems tailored to your learning style.
          </p>

          <div className='flex gap-3'>
            <Button className='bg-blue-100 text-primary rounded-3xl font-light'>Instant Answer</Button>
            <Button className='bg-blue-100 text-primary rounded-3xl font-light'>Step By Step</Button>

            <Button className='bg-blue-100 text-primary rounded-3xl'>24/7 Available</Button>
          </div>
        </div>
        <div className='p-4 bg-white '>
          <TrendingUp size={50} className='text-primary' />
          <h1 className='font-bold text-3xl'>AI-Powered Tutor</h1>
          <p className='text-muted-foreground '>
            {' '}
            Get personalized help from our intelligent AI tutor available 24/7. Ask questions, get explanations, and
            receive practice problems tailored to your learning style.
          </p>
        </div>
        <div className='p-4 bg-white'>
          <Trophy size={50} className='text-primary' />
          <h1 className='font-bold text-3xl'>Gamification</h1>
          <p className='text-muted-foreground '> Earn XP, badges, and track your learning streak</p>
        </div>
        <div className=' p-4 bg-white '>
          <ChartNoAxesColumnIncreasing size={50} className='text-primary' />
          <h1 className='font-bold text-3xl'>Advanced Analytics</h1>
          <p className='text-muted-foreground '>
            {' '}
            Track your learning journey with detailed analytics. Identify strengths and areas for improvement with
            AI-driven insights.
          </p>
        </div>
        <div className=' p-4 bg-white'>
          <ChartBar size={50} className='text-primary' />
          <h1 className='font-bold text-3xl'>Interactive Chat</h1>
          <p className='text-muted-foreground '>Real-time conversations with AI for instant help and explanations.</p>
          <div className='flex  flex-col items-end gap-5'>
            <Button className='bg-amber-100 text-black  w-full  justify-start'>"Can You explain calculus?"</Button>
            <Button className='bg-blue-200 text-black w-[70%] justify-end'>" Of course! Let's start with.."</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
