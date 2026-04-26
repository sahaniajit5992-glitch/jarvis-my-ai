import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import fs from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- LOCAL AUTOMATION API ENDPOINTS ---

  /**
   * Launch a local application
   * Note: On a real PC, this uses 'exec' to run system commands.
   */
  app.post("/api/automate/launch", (req, res) => {
    const { appName } = req.body;
    console.log(`[JARVIS] Attempting to launch: ${appName}`);
    
    // Command mapping for common apps (Windows examples)
    const commands: Record<string, string> = {
      chrome: "start chrome",
      notepad: "notepad",
      calculator: "calc",
      explorer: "explorer",
      vscode: "code",
    };

    const cmd = commands[appName.toLowerCase()] || appName;
    
    // EXECUTION: This only works when running locally on a PC
    exec(cmd, (error) => {
      if (error) {
        console.error(`Execution error: ${error}`);
        return res.status(500).json({ status: "error", message: `System denied access to ${appName}` });
      }
      res.json({ status: "success", message: `${appName} initialized.` });
    });
  });

  /**
   * Filesystem Management
   */
  app.post("/api/automate/file", async (req, res) => {
    const { action, fileName, content } = req.body;
    const desktopPath = path.join(process.env.USERPROFILE || process.env.HOME || "", "Desktop", fileName);

    try {
      if (action === "create") {
        await fs.writeFile(desktopPath, content || "");
        return res.json({ status: "success", message: `File ${fileName} manifested on Desktop.` });
      }
      res.status(400).json({ status: "error", message: "Unknown file action." });
    } catch (err) {
      res.status(500).json({ status: "error", message: "Filesystem access restricted." });
    }
  });

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`══════════════════════════════════════════════`);
    console.log(`🤖 JARVIS BACKEND: ONLINE`);
    console.log(`🔗 LOCAL BRIDGE: http://localhost:${PORT}`);
    console.log(`══════════════════════════════════════════════`);
  });
}

startServer();
