const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const PUBLIC_DATA_DIR = path.join(PROJECT_ROOT, 'public/data');
const PROCESSES_FILE = path.join(PUBLIC_DATA_DIR, 'processes.json');
const PROCESS_ID = "CB_001";
const CASE_NAME = "Sarah Mitchell - Merchandise Not Received";

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
    if (keyDetailsUpdate && Object.keys(keyDetailsUpdate).length > 0) {
        data.keyDetails = { ...data.keyDetails, ...keyDetailsUpdate };
    }
    writeJson(processFile, data);
};

const updateProcessListStatus = async (processId, status, currentStatus) => {
    const apiUrl = process.env.VITE_API_URL || 'http://localhost:3001';
    try {
        const response = await fetch(`${apiUrl}/api/update-status`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: processId, status, currentStatus })
        });
        if (!response.ok) throw new Error(`Server returned ${response.status}`);
    } catch (e) {
        try {
            const processes = JSON.parse(fs.readFileSync(PROCESSES_FILE, 'utf8'));
            const idx = processes.findIndex(p => p.id === String(processId));
            if (idx !== -1) { processes[idx].status = status; processes[idx].currentStatus = currentStatus; fs.writeFileSync(PROCESSES_FILE, JSON.stringify(processes, null, 4)); }
        } catch (err) { }
    }
};

