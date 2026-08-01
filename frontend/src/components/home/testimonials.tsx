import { Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function Testimonials() {
  const testimonials = [
    {
      name: 'Priya Sharma',
      role: 'Parent',
      avatar: 'PS',
      text: "Sikshyaak AI has transformed my daughter's learning journey. The personalized approach adapts to her strengths and weaknesses, and she's now excited to study every day.",
      rating: 5,
    },
    {
      name: 'Rahul Kumar',
      role: 'High School Student',
      avatar: 'RK',
      text: 'The AI tutor explains complex concepts in simple ways. I can ask questions anytime, and the gamification makes learning fun. My grades have improved significantly!',
      rating: 5,
    },
    {
      name: 'Dr. Ananya Patel',
      role: 'Teacher',
      avatar: 'AP',
      text: 'As an educator, I appreciate the detailed analytics. Sikshyaak AI helps me identify knowledge gaps and provides targeted resources for each student.',
      rating: 5,
    },
    {
      name: 'Vikram Singh',
      role: 'College Student',
      avatar: 'VS',
      text: 'Preparing for exams has never been easier. The platform creates personalized study plans and the interactive chat makes learning engaging. Highly recommend!',
      rating: 4,
    },
  ];

  return (
    <section className='py-16 bg-muted/30'>
      <div className='container mx-auto px-4'>
        <div className='text-center mb-12'>
          <h2 className='text-3xl md:text-4xl font-bold mb-4'>What Our Users Say</h2>
          <p className='text-lg text-muted-foreground max-w-2xl mx-auto'>
            Join thousands of students, parents, and educators who are already experiencing the benefits of personalized
            learning with Sikshyaak AI.
          </p>
        </div>

        <div className='grid gap-8 md:grid-cols-2 lg:grid-cols-4'>
          {testimonials.map((testimonial, index) => (
            <Card key={index} className='overflow-hidden'>
              <CardContent className='p-6'>
                <div className='flex items-center gap-1 mb-4 text-yellow-500'>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={16} className={i < testimonial.rating ? 'fill-yellow-500' : 'text-gray-300'} />
                  ))}
                </div>
                <p className='text-muted-foreground mb-6 italic'>{testimonial.text}</p>
                <div className='flex items-center gap-3'>
                  <div className='w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold'>
                    {testimonial.avatar}
                  </div>
                  <div>
                    <h4 className='font-semibold'>{testimonial.name}</h4>
                    <p className='text-sm text-muted-foreground'>{testimonial.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
