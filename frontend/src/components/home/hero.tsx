import hero from '@/assets/hero.png';

export const Hero = () => {
  return (
    <div className='min-h-[80vh] bg-cover bg-center pb-6 bg-primary'>
      <div className='container flex flex-col md:flex-row mt-30 gap-4'>
        <div className='flex-1'>
          <h1 className='text-white font-bold text-3xl md:text-4xl leading-relaxed'>
            Personalized Learning for Every <br />
            <span className='text-white text-5xl'>Student</span> — <span className='text-white text-5xl'>Anywhere</span>
            , Anytime.
          </h1>
          <p className='text-white text-xl'>
            Our adaptive learning platform tailors content to each learner’s pace and style, making education more
            engaging, effective, and fun.
            <br />
            Discover smarter learning powered by data and innovation.
          </p>
        </div>
        <div className='min-h-[30vh] flex-1 relative z-0'>
          <img src={hero} alt='Adaptive Learning Illustration' className='absolute size-full object-cover' />
        </div>
      </div>
    </div>
  );
};
