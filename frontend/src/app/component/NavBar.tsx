"use client";

import React from "react";
import Link from "next/link";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Button from "@mui/material/Button";
import { useAuth } from "../../utils/AuthContext";

const NavBar = () => {
  const { isAuthenticated, logout } = useAuth();

  return (
    <AppBar position="static" color="primary">
      <Toolbar
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "1rem",
        }}
      >
        {!isAuthenticated ? (
          <>
            <Button color="inherit" component={Link} href="/login">
              Login
            </Button>
            <Button color="inherit" component={Link} href="/register">
              Register
            </Button>
          </>
        ) : (
          <>
            <Button color="inherit" component={Link} href="/survey-creation">
              Survey Creation
            </Button>
            <Button color="inherit" component={Link} href="/survey-answer">
              Survey Answer
            </Button>
            <Button color="inherit" component={Link} href="/results">
              Results
            </Button>
            <Button color="inherit" component={Link} href="/history">
              History
            </Button>
            <Button color="inherit" component={Link} href="/profile">
              Profile
            </Button>
            <Button color="inherit" component={Link} href="/settings">
              Settings
            </Button>
            <Button
              onClick={logout}
              style={{
                color: "white",
                backgroundColor: "transparent",
                transition: "background-color 0.3s",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.backgroundColor = "red")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.backgroundColor = "transparent")
              }
            >
              Logout
            </Button>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default NavBar;
