/**
 * OG Technologies - WhatsApp AI Customer Support Agent & Lead Extraction
 * Powered by Firebase Cloud Functions (v2), Firestore, Google Gemini 2.5 Flash,
 * and Meta WhatsApp Cloud API (Graph API v20.0).
 *
 * Company: OG Technologies (Optimal Growth Technologies SA)
 * Website: https://ogtechnologies.co.za
 */

const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const axios = require("axios");
const { GoogleGenAI, Type } = require("@google/genai");

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// Environment configuration
const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Initialize Google GenAI client (Gemini 2.5 Flash)
const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build-ogtechnologies-whatsapp",
    },
  },
});

/**
 * System prompt grounding for OG Technologies
 */
const OG_TECHNOLOGIES_SYSTEM_PROMPT = `
You are the official WhatsApp AI Customer Support & Sales Assistant for "OG Technologies" (Optimal Growth Technologies SA).
Company Website: https://ogtechnologies.co.za
Location: Johannesburg, Gauteng, South Africa (serving clients across South Africa and internationally).

ABOUT OG TECHNOLOGIES & SERVICES:
We are a premier South African technology solutions and digital innovation partner providing:
1. IT Support & Managed Services:
   - Remote & Onsite SLA IT support, network cabling, Wi-Fi infrastructure (Ubiquiti/MikroTik), server administration, workstation maintenance, cyber security, hardware procurement.
2. CCTV Installation & Security Systems:
   - High-definition IP & analog CCTV cameras, remote mobile phone live viewing (Hikvision, Dahua), night vision, biometric access control, NVR/DVR setup, maintenance, business & residential security.
3. Web Development:
   - Custom responsive websites, e-commerce platforms (WooCommerce, Shopify, custom), web applications (React, Next.js, Node.js), WordPress, speed optimization, technical SEO.
4. Mobile App Development:
   - iOS and Android apps, cross-platform (Flutter, React Native), enterprise business apps, API integrations, App Store / Play Store deployment.
5. UI/UX Design:
   - Wireframing, clickable Figma prototypes, brand identity design, mobile & desktop UI design systems.
6. Digital Marketing & Growth:
   - Google Search & Display Ads, Meta (Facebook/Instagram) advertising, Social Media Management, SEO optimization, high-converting landing pages.
7. Cloud, Email & Domain Hosting:
   - Fast SSD cPanel hosting, VPS, Google Workspace & Microsoft 365 business email setup, .co.za / .com domain registration, SSL certificates, cloud migration.

COMMUNICATION GUIDELINES:
- Tone: Professional, warm, proactive, efficient, and distinctly South African friendly (e.g., "Good day", "Howzit", "Welcome to OG Technologies").
- Currency: Use South African Rand (ZAR / R) when discussing estimates or budget ranges.
- Goal: Answer inquiries accurately, qualify potential clients, gather project specifications, and smoothly extract lead contact information (Name, Email, Service Needed, Location) for our engineering/sales team to prepare a tailored quote.
- Formatting: WhatsApp text formatting: use *bold* for emphasis, bullet points with • or -, keep paragraphs concise (2-4 lines) for mobile reading.
- Human Handoff: If the client asks to speak to a person, requests an urgent emergency onsite technician, or has a complex custom request, assure them politely that an OG Technologies specialist will follow up shortly, and prompt for their name and preferred email/call time.
`;

/**
 * Send a WhatsApp text message via Meta Graph API v20.0
 */
