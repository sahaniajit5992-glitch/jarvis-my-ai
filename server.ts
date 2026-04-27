import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import fs from "fs/promises";
import axios from "axios";
import { convert } from "html-to-text";
import os from "os";
import puppeteer from "puppeteer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- LOCAL AUTOMATION API ENDPOINTS ---

  /**
   * Universal Automation Command (Keyboard/Mouse/Shell)
   */
  app.post("/api/automate/command", (req, res) => {
    const { cmd, type } = req.body;
    
    // Safety check for critical commands
    if (cmd.includes("format") || cmd.includes("rm -rf") || cmd.includes("del /s")) {
      return res.status(403).json({ status: "error", message: "Restricted command pattern." });
    }

    // On Windows, we can use Powershell for advanced automation (Cursor, keys)
    let finalCmd = cmd;
    if (type === "powershell") {
      finalCmd = `powershell -Command "${cmd.replace(/"/g, '`"')}"`;
    }

    exec(finalCmd, (error) => {
      if (error) {
        return res.status(500).json({ status: "error", message: error.message });
      }
      res.json({ status: "success" });
    });
  });

  /**
   * System Status (CPU, RAM, Battery)
   */
  app.get("/api/system/status", async (req, res) => {
    try {
      const cpuUsage = os.loadavg()[0];
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const memUsage = ((totalMem - freeMem) / totalMem) * 100;
      
      res.json({
        status: "success",
        data: {
          cpu: cpuUsage.toFixed(2),
          memory: memUsage.toFixed(2),
          platform: os.platform(),
          uptime: (os.uptime() / 3600).toFixed(2) + " hours",
          hostname: os.hostname()
        }
      });
    } catch (err) {
      res.status(500).json({ status: "error", message: "Unable to retrieve system bios, sir." });
    }
  });

  /**
   * Browser Automation (Puppeteer)
   */
  app.post("/api/automate/browser", async (req, res) => {
    const { action, url, search } = req.body;
    let browser;
    try {
      browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      
      if (action === "search_youtube") {
        await page.goto(`https://www.youtube.com/results?search_query=${encodeURIComponent(search)}`);
        const firstVideo = await page.evaluate(() => {
          const first = document.querySelector('a#video-title');
          return first ? (first as any).href : null;
        });
        await browser.close();
        return res.json({ status: "success", videoUrl: firstVideo });
      }

      if (action === "screenshot") {
        await page.goto(url);
        const screenshot = await page.screenshot({ encoding: "base64" });
        await browser.close();
        return res.json({ status: "success", screenshot });
      }

      await browser.close();
      res.status(400).json({ status: "error", message: "Invalid browser action." });
    } catch (err: any) {
      if (browser) await browser.close();
      res.status(500).json({ status: "error", message: err.message });
    }
  });

  /**
   * Web Scraper for AI Context
   */
  app.post("/api/scrape", async (req, res) => {
    const { url } = req.body;
    try {
      const response = await axios.get(url, { 
        headers: { "User-Agent": "Mozilla/5.0 Kyros/1.0" },
        timeout: 5000 
      });
      const text = convert(response.data, {
        wordwrap: 130,
        selectors: [
          { selector: 'nav', format: 'skip' },
          { selector: 'footer', format: 'skip' },
          { selector: 'script', format: 'skip' },
          { selector: 'style', format: 'skip' }
        ]
      });
      res.json({ status: "success", content: text.substring(0, 10000) });
    } catch (err: any) {
      res.status(500).json({ status: "error", message: "Access to the digital stream was blocked, sir." });
    }
  });

  /**
   * Launch a local application
   */
  app.post("/api/automate/launch", (req, res) => {
    const { appName } = req.body;
    console.log(`[Kyros] Attempting to launch: ${appName}`);
    
    const commands: Record<string, string> = {
      chrome: "start chrome",
      notepad: "notepad",
      calculator: "calc",
      explorer: "explorer",
      vscode: "code",
      spotify: "start spotify",
      discord: "start discord",
    };

    const cmd = commands[appName.toLowerCase()] || `start ${appName}`;
    
    exec(cmd, (error) => {
      if (error) {
        return res.status(500).json({ status: "error", message: `System denied access to ${appName}` });
      }
      res.json({ status: "success", message: `${appName} initialized.` });
    });
  });

  app.post("/api/automate/file", async (req, res) => {
    const { action, fileName, content } = req.body;
    const homeDir = process.env.USERPROFILE || process.env.HOME || "";
    const filePath = path.join(homeDir, "Desktop", fileName);

    try {
      if (action === "create") {
        await fs.writeFile(filePath, content || "");
        return res.json({ status: "success", message: `File manifested at ${filePath}` });
      }
      if (action === "read") {
        const data = await fs.readFile(filePath, "utf-8");
        return res.json({ status: "success", content: data });
      }
      res.status(400).json({ status: "error", message: "Invalid action." });
    } catch (err) {
      res.status(500).json({ status: "error", message: "Protocol failure: Filesystem access restricted." });
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
    console.log(`🤖 Kyros BACKEND: ONLINE`);
    console.log(`🔗 LOCAL BRIDGE: http://localhost:${PORT}`);
    console.log(`══════════════════════════════════════════════`);
  });
}

startServer();
