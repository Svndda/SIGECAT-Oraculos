# SIGECAT---Oraculos


## Cómo Ejecutar
```bash
cd client
npm install
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

## Construcción
```bash
npm run build
```

Esto genera los archivos optimizados en la carpeta `dist/`.

## Flujo de Navegación
```
Screen1 (/) 
    ↓ "Comenzar"
Screen2 (/screen2)
    ├→ "Atrás" (vuelve a /)
    ↓ "Continuar"
Screen3 (/screen3)
    ├→ "Atrás" (vuelve a /screen2)
    ↓ "Continuar al Inicio"
Home (/home)

```
## Tecnologías Utilizadas
- **React 19.2.4** - Framework principal
- **React Router DOM 7.13.2** - Enrutamiento
- **Material-UI (MUI) 7.3.9** - Componentes UI (Container, Box, Button, Typography, Stack, Alert)
- **Material Icons 7.3.9** - Iconografía (ArrowForward, ArrowBack)
- **TypeScript** - Tipado estático
- **Vite** - Build tool