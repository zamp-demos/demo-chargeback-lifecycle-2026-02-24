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
    } catch (e) { console.error('Status update failed:', e.message); }
};

const waitForEitherSignal = async (signalIds) => {
    console.log(`Waiting for one of signals: ${signalIds.join(', ')}...`);
    const signalFile = path.join(__dirname, '../interaction-signals.json');
    // Clear any stale signals first
    for (let i = 0; i < 15; i++) {
        try {
            if (fs.existsSync(signalFile)) {
                const content = fs.readFileSync(signalFile, 'utf8');
                if (!content) continue;
                const signals = JSON.parse(content);
                let changed = false;
                for (const sid of signalIds) {
                    if (signals[sid]) { delete signals[sid]; changed = true; }
                }
                if (changed) {
                    const tmp = signalFile + '.' + Math.random().toString(36).substring(7) + '.tmp';
                    fs.writeFileSync(tmp, JSON.stringify(signals, null, 4));
                    fs.renameSync(tmp, signalFile);
                }
                break;
            }
        } catch (e) { await delay(Math.floor(Math.random() * 200) + 100); }
    }
    // Poll until one of the signals fires
    while (true) {
        try {
            if (fs.existsSync(signalFile)) {
                const content = fs.readFileSync(signalFile, 'utf8');
                if (content) {
                    const signals = JSON.parse(content);
                    for (const sid of signalIds) {
                        if (signals[sid]) {
                            console.log(`Signal ${sid} received!`);
                            delete signals[sid];
                            const tmp = signalFile + '.' + Math.random().toString(36).substring(7) + '.tmp';
                            fs.writeFileSync(tmp, JSON.stringify(signals, null, 4));
                            fs.renameSync(tmp, signalFile);
                            return sid;
                        }
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

    const preHitlSteps = [
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
        }
    ];

    const hitlStep = {
        id: "step-6",
        title_p: "Awaiting human approver decision...",
        title_s_approve: "Human override received - Approver authorized chargeback filing",
        title_s_deny: "Human accepted AI recommendation - Chargeback not filed",
        hitl: true,
        reasoning: [
            "Agent Recommendation: DO NOT FILE (62% friendly fraud probability)",
            "Transaction Pattern: Single high-value purchase ($18,750) at luxury retailer",
            "Risk Factors: IP geolocation mismatch, first-time merchant, amount exceeds cardholder avg by 340%",
            "Conflicting Signal: Cardholder confirmed delivery address matches billing",
            "Requires human judgment to override AI recommendation"
        ],
        artifacts: [{
            id: "chargeback-decision", type: "decision", label: "Filing Decision",
            options: [
                { value: "approve", label: "Override AI \u2014 File chargeback ($18,750 for cardholder)", signal: "APPROVE_CHARGEBACK_FILING" },
                { value: "deny", label: "Accept AI recommendation \u2014 Do not file", signal: "DENY_CHARGEBACK_FILING" },
                { value: "escalate", label: "Escalate to senior fraud analyst for further review", signal: "APPROVE_CHARGEBACK_FILING" }
            ]
        }]
    };

    const approveSteps = [
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

    const denySteps = [
        {
            id: "step-7",
            title_p: "Closing case per AI recommendation - chargeback not filed...",
            title_s: "Case closed - AI recommendation accepted, chargeback not filed",
            reasoning: [
                "Human Decision: ACCEPT AI RECOMMENDATION - Do not file chargeback",
                "Basis: 62% friendly fraud probability exceeds filing threshold",
                "3D Secure authentication confirmed cardholder participation in transaction",
                "Device and IP analysis consistent with legitimate cardholder activity",
                "Case Status: CLOSED - No chargeback filed",
                "Audit Trail: Human concurrence with AI decision documented"
            ]
        },
        {
            id: "step-8",
            title_p: "Sending cardholder notification with denial reasoning...",
            title_s: "Cardholder notified - Dispute denial email sent with detailed reasoning",
            reasoning: [
                "Notification Type: Dispute Denial - Cardholder Email",
                "Recipient: James K. Thornton (james.thornton@email.com)",
                "Content: Detailed explanation of denial reasoning",
                "Key Points: 3D Secure authentication, device history consistency",
                "Appeal Window: 30 days to submit additional evidence",
                "Compliance: Fair lending disclosure included"
            ],
            artifacts: [{
                id: "denial-email", type: "email_draft", label: "Cardholder Denial Notification",
                data: {
                    isIncoming: false,
                    to: "james.thornton@email.com",
                    from: "disputes@abcbank.com",
                    cc: "compliance@abcbank.com",
                    subject: "Dispute Decision - Transaction $18,750.00 at Prestige Luxe Boutique",
                    body: "Dear Mr. Thornton,\n\nThank you for contacting ABC Bank regarding the transaction of $18,750.00 at Prestige Luxe Boutique on January 15, 2026.\n\nAfter a thorough investigation, we have determined that the evidence does not support filing a chargeback for this transaction. Our findings include:\n\n  1. 3D Secure Verification: The transaction was fully authenticated through Verified by Visa, confirming cardholder participation at the time of purchase.\n\n  2. Device Consistency: The device used for this transaction matches the device used for four prior undisputed transactions on your account over the past six months.\n\n  3. Location Match: The IP address and shipping address are consistent with your known location in Portland, OR.\n\nBased on these factors, the dispute has been closed without filing a chargeback.\n\nIf you have additional evidence or information that was not considered in this review, you may submit it within 30 days by replying to this email or contacting our dispute resolution team at 1-800-555-0199.\n\nWe take every dispute seriously and appreciate your understanding.\n\nSincerely,\nABC Bank Dispute Resolution Center"
                }
            }]
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
    await updateProcessListStatus(PROCESS_ID, "Needs Attention", "Human approval required - 62% friendly fraud probability");

    // Wait for either APPROVE or DENY signal
    const receivedSignal = await waitForEitherSignal(["APPROVE_CHARGEBACK_FILING", "DENY_CHARGEBACK_FILING"]);

    // Branch based on which signal was received
    const isDeny = receivedSignal === "DENY_CHARGEBACK_FILING";
    const postHitlSteps = isDeny ? denySteps : approveSteps;
    const hitlTitle = isDeny ? hitlStep.title_s_deny : hitlStep.title_s_approve;
    const statusMsg = isDeny ? "AI recommendation accepted - Closing case" : "Human override received - Proceeding with filing";

    // Update HITL step with final title
    updateProcessLog(PROCESS_ID, {
        id: hitlStep.id,
        title: hitlTitle,
        status: isDeny ? "success" : "success",
        reasoning: hitlStep.reasoning,
        artifacts: hitlStep.artifacts
    });
    await updateProcessListStatus(PROCESS_ID, "In Progress", statusMsg);

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
    console.log(`${PROCESS_ID} Complete: ${CASE_NAME} (Path: ${isDeny ? 'DENY' : 'APPROVE'})`);
})();
