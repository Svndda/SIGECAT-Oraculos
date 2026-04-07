import React, { useState } from 'react';
import { Box, IconButton, styled } from '@mui/material';
import { ArrowBackIosNew, ArrowForwardIos } from '@mui/icons-material';

const CarouselContainer = styled(Box)(({ /*theme*/ }) => ({
  position: 'relative',
  width: '100%',
  overflow: 'hidden',
  borderRadius: 'var(--border-radius)',
  backgroundColor: 'var(--color-surface-variant)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '300px',
}));

const Slide = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active: boolean }>(({ active }) => ({
  display: active ? 'block' : 'none',
  width: '100%',
  height: '100%',
  transition: 'opacity var(--transition-fast)',
  animation: active ? 'fadeIn 0.5s ease-in-out' : 'none',
  '@keyframes fadeIn': {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
}));

const NavButton = styled(IconButton)(({ /*theme*/ }) => ({
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  backgroundColor: 'rgba(255, 255, 255, 0.7)',
  color: 'var(--brand-deep-blue)',
  '&:hover': {
    backgroundColor: 'var(--brand-light-orange)',
    color: 'white',
  },
  zIndex: 2,
}));

interface CarouselProps {
  items: React.ReactNode[];
}

export const ImageCarousel = ({ items }: CarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev === items.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev === 0 ? items.length - 1 : prev - 1));
  };

  if (!items || items.length === 0) return null;

  return (
    <CarouselContainer>
      <NavButton onClick={prevSlide} sx={{ left: '10px' }}>
        <ArrowBackIosNew />
      </NavButton>

      {items.map((item, index) => (
        <Slide key={index} active={index === currentIndex}>
          {item}
        </Slide>
      ))}

      <NavButton onClick={nextSlide} sx={{ right: '10px' }}>
        <ArrowForwardIos />
      </NavButton>

      <Box sx={{ position: 'absolute', bottom: '15px', display: 'flex', gap: '8px' }}>
        {items.map((_, index) => (
          <Box
            key={index}
            sx={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: index === currentIndex ? 'var(--brand-orange)' : 'var(--color-muted)',
              transition: 'all 0.3s'
            }}
          />
        ))}
      </Box>
    </CarouselContainer>
  );
};