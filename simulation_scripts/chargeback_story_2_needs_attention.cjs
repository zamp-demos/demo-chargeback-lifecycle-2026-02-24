const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const PUBLIC_DATA_DIR = path.join(PROJECT_ROOT, 'public/data');
const PROCESSES_FILE = path.join(PUBLIC_DATA_DIR, 'processes.json');
const PROCESS_ID = "CB_002";
const CASE_NAME = "James Thornton - Suspected Friendly Fraud ($18,750)";

const readJson = (file) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : []);
const writeJson = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 4));
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const updateProcessLog = (processId, logEntry, keyDetailsUpdate = {}) => {
    const processFile = path.join(PUBLIC_DATA_DIR, `process_${processId}.json`);
    let data = { logs: [], keyDetails: {}, sidebarArtifacts: [] };
    if (fs.existsSync(processFile)) data = readJson(processFile);
    if (logEntry) {
        const existingIdx = logEntry.id ? data.logs.findIndex(l => l.id === logEntry.id) : -1;
        if (existingIdx !== -1) { data.logs[existingIdx] = { ...data.logs[existingIdx], ...logEntry }; }
        else { data.logs.push(logEntry); }
    }
    if (keyDetailsUpdate && Object.keys(keyDetailsUpdate).length > 0) { data.keyDetails = { ...data.keyDetails, ...keyDetailsUpdate }; }
    writeJson(processFile, data);
};

