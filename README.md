# SIGECAT---Oráculos


## How to Run
```bash
cd client
npm install
npm run dev
```

## Terminal 2 / Run server
```bash
cd client
npm run api
```

The application will be available at `http://localhost:5173`

## Build
```bash
npm run build
```

This generates optimized files in the `dist/` folder.

## Navigation Flow
```
EmployeeRecordPage (/) 
    ↓ "Begin"
EmployeeFormPage (/employee-form)
    ├→ "Back" (returns to /)
    ↓ "Next"
WorkHoursPage (/work-hours)
    ├→ "Back" (returns to /employee-form)
    ↓ "Complete"
Home (/home)

```
## Technologies Used
- **React 19.2.4** - Main framework
- **React Router DOM 7.13.2** - Client-side routing
- **Material-UI (MUI) 7.3.9** - UI Components (Container, Box, Button, Typography, Stack, Alert)
- **Material Icons 7.3.9** - Icons (ArrowForward, ArrowBack)
- **TypeScript** - Static typing
- **Vite** - Build tool
- **Express.js** - Mock API server
- **Axios** - HTTP client
- **Concurrently** - Run multiple dev servers
