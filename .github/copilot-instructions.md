# Project Overview

This project is an azure static web application for a homeowners association.  It contains a main public page under /src, an admin page under /src/admin, and a database page for the treasurer under /src/hoadb.  It provides public information about the homeowners association, allows users to pay their dues, and provides a database for the treasurer to manage financial records. 

## Folder Structure

- `/src`: Contains the source code for the frontend.
- `/api`: Contains the source code for the backend c# azure functions api.
- `/api/Model`: Contains the data models for the backend API.
- `/api/HoaDbCommon.cs`: Contains common code for the HOA database API.
- `/src/admin`: Contains the source code for the admin page.
- `/src/hoadb`: Contains the source code for the database page for the treasurer.
- `/swa-db-connections`: Contains the source code for the database connections and configurations for the static web app data-api.

## Libraries and Frameworks

The frontend is an azure static web app written using:

-  Bootstrap 5, including tab navigation, modals, and forms.
-  Font Awesome 4 for icons.
-  JavaScript (ES6+) modules (.mjs files)

The backend is written using:
- C# with Azure Functions for serverless API endpoints.
- Cosmos DB for data storage.
- Built-in GraphQL for azure swa data-api queries.
- Azure storage for file uploads and static content.

Local development uses:
- Azure Static Web Apps CLI for running the frontend locally.
- Azure Functions Core Tools for running the backend locally.
- Node.js and npm for package management.

## Coding Standards

- Use proper indentation (4 spaces).
- Use camelCase for variable and function names with lowercase first letter to match JavaScript conventions and JSON transformations.

## UI guidelines

- Responsive web design supporting mobile and desktop devices.
- Use Bootstrap 5 for layout and styling.
- Data for backend API should be fetched using the Fetch API, and passed using FormData.
- Use modals for user interactions like payments and admin actions.
- Use tabs for navigation between different sections of the application.
- Use Font Awesome 4 for icons.
- Use a consistent color scheme that matches the homeowners association branding.
