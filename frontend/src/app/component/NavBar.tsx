"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AppBar,
  Toolbar,
  Button,
  Box,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  useMediaQuery,
  useTheme,
  Container,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../../utils/AuthContext';

const NavBar = () => {
  const { isAuthenticated, logout } = useAuth();
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  // Liste des routes où la navbar ne doit pas apparaître
  const noNavbarRoutes = ['/login', '/register'];
  
  if (noNavbarRoutes.includes(pathname)) {
    return null;
  }

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const navItems = !isAuthenticated
    ? [
        { name: 'Login', path: '/login' },
        { name: 'Register', path: '/register' },
      ]
    : [
        { name: 'Survey Creation', path: '/survey-creation' },
        { name: 'Survey Answer', path: '/survey-answer' },
        { name: 'Results', path: '/results' },
        { name: 'History', path: '/history' },
        { name: 'Settings', path: '/settings' },
      ];

  const NavButton = ({ name, path }: { name: string; path: string }) => (
    <Button
      component={Link}
      href={path}
      sx={{
        color: pathname === path ? '#667eea' : '#64748b',
        mx: 1,
        py: 1,
        px: 2,
        borderRadius: '8px',
        textTransform: 'none',
        fontSize: '0.95rem',
        fontWeight: pathname === path ? 600 : 500,
        backgroundColor: pathname === path ? 'rgba(102, 126, 234, 0.1)' : 'transparent',
        '&:hover': {
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          color: '#667eea',
        },
      }}
    >
      {name}
    </Button>
  );

  const drawer = (
    <Box
      sx={{
        width: 250,
        height: '100%',
        backgroundColor: 'white',
        position: 'relative',
      }}
    >
      <IconButton
        onClick={handleDrawerToggle}
        sx={{
          position: 'absolute',
          right: 8,
          top: 8,
          color: '#64748b',
        }}
      >
        <CloseIcon />
      </IconButton>
      <List sx={{ mt: 5 }}>
        {navItems.map((item) => (
          <ListItem key={item.name} disablePadding>
            <Button
              component={Link}
              href={item.path}
              fullWidth
              sx={{
                py: 2,
                px: 3,
                justifyContent: 'flex-start',
                color: pathname === item.path ? '#667eea' : '#64748b',
                backgroundColor: pathname === item.path ? 'rgba(102, 126, 234, 0.1)' : 'transparent',
                '&:hover': {
                  backgroundColor: 'rgba(102, 126, 234, 0.1)',
                  color: '#667eea',
                },
              }}
            >
              <ListItemText primary={item.name} />
            </Button>
          </ListItem>
        ))}
        {isAuthenticated && (
          <ListItem disablePadding>
            <Button
              onClick={logout}
              fullWidth
              sx={{
                py: 2,
                px: 3,
                justifyContent: 'flex-start',
                color: '#ef4444',
                '&:hover': {
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                },
              }}
            >
              <ListItemText primary="Logout" />
            </Button>
          </ListItem>
        )}
      </List>
    </Box>
  );

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        backgroundColor: 'white',
        borderBottom: '1px solid',
        borderColor: 'rgba(0, 0, 0, 0.05)',
      }}
    >
      <Container maxWidth="xl">
        <Toolbar
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            py: 1,
          }}
        >
          <Link href="/" style={{ textDecoration: 'none', color: '#1a237e' }}>
            <Box
              component="span"
              sx={{
                fontSize: '1.5rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              SurveyPro
            </Box>
          </Link>

          {isMobile ? (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ color: '#64748b' }}
            >
              <MenuIcon />
            </IconButton>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {navItems.map((item) => (
                <NavButton key={item.name} {...item} />
              ))}
              {isAuthenticated && (
                <Button
                  onClick={logout}
                  sx={{
                    ml: 2,
                    color: '#ef4444',
                    borderColor: '#ef4444',
                    '&:hover': {
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      borderColor: '#ef4444',
                    },
                  }}
                  variant="outlined"
                >
                  Logout
                </Button>
              )}
            </Box>
          )}
        </Toolbar>
      </Container>

      <Drawer
        variant="temporary"
        anchor="right"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better mobile performance
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: 250,
          },
        }}
      >
        {drawer}
      </Drawer>
    </AppBar>
  );
};

export default NavBar;