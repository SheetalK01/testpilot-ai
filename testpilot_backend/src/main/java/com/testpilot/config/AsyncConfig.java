package com.testpilot.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Enables {@code @Async} (AI engine wake-up ping) and {@code @Scheduled} (demo account cleanup). */
@Configuration
@EnableAsync
@EnableScheduling
public class AsyncConfig {}
