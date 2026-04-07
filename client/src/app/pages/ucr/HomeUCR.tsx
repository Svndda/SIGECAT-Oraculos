import { 
  Box, 
  Container, 
  Typography,
  Link, 
  Stack
} from '@mui/material';
import { StyledCard } from '../../../components/Card';
import { HeroSection } from '../../../components/HeroSection';
import { SectionTitle } from '../../../components/SectionTitle';
import { ImageCarousel } from '../../../components/Carousel';

import nyan1 from '../../../assets/imgs/nyan_1.jpeg';
import nyan2 from '../../../assets/imgs/nyan_2.jpeg';
import nyan3 from '../../../assets/imgs/nyan_3.jpeg';
import nyan4 from '../../../assets/imgs/nyan_4.jpeg';
import { HeroTitle } from '../../../components/HeroTitle';
import { HeroSubtitle } from '../../../components/HeroSubtitle';
import { BodyText } from '../../../components/BodyText';
import { Title } from '../../../components/Title';

export default function HomeUCR() {
  const projectPhotos = [
    <Box 
      component="img" 
      src={nyan1} 
      sx={{ width: '100%', height: '100%', objectFit: 'cover' }} 
    />,
    <Box 
      component="img" 
      src={nyan2} 
      sx={{ width: '100%', height: '100%', objectFit: 'cover' }} 
    />,
    <Box 
      component="img" 
      src={nyan3} 
      sx={{ width: '100%', height: '100%', objectFit: 'cover' }} 
    />,
    <Box 
      component="img" 
      src={nyan4} 
      sx={{ width: '100%', height: '100%', objectFit: 'cover' }} 
    />
  ];

  return (
    <Box sx={{ bgcolor: 'var(--color-background)', minHeight: '100vh' , width: '100%' }}>

      {/* Header / Hero */}
      <HeroSection component="header">
        <Container maxWidth="md">
          <HeroTitle>Aaron Carmona Sánchez, C21705</HeroTitle>
          <HeroSubtitle variant="h5" sx={{ opacity: 0.9, fontWeight: 300, lineHeight: 1.6 }}>
            Desarrollador de software enfocado en aplicaciones de alto rendimiento, 
            arquitecturas escalables y desarrollo multiplataforma.
          </HeroSubtitle>
        </Container>
      </HeroSection>

      {/* Sobre Mí */}
      <Container maxWidth="lg" component="section" id="about">
        <SectionTitle variant="h2">Sobre mí</SectionTitle>
        <StyledCard elevation={0}>
          <BodyText variant="body1" paragraph>
            Soy estudiante avanzado de Ciencias de la Computación en la
            Universidad de Costa Rica y desarrollador de software con experiencia
            en el diseño e implementación de aplicaciones escalables y de alto
            rendimiento.
          </BodyText>
          <BodyText variant="body1" paragraph>
            Mi enfoque profesional se encuentra en transformar necesidades técnicas complejas en
            soluciones de software eficientes, priorizando siempre la calidad del código,
            la mantenibilidad y la experiencia del usuario final. Trabajo principalmente
            en el desarrollo de aplicaciones móviles Android, sistemas de escritorio
            en C++ y APIs RESTful.
          </BodyText>
          <BodyText variant="body1">
            Actualmente participo en un proyecto de investigación donde
            desarrollo una API RESTful y aplicaciones móviles con integración de sistemas de mapas,
            procesamiento de coordenadas geográficas, solicitudes de usuarios y gestión de datos
            con uso de arquitecturas basadas en MVVM.
          </BodyText>
        </StyledCard>
      </Container>

      <Container 
        maxWidth="lg" 
        component="section" 
        id="gallery" 
        sx={{ 
          py: 'var(--space-xl)', 
          mb: 'var(--space-lg)'  
        }}
      >
        <SectionTitle variant="h2">Galería de Fotos</SectionTitle>
        
        <BodyText variant="body1" sx={{ mb: 'var(--space-lg)' }}> 
          Tengo un gatito naranja de 5 años llamado Nyan. Lo adopté desde que tiene una semana de nacido y desde entonces ha sido 
          alguien muy importante para mí. Es un gatito bien amoroso, juguetón y malhumorado, y lo amo como nada en el mundooo.
          Aquí hay algunas fotitos de mi precioso:
        </BodyText>
        
        <StyledCard elevation={0} sx={{ p: 0, overflow: 'hidden' }}>
          <ImageCarousel items={projectPhotos} />
        </StyledCard>
      </Container>

      {/* Experiencia */}
      <Container maxWidth="lg" component="section" id="experience">
        <SectionTitle variant="h2">Experiencia</SectionTitle>
        <Stack spacing={3}>
          <StyledCard elevation={0}>
            <Title variant="h5" color="var(--brand-deep-blue)" gutterBottom sx={{ fontWeight: 600 }}>
              Instituto de Investigaciones en Ingeniería (INII) — Universidad de Costa Rica
            </Title>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              <strong>Desarrollador de Software</strong> | 2024 – Presente
            </Typography>
            <Box component="ul" sx={{ pl: 2 }}>
              <li>Desarrollo de una aplicación Android utilizando Kotlin con arquitectura híbrida MVC–MVVM en pro de mejorar la mantenibilidad y scalabilidad del código.</li>
              <li>Implementación de consumo de APIs RESTful utilizando Retrofit, OkHttp y Gson para una comunicación eficiente y correcta con el servidor.</li>
              <li>Desarrollo de funcionalidades de geolocalización y visualización cartográfica utilizando OSMDroid y PROJ4J.</li>
              <li>Optimización de rendimiento mediante la incorporación de LiveData, ViewModel y manejo eficiente de hilos de ejecución.</li>
              <li>Desarrollo de una API RESTful en PHP con autenticación basada en JWT.</li>
            </Box>
          </StyledCard>

          <StyledCard elevation={0}>
            <Title variant="h5" color="var(--brand-deep-blue)" gutterBottom sx={{ fontWeight: 600 }}>
              Macanas Place
            </Title>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              <strong>Desarrollador C++ / Qt6</strong> | 2024
            </Typography>
            <Box component="ul" sx={{ pl: 2 }}>
              <li>Desarrollo completo de un sistema POS utilizando C++17 y Qt6.</li>
              <li>Implementación de una arquitectura MVC para mejorar la mantenibilidad del sistema.</li>
              <li>Optimización del rendimiento de la interfaz gráfica mediante el uso de señales y slots de Qt.</li>
            </Box>
          </StyledCard>
        </Stack>
      </Container>

      {/* Tecnologías */}
      <Container maxWidth="lg" component="section" id="skills">
        <SectionTitle variant="h2">Tecnologías</SectionTitle>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ mb: 6 }}>
          <StyledCard elevation={0} sx={{ flex: 1, bgcolor: '#ffffff' }}>
            <Title variant="h6" gutterBottom color="var(--brand-orange)">Lenguajes</Title>
            <Box component="ul" sx={{ pl: 2 }}>
              <li>Kotlin (avanzado)</li>
              <li>C / C++ (avanzado)</li>
              <li>Python (intermedio)</li>
              <li>Java (intermedio)</li>
              <li>PHP (intermedio)</li>
              <li>Assembly (básico)</li>
            </Box>
          </StyledCard>
          <StyledCard elevation={0} sx={{ flex: 1, bgcolor: '#ffffff' }}>
            <Title variant="h6" gutterBottom color="var(--brand-orange)">Frameworks</Title>
            <Box component="ul" sx={{ pl: 2 }}>
              <li>Jetpack Compose</li>
              <li>Dagger Hilt</li>
              <li>Koin</li>
              <li>Retrofit, OkHttp, Gson</li>
              <li>Qt6</li>
              <li>OSMDroid y PROJ4J</li>
              <li>Gradle</li>
            </Box>
          </StyledCard>
        </Stack>
      </Container>

      {/* Educación */}
      <Container maxWidth="lg" component="section" id="education" sx={{ mb: 8 }}>
        <SectionTitle variant="h2">Educación</SectionTitle>
        <StyledCard elevation={0}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>Universidad de Costa Rica (UCR)</Typography>
          <Typography variant="body1">Bachillerato en Ciencias de la Computación (Estudiante avanzado)</Typography>
          <Typography variant="body2" sx={{ color: 'var(--color-outline)', mt: 1 }}>2022 – Presente</Typography>
        </StyledCard>
      </Container>

      {/* Footer */}
      <Box component="footer" sx={{ py: 6, textAlign: 'center', bgcolor: 'var(--brand-deep-blue)', color: 'white' }}>
        <Container maxWidth="lg">
          <Typography variant="h6" gutterBottom>Contacto</Typography>
          <Link 
            href="mailto:aaron.carmona@ucr.ac.cr" 
            sx={{ color: 'var(--onsurface)', textDecoration: 'none', fontWeight: 700 }}
          >
            aaron.carmona@ucr.ac.cr
          </Link>
        </Container>
      </Box>
    </Box>
  );
}