# Security Policy


## Supported Versions

This project is under active development and only the latest version is supported.

## Reporting a Vulnerability

The security of **NoteNirman** is taken seriously. If you discover a vulnerability, please report it responsibly.

### How to Report

Please do **NOT** create a public GitHub issue for security vulnerabilities. Instead, please follow these steps:

1.  Email the vulnerability details to **rhytambiswas@gmail.com**.
    - Include a description of the issue.
    - Steps to reproduce.
    - Potential impact.
2.  The aim is to acknowledge reports within 48 hours.
3.  A timeline for the fix will be provided, and credit given in release notes (if desired).

### Best Practices for Contributors

- **Never commit `.env` files.** Ensure all environment variables are kept local.
- **Do not hardcode secrets.** Use the `import.meta.env` pattern.
- **Review Row Level Security (RLS)** in Supabase before deploying new database features.

Thank you for helping keep NoteNirman secure! 🛡️
