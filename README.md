# University Event Registration Management System with AI Chatbot

A full-stack event management platform for multi-role university workflows.
It supports main events, sub-events, individual and team registrations, and role-based dashboards.

## Tech Stack

- Backend: Node.js, Express.js, MongoDB, Mongoose, JWT
- Frontend: HTML, CSS, JavaScript, Bootstrap

## Core Features

- Role-based access: host, organiser, management, user
- Main event and sub-event management
- Team flow: team creation, member add/remove, team registrations
- Individual and team registration tracking
- Event-scoped registration visibility for management/organiser
- AI chatbot endpoint for event assistant features
- Runtime-focused setup with only essential execution scripts

## Project Structure

- src/config: database configuration
- src/models: Mongoose schemas
- src/controllers: request handlers
- src/routes: API route definitions
- src/middleware: auth and role checks
- src/utils: runtime utility scripts
- frontend: static pages, CSS, and client JS

## Environment Variables

Create a .env file in the project root with at least:

- PORT
- MONGO_URI
- DB_NAME
- JWT_SECRET
- HOST_NAME
- HOST_EMAIL
- HOST_PASSWORD

Optional email integration values used in current project:

- EMAIL_ID
- EMAIL_PASS

## Setup and Run

1. Install dependencies

- npm install

2. Start normally

- npm start

3. Start development mode

- npm run dev

Notes:

- Server default URL: http://localhost:5000

## Host Bootstrap

On startup, host account is synced/bootstrapped from env values.
Use the host account to create organiser accounts.

## User Model Fields

Current user schema includes:

- name
- email
- password
- role
- createdByOrganiser
- assignedMainEvent
- phone
- department
- year
- collegeName
- rollNo (unique, sparse, uppercase)

## API Endpoints

Base routes are mounted in src/app.js.

### Endpoint Table

| S.No | Method | Endpoint                     | Access                      | Usage                                                                                             |
| ---- | ------ | ---------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------- |
| 1    | GET    | /api/health                  | Public                      | Check server health/status for monitoring and quick connectivity tests.                           |
| 2    | POST   | /api/auth/register           | Public                      | Create a new user account (student/user role) with profile details and credentials.               |
| 3    | POST   | /api/auth/login              | Public                      | Authenticate user and return JWT token + user payload for session access.                         |
| 4    | POST   | /api/users/create-organiser  | Host only                   | Create organiser accounts that can create and manage main events.                                 |
| 5    | POST   | /api/users/create-management | Organiser only              | Create management users and assign them to a selected main event.                                 |
| 6    | GET    | /api/users/organisers        | Host only                   | List all organiser accounts for host administration.                                              |
| 7    | DELETE | /api/users/organisers/:id    | Host only                   | Delete an organiser account by id.                                                                |
| 8    | GET    | /api/users/management        | Organiser only              | List management users created by the organiser.                                                   |
| 9    | DELETE | /api/users/management/:id    | Organiser only              | Delete a management account under the organiser scope.                                            |
| 10   | POST   | /api/main-events             | Organiser, Host             | Create a main event (name, dates, description).                                                   |
| 11   | GET    | /api/main-events             | Authenticated               | Fetch main events visible to current role (scoped by role logic).                                 |
| 12   | PUT    | /api/main-events/:id         | Organiser, Host             | Update main event details with ownership checks and date validation.                              |
| 13   | DELETE | /api/main-events/:id         | Organiser, Host             | Delete a main event with ownership enforcement.                                                   |
| 14   | POST   | /api/events                  | Management, Organiser, Host | Create sub-events under a main event with date and permission validations.                        |
| 15   | GET    | /api/events                  | Authenticated               | List sub-events visible to the logged-in role and assignments.                                    |
| 16   | PUT    | /api/events/:id              | Management, Organiser, Host | Update sub-event details with strict access and date-range checks.                                |
| 17   | DELETE | /api/events/:id              | Management, Organiser, Host | Delete sub-event and related registrations if authorized.                                         |
| 18   | POST   | /api/team/create             | Authenticated user          | Create a team for a team-type event as team leader.                                               |
| 19   | POST   | /api/team/add-member         | Authenticated user          | Add a member to leader's team with event conflict and size checks.                                |
| 20   | DELETE | /api/team/remove-member      | Authenticated user          | Remove a member from leader's team.                                                               |
| 21   | GET    | /api/team/my                 | Authenticated user          | Fetch teams led by user and memberships in other teams.                                           |
| 22   | POST   | /api/register                | Authenticated user          | Register for event (individual) or register whole team (team event).                              |
| 23   | GET    | /api/register/my             | Authenticated user          | Fetch current user's registrations and related event/team info.                                   |
| 24   | GET    | /api/register/event/:eventId | Management, Organiser, Host | View registrations for one event (role and assignment scoped).                                    |
| 25   | POST   | /api/chatbot                 | Public/Optional auth        | Chat endpoint for intent-based event help; supports authenticated context when token is provided. |

### Health

- GET /api/health

### Auth

- POST /api/auth/register
- POST /api/auth/login

### Users

- POST /api/users/create-organiser (host)
- POST /api/users/create-management (organiser)
- GET /api/users/organisers (host)
- DELETE /api/users/organisers/:id (host)
- GET /api/users/management (organiser)
- DELETE /api/users/management/:id (organiser)

### Main Events

- POST /api/main-events (organiser, host)
- GET /api/main-events (authenticated)
- PUT /api/main-events/:id (organiser, host)
- DELETE /api/main-events/:id (organiser, host)

### Sub-Events

- POST /api/events (management, organiser, host)
- GET /api/events (authenticated)
- PUT /api/events/:id (management, organiser, host)
- DELETE /api/events/:id (management, organiser, host)

### Teams

- POST /api/team/create
- POST /api/team/add-member
- DELETE /api/team/remove-member
- GET /api/team/my

### Registrations

- POST /api/register
- GET /api/register/my
- GET /api/register/event/:eventId (management, organiser, host)

### Chatbot

- POST /api/chatbot (works with optional auth token)

## Role Flow

- Host: creates organisers
- Organiser: creates main events and management users
- Management: manages assigned sub-events and event registrations
- User: registers for individual/team events
- Team leader: registers team for team events

## Frontend Pages

- /login.html
- /register.html
- /host-dashboard.html
- /organiser-dashboard.html
- /management-dashboard.html
- /user-dashboard.html
- /team-management.html

## Available NPM Scripts

- npm start
- npm run dev
- npm test

## Data/Behavior Notes

- This project is currently configured for runtime execution only.
- Optional data seeding/fix scripts were intentionally removed from package scripts and src/utils.
- The remaining utility file is bootstrapHost.js, used at startup to sync the host account from environment values.
