import { BookOpen, Brain, Lightbulb, Target, TrendingUp, Users } from 'lucide-react';
import infoo from '@/assets/info.jpg';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

const About = () => {
  // Team members data based on user-provided information
  const teamMembers = [
    {
      name: 'Mamta Sharma',
      role: 'Frontend Developer',
      bio: 'Skilled frontend developer specializing in modern web technologies and responsive design. Focuses on creating intuitive and engaging user interfaces.',
      avatar: 'MS',
    },
    {
      name: 'Jyoti Kumari Raut',
      role: 'AI & Machine Learning',
      bio: 'AI researcher focusing on adaptive learning algorithms and educational data analysis. Experienced in implementing Self-Attentive Knowledge Tracing (SAKT) models.',
      avatar: 'JKR',
    },

    {
      name: 'Aavash Dahal',
      role: 'Mobile App Developer & AI Specialist',
      bio: 'Developer specializing in mobile application development and artificial intelligence solutions. Works on integrating smart AI features into scalable mobile platforms.',
      avatar: 'AD',
    },
    {
      name: 'Anup Adhikari',
      role: 'Backend Developer',
      bio: 'Backend developer experienced in building secure, scalable, and high-performance server-side applications. Focused on database management and API development.',
      avatar: 'AA',
    },
  ];

  // Core values data
  const coreValues = [
    {
      icon: <Brain className='h-8 w-8 text-primary' />,
      title: 'Adaptive Learning',
      description: "Personalized learning paths that adapt to each student's pace and learning style.",
    },
    {
      icon: <Lightbulb className='h-8 w-8 text-primary' />,
      title: 'AI-Powered Insights',
      description: 'Advanced analytics that provide real-time feedback and actionable insights for educators.',
    },
    {
      icon: <Users className='h-8 w-8 text-primary' />,
      title: 'Inclusive Education',
      description: 'Accessible learning solutions that bridge educational gaps for all students.',
    },
    {
      icon: <Target className='h-8 w-8 text-primary' />,
      title: 'Mastery Learning',
      description: 'Focus on deep understanding and skill mastery rather than rote memorization.',
    },
    {
      icon: <BookOpen className='h-8 w-8 text-primary' />,
      title: 'Quality Content',
      description: 'AI-assisted content creation ensures high-quality, relevant learning materials.',
    },
    {
      icon: <TrendingUp className='h-8 w-8 text-primary' />,
      title: 'Continuous Improvement',
      description: 'Data-driven optimization of learning experiences based on student performance.',
    },
  ];

  return (
    <div className='min-h-screen'>
      {/* Hero Section */}
      <div className='bg-primary  text-white py-16 sm:py-24'>
        <div className='container mx-auto px-4'>
          <div className='max-w-3xl mx-auto text-center'>
            <h1 className='text-3xl sm:text-4xl lg:text-5xl font-bold mb-6'>About Sikshyaak AI</h1>
            <p className='text-lg sm:text-xl leading-relaxed mb-8'>
              Empowering Nepali education through AI-driven personalized learning experiences that adapt to every
              student's unique needs.
            </p>
          </div>
        </div>
      </div>

      {/* Our Story */}
      <section className='py-16 sm:py-24 bg-white'>
        <div className='container mx-auto px-4'>
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-12 items-center'>
            <div>
              <h2 className='text-2xl sm:text-3xl font-bold text-primary'>Our Story</h2>
              <div className='space-y-4 text-gray-600 leading-relaxed'>
                <p>
                  Sikshyaak AI was born from a vision to transform traditional education in Nepal. We recognized the
                  challenges faced by students and educators in overcrowded classrooms with limited resources for
                  personalized instruction.
                </p>
                <p>
                  Our platform leverages cutting-edge AI technology, including Self-Attentive Knowledge Tracing (SAKT),
                  to create adaptive learning experiences that adapt to each student's pace and learning style. We
                  believe every student deserves an education that meets their unique needs.
                </p>
                <p>
                  From our humble beginnings as a research project to becoming a comprehensive e-learning platform,
                  we've remained committed to making quality education accessible to all Nepali students.
                </p>
              </div>
            </div>
            <div className='relative'>
              <img src={infoo} alt='' className='rounded-2xl' />
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className='py-16 sm:py-24 bg-gray-50'>
        <div className='container mx-auto px-4'>
          <div className='text-center max-w-3xl mx-auto mb-12 sm:mb-16'>
            <h2 className='text-2xl sm:text-3xl font-bold text-gray-900 mb-4'>Our Core Values</h2>
            <p className='text-gray-600'>
              The principles that guide our approach to educational technology and innovation.
            </p>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
            {coreValues.map((value, index) => (
              <Card key={index} className='border border-gray-200 hover:shadow-lg transition-shadow duration-300'>
                <CardHeader>
                  <div className='bg-primary/10 w-16 h-16 rounded-lg flex items-center justify-center mb-4'>
                    {value.icon}
                  </div>
                  <CardTitle className='text-xl font-semibold text-gray-900'>{value.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className='text-gray-600'>{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className='py-16 sm:py-24 bg-white'>
        <div className='container mx-auto px-4'>
          <div className='text-center max-w-3xl mx-auto mb-12 sm:mb-16'>
            <h2 className='text-2xl sm:text-3xl font-bold text-gray-900 mb-4'>Meet Our Team</h2>
            <p className='text-gray-600'>The dedicated professionals working to transform education in Nepal.</p>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8'>
            {teamMembers.map((member, index) => (
              <Card
                key={index}
                className='border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-300'
              >
                <CardHeader className='text-center pb-4'>
                  <div className='w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-r from-primary to-primary/80 flex items-center justify-center text-white text-2xl font-bold'>
                    {member.avatar}
                  </div>
                  <CardTitle className='text-xl font-semibold text-gray-900'>{member.name}</CardTitle>
                  <p className='text-primary font-medium'>{member.role}</p>
                </CardHeader>
                <CardContent className='text-center'>
                  <p className='text-gray-600 text-sm leading-relaxed'>{member.bio}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className='py-16 sm:py-24 bg-primary'>
        <div className='container mx-auto px-4'>
          <div className='max-w-3xl mx-auto text-center'>
            <h2 className='text-2xl sm:text-3xl font-bold text-white mb-6'>Join Us in Transforming Education</h2>
            <p className='text-primary-foreground/90 text-lg mb-8'>
              Whether you're a student, teacher, or school administrator, Sikshyaak AI has something to offer.
              Experience the future of education today.
            </p>
            <div className='flex flex-col sm:flex-row gap-4 justify-center'>
              <Button className='bg-white text-primary hover:bg-white/90'>Get Started</Button>
              <Button variant='outline' className='bg-transparent border-white text-white hover:bg-white/10'>
                Contact Us
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
