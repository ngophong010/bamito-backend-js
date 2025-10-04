# BAMITO - Badminton E-commerce Backend API 🏸

This repository contains the complete backend API for the BAMITO e-commerce platform. It is a modern, scalable, and secure RESTful API built with Express.js, TypeScript, and Sequelize, following a professional **API-First design methodology**.

The entire API is documented using an **[OpenAPI 3.0.0 Specification](#-api-documentation)**, which serves as the single source of truth for the application's functionality.

---

## ✨ Core Features & Architecture

This project was built from the ground up with a focus on modern, professional backend principles.

-   **API-First Design:** The API contract was designed and documented in OpenAPI before implementation, enabling parallel development and a clear, predictable structure.
-   **RESTful Architecture:** Follows REST principles with resource-oriented endpoints, proper use of HTTP verbs, and standard status codes.
-   **Fully Type-Safe:** Built entirely with **TypeScript** to ensure type safety, reduce bugs, and improve the developer experience.
-   **High-Performance Database Schema:** Uses a robust **PostgreSQL** database with an efficient schema designed around **integer primary keys** and proper indexing for fast joins and high performance.
-   **Transactional Integrity:** All critical multi-step operations (like creating an order) are wrapped in **Sequelize transactions** to guarantee data atomicity and prevent corruption.
-   **Robust Security:**
    -   **Authentication:** Secure JWT (Access & Refresh Tokens) flow implemented in `httpOnly` cookies.
    -   **Authorization:** Role-Based Access Control (RBAC) with a clean `protect` -> `isAdmin`/`isOwner` middleware pattern.
    -   **Input Validation:** All incoming requests are validated and sanitized using `express-validator` to prevent bad data and common vulnerabilities.
    -   **Security Headers & Rate Limiting:** `Helmet` and `express-rate-limit` are used for an extra layer of protection.
-   **Separation of Concerns:** A clean, scalable folder structure that strictly separates logic into Routers, Controllers, Services, and Models.

---

## 🛠️ Tech Stack

-   **Framework:** [Express.js](https://expressjs.com/)
-   **Language:** [TypeScript](https://www.typescriptlang.org/)
-   **Database:** [PostgreSQL](https://www.postgresql.org/)
-   **ORM:** [Sequelize](https://sequelize.org/)
-   **Authentication:** [JSON Web Tokens (JWT)](https://jwt.io/)
-   **File Uploads:** [Cloudinary](https://cloudinary.com/) & [Multer](https://github.com/expressjs/multer)
-   **Validation:** [express-validator](https://express-validator.github.io/)
-   **Transactional Emails:** [Nodemailer](https://nodemailer.com/)
-   **SMS / OTP:** [Twilio](https://www.twilio.com/)

---

## 📖 API Documentation

This API adheres to an **API-First** workflow. The complete and interactive documentation, generated from the OpenAPI specification, serves as the single source of truth.

**The full specification can be found in the `/docs` directory.**

You can use a tool like the [Swagger Editor](https://editor.swagger.io/) or a VS Code extension to view the `docs/openapi.yaml` file for an interactive experience.

---

## 🚀 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

-   Node.js (v18 or later recommended)
-   npm or yarn
-   A running **PostgreSQL** database instance.
-   [Sequelize CLI](https://sequelize.org/docs/v6/other-topics/migrations/#installing-the-cli) installed globally:
    ```sh
    npm install -g sequelize-cli
    ```

### Installation & Setup

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/ngophong010/bamito-backend.git
    ```

2.  **Navigate to the project directory:**
    ```sh
    cd bamito-backend
    ```

3.  **Install NPM packages:**
    ```sh
    npm install
    ```

4.  **Set up environment variables:**
    -   Create a copy of the example environment file.
        ```sh
        cp .env.example .env
        ```
    -   Open the newly created `.env` file and fill in all the required values (database credentials, JWT secrets, etc.). See the table below for details.

5.  **Create the database:**
    -   Connect to your PostgreSQL instance and run:
        ```sql
        CREATE DATABASE bamito_dev;
        ```

6.  **Run the database migrations:**
    -   This will create all the necessary tables in your database.
        ```sh
        npx sequelize-cli db:migrate
        ```

7.  **Run the database seeders:**
    -   This will populate the database with essential foundational data (roles, brands, etc.).
        ```sh
        npx sequelize-cli db:seed:all
        ```

8.  **Run the development server:**
    ```sh
    npm run dev
    ```

The API server should now be running at `http://localhost:8080`.

### Environment Variables (`.env`)

| Variable                | Description                                                                | Example Value                          |
| ----------------------- | -------------------------------------------------------------------------- | -------------------------------------- |
| `PORT`                  | The port the Express server will run on.                                   | `8080`                                 |
| `NODE_ENV`              | The current environment (`development` or `production`).                   | `development`                          |
| `URL_CLIENT`            | The URL of your main frontend app (for CORS).                              | `http://localhost:3000`                |
| `URL_SERVER`            | The base URL of this backend server.                                       | `http://localhost:8080`                |
| `ACCESS_KEY`            | **CRITICAL:** A long, random string for signing JWT access tokens.         | `generate_a_long_random_string`        |
| `REFRESH_KEY`           | **CRITICAL:** A different, long, random string for signing refresh tokens. | `generate_another_random_string`       |
| `ACCESS_TIME`           | The expiration time for access tokens.                                     | `15m`                                  |
| `REFRESH_TIME`          | The expiration time for refresh tokens.                                    | `7d`                                   |
| `EMAIL_APP`             | Your Gmail address for sending emails.                                     | `your-email@gmail.com`                 |
| `EMAIL_APP_PASSWORD`    | **CRITICAL:** A 16-character Google App Password.                          | `xxxxxxxxxxxxxxxx`                     |
| `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name.                                                | `get-from-cloudinary-dashboard`        |
| `CLOUDINARY_API_KEY`    | Your Cloudinary API key.                                                   | `get-from-cloudinary-dashboard`        |
| `CLOUDINARY_API_SECRET` | Your Cloudinary API secret.                                                | `get-from-cloudinary-dashboard`        |
| `DB_HOST`               | Your PostgreSQL database host.                                             | `localhost`                            |
| `DB_PORT`               | Your PostgreSQL database port.                                             | `5432`                                 |
| `DB_USERNAME`           | Your PostgreSQL username.                                                  | `postgres`                             |
| `DB_PASSWORD`           | Your PostgreSQL password.                                                  | `your_db_password`                     |
| `DB_DATABASE`           | The name of your database.                                                 | `bamito_dev`                           |
| `VNP_TMNCODE`           | Your VNPAY Sandbox TmnCode.                                                | `get-from-vnpay-sandbox`               |
| `VNP_HASHSECRET`        | Your VNPAY Sandbox Hash Secret.                                            | `get-from-vnpay-sandbox`               |
| `VNP_URL`               | The VNPAY Sandbox payment URL.                                             | `https://sandbox.vnpayment.vn/...`     |
| `VNP_RETURNURL`         | The return URL on your **frontend** after payment.                         | `http://localhost:3000/payment-return` |

---

## 📜 Available Scripts

-   `npm run dev`: Starts the server in development mode using `nodemon` and `ts-node`.
-   `npm run build`: Compiles the TypeScript source (`/src`) into JavaScript (`/build`).
-   `npm start`: Runs the compiled JavaScript application for production.
-   `npm run lint`: Lints the codebase for errors and style issues.
-   `npm run db:migrate`: Applies any pending database migrations.
-   `npm run db:seed:all`: Runs all seeder files to populate foundational data.

---

## 📂 Project Structure

The project follows a strict **Separation of Concerns** architecture to ensure the code is scalable and maintainable.


```markdown
/src
├── /config/ # Database connections, environment validation, and global config
├── /controllers/ # "Traffic Cops": Handle requests, call services, and send responses. NO business logic.
├── /middlewares/ # "Security Guards": Authentication, authorization, request validation, file uploads.
├── /migrations/ # "Database Blueprint": Version-controlled schema changes.
├── /models/ # "Database Ambassadors": Define data models and relationships.
├── /routes/ # "The Front Door": Define API endpoints and delegate to controllers.
├── /seeders/ # "Foundational Furniture": Populate the database with essential or test data.
├── /services/ # "The Brains": Contain core business logic and application rules.
├── /types/ # "The Dictionary": Shared TypeScript interfaces, types, and enums.
├── /utils/ # "The Toolbox": Pure helper functions, formatting, and utility methods.
├── /openapi/ # API documentation (OpenAPI/Swagger files)
│ ├── openapi.yaml
│ ├── /paths/
│ ├── /schemas/
│ └── /components/
├── /tests/ # Unit, integration, and e2e tests
└── server.ts # Application entry point: wires everything together
```