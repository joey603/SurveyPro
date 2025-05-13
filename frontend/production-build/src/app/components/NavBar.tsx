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
  Menu,
  MenuItem,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../../utils/AuthContext';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

// Ajout des constantes de style
const NAVBAR_STYLES = {
  gradient: {
    primary: 'linear-gradient(135deg, #1a237e 0%, #311b92 100%)',
    logo: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  transitions: {
    default: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    smooth: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

const NavBar = () => {
  const { isAuthenticated, logout } = useAuth();
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  // Liste des routes où la navbar ne doit pas apparaître
  const noNavbarRoutes = ['/login', '/register'];
  
  if (noNavbarRoutes.includes(pathname)) {
    return null;
  }

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleSurveyClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleSurveyClose = () => {
    setAnchorEl(null);
  };

  const navItems = !isAuthenticated
    ? [
        { name: 'Login', path: '/login' },
        { name: 'Register', path: '/register' },
      ]
    : [
        { name: 'Analytics', path: '/analytics' },
        { name: 'Explore', path: '/survey-answer' },
        { name: 'Activity Log', path: '/history' },
        { name: 'Settings', path: '/settings' },
      ];

  const NavButton = ({ name, path }: { name: string; path: string }) => (
    <Button
      component={Link}
      href={path}
      sx={{
        color: pathname === path ? '#667eea' : '#64748b',
        mx: 1,
        py: 1.5,
        px: 2.5,
        borderRadius: '12px',
        textTransform: 'none',
        fontSize: '0.95rem',
        fontWeight: pathname === path ? 600 : 500,
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: pathname === path ? 'rgba(102, 126, 234, 0.1)' : 'transparent',
        transition: NAVBAR_STYLES.transitions.default,
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(102, 126, 234, 0.1)',
          transform: 'translateY(100%)',
          transition: NAVBAR_STYLES.transitions.default,
        },
        '&:hover': {
          color: '#667eea',
          transform: 'translateY(-2px)',
          '&::before': {
            transform: 'translateY(0)',
          },
        },
      }}
    >
      {name}
    </Button>
  );

  // Composant pour le bouton New Survey avec dropdown
  const NewSurveyButton = () => {
    const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
    const menuOpen = Boolean(menuAnchorEl);

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      setMenuAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
      setMenuAnchorEl(null);
    };

    return (
      <div>
        <Button
          id="new-survey-button"
          aria-controls={menuOpen ? 'new-survey-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={menuOpen ? 'true' : undefined}
          onClick={handleClick}
          endIcon={<KeyboardArrowDownIcon />}
          sx={{
            color: '#64748b',
            mx: 1,
            py: 1.5,
            px: 2.5,
            borderRadius: '12px',
            textTransform: 'none',
            fontSize: '0.95rem',
            fontWeight: 500,
            '&:hover': {
              color: '#667eea',
              backgroundColor: 'rgba(102, 126, 234, 0.1)',
            },
          }}
        >
          New Survey
        </Button>
        <Menu
          id="new-survey-menu"
          anchorEl={menuAnchorEl}
          open={menuOpen}
          onClose={handleClose}
          MenuListProps={{
            'aria-labelledby': 'new-survey-button',
          }}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          sx={{
            '& .MuiPaper-root': {
              borderRadius: '12px',
              marginTop: '8px',
              minWidth: '200px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
            },
          }}
        >
          <MenuItem 
            component={Link} 
            href="/survey-creation"
            onClick={handleClose}
            sx={{
              py: 1.5,
              px: 2.5,
              '&:hover': {
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
              },
            }}
          >
            Standard Survey
          </MenuItem>
          <MenuItem 
            component={Link} 
            href="/survey-creation/dynamic"
            onClick={handleClose}
            sx={{
              py: 1.5,
              px: 2.5,
              '&:hover': {
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
              },
            }}
          >
            Dynamic Survey
          </MenuItem>
        </Menu>
      </div>
    );
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid',
        borderColor: 'rgba(0, 0, 0, 0.05)',
        transition: NAVBAR_STYLES.transitions.smooth,
      }}
    >
      <Container maxWidth="xl">
        <Toolbar
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            py: 1.5,
          }}
        >
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Box
              component="span"
              sx={{
                fontSize: '1.75rem',
                fontWeight: 800,
                background: NAVBAR_STYLES.gradient.logo,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                position: 'relative',
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: -2,
                  height: 2,
                  background: NAVBAR_STYLES.gradient.logo,
                  transform: 'scaleX(0)',
                  transformOrigin: 'right',
                  transition: NAVBAR_STYLES.transitions.default,
                },
                '&:hover::after': {
                  transform: 'scaleX(1)',
                  transformOrigin: 'left',
                },
              }}
            >
              SurveyFlow
            </Box>
          </Link>

          {isMobile ? (
            <IconButton
              onClick={handleDrawerToggle}
              sx={{
                color: '#64748b',
                transition: NAVBAR_STYLES.transitions.default,
                '&:hover': {
                  transform: 'rotate(180deg)',
                },
              }}
            >
              <MenuIcon />
            </IconButton>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {isAuthenticated && <NewSurveyButton />}
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
                    borderRadius: '12px',
                    textTransform: 'none',
                    fontWeight: 600,
                    px: 3,
                    transition: NAVBAR_STYLES.transitions.default,
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'rgba(239, 68, 68, 0.1)',
                      transform: 'translateX(-100%)',
                      transition: NAVBAR_STYLES.transitions.default,
                    },
                    '&:hover': {
                      borderColor: '#ef4444',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)',
                      '&::before': {
                        transform: 'translateX(0)',
                      },
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
          keepMounted: true,
        }}
        sx={{
          '& .MuiDrawer-paper': {
            width: 280,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
          },
        }}
      >
        <Box
          sx={{
            width: 280,
            height: '100%',
            position: 'relative',
            pt: 6,
          }}
        >
          <IconButton
            onClick={handleDrawerToggle}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: '#64748b',
              transition: NAVBAR_STYLES.transitions.default,
              '&:hover': {
                transform: 'rotate(180deg)',
              },
            }}
          >
            <CloseIcon />
          </IconButton>
          <List>
            {isAuthenticated && (
              <>
                <ListItem>
                  <ListItemText 
                    primary="New Survey"
                    primaryTypographyProps={{
                      sx: {
                        color: '#64748b',
                        fontWeight: 600,
                        pl: 2,
                      }
                    }}
                  />
                </ListItem>
                <ListItem disablePadding>
                  <Button
                    component={Link}
                    href="/survey-creation"
                    fullWidth
                    sx={{
                      py: 2,
                      px: 3,
                      pl: 6,
                      justifyContent: 'flex-start',
                      color: pathname === '/survey-creation' ? '#667eea' : '#64748b',
                      backgroundColor: pathname === '/survey-creation' ? 'rgba(102, 126, 234, 0.1)' : 'transparent',
                      transition: NAVBAR_STYLES.transitions.default,
                      '&:hover': {
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        transform: 'translateX(8px)',
                      },
                    }}
                  >
                    <ListItemText 
                      primary="Standard Survey"
                      primaryTypographyProps={{
                        sx: {
                          fontWeight: pathname === '/survey-creation' ? 600 : 500,
                        }
                      }}
                    />
                  </Button>
                </ListItem>
                <ListItem disablePadding>
                  <Button
                    component={Link}
                    href="/survey-creation/dynamic"
                    fullWidth
                    sx={{
                      py: 2,
                      px: 3,
                      pl: 6,
                      justifyContent: 'flex-start',
                      color: pathname === '/survey-creation/dynamic' ? '#667eea' : '#64748b',
                      backgroundColor: pathname === '/survey-creation/dynamic' ? 'rgba(102, 126, 234, 0.1)' : 'transparent',
                      transition: NAVBAR_STYLES.transitions.default,
                      '&:hover': {
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        transform: 'translateX(8px)',
                      },
                    }}
                  >
                    <ListItemText 
                      primary="Dynamic Survey"
                      primaryTypographyProps={{
                        sx: {
                          fontWeight: pathname === '/survey-creation/dynamic' ? 600 : 500,
                        }
                      }}
                    />
                  </Button>
                </ListItem>
              </>
            )}
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
                    transition: NAVBAR_STYLES.transitions.default,
                    '&:hover': {
                      backgroundColor: 'rgba(102, 126, 234, 0.1)',
                      transform: 'translateX(8px)',
                    },
                  }}
                >
                  <ListItemText 
                    primary={item.name}
                    primaryTypographyProps={{
                      sx: {
                        fontWeight: pathname === item.path ? 600 : 500,
                      }
                    }}
                  />
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
                    transition: NAVBAR_STYLES.transitions.default,
                    '&:hover': {
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      transform: 'translateX(8px)',
                    },
                  }}
                >
                  <ListItemText primary="Logout" />
                </Button>
              </ListItem>
            )}
          </List>
        </Box>
      </Drawer>
    </AppBar>
  );
};

export default NavBar;