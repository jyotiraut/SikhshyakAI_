import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone, Twitter } from 'lucide-react';
import { Link } from 'react-router';

export function Footer() {
  return (
    <footer className='bg-foreground text-foreground/80 pt-12  mt-8 pb-6'>
      <div className='container mx-auto px-4'>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8'>
          <div>
            <div className='flex items-center gap-2 mb-4'>
              <img src='/logo.png' className='h-16' alt='logo' />

              <span className='text-xl font-bold text-white'>Sikshyaak AI</span>
            </div>
            <p className='text-sm mb-4 text-muted-foreground'>
              Personalized learning for every student, anywhere, anytime. Empowering the future through AI-driven
              education.
            </p>
            <div className='flex gap-4'>
              <a href='#' className='text-muted-foreground hover:text-primary transition-colors'>
                <Facebook size={20} />
              </a>
              <a href='#' className='text-muted-foreground hover:text-primary transition-colors'>
                <Twitter size={20} />
              </a>
              <a href='#' className='text-muted-foreground hover:text-primary transition-colors'>
                <Instagram size={20} />
              </a>
              <a href='#' className='text-muted-foreground hover:text-primary transition-colors'>
                <Linkedin size={20} />
              </a>
            </div>
          </div>

          <div>
            <h4 className='text-white font-semibold mb-4'>Quick Links</h4>
            <ul className='space-y-2 text-sm'>
              <li>
                <Link to='/' className='text-muted-foreground hover:text-primary transition-colors'>
                  Home
                </Link>
              </li>
              <li>
                <Link to='/about' className='text-muted-foreground hover:text-primary transition-colors'>
                  About Us
                </Link>
              </li>
              <li>
                <a href='#' className='text-muted-foreground hover:text-primary transition-colors'>
                  Features
                </a>
              </li>
              <li>
                <a href='#' className='text-muted-foreground hover:text-primary transition-colors'>
                  Pricing
                </a>
              </li>
              <li>
                <a href='#' className='text-muted-foreground hover:text-primary transition-colors'>
                  Testimonials
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className='text-white font-semibold mb-4'>Support</h4>
            <ul className='space-y-2 text-sm'>
              <li>
                <a href='#' className='text-muted-foreground hover:text-primary transition-colors'>
                  Help Center
                </a>
              </li>
              <li>
                <Link to='/contact' className='text-muted-foreground hover:text-primary transition-colors'>
                  Contact Us
                </Link>
              </li>
              <li>
                <a href='#' className='text-muted-foreground hover:text-primary transition-colors'>
                  FAQ
                </a>
              </li>
              <li>
                <a href='#' className='text-muted-foreground hover:text-primary transition-colors'>
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href='#' className='text-muted-foreground hover:text-primary transition-colors'>
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className='text-white font-semibold mb-4'>Contact Us</h4>
            <ul className='space-y-2 text-sm'>
              <li className='flex items-start gap-2'>
                <Mail size={16} className='mt-0.5 shrink-0 text-muted-foreground' />
                <span className='text-muted-foreground'>info@sikshyaak.ai</span>
              </li>
              <li className='flex items-start gap-2'>
                <Phone size={16} className='mt-0.5 shrink-0 text-muted-foreground' />
                <span className='text-muted-foreground'>+977-1-xxxxxxx</span>
              </li>
              <li className='flex items-start gap-2'>
                <MapPin size={16} className='mt-0.5 shrink-0 text-muted-foreground' />
                <span className='text-muted-foreground'>Kathmandu, Nepal</span>
              </li>
            </ul>
          </div>
        </div>

        <div className='border-t border-white/10 pt-6 text-sm text-muted-foreground'>
          <div className='flex flex-col md:flex-row justify-between items-center gap-4'>
            <p>&copy; 2024 Sikshyaak AI. All rights reserved.</p>
            <div className='flex gap-6'>
              <a href='#' className='hover:text-primary transition-colors'>
                Privacy Policy
              </a>
              <a href='#' className='hover:text-primary transition-colors'>
                Terms of Service
              </a>
              <a href='#' className='hover:text-primary transition-colors'>
                Cookie Policy
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
