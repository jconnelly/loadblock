// Simple test component to isolate NotificationBell
import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { BrowserRouter } from 'react-router-dom';
import theme from '../../theme';
import NotificationBell from './NotificationBell';
import { NotificationProvider } from '../../hooks/useNotifications';

const NotificationTest: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <NotificationProvider>
          <div style={{ padding: '20px' }}>
            <h1>Notification Bell Test</h1>
            <NotificationBell />
          </div>
        </NotificationProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default NotificationTest;