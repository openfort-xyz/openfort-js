import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth";
import cors from "cors";

const app = express();
const port = process.env.BACKEND_PORT || 8000;

// Enable requests from the frontend and Openfort
app.use(cors({
  origin: [process.env.BETTER_AUTH_URL || "", "https://api.openfort.xyz/iam/v1/oauth/third_party"],
  credentials: true,
}));

// Handle all auth routes with Better Auth
app.all('/api/auth/{*any}', toNodeHandler(auth));

// Parse JSON bodies
app.use(express.json());

// GET to read http only cookie in the frontend
app.get("/api/token", async (req, res) => {
  try {
    const sessionToken = req.headers["cookie"]?.split('; ').find(row => row.startsWith('better-auth.session_token='))?.split('=')[1];
    if (!sessionToken) {
      return res.status(401).json({ error: "No session token provided" });
    }
    return res.json({ token: sessionToken });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
});


// POST for Openfort to internally validate token
app.post("/api/validate", async (req, res) => {
  const { payload } = req.body;
  const token = payload;
  if (!token) return res.status(401).json({ error: "No token provided" });

  // Openfort provides the token in the payload, Better Auth expects it in the cookie header
  const requestBody = {
    headers: new Headers({
      cookie: `better-auth.session_token=${token}`,
      ...Object.fromEntries(Object.entries(req.headers).map(([key, value]) => [key.toLowerCase(), value])),
    }),
  }

  // Get session data using the token
  try {
    const session = await auth.api.getSession(requestBody);
    if (!session || !session.user) {
      return res.status(401).json({ error: "Invalid session" });
    }
    // Return following Openfort's expected response format
    return res.json({
      userId: session.user.id,
      email: session.user.email,
    });
  } catch (err) {
    return res.status(500).json({ error: err });
  }
});

app.get("/", (_, res) => {
  res.send("Better Auth backend running via Vite + vite-node");
});

app.listen(port, () => {
  console.log(`Better Auth app listening on port ${port}`);
});
