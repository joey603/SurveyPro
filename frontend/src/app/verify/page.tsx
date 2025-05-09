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
  const [resendCooldown, setResendCooldown] = useState(0);
  const router = useRouter();
  const email = localStorage.getItem("email");

  useEffect(() => {
    if (!email) {
      router.push("/login");
    }
  }, [email, router]);

  const handleVerify = async () => {
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5041';
      const response = await axios.post(`${apiUrl}/api/auth/verify-email`, {
        email,
        verificationCode,
      });
      setMessage(response.data.message);
      setTimeout(() => {
        localStorage.removeItem("email");
        router.push("/login");
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5041';
      await axios.post(`${apiUrl}/api/auth/resend-verification`, {
        email,
      });
      setMessage("A new code has been sent to your email.");
      setResendCooldown(60);
      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to send code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: 3,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Box
        sx={{
          backgroundColor: "white",
          padding: 4,
          borderRadius: 2,
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          maxWidth: 400,
          width: "100%",
          transition: "all 0.3s ease-in-out",
          "&:hover": {
            transform: "translateY(-8px)",
          },
        }}
      >
        <Typography 
          variant="h3" 
          gutterBottom 
          align="center"
          sx={{ 
            color: "#1a237e",
            fontWeight: 600,
            marginBottom: 2
          }}
        >
          Email Verification
        </Typography>
        <Typography 
          variant="h6" 
          gutterBottom 
          align="center"
          sx={{ 
            color: "text.secondary",
            marginBottom: 3
          }}
        >
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
          sx={{
            '& .MuiOutlinedInput-root': {
              '&:hover fieldset': {
                borderColor: '#667eea',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#667eea',
              },
            },
            '& .MuiInputLabel-root.Mui-focused': {
              color: '#667eea',
            },
          }}
        />
        <Button
          fullWidth
          variant="contained"
          onClick={handleVerify}
          disabled={loading}
          sx={{
            marginTop: 3,
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: 'white',
            padding: '12px',
            '&:hover': {
              background: "linear-gradient(135deg, #764ba2 0%, #667eea 100%)",
            },
          }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : "Verify"}
        </Button>
        <Button
          fullWidth
          variant="text"
          onClick={handleResendCode}
          disabled={loading || resendCooldown > 0}
          sx={{
            marginTop: 2,
            color: '#667eea',
            '&:hover': {
              backgroundColor: 'rgba(102, 126, 234, 0.1)',
            },
          }}
        >
          {resendCooldown > 0 
            ? `Resend code (${resendCooldown}s)` 
            : "Resend code"}
        </Button>
      </Box>
    </Box>
  );
};

export default VerifyPage;
