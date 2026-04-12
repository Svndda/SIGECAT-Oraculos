import { Box } from '@mui/material';

export default function Header() {
  return (
    <Box
      component="img"
      src="/src/assets/header.png"
      alt="Header"
      sx={{
        width: '100%',
        height: 'auto',
        display: 'block',
        backgroundColor: '#2c2c2c',
      }}
    />
  );
}
