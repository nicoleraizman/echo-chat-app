# Echo Chat - AI-Moderated Political Forum 💬

**Live Demo:** https://echochat-f120.onrender.com

Echo Chat is a full-stack, real-time web application designed to host constructive political debates. It utilizes a custom-prompted Large Language Model (LLM) to act as an active content moderator, ensuring discussions remain respectful while still allowing for passionate disagreements.

## Key Features
* **AI Content Moderation:** Integrates the Groq API (Llama 3) to intercept messages, analyze Hebrew text for toxicity, and automatically suggest polite rephrasings for rejected messages.
* **Google OAuth 2.0:** Secure user authentication preventing anonymous trolling.
* **Real-Time UI:** Dynamic DOM manipulation with built-in race-condition protections for asynchronous data fetching.
* **Responsive RTL Design:** Fully tailored for a native Hebrew reading experience.

## Tech Stack
* **Frontend:** Vanilla JavaScript, HTML5, CSS3 
* **Backend:** Node.js, Express.js
* **Database:** PostgreSQL (Hosted on Render)
* **AI Integration:** Groq API (Llama-3.3-70b-versatile)
* **Authentication:** Google Cloud Console OAuth 2.0
* **Deployment:** Render (CI/CD Pipeline)


