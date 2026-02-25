const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const PUBLIC_DATA_DIR = path.join(PROJECT_ROOT, 'public/data');
const PROCESSES_FILE = path.join(PUBLIC_DATA_DIR, 'processes.json');
const PROCESS_ID = "CB_003";
const CASE_NAME = "Maria Rivera-Santos - Full Lifecycle (Filing + Representment)";

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
            cardholderName: "Maria Rivera-Santos",
            transactionAmount: "$4,890.00",
            merchantName: "GreenLeaf Home Goods",
            reasonCode: "13.3 - Not as Described",
            cardNetwork: "Visa",
            transactionDate: "Jan 15, 2026",
            caseReference: "CB-2026-0592",
            lifecycle: "Full (Filing + Representment)"
        }
    });

    const steps = [
        {
            id: "step-1",
            title_p: "Receiving new dispute - cardholder claims product not as described...",
            title_s: "Dispute received - Solid oak table ordered, particle board received",
            reasoning: [
                "Cardholder: Maria Rivera-Santos (Card ending 5512)",
                "Transaction: $4,890.00 at GreenLeaf Home Goods",
                "Claim: Ordered solid oak dining table, received particle board",
                "Evidence: Cardholder provided photos showing material discrepancy",
                "Reason Code: 13.3 - Not as Described/Defective Merchandise"
            ],
            artifacts: [{
                id: "intake-3", type: "json", label: "Dispute Intake Data",
                data: { cardholder: "Maria Rivera-Santos", cardLast4: "5512", amount: "$4,890.00", merchant: "GreenLeaf Home Goods", merchantMCC: "5712 - Home Furnishings", transactionId: "TXN-3392014", transactionDate: "2026-01-15", reasonCode: "13.3", claim: "Product not as described - ordered solid oak, received particle board" }
            }]
        },
        {
            id: "step-2",
            title_p: "Extracting transaction details from core banking system...",
            title_s: "Transaction verified - Authorization and payment confirmed",
            reasoning: [
                "Authorization Code: AUTH-552910 (approved)",
                "AVS Result: Y (Full match)",
                "CVV Result: M (Match)",
                "MCC: 5712 - Home Furnishings",
                "E-commerce transaction (card not present)",
                "Settlement: January 16, 2026"
            ]
        },
        {
            id: "step-3",
            title_p: "Running fraud screening - verifying legitimate consumer dispute...",
            title_s: "No fraud indicators - Legitimate consumer dispute confirmed",
            reasoning: [
                "Fraud Screening: CLEAR - No fraud indicators",
                "Dispute Type: Consumer dispute (product quality)",
                "Cardholder History: Good standing, no prior disputes",
                "This is a product quality/description issue, not fraud"
            ]
        },
        {
            id: "step-4",
            title_p: "Analyzing chargeback decision - reason code 13.3 eligibility...",
            title_s: "Reasoning complete - Filing recommended (strong evidence)",
            reasoning: [
                "Reason Code 13.3 Eligibility: CONFIRMED",
                "Timeline: Day 40 of 120 - WITHIN Visa window",
                "Cardholder Evidence: Photos showing particle board vs oak listing",
                "Product Description: Listed as 'solid wood construction'",
                "Material Received: Particle board (per cardholder photos)",
                "Evidence Strength: STRONG - Visual proof of material mismatch",
                "Recommendation: FILE CHARGEBACK"
            ],
            artifacts: [{
                id: "decision-3", type: "json", label: "Reasoning Decision Matrix",
                data: { reasonCodeEligibility: "PASSED - 13.3", timelineCompliance: "PASSED - Day 40/120", evidenceStrength: "STRONG", cardholderPhotos: "Material mismatch documented", productListing: "Solid wood construction", productReceived: "Particle board", recommendation: "FILE CHARGEBACK", confidence: "91%" }
            }]
        },
        {
            id: "step-5",
            title_p: "Filing chargeback on Visa Resolve Online (VROL)...",
            title_s: "Chargeback filed on VROL - Case CB-2026-0592",
            reasoning: [
                "Portal: Visa Resolve Online (VROL)",
                "Case Reference: CB-2026-0592",
                "Reason Code: 13.3 - Not as Described",
                "Amount: $4,890.00",
                "Evidence: Cardholder photos uploaded",
                "Status: ACCEPTED by Visa network"
            ],
            artifacts: [{
                id: "vrol-video-3", type: "video", label: "VROL Filing - Browser Agent Recording",
                videoPath: "/data/vrol_filing_cb003.webm"
            }]
        },
        {
            id: "step-6",
            title_p: "Issuing provisional credit and notifying merchant...",
            title_s: "Provisional credit $4,890 issued - Merchant has 30 days to respond",
            reasoning: [
                "Provisional Credit: $4,890.00 to account ending 5512",
                "Merchant Response Deadline: March 26, 2026",
                "--- PHASE 1 COMPLETE: CHARGEBACK FILED ---",
                "--- PHASE 2 BEGINS: REPRESENTMENT HANDLING ---"
            ]
        },
        {
            id: "step-7",
            title_p: "Receiving representment package from merchant...",
            title_s: "Representment received - 4 evidence documents from GreenLeaf Home Goods",
            reasoning: [
                "Merchant: GreenLeaf Home Goods",
                "Submitted By: Thomas Chen, Dispute Resolution Manager",
                "Evidence Files Received:",
                "  1. Rebuttal Letter (PDF)",
                "  2. Shipping Confirmation with Delivery Signature (PDF)",
                "  3. Product Listing Screenshots",
                "  4. Customer Email Correspondence Thread"
            ],
            artifacts: [{
                id: "representment-intake", type: "json", label: "Representment Package",
                data: { caseReference: "CB-2026-0592", merchantName: "GreenLeaf Home Goods", submittedBy: "Thomas Chen", submissionDate: "2026-02-20", evidenceCount: 4, documents: ["Rebuttal Letter", "Shipping Confirmation + Signature", "Product Listing", "Customer Emails"] }
            }]
        },
        {
            id: "step-8",
            title_p: "Extracting data from rebuttal letter and shipping confirmation...",
            title_s: "Documents parsed - Signature mismatch flagged",
            reasoning: [
                "REBUTTAL LETTER EXTRACTION:",
                "  - Claims product matches listing description",
                "  - References order GH-20260115-4421",
                "  - Cites delivery confirmation as proof",
                "  - MISSING: Does not address material/quality complaint",
                "SHIPPING CONFIRMATION EXTRACTION:",
                "  - Carrier: FedEx Freight, Tracking: 7748 2901 4455 8832",
                "  - Delivery Date: January 23, 2026 at 2:47 PM",
                "  - Signed By: 'M. Rivera'",
                "  - FLAG: Cardholder name is 'Maria Rivera-Santos' - PARTIAL MISMATCH"
            ],
            artifacts: [
                { id: "rebuttal-pdf", type: "file", label: "Merchant Rebuttal Letter", pdfPath: "/data/merchant_rebuttal_letter_CB003.pdf" },
                { id: "shipping-pdf", type: "file", label: "Shipping Confirmation", pdfPath: "/data/shipping_confirmation_CB003.pdf" }
            ]
        },
        {
            id: "step-9",
            title_p: "Cross-referencing signature and analyzing product evidence...",
            title_s: "Signature partial match (M. Rivera vs Maria Rivera-Santos) - Risk factor identified",
            reasoning: [
                "SIGNATURE ANALYSIS:",
                "  - Signed: 'M. Rivera'",
                "  - Cardholder: 'Maria Rivera-Santos'",
                "  - Assessment: PARTIAL MATCH - First initial + partial surname",
                "  - Risk: Could be cardholder OR another household member",
                "PRODUCT LISTING vs PHOTOS:",
                "  - Visual Match Score: 94% (appearance matches)",
                "  - BUT: Listing says 'solid wood construction'",
                "  - Cardholder photos show particle board core",
                "  - Visual similarity doesn't address MATERIAL quality"
            ]
        },
        {
            id: "step-10",
            title_p: "Parsing customer email correspondence...",
            title_s: "Quality complaint found - Cardholder complained within 3 days of delivery",
            reasoning: [
                "EMAIL THREAD EXTRACTION:",
                "  - Jan 26, 2026: Cardholder emails merchant about material quality",
                "  - Jan 27, 2026: Merchant responds - 'our products meet advertised specs'",
                "  - Jan 28, 2026: Cardholder requests refund citing material mismatch",
                "  - Jan 30, 2026: Merchant denies refund - 'item is as described'",
                "  - Feb 2, 2026: Cardholder files dispute with ABC Bank",
                "KEY FINDING: Complaint raised within 3 days of delivery",
                "KEY GAP: Merchant rebuttal letter does NOT address material complaint"
            ],
            artifacts: [{
                id: "extraction-results", type: "json", label: "Document Extraction Results",
                data: { rebuttalLetter: { addressesReasonCode: true, addressesMaterialComplaint: false, rating: "INCOMPLETE" }, shippingConfirmation: { deliveryConfirmed: true, signatureName: "M. Rivera", cardholderName: "Maria Rivera-Santos", signatureMatch: "PARTIAL", riskFactor: "MEDIUM" }, productMatch: { visualScore: "94%", materialAddressed: false }, customerEmails: { complaintDate: "2026-01-26", daysAfterDelivery: 3, merchantDeniedRefund: true, complaintTopic: "Material quality - particle board vs solid wood" } }
            }]
        },
        {
            id: "step-11",
            title_p: "Evaluating overall representment evidence strength...",
            title_s: "Evidence MODERATE-WEAK - Recommending UPHOLD CHARGEBACK (60% confidence)",
            reasoning: [
                "EVIDENCE EVALUATION MATRIX:",
                "  Rebuttal Letter: Addresses reason code BUT misses material complaint (INCOMPLETE)",
                "  Delivery Proof: Confirmed but signature partial mismatch (MEDIUM RISK)",
                "  Product Photos: 94% visual match but material discrepancy unaddressed (WEAK)",
                "  Customer Emails: Show complaint within 3 days, merchant denied refund (SUPPORTS CARDHOLDER)",
                "OVERALL EVIDENCE STRENGTH: MODERATE-WEAK",
                "KEY GAPS: Material complaint unaddressed + signature mismatch",
                "RECOMMENDATION: UPHOLD CHARGEBACK",
                "CONFIDENCE: 60% that merchant evidence is insufficient"
            ],
            artifacts: [{
                id: "evidence-matrix", type: "json", label: "Evidence Evaluation Matrix",
                data: { rebuttalLetter: { score: "6/10", issue: "Does not address material/quality complaint" }, deliveryProof: { score: "7/10", issue: "Signature partial mismatch (M. Rivera vs Maria Rivera-Santos)" }, productPhotos: { score: "5/10", issue: "Visual match but material discrepancy not addressed" }, customerEmails: { score: "3/10 for merchant", issue: "Complaint within 3 days, refund denied" }, overallStrength: "MODERATE-WEAK", recommendation: "UPHOLD CHARGEBACK", confidence: "60%" }
            }]
        },
        {
            id: "step-12",
            title_p: "Awaiting human analyst decision on representment...",
            title_s: "Human analyst confirms - Uphold chargeback (representment denied)",
            hitl: true,
            reasoning: [
                "Agent Recommendation: UPHOLD CHARGEBACK",
                "Key Factors: Unaddressed material complaint + signature mismatch",
                "Human Decision: ACCEPT - Uphold chargeback",
                "Representment Status: DENIED"
            ]
        },
        {
            id: "step-13",
            title_p: "Updating case status and notifying merchant acquirer...",
            title_s: "Representment denied - Chargeback upheld, merchant notified",
            reasoning: [
                "Decision: CHARGEBACK UPHELD",
                "Representment: DENIED - Evidence insufficient",
                "Merchant acquirer notified of decision",
                "Cardholder provisional credit becomes permanent",
                "Merchant may escalate to pre-arbitration within 30 days"
            ],
            artifacts: [{
                id: "decision-email", type: "email_draft", label: "Representment Decision Notification",
                data: { isIncoming: false, to: "disputes@firstnational.com", cc: "disputes@greenleafhomegoods.com", subject: "Representment Denied - Case CB-2026-0592 | Chargeback Upheld", body: "Dear First National Payment Solutions,\n\nRe: Case CB-2026-0592 | TXN-3392014 | $4,890.00\n\nAfter thorough review of the representment evidence submitted by GreenLeaf Home Goods, ABC Bank has determined that the evidence is insufficient to reverse the chargeback.\n\nKey Findings:\n1. Rebuttal letter does not address the cardholder's material quality complaint\n2. Delivery signature shows partial mismatch (M. Rivera vs Maria Rivera-Santos)\n3. Customer correspondence shows complaint filed within 3 days of delivery\n4. Merchant denied refund despite documented material discrepancy\n\nDecision: CHARGEBACK UPHELD\nThe provisional credit of $4,890.00 will become permanent.\n\nThe merchant may escalate to pre-arbitration within 30 days if additional evidence is available.\n\nABC Bank Dispute Resolution Center" }
            }]
        },
        {
            id: "step-14",
            title_p: "Finalizing full lifecycle case with audit trail...",
            title_s: "Case complete - Full lifecycle processed (Filing through Representment)",
            reasoning: [
                "CASE LIFECYCLE SUMMARY:",
                "  Phase 1 - Filing: Chargeback filed successfully on VROL",
                "  Phase 2 - Representment: Evidence reviewed and found insufficient",
                "  Decision: CHARGEBACK UPHELD",
                "  Cardholder Credit: $4,890.00 (now permanent)",
                "  Compliance: All Visa network rules followed",
                "  Audit Trail: Complete with AI analysis + human confirmation",
                "  Next Possible Action: Merchant pre-arbitration (30 days)"
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
            await updateProcessListStatus(PROCESS_ID, "Needs Attention", "Human review required - Representment evidence assessment");
            await waitForSignal("APPROVE_EVIDENCE_DECISION");
            await updateProcessListStatus(PROCESS_ID, "In Progress", "Human confirmed - Upholding chargeback");
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
