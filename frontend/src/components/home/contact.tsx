import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone, Send, Twitter } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    setTimeout(() => {
      console.log('Form submitted:', formData);
      setIsSubmitting(false);
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: '',
      });
    }, 1500);
  };

  return (
    <div className=' min-h-screen'>
      <div className=''>
        {/* Header Section */}
        <div className='text-center  mx-auto mb-12 sm:mb-16 py-34 bg-primary text-white'>
          <h1 className='text-3xl sm:text-4xl lg:text-5xl font-bold mb-4'>Get in Touch</h1>
          <p className='text-lg'>
            Have questions or need support? We're here to help! Reach out to us using the form below or through our
            contact information.
          </p>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-2 gap-12 items-center container '>
          {/* Contact Information */}
          <div className='space-y-8'>
            <div>
              <h2 className='text-2xl font-bold text-gray-900 mb-6'>Contact Information</h2>

              {/* Contact Cards */}
              <div className='space-y-4'>
                <Card>
                  <CardContent className='p-6 flex items-start gap-4'>
                    <div className='bg-primary/10 p-3 rounded-lg'>
                      <MapPin className='h-6 w-6 text-primary' />
                    </div>
                    <div>
                      <h3 className='font-semibold text-gray-900 mb-1'>Address</h3>
                      <p className='text-gray-600'>Kathmandu, Nepal</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className='p-6 flex items-start gap-4'>
                    <div className='bg-primary/10 p-3 rounded-lg'>
                      <Mail className='h-6 w-6 text-primary' />
                    </div>
                    <div>
                      <h3 className='font-semibold text-gray-900 mb-1'>Email</h3>
                      <p className='text-gray-600'>info@sikshyaak.ai</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className='p-6 flex items-start gap-4'>
                    <div className='bg-primary/10 p-3 rounded-lg'>
                      <Phone className='h-6 w-6 text-primary' />
                    </div>
                    <div>
                      <h3 className='font-semibold text-gray-900 mb-1'>Phone</h3>
                      <p className='text-gray-600'>+977-1-xxxxxxx</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Social Media */}
            <div>
              <h3 className='text-xl font-bold text-gray-900 mb-4'>Follow Us</h3>
              <div className='flex space-x-4'>
                <Button variant='outline' size='icon' className='rounded-full'>
                  <Facebook className='h-5 w-5' />
                </Button>
                <Button variant='outline' size='icon' className='rounded-full'>
                  <Twitter className='h-5 w-5' />
                </Button>
                <Button variant='outline' size='icon' className='rounded-full'>
                  <Instagram className='h-5 w-5' />
                </Button>
                <Button variant='outline' size='icon' className='rounded-full'>
                  <Linkedin className='h-5 w-5' />
                </Button>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div>
            <Card className=' shadow-none border-0 h-full'>
              <CardContent className='p-6 sm:p-8'>
                <h2 className='text-2xl font-bold text-gray-900 mb-6'>Send Us a Message</h2>
                <form onSubmit={handleSubmit} className='space-y-6'>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-6'>
                    <div className='space-y-2'>
                      <Label htmlFor='name'>Your Name</Label>
                      <Input
                        id='name'
                        name='name'
                        type='text'
                        placeholder='Enter your name'
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className='w-full'
                      />
                    </div>
                    <div className='space-y-2'>
                      <Label htmlFor='email'>Your Email</Label>
                      <Input
                        id='email'
                        name='email'
                        type='email'
                        placeholder='Enter your email'
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className='w-full'
                      />
                    </div>
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='subject'>Subject</Label>
                    <Input
                      id='subject'
                      name='subject'
                      type='text'
                      placeholder='Enter subject'
                      value={formData.subject}
                      onChange={handleChange}
                      required
                      className='w-full'
                    />
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='message'>Message</Label>
                    <Textarea
                      id='message'
                      name='message'
                      placeholder='Enter your message'
                      value={formData.message}
                      onChange={handleChange}
                      required
                      rows={5}
                      className='w-full'
                    />
                  </div>

                  <Button type='submit' className='w-full bg-primary hover:bg-primary/90' disabled={isSubmitting}>
                    {isSubmitting ? (
                      <span className='flex items-center gap-2'>
                        <svg
                          className='animate-spin h-5 w-5 text-white'
                          xmlns='http://www.w3.org/2000/svg'
                          fill='none'
                          viewBox='0 0 24 24'
                        >
                          <circle
                            className='opacity-25'
                            cx='12'
                            cy='12'
                            r='10'
                            stroke='currentColor'
                            strokeWidth='4'
                          ></circle>
                          <path
                            className='opacity-75'
                            fill='currentColor'
                            d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                          ></path>
                        </svg>
                        Sending...
                      </span>
                    ) : (
                      <span className='flex items-center gap-2'>
                        <Send className='h-5 w-5' />
                        Send Message
                      </span>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