async function sendWhatsAppMessage(recipientPhone, textBody) {
  if (!META_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    console.error("[Meta Cloud API] Missing META_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID");
    return;
  }

  const url = `https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipientPhone,
    type: "text",
    text: {
      preview_url: false,
      body: textBody,
    },
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${META_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });
    console.log(`[Meta Cloud API] Message sent successfully to ${recipientPhone}. Message ID:`, response.data.messages?.[0]?.id);
    return response.data;
  } catch (error) {
    const metaError = error.response?.data || error.message;
    console.error(`[Meta Cloud API Error] Failed to send message to ${recipientPhone}:`, JSON.stringify(metaError));
    throw error;
  }
}

/**
 * Fetch last 10 messages from Firestore to provide multi-turn conversation memory
 */
async function getChatHistory(phoneNumber) {
  try {
    const messagesSnapshot = await db
      .collection("chats")
      .doc(phoneNumber)
      .collection("messages")
      .orderBy("timestamp", "asc")
      .limitToLast(10)
      .get();

    const history = [];
    messagesSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.role && data.content) {
        history.push({
          role: data.role === "assistant" ? "model" : "user",
          parts: [{ text: data.content }],
        });
      }
    });

    return history;
  } catch (err) {
    console.warn(`[Firestore] Could not retrieve chat history for ${phoneNumber}:`, err.message);
    return [];
  }
}

/**
 * Save message to Firestore chat session
 */
async function saveMessage(phoneNumber, role, content, metadata = {}) {
  const timestamp = admin.firestore.FieldValue.serverTimestamp();
  const chatRef = db.collection("chats").doc(phoneNumber);

  const batch = db.batch();

  // 1. Add message subcollection document
  const messageDocRef = chatRef.collection("messages").doc();
  batch.set(messageDocRef, {
    role,
    content,
    timestamp,
    ...metadata,
  });

  // 2. Upsert parent chat session document
  batch.set(
    chatRef,
    {
      phoneNumber,
      lastMessage: content,
      lastMessageRole: role,
      updatedAt: timestamp,
      ...(metadata.senderName ? { senderName: metadata.senderName } : {}),
      ...(metadata.humanHandoff !== undefined ? { humanHandoff: metadata.humanHandoff } : {}),
    },
    { merge: true }
  );

  await batch.commit();
}

/**
 * Extract lead details using Gemini structured JSON generation
 */
async function extractLeadIfPresent(phoneNumber, senderName, userMessage, fullConversationSnippet) {
  try {
    const extractionPrompt = `
Analyze the following WhatsApp message exchange with an OG Technologies customer.
Determine if the customer has requested a quote, demonstrated purchase intent for an IT/security/software service, or shared contact details.

Customer Phone: ${phoneNumber}
Contact Name: ${senderName || "Unknown"}
Latest Message: "${userMessage}"

Recent Conversation Context:
${fullConversationSnippet}

If the user is a prospective lead, extract the structured details. If they are merely saying hello, asking a casual greeting without business intent, or already completed, return isLead: false.
`;

    const leadResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: extractionPrompt,
      config: {
        systemInstruction: "You are an automated CRM lead classifier and extractor for OG Technologies. Extract accurate lead info.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isLead: { type: Type.BOOLEAN, description: "True if user expressed interest in a quote, project, service, or booking" },
            leadName: { type: Type.STRING, description: "The full name of the lead or contact person" },
            serviceNeeded: {
              type: Type.STRING,
              description: "Service required (e.g., 'CCTV Installation', 'Web Development', 'IT Support SLA', 'Mobile App', 'Hosting', 'Digital Marketing')",
            },
            email: { type: Type.STRING, description: "Email address if provided, otherwise empty" },
            location: { type: Type.STRING, description: "City/suburb (e.g., Sandton, Pretoria, Cape Town) if mentioned" },
            urgency: { type: Type.STRING, description: "High, Medium, or Low" },
            summary: { type: Type.STRING, description: "1-sentence executive summary of what the client is asking for" },
            humanHandoffNeeded: { type: Type.BOOLEAN, description: "True if user wants a human call, urgent emergency support, or complex quote" },
          },
          required: ["isLead"],
        },
      },
    });

    const parsed = JSON.parse(leadResponse.text || "{}");

    if (parsed.isLead) {
      const leadData = {
        name: parsed.leadName || senderName || "WhatsApp Inquirer",
        phone: phoneNumber,
        email: parsed.email || "",
        service: parsed.serviceNeeded || "General IT Inquiry",
        location: parsed.location || "South Africa",
        urgency: parsed.urgency || "Medium",
        summary: parsed.summary || userMessage,
        humanHandoff: parsed.humanHandoffNeeded || false,
        status: "NEW", // NEW | CONTACTED | QUALIFIED | CLOSED
        source: "WhatsApp Cloud API",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Save or update lead in 'leads' collection
      const leadDocRef = db.collection("leads").doc(phoneNumber);
      await leadDocRef.set(leadData, { merge: true });
      console.log(`[Lead Extracted] Saved lead for ${phoneNumber}:`, leadData.service);

      // If handoff is flagged, update chat session
      if (parsed.humanHandoffNeeded) {
        await db.collection("chats").doc(phoneNumber).update({
          humanHandoff: true,
          humanHandoffReason: parsed.summary,
        });
      }

      return leadData;
    }
  } catch (error) {
    console.error("[Lead Extraction Error]:", error.message);
  }
  return null;
}

/**
 * Process inbound WhatsApp message asynchronously
 */
async function processIncomingMessage(senderPhone, senderName, incomingText, messageId) {
  try {
    // 1. Deduplication check: verify if messageId was already processed
    const messageCheckRef = db.collection("processed_messages").doc(messageId);
    const existingCheck = await messageCheckRef.get();
    if (existingCheck.exists) {
      console.log(`[Deduplication] Message ${messageId} already processed. Skipping.`);
      return;
    }
    await messageCheckRef.set({
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      phone: senderPhone,
    });

    // 2. Save incoming user message in Firestore
    await saveMessage(senderPhone, "user", incomingText, {
      senderName,
      messageId,
    });

    // 3. Fetch conversation history for session memory (RAG & Multi-turn)
    const history = await getChatHistory(senderPhone);

    // Build the request contents array with memory
    // Remove the last message from history if it duplicates the current incomingText
    const contents = [];
    for (const h of history) {
      contents.push(h);
    }
    // Append the new message
    contents.push({
      role: "user",
      parts: [
        {
          text: `Customer Name: ${senderName || "Valued Client"}\nCustomer Phone: ${senderPhone}\nMessage: ${incomingText}`,
        },
      ],
    });

    // 4. Generate response with Google Gemini 2.5 Flash
    console.log(`[Gemini AI] Generating response for ${senderPhone}...`);
    const aiResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
      config: {
        systemInstruction: OG_TECHNOLOGIES_SYSTEM_PROMPT,
        temperature: 0.7,
        topP: 0.9,
      },
    });

    const replyText =
      aiResponse.text ||
      "Thank you for contacting OG Technologies! A representative will assist you shortly. You can also visit https://ogtechnologies.co.za.";

    // 5. Save assistant reply to Firestore
    await saveMessage(senderPhone, "assistant", replyText);

    // 6. Send reply via Meta WhatsApp Cloud API
    await sendWhatsAppMessage(senderPhone, replyText);

    // 7. Background lead qualification & extraction
    const conversationSnippet = history
      .map((item) => `${item.role}: ${item.parts[0]?.text || ""}`)
      .concat([`user: ${incomingText}`, `assistant: ${replyText}`])
      .join("\n");

    await extractLeadIfPresent(senderPhone, senderName, incomingText, conversationSnippet);
  } catch (err) {
    console.error(`[Process Message Failed] For ${senderPhone}:`, err);
    // Send polite fallback
    try {
      await sendWhatsAppMessage(
        senderPhone,
        "Thank you for reaching out to OG Technologies. Our team is reviewing your message and will respond right away! You can also reach our team directly at https://ogtechnologies.co.za."
      );
    } catch (sendFallbackError) {
      console.error("[Fallback Send Failed]:", sendFallbackError.message);
    }
  }
}

/**
 * Main Webhook HTTP Endpoint for Firebase Cloud Functions v2
 * Exposes GET /webhook (verification) and POST /webhook (inbound messages)
 */
exports.webhook = onRequest(
  {
    cors: true,
    region: "us-central1", // Or 'europe-west1' depending on preferred Firebase region
    timeoutSeconds: 60,
    memory: "512MiB",
  },
  async (req, res) => {
    // -------------------------------------------------------------
    // GET: Meta Webhook Setup Verification
    // -------------------------------------------------------------
    if (req.method === "GET") {
      const mode = req.query["hub.mode"];
      const token = req.query["hub.verify_token"];
      const challenge = req.query["hub.challenge"];

      console.log(`[Webhook Verification] Mode: ${mode}, Token matched: ${token === META_VERIFY_TOKEN}`);

      if (mode === "subscribe" && token === META_VERIFY_TOKEN) {
        console.log("[Webhook Verification] Verified successfully with Meta challenge!");
        return res.status(200).send(challenge);
      } else {
        console.warn("[Webhook Verification Failed] Invalid verify token or mode.");
        return res.status(403).send("Forbidden: Verify token mismatch");
      }
    }

    // -------------------------------------------------------------
    // POST: Meta WhatsApp Inbound Message Handler
    // -------------------------------------------------------------
    if (req.method === "POST") {
      const body = req.body;

      // Log receipt
      console.log("[Webhook Inbound] Received Meta payload event:", JSON.stringify(body));

      // Meta requires immediate HTTP 200 response to acknowledge receipt.
      // We respond immediately to avoid duplicate webhook retries.
      res.status(200).send("EVENT_RECEIVED");

      // Verify that this is a WhatsApp Business Account webhook payload
      if (body && body.object === "whatsapp_business_account") {
        try {
          const entries = body.entry || [];
          for (const entry of entries) {
            const changes = entry.changes || [];
            for (const change of changes) {
              const value = change.value;
              if (!value) continue;

              // Extract messages array
              const messages = value.messages;
              if (messages && messages.length > 0) {
                const messageObj = messages[0];
                const senderPhone = messageObj.from;
                const messageId = messageObj.id;

                // Extract contact profile name if provided
                const contacts = value.contacts || [];
                const senderName = contacts[0]?.profile?.name || "";

                // Handle text messages and quick-reply button clicks
                let incomingText = "";
                if (messageObj.type === "text" && messageObj.text?.body) {
                  incomingText = messageObj.text.body;
                } else if (messageObj.type === "interactive") {
                  if (messageObj.interactive?.button_reply?.title) {
                    incomingText = messageObj.interactive.button_reply.title;
                  } else if (messageObj.interactive?.list_reply?.title) {
                    incomingText = messageObj.interactive.list_reply.title;
                  }
                } else if (messageObj.type === "button" && messageObj.button?.text) {
                  incomingText = messageObj.button.text;
                } else {
                  console.log(`[Webhook Inbound] Unsupported message type: ${messageObj.type}. Sending guidance.`);
                  incomingText = "I sent a media/unsupported attachment.";
                }

                if (incomingText && senderPhone) {
                  console.log(`[Webhook Inbound] Processing message from ${senderPhone} (${senderName}): "${incomingText}"`);
                  // Asynchronously process conversation, memory, and reply
                  await processIncomingMessage(senderPhone, senderName, incomingText, messageId);
                }
              }

              // Status callbacks (sent, delivered, read)
              if (value.statuses && value.statuses.length > 0) {
                const status = value.statuses[0];
                console.log(`[Message Status Callback] Message ${status.id} -> ${status.status} for ${status.recipient_id}`);
              }
            }
          }
        } catch (handlerErr) {
          console.error("[Webhook Processing Error]:", handlerErr);
        }
      }

      return;
    }

    // Default for other HTTP methods
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).send("Method Not Allowed");
  }
);
