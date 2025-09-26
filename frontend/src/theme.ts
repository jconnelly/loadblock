import { createTheme } from '@mui/material/styles';

// LoadBlock brand colors
const brandColors = {
  primary: '#0D47A1',      // Deep Blue
  secondary: '#FF9800',    // Orange
  dark: '#212121',         // Dark Grey
  blue: '#1976D2',         // Medium Blue
  white: '#ffffff',
  greyLight: '#f5f5f5',
  greyMedium: '#e0e0e0',
  greyDark: '#757575',
};

const theme = createTheme({
  palette: {
    primary: {
      main: brandColors.primary,
      light: brandColors.blue,
      dark: '#0A3A8A',
      contrastText: brandColors.white,
    },
    secondary: {
      main: brandColors.secondary,
      light: '#FFB74D',
      dark: '#F57C00',
      contrastText: brandColors.white,
    },
    background: {
      default: brandColors.greyLight,
      paper: brandColors.white,
    },
    text: {
      primary: brandColors.dark,
      secondary: brandColors.greyDark,
    },
    grey: {
      50: brandColors.greyLight,
      100: brandColors.greyMedium,
      500: brandColors.greyDark,
      900: brandColors.dark,
    },
  },
  typography: {
    fontFamily: [
      'Roboto',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontWeight: 600,
      fontSize: '2.5rem',
      color: brandColors.dark,
    },
    h2: {
      fontWeight: 600,
      fontSize: '2rem',
      color: brandColors.dark,
    },
    h3: {
      fontWeight: 500,
      fontSize: '1.5rem',
      color: brandColors.dark,
    },
    h4: {
      fontWeight: 500,
      fontSize: '1.25rem',
      color: brandColors.dark,
    },
    h5: {
      fontWeight: 500,
      fontSize: '1.125rem',
      color: brandColors.dark,
    },
    h6: {
      fontWeight: 500,
      fontSize: '1rem',
      color: brandColors.dark,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: brandColors.primary,
          color: brandColors.white,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 8,
        },
        containedPrimary: {
          backgroundColor: brandColors.primary,
          '&:hover': {
            backgroundColor: '#0A3A8A',
          },
        },
        containedSecondary: {
          backgroundColor: brandColors.secondary,
          '&:hover': {
            backgroundColor: '#F57C00',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: brandColors.primary,
            },
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: brandColors.white,
          borderRight: `1px solid ${brandColors.greyMedium}`,
        },
      },
    },
  },
  shape: {
    borderRadius: 8,
  },
  spacing: 8,
});

export default theme;