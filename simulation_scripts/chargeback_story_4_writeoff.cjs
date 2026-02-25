const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const PUBLIC_DATA_DIR = path.join(PROJECT_ROOT, 'public/data');
const PROCESSES_FILE = path.join(PUBLIC_DATA_DIR, 'processes.json');
const PROCESS_ID = "CB_004";
const CASE_NAME = "Alex Chen - Low-Value Writeoff ($5.00)";

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
    } catch (e) { console.error('Status update failed:', e.message); }
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
            cardholderName: "Alex Chen",
            transactionAmount: "$5.00",
            merchantName: "QuickBite Express",
            reasonCode: "13.1 - Merchandise Not Received",
            cardNetwork: "Visa",
            transactionDate: "Feb 18, 2026",
            riskLevel: "LOW - Below writeoff threshold"
        }
    });

    const preHitlSteps = [
        {
            id: "step-1",
            title_p: "Receiving new dispute - standard intake processing...",
            title_s: "Dispute received - $5.00 charge at QuickBite Express",
            reasoning: [
                "Cardholder: Alex Chen (Card ending 7712)",
                "Merchant: QuickBite Express (MCC: 5812 - Eating/Restaurants)",
                "Amount: $5.00",
                "Claim: Food delivery order never arrived",
                "Transaction Date: February 18, 2026",
                "Priority: STANDARD"
            ],
            artifacts: [{
                id: "intake-4", type: "json", label: "Dispute Intake Data",
                data: { cardholder: "Alex Chen", cardLast4: "7712", amount: "$5.00", merchant: "QuickBite Express", merchantMCC: "5812 - Restaurants", transactionId: "TXN-0098234", transactionDate: "2026-02-18", reasonCode: "13.1", priorityFlag: "STANDARD", deliveryPlatform: "QuickBite App" }
            }]
        },
        {
            id: "step-2",
            title_p: "Running cost-benefit analysis against writeoff threshold...",
            title_s: "Below writeoff threshold - $5.00 under $25 SOP limit",
            reasoning: [
                "COST-BENEFIT ANALYSIS:",
                "  Transaction Amount: $5.00",
                "  Writeoff Threshold (per SOP): $25.00",
                "  Estimated Filing Cost: $35.00 (network fees + processing time)",
                "  Cost Ratio: Filing would cost 7x the disputed amount",
                "  SOP Reference: Section 7 - Low-Value Dispute Writeoff Policy",
                "RECOMMENDATION: WRITEOFF - Amount below threshold, filing not cost-effective"
            ]
        },
        {
            id: "step-3",
            title_p: "Verifying cardholder history and dispute frequency...",
            title_s: "Clean cardholder history - First dispute in 24 months",
            reasoning: [
                "Cardholder History Check:",
                "  Account Age: 3 years, 4 months",
                "  Total Disputes (24 months): 0 (this is the first)",
                "  Average Monthly Spend: $420",
                "  Dispute-to-Transaction Ratio: 0.02%",
                "  Loyalty Tier: Gold",
                "  Risk Flag: NONE",
                "No indicators of serial dispute abuse - writeoff recommendation stands"
            ]
        },
        {
            id: "step-4",
            title_p: "Evaluating writeoff decision - preparing for human confirmation...",
            title_s: "WRITEOFF RECOMMENDED: $5.00 below $25 threshold - Awaiting human confirmation",
            reasoning: [
                "DECISION SUMMARY:",
                "  Amount: $5.00 (below $25 writeoff threshold)",
                "  Filing Cost: $35.00 (7x transaction amount)",
                "  Cardholder Risk: LOW (clean 24-month history)",
                "  SOP Compliance: Writeoff aligns with Section 7 policy",
                "  Agent Recommendation: WRITEOFF AND REFUND",
                "  Rationale: Filing a $35 chargeback for a $5 transaction is not cost-effective",
                "  Escalation: Requires human confirmation per SOP"
            ],
            artifacts: [{
                id: "cost-analysis", type: "json", label: "Cost-Benefit Analysis",
                data: { transactionAmount: "$5.00", writeoffThreshold: "$25.00", estimatedFilingCost: "$35.00", costRatio: "7:1 (filing cost to amount)", cardholderRisk: "LOW", disputeHistory: "0 disputes in 24 months", sopReference: "Section 7 - Low-Value Writeoff", recommendation: "WRITEOFF AND REFUND" }
            }]
        }
    ];

    const hitlStep = {
        id: "step-5",
        title_p: "Awaiting human confirmation for writeoff...",
        title_s: "Human confirmed - Writeoff approved, proceeding with refund",
        hitl: true,
        reasoning: [
            "Agent Recommendation: WRITEOFF ($5.00 below $25 threshold)",
            "Cost Analysis: Filing chargeback would cost $35 (7x the amount)",
            "SOP Reference: Section 7 - Low-Value Dispute Writeoff Policy",
            "Cardholder: Alex Chen - Clean history, first dispute in 24 months",
            "Requires human confirmation to execute writeoff and issue refund"
        ],
        artifacts: [{
            id: "writeoff-decision", type: "decision", label: "Writeoff Confirmation",
            options: [
                { value: "confirm_writeoff", label: "Confirm writeoff \u2014 Issue $5.00 refund to cardholder", signal: "APPROVE_WRITEOFF" },
                { value: "process_normally", label: "Override \u2014 File chargeback through standard process", signal: "APPROVE_WRITEOFF" }
            ]
        }]
    };

    const postHitlSteps = [
        {
            id: "step-6",
            title_p: "Logging decision against SOP - writeoff threshold policy applied...",
            title_s: "SOP compliance logged - Writeoff under Section 7 policy documented",
            reasoning: [
                "SOP COMPLIANCE LOG:",
                "  Policy: ABC Bank Chargeback SOP - Section 7",
                "  Rule: Disputes below $25 eligible for direct writeoff",
                "  Conditions Met:",
                "    \u2713 Amount ($5.00) below threshold ($25.00)",
                "    \u2713 Cardholder in good standing (0 prior disputes)",
                "    \u2713 No pattern of low-value dispute abuse detected",
                "    \u2713 Human approver confirmed writeoff",
                "  Decision: WRITEOFF APPROVED per SOP Section 7",
                "  Audit ID: WO-2026-0234"
            ]
        },
        {
            id: "step-7",
            title_p: "Issuing refund and closing case...",
            title_s: "Case complete - $5.00 refund issued, writeoff logged per SOP",
            reasoning: [
                "CASE RESOLUTION:",
                "  Action: Direct writeoff and refund (no chargeback filed)",
                "  Refund Amount: $5.00 credited to card ending 7712",
                "  Processing Time: Refund visible within 1-2 business days",
                "  Cost Savings: $35.00 in avoided filing costs",
                "  Cardholder Notification: Email confirmation sent",
                "  SOP Compliance: Section 7 writeoff policy followed",
                "  Audit Trail: Complete - AI recommendation + human confirmation",
                "  Knowledge Base: Writeoff threshold section referenced"
            ]
        }
    ];

    // Execute pre-HITL steps
    for (let i = 0; i < preHitlSteps.length; i++) {
        const step = preHitlSteps[i];
        updateProcessLog(PROCESS_ID, {
            id: step.id,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            title: step.title_p,
            status: "processing"
        });
        await updateProcessListStatus(PROCESS_ID, "In Progress", step.title_p);
        await delay(2000);
        updateProcessLog(PROCESS_ID, {
            id: step.id,
            title: step.title_s,
            status: "success",
            reasoning: step.reasoning || [],
            artifacts: step.artifacts || []
        });
        await updateProcessListStatus(PROCESS_ID, "In Progress", step.title_s);
        await delay(1500);
    }

    // HITL step
    updateProcessLog(PROCESS_ID, {
        id: hitlStep.id,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        title: hitlStep.title_p,
        status: "processing"
    });
    await updateProcessListStatus(PROCESS_ID, "In Progress", hitlStep.title_p);
    await delay(2000);
    updateProcessLog(PROCESS_ID, {
        id: hitlStep.id,
        title: hitlStep.title_p,
        status: "warning",
        reasoning: hitlStep.reasoning,
        artifacts: hitlStep.artifacts
    });
    await updateProcessListStatus(PROCESS_ID, "Needs Attention", "Human confirmation required - Writeoff $5.00 per SOP threshold");
    await waitForSignal("APPROVE_WRITEOFF");
    updateProcessLog(PROCESS_ID, {
        id: hitlStep.id,
        title: hitlStep.title_s,
        status: "success",
        reasoning: hitlStep.reasoning,
        artifacts: hitlStep.artifacts
    });
    await updateProcessListStatus(PROCESS_ID, "In Progress", "Writeoff confirmed - Processing refund");

    // Execute post-HITL steps
    for (let i = 0; i < postHitlSteps.length; i++) {
        const step = postHitlSteps[i];
        const isFinal = i === postHitlSteps.length - 1;
        updateProcessLog(PROCESS_ID, {
            id: step.id,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            title: step.title_p,
            status: "processing"
        });
        await updateProcessListStatus(PROCESS_ID, "In Progress", step.title_p);
        await delay(2000);
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
    console.log(`${PROCESS_ID} Complete: ${CASE_NAME}`);
})();
