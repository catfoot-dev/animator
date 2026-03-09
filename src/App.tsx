import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import Canvas from './components/Canvas';
import Controller from './components/Controller';
import { useTimerController } from './hooks/useTimerController';
import './App.css';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#71d4fe',
    },
    secondary: {
      main: '#ff69b4',
    },
    background: {
      default: '#13181c',
      paper: '#1c2227',
    },
  },
  shape: {
    borderRadius: 14,
  },
});

function App() {
  const { controller, snapshot, uiState } = useTimerController();

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div className="app-shell">
        <Canvas snapshot={snapshot} />
        <Controller controller={controller} uiState={uiState} />
      </div>
    </ThemeProvider>
  );
}

export default App;
