# hLPU (Help LPU)

A platform that connects students and alumni of LPU for job opportunities, mentorship, mock interviews, and career guidance.

## Project Overview

hLPU is designed to be a comprehensive network for Lovely Professional University (LPU) students. It facilitates professional growth by leveraging the experience of alumni to help current students navigate their career paths.

## Features

- **Job Opportunities**: Alumni can post jobs and students can apply directly.
- **Mentorship**: Connect with experienced professionals for one-on-one guidance.
- **Mock Interviews**: Practice interview skills with feedback from experts.
- **Career Guidance**: Access resources and maps to plan your educational and professional journey.
- **Admin Dashboard**: Verification and management of users and content.

## Folder Structure

```
hlpu/
├── assets/
│   └── images/          # Images and visual assets
├── css/
│   ├── core/           # Shared premium theme styles
│   └── [feature].css   # Feature-specific styles
├── js/
│   ├── core/           # Shared core logic and utilities
│   └── [feature].js    # Feature-specific scripts
├── For-Admin/          # Admin-only pages
├── For-Alumini/        # Alumni portal
├── For-Student/        # Student portal
├── Main/               # Entry point and landing pages
├── shared/             # Common HTML components (navbars)
├── docs/               # Project documentation
├── .gitignore          # Files to ignore in Git
├── LICENSE             # MIT License
└── CONTRIBUTING.md     # Guidelines for contributors
```

## Technologies Used

- **HTML5**: Semantic structure
- **CSS3**: Premium glassmorphism and modern UI (Inter font, mesh backgrounds)
- **JavaScript (Vanilla)**: Interaction and logic
- **Bootstrap 4.6**: Grid and basic components
- **Font Awesome 6**: Professional iconography

## How to Run Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/Dhanush1376/event_management_system.git
   ```
2. Navigate to the project folder:
   ```bash
   cd event_management_system
   ```
3. Open the entry point file in your browser:
   `Main/Index.html`

## Future Improvements

- Integration with a live backend (Node.js/Express)
- Real-time notification system
- Enhanced AI-driven career recommendations
- Mobile app version
