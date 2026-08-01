import { Link } from 'react-router';

const navItems = [
  { title: 'Home', url: '/' },
  { title: 'About', url: '/about' },
  { title: 'Contact', url: '/contact' },
];

export const NavItems = () => {
  return (
    <>
      {navItems.map((it, index) => (
        <Link key={index} to={it.url} className='mx-3  font-semibold '>
          {it.title}
        </Link>
      ))}
    </>
  );
};
