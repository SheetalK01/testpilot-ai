/** Build-time configuration (Vite injects VITE_* variables). Nothing here is secret. */
export const config = {
  apiUrl: (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, ''),
  /** True on the public live demo: shows the mock-AI banner. */
  demoMode: import.meta.env.VITE_DEMO_MODE === 'true',
  videoUrl:
    import.meta.env.VITE_DEMO_VIDEO_URL ??
    'https://github.com/SheetalK01/testpilot-ai/blob/main/docs/demo/testpilot-demo.mp4',
  sentryDsn: import.meta.env.VITE_SENTRY_DSN ?? '',
  release: import.meta.env.VITE_RELEASE ?? 'local',
};
