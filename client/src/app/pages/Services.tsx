import { Container, Typography, Grid, CardActionArea } from '@mui/material';
import { SectionTitle } from '../../components/SectionTitle';
import { StyledCard } from '../../components/Card';
import { useNavigate } from 'react-router-dom';


interface ServiceItem {
  title: string;
  description: string;
  path: string;
}

const SERVICES_DATA: ServiceItem[] = [
  {
    title: 'App UCR',
    description: 'Módulo de aplicaciones dedicadas a proyectos relacionados a la UCR.',
    path: '/app-ucr',
  },
  {
    title: 'JosheManicurista',
    description: 'Módulo de servicios de manicura y pedicura.',
    path: '/joshe-manicurista',
  },
];

export default function Services() {
  const navigate = useNavigate();

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <SectionTitle variant="h2">
        Aplicaciones de Servicios
      </SectionTitle>

      <Grid container spacing={3}>
        {SERVICES_DATA.map((service, index) => (
          <Grid size={{ xs: 12, md: 6 }} key={index}>
            <StyledCard 
              elevation={0} 
              sx={{ p: 0, overflow: 'hidden' }}
            >
              <CardActionArea 
                onClick={() => navigate(service.path)}
                sx={{ p: 4, height: '100%' }}
              >
                <Typography 
                  variant="h5" 
                  component="h3" 
                  gutterBottom 
                  sx={{ fontWeight: 600, color: 'var(--brand-deep-blue)' }}
                >
                  {service.title}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {service.description}
                </Typography>
              </CardActionArea>
            </StyledCard>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}