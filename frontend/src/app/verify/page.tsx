"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Box, TextField, Button, Typography, Alert, CircularProgress } from "@mui/material";

const VerifyPage = () => {
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const email = localStorage.getItem("email"); // Récupérer l'email depuis le localStorage

  useEffect(() => {
    if (!email) {
      router.push("/login"); // Rediriger vers login si l'email n'existe pas
    }
  }, [email, router]);

  const handleVerify = async () => {
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const response = await axios.post("http://localhost:5041/api/auth/verify-email", {
        email, // L'email est automatiquement utilisé depuis le localStorage
        verificationCode,
      });
      setMessage(response.data.message);
      setTimeout(() => {
        localStorage.removeItem("email"); // Supprimer l'email après vérification réussie
        router.push("/login"); // Redirection vers la page login
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Verification failed.");
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
          Verify Your Email
        </Typography>
        <Typography variant="body1" gutterBottom align="center">
          Enter the verification code sent to your email.
        </Typography>
        {message && <Alert severity="success" sx={{ marginBottom: 2 }}>{message}</Alert>}
        {error && <Alert severity="error" sx={{ marginBottom: 2 }}>{error}</Alert>}
        <TextField
          fullWidth
          label="Verification Code"
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value)}
          margin="normal"
          type="number"
        />
        <Button
          fullWidth
          variant="contained"
          color="primary"
          onClick={handleVerify}
          disabled={loading}
          sx={{ marginTop: 2 }}
        >
          {loading ? <CircularProgress size={24} /> : "Verify"}
        </Button>
      </Box>
    </Box>
  );
};

export default VerifyPage;
