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
import loudness from "loudness";

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
   * System Automation (Volume)
   */
  app.post("/api/system/volume", async (req, res) => {
    let { volume } = req.body;
    if (typeof volume !== "number" || volume < 0 || volume > 100) {
       return res.status(400).json({ status: "error", message: "Invalid volume." });
    }
    
    try {
      await loudness.setVolume(volume);
      res.json({ status: "success", message: `System volume successfully set to ${volume}%.` });
    } catch (e: any) {
      res.json({ status: "error", message: e.message });
    }
  });

  /**
   * Browser Automation (Puppeteer & Metadata)
   */
  app.post("/api/automate/browser", async (req, res) => {
    const { action, url, search } = req.body;
    
    if (action === "screenshot" && !url) {
      // If no URL is provided, return a placeholder for "Desktop Mirror"
      return res.json({ 
        status: "success", 
        screenshot: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", 
        message: "Visual data synchronized via neural link, Sir."
      });
    }

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
    const platform = os.platform();
    console.log(`[Kyros] Attempting to launch: ${appName} on ${platform}`);
    
    let cmd = "";
    const lowerApp = appName.toLowerCase();

    if (platform === "win32") {
      const winCommands: Record<string, string> = {
        chrome: "Start-Process 'chrome'",
        vscode: "Start-Process 'code'",
        spotify: "Start-Process 'spotify'",
        discord: "Start-Process 'discord'",
        notepad: "Start-Process 'notepad'",
        calculator: "Start-Process 'calc'",
        excel: "Start-Process 'excel'",
      };
      const psCmd = winCommands[lowerApp] || `Start-Process '${appName}'`;
      cmd = `powershell -Command "${psCmd}"`;
    } else if (platform === "darwin") {
      const macCommands: Record<string, string> = {
        chrome: "open -a 'Google Chrome'",
        vscode: "code",
        spotify: "open -a Spotify",
        discord: "open -a Discord",
      };
      cmd = macCommands[lowerApp] || `open -a ${appName}`;
    } else {
      cmd = `xdg-open ${appName}`;
    }
    
    exec(cmd, (error) => {
      if (error) {
        // Fallback to start
        exec(`start ${appName}`, (err2) => {
          if (err2) return res.status(500).json({ status: "error", message: `System denied access to ${appName}.` });
          res.json({ status: "success", message: `${appName} initialized via fallback.` });
        });
      } else {
        res.json({ status: "success", message: `${appName} initialized.` });
      }
    });
  });

  /**
   * Mouse Control Endpoint (Windows PowerShell)
   */
  app.post("/api/automate/mouse", (req, res) => {
    const { action, x, y } = req.body;
    if (os.platform() !== "win32") return res.status(501).json({ error: "Only Windows supported for direct mouse control." });

    let script = "";
    if (action === "move" || action === "click") {
      script = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x || 0}, ${y || 0});`;
      if (action === "click") {
        script += "$sig = '[DllImport(\"user32.dll\")] public static extern void mouse_event(int dwFlags, int dx, int dy, int dwData, int dwExtraInfo);'; $type = Add-Type -MemberDefinition $sig -Name 'Mouse' -Namespace 'Win32' -PassThru; $type::mouse_event(0x0002, 0, 0, 0, 0); $type::mouse_event(0x0004, 0, 0, 0, 0);";
      }
    }

    exec(`powershell -Command "${script}"`, (error) => {
      if (error) return res.status(500).json({ error: error.message });
      res.json({ status: "success" });
    });
  });

  /**
   * Keyboard Control Endpoint (Windows PowerShell)
   */
  app.post("/api/automate/keyboard", (req, res) => {
    const { action, text } = req.body;
    if (os.platform() !== "win32") return res.status(501).json({ error: "Only Windows supported for keyboard control." });

    let script = "";
    if (action === "type") {
      // Escape single quotes for PowerShell
      const escaped = text.replace(/'/g, "''");
      script = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${escaped}')`;
    } else if (action === "press_key") {
      const keyMap: Record<string, string> = { 
        "enter": "{ENTER}", 
        "tab": "{TAB}", 
        "space": " ",
        "backspace": "{BACKSPACE}",
        "delete": "{DELETE}",
        "up": "{UP}",
        "down": "{DOWN}",
        "left": "{LEFT}",
        "right": "{RIGHT}",
        "win": "^{ESC}" // Approximation for Win key
      };
      const key = keyMap[text.toLowerCase()] || text;
      script = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${key}')`;
    }

    exec(`powershell -Command "${script}"`, (error) => {
      if (error) return res.status(500).json({ error: error.message });
      res.json({ status: "success" });
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

  /**
   * Intelligence Proxy for Stock and Wikipedia
   */
  app.get("/api/intelligence/stock/:symbol", async (req, res) => {
    const { symbol } = req.params;
    try {
      const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol.toUpperCase()}?interval=1d&range=1d`, {
        headers: { "User-Agent": "Mozilla/5.0" },
        timeout: 5000
      });
      res.json(response.data);
    } catch (err: any) {
      res.status(500).json({ status: "error", message: "Neural link to market data failed." });
    }
  });

  app.get("/api/intelligence/wikipedia/:topic", async (req, res) => {
    const { topic } = req.params;
    try {
      const response = await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`, {
        timeout: 5000
      });
      res.json(response.data);
    } catch (err: any) {
      res.status(500).json({ status: "error", message: "Educational database access failed." });
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
