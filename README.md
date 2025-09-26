
# BestAI Portrait Generator

[![Author](https://img.shields.io/badge/Author-Naqash%20Afzal-blue.svg)](https://github.com/naqashafzal)
[![Website](https://img.shields.io/badge/Website-ai.nullpk.com-brightgreen.svg)](https://ai.nullpk.com)

Transform your photos into professional headshots, epic sci-fi portraits, or creative characters using the power of Google's Gemini AI. This advanced web application provides a seamless user experience for generating high-quality images and videos with a rich set of features for both users and administrators.

**Live Demo:** [**ai.nullpk.com**](https://ai.nullpk.com)

 <!-- Replace with an actual screenshot -->

---

## ✨ Key Features

- **Advanced Image Generation:**
  - **Single Person Mode:** Transform a single photo with two distinct modes:
    - `Creative Mode`: For artistic and significant transformations.
    - `Fidelity Mode`: For subtle edits that preserve the original style.
    - `Canny Edges`: Enforces strict pose and composition replication for precise style changes.
  - **Multi-Person Mode:** Combine people from two separate photos into one cohesive image.
  - **Style Reference:** Use a third image to guide the mood, lighting, and background of a multi-person generation.
  - **HD & Aspect Ratios:** Pro users can generate images in stunning 2048px HD and choose from various aspect ratios (16:9, 9:16, 4:3, 3:4).

- **AI-Powered Prompting:**
  - **Prompt from Image:** Upload a photo and let AI generate a detailed, descriptive prompt for you.
  - **Example Library:** Browse a rich library of categorized and searchable prompt examples to kickstart your creativity.

- **Video Generation (Admin Feature):**
  - Create stunning videos from text prompts and optional reference images, powered by the `veo-2.0` model.
  - Control aspect ratio, motion level, and seed for reproducible results.

- **User & Membership System:**
  - **Authentication:** Secure user sign-up and login powered by Supabase Auth.
  - **Credit System:** Users receive credits to spend on generations. Free users get daily/signup credits, while Pro users get a large monthly allowance.
  - **Membership Tiers:** A `Free` plan for casual use and a `Pro` plan with exclusive features and more credits.
  - **Payment Integration:** Supports PayPal and manual payment methods, with a flexible regional pricing system.

- **Comprehensive Admin Dashboard:**
  - **User Management:** View, edit, and delete user profiles, plans, and credits.
  - **Content Management:** Add, edit, and delete example prompts and categories.
  - **Settings Control:** Manage plan pricing, feature credit costs, and regional pricing variations.
  - **Financials:** Configure payment provider keys (Stripe, PayPal), manage coupons, and review manual payments.

- **Enhanced User Experience:**
  - **AI Assistant:** An in-app chatbot to help users with prompts and app features.
  - **Generation History:** View and re-download all your previously generated images.
  - **Visitor Queue:** A fair-usage queue system to manage generation load for non-logged-in users.
  - **Responsive Design:** A sleek, modern, and fully responsive UI built with Tailwind CSS.

---

## 🛠️ Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS
- **AI Model:** Google Gemini API
  - `gemini-2.5-flash`: For chat and prompt generation.
  - `gemini-2.5-flash-image-preview`: For powerful image editing and generation.
  - `veo-2.0-generate-001`: For state-of-the-art video generation.
- **Backend & Database:** Supabase (Authentication, PostgreSQL Database, Storage, Edge Functions)
- **API Security:** Node.js & Express.js proxy server to protect the Gemini API key.

---

## 🚀 Getting Started

To run this project locally, you'll need to set up both the Supabase backend and the local server environment.

### Prerequisites

- Node.js and npm
- A [Supabase](https://supabase.com/) account
- A [Google AI Studio](https://aistudio.google.com/) account to get a Gemini API Key

### 1. Supabase Setup

1.  **Create a Project:** Go to your Supabase dashboard and create a new project.
2.  **Database Schema:** You will need to create the database schema. Go to the `SQL Editor` and run the SQL scripts necessary to create the following tables:
    - `profiles`: Stores user data, linked to `auth.users`.
    - `plans`: Defines membership plans (e.g., free, pro).
    - `prompts`: Stores the example prompts.
    - `coupons`: For managing discounts.
    - `credit_costs`, `payment_settings`, `plan_country_prices`, etc.
3.  **Auth Trigger:** Set up a database trigger to automatically create a new user profile in the `public.profiles` table whenever a new user signs up in the `auth.users` table.
4.  **Storage:** Create a new bucket in Supabase Storage (e.g., `prompt_images`) and set up appropriate access policies.
5.  **Get Credentials:** Find your Project URL and `anon` public key in `Project Settings > API`.

### 2. Local Environment Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/bestai-portrait-generator.git
    cd bestai-portrait-generator
    ```

2.  **Configure Frontend:**
    - Open `src/services/supabaseClient.ts`.
    - Replace the placeholder `supabaseUrl` and `supabaseAnonKey` with the credentials from your Supabase project.

3.  **Configure and Run the Server:**
    - The Node.js server in the `server` directory serves the frontend and proxies API requests.
    - Create a `.env` file in the root directory:
      ```
      GEMINI_API_KEY=your_gemini_api_key_here
      ```
    - Install server dependencies and run the server:
      ```bash
      npm install
      npm start
      ```
    - The application should now be running on `http://localhost:3001`.

---

## 🏗️ Project Structure

```
/
├── public/                # Static assets for the server
├── server/                # Node.js/Express proxy server
│   ├── server.js
│   └── ...
├── src/
│   ├── components/        # React components
│   │   ├── admin/         # Admin panel specific components
│   │   └── ...
│   ├── services/          # API services (Gemini, Supabase)
│   ├── utils/             # Helper functions
│   ├── App.tsx            # Main application component
│   ├── index.tsx          # React entry point
│   └── types.ts           # TypeScript type definitions
├── index.html             # Main HTML file
└── ...
```

---

## 🤝 Contributing

Contributions are welcome! If you'd like to contribute, please fork the repository and create a pull request. You can also open an issue with the "enhancement" tag.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

---

## ⚖️ License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 👤 Author

-   **Naqash Afzal**
    -   Website: [ai.nullpk.com](https://ai.nullpk.com)
    -   GitHub: [@naqashafzal](https://github.com/naqashafzal)
