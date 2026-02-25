try { require('dotenv').config(); } catch(e) {}

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = process.env.PORT || 3001;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.VITE_MODEL || 'gemini-2.5-flash';

const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(PUBLIC_DIR, 'data');
const FEEDBACK_QUEUE_PATH = path.join(__dirname, 'feedbackQueue.json');
const KB_PATH = path.join(__dirname, 'src/data/knowledgeBase.md');
const KB_VERSIONS_PATH = path.join(DATA_DIR, 'kbVersions.json');
const SNAPSHOTS_DIR = path.join(DATA_DIR, 'snapshots');

let state = { sent: false, confirmed: false, signals: {} };
const runningProcesses = new Map();

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
};

// Initialize files on startup
if (!fs.existsSync(path.join(DATA_DIR, 'processes.json')) && fs.existsSync(path.join(DATA_DIR, 'base_processes.json'))) {
    fs.copyFileSync(path.join(DATA_DIR, 'base_processes.json'), path.join(DATA_DIR, 'processes.json'));
}
const signalFile = path.join(__dirname, 'interaction-signals.json');
if (!fs.existsSync(signalFile)) {
    fs.writeFileSync(signalFile, JSON.stringify({ APPROVE_CHARGEBACK_FILING: false, APPROVE_EVIDENCE_DECISION: false }, null, 4));
}
if (!fs.existsSync(FEEDBACK_QUEUE_PATH)) fs.writeFileSync(FEEDBACK_QUEUE_PATH, '[]');
if (!fs.existsSync(KB_VERSIONS_PATH)) fs.writeFileSync(KB_VERSIONS_PATH, '[]');
if (!fs.existsSync(SNAPSHOTS_DIR)) fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });

const mimeTypes = {
    '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
    '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml', '.pdf': 'application/pdf', '.webm': 'video/webm',
    '.mp4': 'video/mp4', '.woff': 'font/woff', '.woff2': 'font/woff2', '.md': 'text/markdown'
};

async function callGemini(messages, systemPrompt) {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL, systemInstruction: systemPrompt });
    const chat = model.startChat({
        history: messages.slice(0, -1).map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
    });
    const result = await chat.sendMessage(messages[messages.length - 1].content);
    return result.response.text();
}