const updateProcessListStatus = async (processId, status, currentStatus) => {
    const apiUrl = process.env.VITE_API_URL || 'http://localhost:3001';
    try {
        const response = await fetch(`${apiUrl}/api/update-status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: processId, status, currentStatus }) });
        if (!response.ok) throw new Error(`Server returned ${response.status}`);
    } catch (e) {
        try { const processes = JSON.parse(fs.readFileSync(PROCESSES_FILE, 'utf8')); const idx = processes.findIndex(p => p.id === String(processId)); if (idx !== -1) { processes[idx].status = status; processes[idx].currentStatus = currentStatus; fs.writeFileSync(PROCESSES_FILE, JSON.stringify(processes, null, 4)); } } catch (err) { }
    }
};

const waitForSignal = async (signalId) => {
    console.log(`Waiting for human signal: ${signalId}...`);
    const signalFile = path.join(__dirname, '../interaction-signals.json');
    for (let i = 0; i < 15; i++) {
        try {
            if (fs.existsSync(signalFile)) {
                const content = fs.readFileSync(signalFile, 'utf8');
                if (!content) continue;
                const signals = JSON.parse(content);
                if (signals[signalId]) {
                    delete signals[signalId];
                    const tmp = signalFile + '.' + Math.random().toString(36).substring(7) + '.tmp';
                    fs.writeFileSync(tmp, JSON.stringify(signals, null, 4));
                    fs.renameSync(tmp, signalFile);
                }
                break;
            }
        } catch (e) { await delay(Math.floor(Math.random() * 200) + 100); }
    }
    while (true) {
        try {
            if (fs.existsSync(signalFile)) {
                const content = fs.readFileSync(signalFile, 'utf8');
                if (content) {
                    const signals = JSON.parse(content);
                    if (signals[signalId]) {
                        console.log(`Signal ${signalId} received!`);
                        delete signals[signalId];
                        const tmp = signalFile + '.' + Math.random().toString(36).substring(7) + '.tmp';
                        fs.writeFileSync(tmp, JSON.stringify(signals, null, 4));
                        fs.renameSync(tmp, signalFile);
                        return true;
                    }
                }
            }
        } catch (e) { }
        await delay(1000);
    }
};

(async () => {
    console.log(`Starting ${PROCESS_ID}: ${CASE_NAME}...`);
    writeJson(path.join(PUBLIC_DATA_DIR, `process_${PROCESS_ID}.json`), {
        logs: [], keyDetails: {
            cardholderName: "James K. Thornton",
            transactionAmount: "$18,750.00",
            merchantName: "Prestige Luxe Boutique",
            reasonCode: "10.4 - Fraud (Card Absent)",
            cardNetwork: "Visa",
            transactionDate: "Jan 15, 2026",
            riskLevel: "HIGH - Friendly Fraud Suspected"
        }
    });

    const steps = [
        {
            id: "step-1",
            title_p: "Receiving new dispute - high-value flag triggered...",
            title_s: "High-value dispute received - $18,750 exceeds $10K threshold",
            reasoning: [
                "HIGH VALUE ALERT: Transaction amount $18,750 exceeds $10,000 threshold",
                "Cardholder: James K. Thornton (Card ending 4829)",
                "Merchant: Prestige Luxe Boutique (MCC: 5944 - Jewelry/Luxury)",
                "Claim: Cardholder states transaction was unauthorized",
                "Priority: ELEVATED - Requires enhanced review"
            ],
            artifacts: [{
                id: "intake-2", type: "json", label: "Dispute Intake Data",
                data: { cardholder: "James K. Thornton", cardLast4: "4829", amount: "$18,750.00", merchant: "Prestige Luxe Boutique", merchantMCC: "5944 - Jewelry", transactionId: "TXN-7734509", transactionDate: "2026-01-15", reasonCode: "10.4", priorityFlag: "HIGH VALUE", threshold: "$10,000" }
            }]
        },
        {
            id: "step-2",
            title_p: "Extracting full transaction details including 3D Secure records...",
            title_s: "3D Secure AUTHENTICATED - Cardholder verified during transaction",
            reasoning: [
                "3D Secure Status: FULLY AUTHENTICATED (Verified by Visa)",
                "ECI Indicator: 05 (Fully authenticated)",
                "Authentication Result: Y",
                "Liability Shift: Per Visa rules, liability shifts to ISSUER for authenticated transactions",
                "This is a critical finding - 3D Secure authentication suggests cardholder participation"
            ]
        },
        {
            id: "step-3",
            title_p: "Running deep fraud analysis - device, IP, behavioral patterns...",
            title_s: "Deep analysis complete - Mixed signals detected",
            reasoning: [
                "Device Fingerprint: MATCH - Same device used for 4 prior clean transactions",
                "Prior Transactions: Aug 2025 ($120), Oct 2025 ($340), Nov 2025 ($280), Dec 2025 ($195)",
                "IP Address: 72.134.88.201 - Consistent with cardholder city (Portland, OR)",
                "Shipping Address: MATCHES billing address exactly",
                "Behavioral Flag: Transaction amount ($18,750) is 55x cardholder average ($340)",
                "Red Flag: First luxury goods purchase on this card"
            ]
        },
        {
            id: "step-4",
            title_p: "Pulling cardholder transaction history for pattern analysis...",
            title_s: "4 prior clean transactions from same device in 6 months identified",
            reasoning: [
                "Transaction History (last 6 months from same device):",
                "Aug 12, 2025: $120.00 at Amazon.com - NOT DISPUTED",
                "Oct 3, 2025: $340.00 at Best Buy - NOT DISPUTED",
                "Nov 18, 2025: $280.00 at Target - NOT DISPUTED",
                "Dec 5, 2025: $195.00 at Walmart - NOT DISPUTED",
                "Jan 15, 2026: $18,750.00 at Prestige Luxe Boutique - DISPUTED",
                "Pattern: Consistent device and IP across all transactions"
            ]
        },
        {
            id: "step-5",
            title_p: "Evaluating chargeback decision - cross-referencing fraud indicators...",
            title_s: "DECISION CONFLICT: 62% friendly fraud probability - Human approval required",
            reasoning: [
                "LEGITIMACY SIGNALS (favoring DO NOT FILE):",
                "  - 3D Secure fully authenticated (strong cardholder verification)",
                "  - Device consistent with 4 prior clean transactions",
                "  - IP address matches cardholder location",
                "  - Shipping = billing address (no address mismatch)",
                "FRAUD SIGNALS (favoring FILE):",
                "  - Amount is 55x cardholder average",
                "  - First luxury purchase on card",
                "  - Cardholder insists transaction unauthorized",
                "RISK ASSESSMENT:",
                "  - Friendly Fraud Probability: 62%",
                "  - Unauthorized Fraud Probability: 38%",
                "  - Evidence Strength for Filing: WEAK",
                "RECOMMENDATION: DO NOT FILE - Escalate to human approver"
            ],
            artifacts: [
                {
                    id: "decision-matrix-2", type: "json", label: "Reasoning Decision Matrix",
                    data: { threeDSecure: "AUTHENTICATED - Liability shift to issuer", deviceHistory: "4 prior clean transactions from same device", ipConsistency: "MATCH - Portland, OR", addressMatch: "FULL MATCH - Shipping equals billing", amountAnomaly: "HIGH - 55x average spend", friendlyFraudProbability: "62%", unauthorizedFraudProbability: "38%", evidenceStrength: "WEAK", recommendation: "DO NOT FILE", overrideAvailable: true }
                },
                {
                    id: "fraud-report", type: "file", label: "Fraud Investigation Report",
                    pdfPath: "/data/fraud_investigation_report_CB002.pdf"
                }
            ]
        },
        {
            id: "step-6",
            title_p: "Awaiting human approver decision...",
            title_s: "Human override received - Approver authorized chargeback filing",
            hitl: true,
            reasoning: [
                "Agent Recommendation: DO NOT FILE (62% friendly fraud)",
                "Human Decision: OVERRIDE - File chargeback",
                "Approver rationale recorded in case audit trail",
                "Proceeding with chargeback filing per human authorization"
            ]
        },
        {
            id: "step-7",
            title_p: "Filing chargeback on VROL with human override notation...",
            title_s: "Chargeback filed on VROL - Case CB-2026-1203 (Human Override)",
            reasoning: [
                "Portal: Visa Resolve Online (VROL)",
                "Case Reference: CB-2026-1203",
                "Reason Code: 10.4 - Other Fraud (Card Absent)",
                "Amount: $18,750.00",
                "Special Note: Human override applied - AI recommended DO NOT FILE",
                "Filing Status: ACCEPTED by Visa network"
            ],
            artifacts: [{
                id: "vrol-video-2", type: "video", label: "VROL Filing - Browser Agent Recording",
                videoPath: "/data/vrol_filing_cb002.webm"
            }]
        },
        {
            id: "step-8",
            title_p: "Issuing provisional credit and generating audit trail...",
            title_s: "Case complete - $18,750 provisional credit issued, override logged",
            reasoning: [
                "Provisional Credit: $18,750.00 issued to account ending 4829",
                "Merchant Notified: Prestige Luxe Boutique via acquirer",
                "Response Deadline: March 26, 2026",
                "Audit Trail: Human override documented with timestamp and approver ID",
                "Compliance Flag: Case flagged for friendly fraud monitoring"
            ],
            artifacts: [{
                id: "escalation-email", type: "email_draft", label: "Internal Escalation - Friendly Fraud Flag",
                data: { isIncoming: false, to: "compliance@abcbank.com", cc: "fraud-monitoring@abcbank.com", subject: "Friendly Fraud Flag - Case CB-2026-1203 | $18,750 | Human Override Applied", body: "INTERNAL - COMPLIANCE NOTIFICATION\n\nCase CB-2026-1203 has been filed with a human override.\n\nAI Recommendation: DO NOT FILE (62% friendly fraud probability)\nHuman Decision: OVERRIDE - File chargeback\n\nKey Findings:\n- 3D Secure was fully authenticated\n- Same device used for 4 prior clean transactions\n- Shipping matches billing address\n- Amount ($18,750) is 55x cardholder average\n\nThis case has been flagged for the friendly fraud monitoring program.\nPlease review and update risk models as appropriate.\n\nABC Bank Dispute Resolution - Automated Alert" }
            }]
        },
        {
            id: "step-9",
            title_p: "Finalizing case with compliance review...",
            title_s: "Case closed - Filed with human override, compliance flagged",
            reasoning: [
                "Case Status: FILED WITH HUMAN OVERRIDE",
                "Compliance Review: Flagged for friendly fraud monitoring",
                "Audit Trail: Complete with AI reasoning + human decision",
                "Next Review: March 26, 2026 (merchant response deadline)",
                "Risk Note: Monitor cardholder for repeat dispute patterns"
            ]
        }
    ];

    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const isFinal = i === steps.length - 1;

        updateProcessLog(PROCESS_ID, {
            id: step.id,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            title: step.title_p,
            status: "processing"
        });
        await updateProcessListStatus(PROCESS_ID, "In Progress", step.title_p);
        await delay(2000);

        if (step.hitl) {
            updateProcessLog(PROCESS_ID, {
                id: step.id,
                title: step.title_s,
                status: "warning",
                reasoning: step.reasoning || [],
                artifacts: step.artifacts || []
            });
            await updateProcessListStatus(PROCESS_ID, "Needs Attention", "Human approval required - 62% friendly fraud probability");
            await waitForSignal("APPROVE_CHARGEBACK_FILING");
            await updateProcessListStatus(PROCESS_ID, "In Progress", "Human override received - Proceeding with filing");
        } else {
            updateProcessLog(PROCESS_ID, {
                id: step.id,
                title: step.title_s,
                status: isFinal ? "completed" : "success",
                reasoning: step.reasoning || [],
                artifacts: step.artifacts || []
            });
            await updateProcessListStatus(PROCESS_ID, isFinal ? "Done" : "In Progress", step.title_s);
            await delay(1500);
        }
    }
    console.log(`${PROCESS_ID} Complete: ${CASE_NAME}`);
})();
