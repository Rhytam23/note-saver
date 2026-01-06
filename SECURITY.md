# Security Policy

## Supported Versions

Use this section to tell people about which versions of your project are currently being supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of **Note Saver** seriously. If you discover a vulnerability, please report it responsibly.

### How to Report

Please do **NOT** create a public GitHub issue for security vulnerabilities. Instead, please follow these steps:

1.  Email the vulnerability details to **rhytambiswas@gmail.com**.
    - Include a description of the issue.
    - Steps to reproduce.
    - Potential impact.
2.  We will acknowledge your report within 48 hours.
3.  We will provide a timeline for the fix and credit you in the release notes (if desired).

### Best Practices for Contributors

- **Never commit `.env` files.** Ensure all environment variables are kept local.
- **Do not hardcode secrets.** Use the `import.meta.env` or `process.env` patterns.
- **Review Row Level Security (RLS)** in Supabase before deploying new database features.

Thank you for helping keep Note Saver secure! 🛡️
