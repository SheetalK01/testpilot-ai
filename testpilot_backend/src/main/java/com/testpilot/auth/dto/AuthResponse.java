package com.testpilot.auth.dto;

public record AuthResponse(String token, UserResponse user) {}
