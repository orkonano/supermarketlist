// Runs before every test file. Sets env vars that modules read at import time.
process.env.SESSION_SECRET = "test-secret-key-for-vitest-session!!";
