import { useEffect, useState } from 'react';

export function useTypingEffect(text: string, speed = 100) {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.substring(0, index + 1));
        index++;
      } else {
        clearInterval(timer);
      }
    }, speed);
  }, [text, speed]);
  return displayedText;
}
