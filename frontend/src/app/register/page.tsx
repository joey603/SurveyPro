"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Box, TextField, Button, Typography, Alert, CircularProgress } from "@mui/material";

const RegisterPage = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleRegister = async () => {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      await axios.post("http://localhost:5041/api/auth/register", {
        username,
        email,
        password,
      });

      setMessage("Registration successful! Check your email for the verification code.");
      localStorage.setItem("email", email); // Stocker l'email pour la vérification
      setTimeout(() => {
        router.push("/verify"); // Rediriger vers Verify
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundColor: "#f5f5f5",
        padding: 3,
      }}
    >
      <Box
        sx={{
          backgroundColor: "white",
          padding: 4,
          borderRadius: 2,
          boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
          maxWidth: 400,
          width: "100%",
        }}
      >
        <Typography variant="h4" gutterBottom align="center">
          Register
        </Typography>
        {message && <Alert severity="success" sx={{ marginBottom: 2 }}>{message}</Alert>}
        {error && <Alert severity="error" sx={{ marginBottom: 2 }}>{error}</Alert>}
        <TextField
          fullWidth
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          margin="normal"
        />
        <TextField
          fullWidth
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          margin="normal"
        />
        <TextField
          fullWidth
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          margin="normal"
          type="password"
        />
        <Button
          fullWidth
          variant="contained"
          color="primary"
          onClick={handleRegister}
          disabled={loading}
          sx={{ marginTop: 2 }}
        >
          {loading ? <CircularProgress size={24} /> : "Register"}
        </Button>
      </Box>
    </Box>
  );
};

export default RegisterPage;
