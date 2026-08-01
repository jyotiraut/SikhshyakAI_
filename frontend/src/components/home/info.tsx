import infoo from '@/assets/info.jpg';
import { Button } from '../ui/button';
export function Info() {
  return (
    <div className='mt-15 container grid grid-cols-2 gap-4'>
      <div className=' '>
        <h1 className='font-extrabold text-3xl text-primary'>About Us</h1>

        <div className=' space-y-8 font-semibold mt-4 text-muted-foreground'>
          <p>
            Sikshyaak AI is a modern learning platform designed to personalize education for every student. With
            adaptive technology, intelligent recommendations, and real-time progress tracking, we help learners
            understand concepts faster and stay motivated.
          </p>
          <p>
            Teachers gain powerful tools to monitor performance, support students, and simplify classroom management.
            Our mission is to make smart, accessible, and effective learning available to everyone—anywhere, anytime.
          </p>
          <Button className='bg-primary text-white p-5 rounded-full'>Know More..</Button>
        </div>
      </div>
      <img src={infoo} alt='' className='rounded-2xl' />
    </div>
  );
}
