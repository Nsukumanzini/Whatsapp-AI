import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory data store for live preview & simulation
interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  service: string;
  location: string;
  urgency: 'Low' | 'Medium' | 'High';
  summary: string;
  humanHandoff: boolean;
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CLOSED';
  createdAt: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  senderName?: string;
  isHumanTakeover?: boolean;
}

interface ChatSession {
  phone: string;
  name: string;
  lastMessage: string;
  updatedAt: string;
  humanHandoff: boolean;
  messages: ChatMessage[];
}

// Initial state with South African realistic business scenarios
const leadsStore: Lead[] = [
  {
    id: '+27821234567',
    name: 'Sipho Dlamini',
    phone: '+27821234567',
    email: 'sipho@dlamini-logistics.co.za',
    service: 'CCTV Installation',
    location: 'Sandton, Johannesburg',
    urgency: 'High',
    summary: 'Needs 8-camera Hikvision IP system with remote phone viewing for warehouse',
    humanHandoff: false,
    status: 'NEW',
    createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
  },
  {
    id: '+27719876543',
    name: 'Annatjie van der Merwe',
    phone: '+27719876543',
    email: 'annatjie@pretoriaboutique.co.za',
    service: 'Web Development',
    location: 'Pretoria East',
    urgency: 'Medium',
    summary: 'Looking to build an online e-commerce boutique store with PayFast payment integration',
    humanHandoff: false,
    status: 'QUALIFIED',
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
  {
    id: '+27834567890',
    name: 'Dr. Thabo Khumalo',
    phone: '+27834567890',
    email: 'info@khumalomedical.co.za',
    service: 'IT Support',
    location: 'Rosebank, JHB',
    urgency: 'High',
    summary: 'Urgent SLA needed: 15 workstations network offline, Wi-Fi router dropouts',
    humanHandoff: true,
    status: 'NEW',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  }
];

const chatsStore: Record<string, ChatSession> = {
  '+27821234567': {
    phone: '+27821234567',
    name: 'Sipho Dlamini',
    lastMessage: 'Excellent, thank you Mr. Dlamini! I have logged your request (*8-Camera CCTV Warehouse Quote - Sandton*).',
    updatedAt: new Date(Date.now() - 1000 * 60 * 20).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    humanHandoff: false,
    messages: [
      { id: '1', role: 'user', content: 'Good day, do you guys install CCTV cameras for businesses in Sandton?', timestamp: '10:15 AM' },
      { id: '2', role: 'assistant', content: 'Hello Sipho! Thank you for reaching out to *OG Technologies*. Yes, absolutely! We specialize in high-definition IP CCTV installations across Sandton and Greater Johannesburg, complete with crystal-clear night vision and smartphone remote live viewing.', timestamp: '10:15 AM' },
      { id: '3', role: 'user', content: 'Great! How many cameras do you recommend for a 400sqm warehouse, and what\'s the turnaround time?', timestamp: '10:18 AM' },
      { id: '4', role: 'assistant', content: 'For a 400sqm warehouse, an 8-camera NVR setup (covering entry gates, dispatch bays, and main floor) is standard. We typically complete site assessment and installation within 48 to 72 hours. What is your email address so our technical director can send through an official specification and quote?', timestamp: '10:19 AM' },
      { id: '5', role: 'user', content: 'My name is Sipho Dlamini, email is sipho@dlamini-logistics.co.za.', timestamp: '10:21 AM' },
      { id: '6', role: 'assistant', content: 'Excellent, thank you Mr. Dlamini! I have logged your request (*8-Camera CCTV Warehouse Quote - Sandton*) for our engineering team. We will email the itemized proposal shortly. Can we also assist with biometric access control or network cabling while on site?', timestamp: '10:22 AM' }
    ]
  },
  '+27834567890': {
    phone: '+27834567890',
    name: 'Dr. Thabo Khumalo',
    lastMessage: 'Understood! An OG Technologies senior network technician has been alerted with top priority and will phone you directly within the next 10 minutes.',
    updatedAt: new Date(Date.now() - 1000 * 60 * 45).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    humanHandoff: true,
    messages: [
      { id: '1', role: 'user', content: 'Emergency! Our medical practice network has been dropping all morning and we can\'t access patient files.', timestamp: '11:30 AM' },
      { id: '2', role: 'assistant', content: 'Good day Dr. Khumalo! We understand the critical urgency for your medical practice. I am immediately flagging this for an emergency priority technician handoff. Can you confirm if your main fibre router lights are blinking red or green?', timestamp: '11:30 AM' },
      { id: '3', role: 'user', content: 'The router is green but the internal switches are clicking. Please have someone call me ASAP at this number.', timestamp: '11:32 AM' },
      { id: '4', role: 'assistant', content: 'Understood! An OG Technologies senior network technician has been alerted with top priority and will phone you directly within the next 10 minutes.', timestamp: '11:33 AM' }
    ]
  }
};

// Initialize Gemini SDK with User-Agent header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const OG_TECHNOLOGIES_PROMPT = `
You are the official WhatsApp AI Customer Support & Sales Assistant for "OG Technologies" (Optimal Growth Technologies SA).
Company Website: https://ogtechnologies.co.za
Location: Johannesburg, Gauteng, South Africa (serving clients across South Africa and internationally).

ABOUT OG TECHNOLOGIES & SERVICES:
1. IT Support & Managed Services: SLA IT support, network cabling, Wi-Fi infrastructure (Ubiquiti/MikroTik), server administration, workstation maintenance, cyber security, hardware procurement.
2. CCTV Installation & Security Systems: High-definition IP & analog CCTV cameras, remote mobile phone live viewing (Hikvision, Dahua), night vision, biometric access control, NVR/DVR setup, business & residential security.
3. Web Development: Custom responsive websites, e-commerce platforms (WooCommerce, Shopify, custom), web applications (React, Next.js, Node.js), WordPress, speed optimization, technical SEO.
4. Mobile App Development: iOS and Android apps, cross-platform (Flutter, React Native), enterprise business apps, API integrations.
5. UI/UX Design: Wireframing, clickable Figma prototypes, brand identity design, design systems.
6. Digital Marketing: Google Search & Display Ads, Meta (Facebook/Instagram) advertising, SEO optimization, high-converting landing pages.
7. Cloud, Email & Domain Hosting: Fast SSD cPanel hosting, VPS, Google Workspace & Microsoft 365 business email setup, .co.za / .com domain registration, SSL certificates.

COMMUNICATION GUIDELINES:
- Tone: Professional, warm, proactive, helpful, and distinctly South African friendly (e.g., "Good day", "Howzit", "Welcome to OG Technologies").
- Currency: Use South African Rand (ZAR / R) for estimates.
- Formatting: WhatsApp text style: use *bold* for emphasis, bullet points with • or -, short mobile paragraphs (2-4 lines).
- Qualification Goal: Smoothly gather what service they need, location/scale, and their name/email so our team can provide an official quote.
- Human Handoff: If they request a human phone call or urgent emergency technician, assure them an OG Technologies specialist has been alerted and will reach out.
`;

// Helper: Lead extraction with Gemini 2.5 Flash
async function extractLeadFromConversation(phone: string, senderName: string, userMessage: string, historySummary: string) {
  try {
    const prompt = `
Analyze the customer's WhatsApp message and history for OG Technologies (ogtechnologies.co.za).
Determine if they are inquiring about a service, requesting a quote, or sharing contact details.

Customer Phone: ${phone}
Contact Name: ${senderName || 'Unknown'}
Latest Message: "${userMessage}"
Context: ${historySummary}
`;

    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: 'Extract structured CRM lead qualification data for OG Technologies in JSON format.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isLead: { type: Type.BOOLEAN, description: 'True if customer has requested service, quote, pricing, or technician' },
            leadName: { type: Type.STRING, description: 'Name of the contact' },
            serviceNeeded: { type: Type.STRING, description: 'Service category (e.g. CCTV Installation, IT Support, Web Development, Mobile App, Hosting, Digital Marketing)' },
            email: { type: Type.STRING, description: 'Email address if mentioned' },
            location: { type: Type.STRING, description: 'City/suburb in South Africa (e.g. Sandton, Pretoria, Cape Town)' },
            urgency: { type: Type.STRING, description: 'High, Medium, or Low' },
            summary: { type: Type.STRING, description: 'Brief 1-sentence summary of the request' },
            humanHandoffNeeded: { type: Type.BOOLEAN, description: 'True if user requested a human or emergency support' },
          },
          required: ['isLead'],
        },
      },
    });

    const parsed = JSON.parse(res.text || '{}');
    if (parsed.isLead) {
      const existingIndex = leadsStore.findIndex(l => l.phone === phone);
      const leadItem: Lead = {
        id: phone,
        name: parsed.leadName || senderName || 'WhatsApp Inquirer',
        phone,
        email: parsed.email || (existingIndex >= 0 ? leadsStore[existingIndex].email : ''),
        service: parsed.serviceNeeded || 'General IT Inquiry',
        location: parsed.location || 'Johannesburg, SA',
        urgency: (parsed.urgency as 'Low' | 'Medium' | 'High') || 'Medium',
        summary: parsed.summary || userMessage,
        humanHandoff: parsed.humanHandoffNeeded || false,
        status: existingIndex >= 0 ? leadsStore[existingIndex].status : 'NEW',
        createdAt: new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        leadsStore[existingIndex] = { ...leadsStore[existingIndex], ...leadItem };
      } else {
        leadsStore.unshift(leadItem);
      }
      return leadItem;
    }
  } catch (err) {
    console.error('Lead extraction error:', err);
  }
  return null;
}

// ----------------------------------------------------------------------
// 1. Meta Webhook Verification (GET /webhook)
// ----------------------------------------------------------------------
app.get('/webhook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = process.env.META_VERIFY_TOKEN || 'og_tech_whatsapp_verify_secret_2025';

  if (mode === 'subscribe' && token === expectedToken) {
    console.log('[Meta Webhook Verified] Successfully replied with challenge:', challenge);
    return res.status(200).send(challenge);
  } else {
    console.warn('[Meta Webhook Failed] Token mismatch or invalid mode.');
    return res.status(403).send('Verification token mismatch');
  }
});

// ----------------------------------------------------------------------
// 2. Meta WhatsApp Inbound Message Handler (POST /webhook)
// ----------------------------------------------------------------------
app.post('/webhook', async (req: Request, res: Response) => {
  const body = req.body;
  // Meta requires immediate 200 OK
  res.status(200).send('EVENT_RECEIVED');

  if (body && body.object === 'whatsapp_business_account') {
    const entries = body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const val = change.value;
        if (!val || !val.messages || val.messages.length === 0) continue;

        const messageObj = val.messages[0];
        const senderPhone = messageObj.from;
        const senderName = val.contacts?.[0]?.profile?.name || 'WhatsApp Client';
        const messageText = messageObj.text?.body || messageObj.button?.text || 'Hello';

        console.log(`[Inbound WhatsApp Webhook] ${senderPhone} (${senderName}): ${messageText}`);

        // Process with agent
        await handleChatMessage(senderPhone, senderName, messageText);
      }
    }
  }
});

// Internal helper for chat processing
async function handleChatMessage(phone: string, senderName: string, text: string) {
  if (!chatsStore[phone]) {
    chatsStore[phone] = {
      phone,
      name: senderName || 'Valued Client',
      lastMessage: text,
      updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      humanHandoff: false,
      messages: [],
    };
  }

  const session = chatsStore[phone];
  const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Add user message
  session.messages.push({
    id: Math.random().toString(36).substring(7),
    role: 'user',
    content: text,
    timestamp: nowTime,
    senderName,
  });

  // Prepare Gemini contents with last 10 messages for multi-turn memory
  const recentMessages = session.messages.slice(-10);
  const contents = recentMessages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  let replyText = '';
  try {
    const aiResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        systemInstruction: OG_TECHNOLOGIES_PROMPT,
        temperature: 0.7,
      },
    });
    replyText = aiResponse.text || 'Thank you for reaching out to OG Technologies. An engineer will assist you shortly!';
  } catch (err: any) {
    console.error('Gemini generation error:', err);
    replyText = 'Hello! Thank you for contacting OG Technologies (ogtechnologies.co.za). We have received your inquiry and our team will respond right away.';
  }

  // Add assistant reply
  session.messages.push({
    id: Math.random().toString(36).substring(7),
    role: 'assistant',
    content: replyText,
    timestamp: nowTime,
  });
  session.lastMessage = replyText;
  session.updatedAt = nowTime;

  // Extract lead in background
  const historyText = recentMessages.map(m => `${m.role}: ${m.content}`).join('\n');
  const extracted = await extractLeadFromConversation(phone, senderName, text, historyText);
  if (extracted?.humanHandoff) {
    session.humanHandoff = true;
  }

  return { replyText, extracted, session };
}

// ----------------------------------------------------------------------
// 3. API Routes for Interactive Portal
// ----------------------------------------------------------------------

// Interactive Chat endpoint for frontend WhatsApp simulator
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { phone = '+27829990001', name = 'Test User', message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const result = await handleChatMessage(phone, name, message);
    return res.json({
      success: true,
      reply: result.replyText,
      extractedLead: result.extracted,
      session: result.session,
    });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal error' });
  }
});

// Leads List & Status Update
app.get('/api/leads', (_req: Request, res: Response) => {
  return res.json({ leads: leadsStore });
});

app.patch('/api/leads/:phone', (req: Request, res: Response) => {
  const { phone } = req.params;
  const { status, humanHandoff } = req.body;
  const lead = leadsStore.find(l => l.phone === phone);
  if (lead) {
    if (status) lead.status = status;
    if (humanHandoff !== undefined) lead.humanHandoff = humanHandoff;
    return res.json({ success: true, lead });
  }
  return res.status(404).json({ error: 'Lead not found' });
});

// Chats List & Messages
app.get('/api/chats', (_req: Request, res: Response) => {
  return res.json({ chats: chatsStore });
});

app.post('/api/chats/:phone/reply', (req: Request, res: Response) => {
  const { phone } = req.params;
  const { text } = req.body;
  if (!chatsStore[phone]) {
    return res.status(404).json({ error: 'Chat not found' });
  }
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const newMsg: ChatMessage = {
    id: Math.random().toString(36).substring(7),
    role: 'assistant',
    content: `[Human Agent]: ${text}`,
    timestamp: now,
    isHumanTakeover: true,
  };
  chatsStore[phone].messages.push(newMsg);
  chatsStore[phone].lastMessage = newMsg.content;
  chatsStore[phone].updatedAt = now;
  chatsStore[phone].humanHandoff = false;

  return res.json({ success: true, message: newMsg, session: chatsStore[phone] });
});

// Meta Webhook Inbound Simulator (for testing webhook payloads)
app.post('/api/simulate-webhook', async (req: Request, res: Response) => {
  const { phone = '+27845551234', name = 'Lerato Molefe', message = 'Hi, I need CCTV quotes for our office in Rosebank' } = req.body;
  
  // Construct real Meta Graph API v20.0 webhook payload
  const metaPayload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '109876543210987',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '27101234567',
                phone_number_id: '109876543210987',
              },
              contacts: [
                {
                  profile: { name },
                  wa_id: phone.replace('+', ''),
                },
              ],
              messages: [
                {
                  from: phone,
                  id: `wamid.HBgL${Math.random().toString(36).substring(2, 10).toUpperCase()}==`,
                  timestamp: Math.floor(Date.now() / 1000).toString(),
                  text: { body: message },
                  type: 'text',
                },
              ],
            },
            field: 'messages',
          },
        ],
      },
    ],
  };

  const result = await handleChatMessage(phone, name, message);
  return res.json({
    success: true,
    metaPayload,
    replyGenerated: result.replyText,
    leadExtracted: result.extracted,
  });
});

// Status check
app.get('/api/status', (_req: Request, res: Response) => {
  res.json({
    status: 'ONLINE',
    company: 'OG Technologies (Optimal Growth Technologies SA)',
    website: 'https://ogtechnologies.co.za',
    runtime: 'Node.js 20 on Cloud Functions / Express',
    aiModel: 'Google Gemini 2.5 Flash (@google/genai)',
    metaApiVersion: 'v20.0',
    metaConfigured: Boolean(process.env.META_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
    activeLeadsCount: leadsStore.length,
    activeChatsCount: Object.keys(chatsStore).length,
  });
});

// Mount Vite in dev mode or static files in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[OG Technologies WhatsApp AI Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