function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch (e) { resolve({}); } });
        req.on('error', reject);
    });
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const cleanPath = url.pathname;

    if (req.method === 'OPTIONS') {
        res.writeHead(204, corsHeaders);
        return res.end();
    }

    // --- RESET ---
    if (cleanPath === '/reset') {
        state = { sent: false, confirmed: false, signals: {} };
        console.log('Demo Reset Triggered');
        const sf = path.join(__dirname, 'interaction-signals.json');
        fs.writeFileSync(sf, JSON.stringify({ APPROVE_CHARGEBACK_FILING: false, APPROVE_EVIDENCE_DECISION: false }, null, 4));

        runningProcesses.forEach((proc, id) => { try { process.kill(-proc.pid, 'SIGKILL'); } catch (e) { } });
        runningProcesses.clear();

        exec('pkill -9 -f "node(.*)simulation_scripts" || true', (err) => {
            setTimeout(() => {
                const processesPath = path.join(DATA_DIR, 'processes.json');
                const cases = [
                    { id: "CB_001", name: "Sarah Mitchell - Merchandise Not Received", category: "Chargeback Lifecycle", stockId: "CB-2026-0847", year: "2026-02-24", status: "In Progress", currentStatus: "Initializing...", cardholderName: "Sarah Mitchell", transactionAmount: "$2,340.00", merchantName: "ElectroMax Online Store", reasonCode: "13.1", cardNetwork: "Visa" },
                    { id: "CB_002", name: "James Thornton - Suspected Friendly Fraud ($18,750)", category: "Chargeback Lifecycle", stockId: "CB-2026-1203", year: "2026-02-24", status: "In Progress", currentStatus: "Initializing...", cardholderName: "James K. Thornton", transactionAmount: "$18,750.00", merchantName: "Prestige Luxe Boutique", reasonCode: "10.4", cardNetwork: "Visa" },
                    { id: "CB_003", name: "Maria Rivera-Santos - Full Lifecycle (Filing + Representment)", category: "Chargeback Lifecycle", stockId: "CB-2026-0592", year: "2026-02-24", status: "In Progress", currentStatus: "Initializing...", cardholderName: "Maria Rivera-Santos", transactionAmount: "$4,890.00", merchantName: "GreenLeaf Home Goods", reasonCode: "13.3", cardNetwork: "Visa" }
                ];
                fs.writeFileSync(processesPath, JSON.stringify(cases, null, 4));
                fs.writeFileSync(FEEDBACK_QUEUE_PATH, '[]');
                fs.writeFileSync(KB_VERSIONS_PATH, '[]');

                const scripts = [
                    { file: 'chargeback_story_1_happy_path.cjs', id: 'CB_001' },
                    { file: 'chargeback_story_2_needs_attention.cjs', id: 'CB_002' },
                    { file: 'chargeback_story_3_representment.cjs', id: 'CB_003' }
                ];
                let totalDelay = 0;
                scripts.forEach((script) => {
                    setTimeout(() => {
                        const scriptPath = path.join(__dirname, 'simulation_scripts', script.file);
                        const child = exec(`node "${scriptPath}" > "${scriptPath}.log" 2>&1`, (error) => {
                            if (error && error.code !== 0) console.error(`${script.file} error:`, error.message);
                            runningProcesses.delete(script.id);
                        });
                        runningProcesses.set(script.id, child);
                    }, totalDelay * 1000);
                    totalDelay += 2;
                });
            }, 1000);
        });
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ status: 'ok' }));
    }

    // --- EMAIL STATUS ---
    if (cleanPath === '/email-status') {
        if (req.method === 'GET') {
            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ sent: state.sent }));
        }
        if (req.method === 'POST') {
            const body = await parseBody(req);
            state.sent = body.sent || false;
            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ status: 'ok' }));
        }
    }

    // --- SIGNALS ---
    if (cleanPath === '/signal-status') {
        const sf = path.join(__dirname, 'interaction-signals.json');
        let signals = {};
        try { signals = JSON.parse(fs.readFileSync(sf, 'utf8')); } catch (e) { }
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        return res.end(JSON.stringify(signals));
    }
    if (cleanPath === '/signal' && req.method === 'POST') {
        const body = await parseBody(req);
        const sf = path.join(__dirname, 'interaction-signals.json');
        let signals = {};
        try { signals = JSON.parse(fs.readFileSync(sf, 'utf8')); } catch (e) { }
        if (body.signal) { signals[body.signal] = true; fs.writeFileSync(sf, JSON.stringify(signals, null, 4)); }
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ status: 'ok' }));
    }

    // --- UPDATE STATUS ---
    if (cleanPath === '/api/update-status' && req.method === 'POST') {
        const body = await parseBody(req);
        try {
            const processesPath = path.join(DATA_DIR, 'processes.json');
            const processes = JSON.parse(fs.readFileSync(processesPath, 'utf8'));
            const idx = processes.findIndex(p => p.id === body.id);
            if (idx !== -1) {
                processes[idx].status = body.status;
                processes[idx].currentStatus = body.currentStatus;
                fs.writeFileSync(processesPath, JSON.stringify(processes, null, 4));
            }
        } catch (e) { console.error('Update status error:', e); }
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ status: 'ok' }));
    }

    // --- CHAT (Dual contract: KB chat + Work-with-Pace) ---
    if (cleanPath === '/api/chat' && req.method === 'POST') {
        const parsed = await parseBody(req);
        try {
            let messages, systemPrompt;
            if (parsed.messages && parsed.systemPrompt) {
                messages = parsed.messages;
                systemPrompt = parsed.systemPrompt;
            } else {
                const history = parsed.history || [];
                messages = [
                    ...history.map(h => ({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content })),
                    { role: 'user', content: parsed.message }
                ];
                systemPrompt = `You are a knowledgeable assistant for ABC Bank's Chargeback Lifecycle process. Answer questions based on the following knowledge base:\n\n${parsed.knowledgeBase || ''}`;
            }
            const response = await callGemini(messages, systemPrompt);
            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ response }));
        } catch (e) {
            console.error('Chat error:', e);
            res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: e.message }));
        }
    }

    // --- FEEDBACK QUESTIONS ---
    if (cleanPath === '/api/feedback/questions' && req.method === 'POST') {
        const parsed = await parseBody(req);
        try {
            const prompt = `Based on this feedback about a knowledge base, generate exactly 3 clarifying questions to better understand what changes are needed.\n\nFeedback: ${parsed.feedback}\n\nCurrent KB:\n${parsed.knowledgeBase || ''}\n\nRespond with a JSON array of 3 questions only, like: ["Q1?", "Q2?", "Q3?"]`;
            const response = await callGemini([{ role: 'user', content: prompt }], 'You generate clarifying questions for knowledge base feedback. Always respond with a valid JSON array of exactly 3 strings.');
            let questions;
            try { questions = JSON.parse(response.replace(/```json?\n?/g, '').replace(/```/g, '').trim()); } catch (e) { questions = ["Could you elaborate on the specific change needed?", "Which section of the KB should be updated?", "What is the expected outcome of this change?"]; }
            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ questions }));
        } catch (e) {
            res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: e.message }));
        }
    }

    // --- FEEDBACK SUMMARIZE ---
    if (cleanPath === '/api/feedback/summarize' && req.method === 'POST') {
        const parsed = await parseBody(req);
        try {
            const qaPairs = (parsed.questions || []).map((q, i) => `Q: ${q}\nA: ${(parsed.answers || [])[i] || 'No answer'}`).join('\n\n');
            const prompt = `Summarize this feedback into a clear, actionable proposal for updating the knowledge base.\n\nOriginal Feedback: ${parsed.feedback}\n\nClarifying Q&A:\n${qaPairs}\n\nProvide a concise summary of what should change in the KB.`;
            const response = await callGemini([{ role: 'user', content: prompt }], 'You summarize feedback into actionable KB update proposals.');
            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ summary: response }));
        } catch (e) {
            res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: e.message }));
        }
    }

    // --- FEEDBACK QUEUE (GET, POST, DELETE) ---
    if (cleanPath.startsWith('/api/feedback/queue')) {
        if (req.method === 'GET') {
            let queue = [];
            try { queue = JSON.parse(fs.readFileSync(FEEDBACK_QUEUE_PATH, 'utf8')); } catch (e) { }
            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ queue }));
        }
        if (req.method === 'POST' && cleanPath === '/api/feedback/queue') {
            const item = await parseBody(req);
            let queue = [];
            try { queue = JSON.parse(fs.readFileSync(FEEDBACK_QUEUE_PATH, 'utf8')); } catch (e) { }
            queue.push({ ...item, status: 'pending', timestamp: new Date().toISOString() });
            fs.writeFileSync(FEEDBACK_QUEUE_PATH, JSON.stringify(queue, null, 2));
            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ status: 'ok' }));
        }
        if (req.method === 'DELETE') {
            const id = cleanPath.split('/').pop();
            let queue = [];
            try { queue = JSON.parse(fs.readFileSync(FEEDBACK_QUEUE_PATH, 'utf8')); } catch (e) { }
            queue = queue.filter(item => item.id !== id);
            fs.writeFileSync(FEEDBACK_QUEUE_PATH, JSON.stringify(queue, null, 2));
            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ status: 'ok' }));
        }
    }

    // --- FEEDBACK APPLY ---
    if (cleanPath === '/api/feedback/apply' && req.method === 'POST') {
        const parsed = await parseBody(req);
        try {
            let queue = [];
            try { queue = JSON.parse(fs.readFileSync(FEEDBACK_QUEUE_PATH, 'utf8')); } catch (e) { }
            const item = queue.find(i => i.id === parsed.feedbackId);
            if (!item) { res.writeHead(404, corsHeaders); return res.end(JSON.stringify({ error: 'Not found' })); }

            const currentKB = fs.readFileSync(KB_PATH, 'utf8');
            const prompt = `Update the following knowledge base document based on this feedback:\n\nFeedback Summary: ${item.summary}\n\nCurrent KB:\n${currentKB}\n\nReturn the COMPLETE updated knowledge base document (not just the changes).`;
            const updatedKB = await callGemini([{ role: 'user', content: prompt }], 'You update knowledge base documents. Return the complete updated document.');

            const cleanKB = updatedKB.replace(/```markdown?\n?/g, '').replace(/```/g, '').trim();

            const timestamp = new Date().toISOString();
            const snapshotFile = `kb_${Date.now()}.md`;
            const previousFile = `kb_${Date.now()}_prev.md`;
            fs.writeFileSync(path.join(SNAPSHOTS_DIR, previousFile), currentKB);
            fs.writeFileSync(path.join(SNAPSHOTS_DIR, snapshotFile), cleanKB);
            fs.writeFileSync(KB_PATH, cleanKB);

            let versions = [];
            try { versions = JSON.parse(fs.readFileSync(KB_VERSIONS_PATH, 'utf8')); } catch (e) { }
            versions.push({ id: Date.now().toString(), timestamp, snapshotFile, previousFile, changes: [item.summary] });
            fs.writeFileSync(KB_VERSIONS_PATH, JSON.stringify(versions, null, 2));

            queue = queue.filter(i => i.id !== parsed.feedbackId);
            fs.writeFileSync(FEEDBACK_QUEUE_PATH, JSON.stringify(queue, null, 2));

            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: true, content: cleanKB }));
        } catch (e) {
            res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: e.message }));
        }
    }

    // --- KB CONTENT ---
    if (cleanPath === '/api/kb/content' && req.method === 'GET') {
        const versionId = url.searchParams.get('versionId');
        try {
            let content;
            if (versionId) {
                let versions = JSON.parse(fs.readFileSync(KB_VERSIONS_PATH, 'utf8'));
                const version = versions.find(v => v.id === versionId);
                if (version) { content = fs.readFileSync(path.join(SNAPSHOTS_DIR, version.snapshotFile), 'utf8'); }
                else { content = fs.readFileSync(KB_PATH, 'utf8'); }
            } else { content = fs.readFileSync(KB_PATH, 'utf8'); }
            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ content }));
        } catch (e) {
            res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: e.message }));
        }
    }

    // --- KB VERSIONS ---
    if (cleanPath === '/api/kb/versions' && req.method === 'GET') {
        let versions = [];
        try { versions = JSON.parse(fs.readFileSync(KB_VERSIONS_PATH, 'utf8')); } catch (e) { }
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ versions }));
    }

    // --- KB SNAPSHOT ---
    if (cleanPath.startsWith('/api/kb/snapshot/') && req.method === 'GET') {
        const filename = cleanPath.split('/').pop();
        const filePath = path.join(SNAPSHOTS_DIR, filename);
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'text/markdown' });
            return res.end(content);
        } catch (e) {
            res.writeHead(404, corsHeaders);
            return res.end('Not found');
        }
    }

    // --- KB UPDATE ---
    if (cleanPath === '/api/kb/update' && req.method === 'POST') {
        const parsed = await parseBody(req);
        try {
            fs.writeFileSync(KB_PATH, parsed.content);
            res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ status: 'ok' }));
        } catch (e) {
            res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: e.message }));
        }
    }

    // --- DEBUG ---
    if (cleanPath === '/debug-paths') {
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ dataDir: DATA_DIR, exists: fs.existsSync(DATA_DIR), files: fs.existsSync(DATA_DIR) ? fs.readdirSync(DATA_DIR) : [] }));
    }

    // --- STATIC FILES ---
    let filePath = path.join(PUBLIC_DIR, cleanPath === '/' ? 'index.html' : cleanPath);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(PUBLIC_DIR, 'index.html');
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    try {
        const content = fs.readFileSync(filePath);
        res.writeHead(200, { ...corsHeaders, 'Content-Type': contentType });
        res.end(content);
    } catch (e) {
        res.writeHead(404, corsHeaders);
        res.end('Not found');
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Chargeback Lifecycle server running on port ${PORT}`);
});
