import express from "express";
import path from "path";
import multer from "multer";
import fs from "fs";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Configure multer for file uploads
  const upload = multer({ dest: "uploads/" });

  // Ensure uploads directory exists
  if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");
  }

  // API Route to handle ZIP upload
  app.post("/api/upload-zip", upload.single("file"), (req, res) => {
    if (!req.file) {
      console.error("Upload attempt with no file");
      return res.status(400).json({ error: "No file uploaded" });
    }
    
    console.log(`Received ZIP folder: ${req.file.originalname} -> ${req.file.path}`);
    
    // Check if it actually exists
    if (fs.existsSync(req.file.path)) {
      console.log(`File confirmed on disk at ${req.file.path}`);
      res.json({ 
        success: true, 
        message: "File uploaded to server. The agent can now process it.",
        filename: req.file.filename,
        path: req.file.path,
        originalname: req.file.originalname
      });
    } else {
      console.error("Multer reported success but file not found on disk!");
      res.status(500).json({ error: "File lost during upload" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