(async () => {
    console.log(`Starting ${PROCESS_ID}: ${CASE_NAME}...`);
    writeJson(path.join(PUBLIC_DATA_DIR, `process_${PROCESS_ID}.json`), {
        logs: [], keyDetails: {
            cardholderName: "Sarah Mitchell",
            transactionAmount: "$2,340.00",
            merchantName: "ElectroMax Online Store",
            reasonCode: "13.1 - Not Received",
            cardNetwork: "Visa",
            transactionDate: "Dec 28, 2025",
            caseReference: "CB-2026-0847"
        }
    });

    const steps = [
        {
            id: "step-1",
            title_p: "Receiving new dispute notification...",
            title_s: "Dispute received - Cardholder claims merchandise not received",
            reasoning: [
                "Dispute Type: Merchandise/Services Not Received",
                "Cardholder: Sarah Mitchell (Card ending 7391)",
                "Transaction: $2,340.00 at ElectroMax Online Store",
                "Transaction Date: December 28, 2025",
                "Claim Filed: January 28, 2026 (31 days after transaction)"
            ],
            artifacts: [{
                id: "intake-1", type: "json", label: "Dispute Intake Data",
                data: { cardholder: "Sarah Mitchell", cardLast4: "7391", amount: "$2,340.00", merchant: "ElectroMax Online Store", merchantMCC: "5732 - Electronics", transactionId: "TXN-9847201", transactionDate: "2025-12-28", disputeDate: "2026-01-28", reasonCode: "13.1" }
            }]
        },
        {
            id: "step-2",
            title_p: "Extracting transaction details from core banking system...",
            title_s: "Transaction details extracted - Authorization confirmed",
            reasoning: [
                "Authorization Code: AUTH-884721 (approved)",
                "AVS Result: Y (Street + ZIP match)",
                "CVV Result: M (Match)",
                "MCC: 5732 - Electronics Stores",
                "Acquiring Bank: First National Payment Solutions",
                "Settlement Date: December 29, 2025"
            ],
            artifacts: [{
                id: "txn-details", type: "json", label: "Transaction Analysis",
                data: { transactionId: "TXN-9847201", authCode: "AUTH-884721", avsResult: "Y - Full Match", cvvResult: "M - Match", amount: "$2,340.00", merchantMCC: "5732", acquirer: "First National Payment Solutions", settlementDate: "2025-12-29", cardPresent: false, ecommerceIndicator: "07" }
            }]
        },
        {
            id: "step-3",
            title_p: "Running fraud screening checks...",
            title_s: "Fraud screening complete - No fraud indicators detected",
            reasoning: [
                "Device Fingerprint: Consistent with cardholder profile",
                "IP Geolocation: Portland, OR (matches billing address city)",
                "Velocity Check: Normal purchase frequency",
                "Transaction Pattern: Within typical spend range for cardholder",
                "Conclusion: Legitimate consumer dispute, not fraud"
            ]
        },
        {
            id: "step-4",
            title_p: "Checking retrieval request history...",
            title_s: "Retrieval request expired - Merchant failed to respond",
            reasoning: [
                "Retrieval Request Sent: February 1, 2026",
                "Merchant Response Deadline: February 21, 2026",
                "Merchant Response: NONE (no response received)",
                "Status: EXPIRED - Merchant failed to provide transaction documentation",
                "Delivery Confirmation: NOT ON FILE",
                "Tracking Number: NOT ON FILE"
            ]
        },
        {
            id: "step-5",
            title_p: "Analyzing chargeback decision - evaluating evidence and eligibility...",
            title_s: "Reasoning complete - Recommending chargeback filing",
            reasoning: [
                "Reason Code Eligibility: 13.1 ELIGIBLE (merchandise not received claim)",
                "Timeline Check: 58 days from transaction - WITHIN 120-day Visa window",
                "Evidence Strength: STRONG - No delivery proof, merchant non-responsive",
                "Retrieval Request: EXPIRED with no merchant response",
                "Cost-Benefit: $2,340 amount justifies filing",
                "Prior Resolution Attempt: Cardholder contacted merchant with no response",
                "Decision: FILE CHARGEBACK - All criteria met"
            ],
            artifacts: [{
                id: "decision-matrix", type: "json", label: "Reasoning Decision Matrix",
                data: { reasonCodeEligibility: "PASSED - 13.1 applicable", timelineCompliance: "PASSED - Day 58 of 120", evidenceStrength: "STRONG", merchantResponse: "NONE - Retrieval expired", deliveryProof: "NOT AVAILABLE", costBenefit: "FAVORABLE - $2,340 exceeds filing cost", priorResolution: "ATTEMPTED - No merchant response", recommendation: "FILE CHARGEBACK", confidence: "94%" }
            }]
        },
        {
            id: "step-6",
            title_p: "Preparing chargeback filing package...",
            title_s: "Filing package prepared with reason code 13.1 and supporting documentation",
            reasoning: [
                "Package Contents: Cardholder statement, transaction records, retrieval request history",
                "Reason Code: 13.1 - Merchandise/Services Not Received",
                "Supporting Evidence: Expired retrieval request, no delivery confirmation",
                "Filing Format: Visa VROL digital submission",
                "Compliance Check: All required fields populated"
            ]
        },
        {
            id: "step-7",
            title_p: "Filing chargeback on Visa Resolve Online (VROL)...",
            title_s: "Chargeback filed successfully on VROL - Case CB-2026-0847",
            reasoning: [
                "Portal: Visa Resolve Online (VROL)",
                "Action: New dispute created and submitted",
                "Case Reference: CB-2026-0847",
                "Reason Code: 13.1 - Merchandise/Services Not Received",
                "Evidence Package: Uploaded successfully",
                "Filing Status: ACCEPTED by Visa network"
            ],
            artifacts: [{
                id: "vrol-video", type: "video", label: "VROL Filing - Browser Agent Recording",
                videoPath: "/data/vrol_filing_cb001.webm"
            }]
        },
        {
            id: "step-8",
            title_p: "Issuing provisional credit to cardholder...",
            title_s: "Provisional credit of $2,340.00 issued to cardholder account",
            reasoning: [
                "Credit Amount: $2,340.00",
                "Credited To: Account ending 7391 (Sarah Mitchell)",
                "Credit Date: February 24, 2026",
                "Credit Type: Provisional (pending dispute resolution)",
                "Cardholder Notification: Sent via mobile banking alert"
            ]
        },
        {
            id: "step-9",
            title_p: "Generating merchant notification and response deadline...",
            title_s: "Merchant notified - 30-day response deadline set (March 26, 2026)",
            reasoning: [
                "Merchant: ElectroMax Online Store",
                "Acquirer: First National Payment Solutions",
                "Notification: Chargeback filed with reason code 13.1",
                "Response Deadline: March 26, 2026 (30 days)",
                "Required Response: Delivery proof, tracking, signed receipt"
            ],
            artifacts: [
                {
                    id: "filing-confirmation", type: "file", label: "Chargeback Filing Confirmation",
                    pdfPath: "/data/chargeback_filing_confirmation_CB001.pdf"
                },
                {
                    id: "merchant-email", type: "email_draft", label: "Merchant Notification Email",
                    data: { isIncoming: false, to: "disputes@firstnational.com", cc: "chargebacks@electromax.com", subject: "Chargeback Filed - Case CB-2026-0847 | TXN-9847201 | $2,340.00", body: "Dear First National Payment Solutions,\n\nThis notice confirms that ABC Bank has filed a chargeback under Case Reference CB-2026-0847.\n\nTransaction Details:\n- Transaction ID: TXN-9847201\n- Amount: $2,340.00\n- Date: December 28, 2025\n- Merchant: ElectroMax Online Store\n- Reason Code: Visa 13.1 - Merchandise/Services Not Received\n\nThe merchant has 30 days (until March 26, 2026) to respond with compelling evidence including delivery confirmation and tracking information.\n\nIf no response is received by the deadline, the chargeback will be finalized.\n\nABC Bank Dispute Resolution Center" }
                }
            ]
        },
        {
            id: "step-10",
            title_p: "Finalizing case and running compliance audit...",
            title_s: "Case closed - Chargeback filed successfully with full audit trail",
            reasoning: [
                "Compliance Check: All Visa network rules followed",
                "Timeline Compliance: PASSED",
                "Documentation: Complete",
                "Provisional Credit: Issued",
                "Merchant Notification: Sent",
                "Next Review: March 26, 2026 (merchant response deadline)",
                "Case Status: FILED - Awaiting merchant response"
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
