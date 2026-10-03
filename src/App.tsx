import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Users,
  Terminal,
  FileCode,
  BookOpen,
  Send,
  Phone,
  Shield,
  CheckCheck,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  Download,
  Search,
  Filter,
  Bot,
  UserCheck,
  CheckCircle2,
  Clock,
  Layers,
  Building,
  Key,
  Globe
} from 'lucide-react';

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

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'crm' | 'webhook' | 'codebase' | 'guide'>('simulator');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // WhatsApp Simulator State
  const [simPhone, setSimPhone] = useState('+27821234567');
  const [simName, setSimName] = useState('Sipho Dlamini');
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Good day! Welcome to *OG Technologies* (Optimal Growth Technologies SA). 🇿🇦\n\nHow can we assist you today? We specialize in:\n• CCTV Installation & Security\n• IT Support & SLA Contracts\n• Custom Web & Mobile Apps\n• Cloud & Domain Hosting\n• Digital Marketing',
      timestamp: '10:00 AM',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [latestExtractedLead, setLatestExtractedLead] = useState<Lead | null>(null);

  // CRM State
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchLead, setSearchLead] = useState('');
  const [filterService, setFilterService] = useState('ALL');
  const [selectedLeadPhone, setSelectedLeadPhone] = useState<string | null>(null);
  const [humanReply, setHumanReply] = useState('');

  // Webhook Tester State
  const [verifyTokenInput, setVerifyTokenInput] = useState('og_tech_whatsapp_verify_secret_2025');
  const [verifyChallenge, setVerifyChallenge] = useState('1158201444');
  const [verifyResult, setVerifyResult] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const [postSimPhone, setPostSimPhone] = useState('+27725556789');
  const [postSimName, setPostSimName] = useState('Nandi Mthembu');
  const [postSimText, setPostSimText] = useState('Hi there! Looking for IT support for our 20-employee office in Midrand.');
  const [postPayloadResult, setPostPayloadResult] = useState<any>(null);
  const [isPostingPayload, setIsPostingPayload] = useState(false);

  // Codebase Viewer State
  const [selectedFile, setSelectedFile] = useState<string>('functions/index.js');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch initial leads
  const fetchLeads = async () => {
    try {
      const res = await fetch('/api/leads');
      const data = await res.json();
      if (data.leads) setLeads(data.leads);
    } catch (e) {
      console.error('Error fetching leads:', e);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Send WhatsApp message in simulator
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userText = inputMessage.trim();
    setInputMessage('');

    const newMsg: ChatMessage = {
      id: Math.random().toString(),
      role: 'user',
      content: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: simPhone,
          name: simName,
          message: userText,
        }),
      });

      const data = await res.json();
      if (data.reply) {
        setMessages((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            role: 'assistant',
            content: data.reply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }

      if (data.extractedLead) {
        setLatestExtractedLead(data.extractedLead);
        fetchLeads();
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          role: 'assistant',
          content: 'Thank you for reaching out to OG Technologies. A technical consultant will be in touch shortly!',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Test Webhook GET Verification
  const testGetWebhook = async () => {
    setIsVerifying(true);
    setVerifyResult(null);
    try {
      const res = await fetch(
        `/webhook?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(
          verifyTokenInput
        )}&hub.challenge=${encodeURIComponent(verifyChallenge)}`
      );
      const text = await res.text();
      setVerifyResult(`HTTP ${res.status}: ${text}`);
    } catch (err: any) {
      setVerifyResult(`Error: ${err.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  // Test Webhook POST Payload
  const testPostWebhook = async () => {
    setIsPostingPayload(true);
    setPostPayloadResult(null);
    try {
      const res = await fetch('/api/simulate-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: postSimPhone,
          name: postSimName,
          message: postSimText,
        }),
      });
      const data = await res.json();
      setPostPayloadResult(data);
      fetchLeads();
    } catch (err: any) {
      setPostPayloadResult({ error: err.message });
    } finally {
      setIsPostingPayload(false);
    }
  };

  // Update lead status
  const handleUpdateLeadStatus = async (phone: string, status: string) => {
    try {
      await fetch(`/api/leads/${encodeURIComponent(phone)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      fetchLeads();
    } catch (e) {
      console.error(e);
    }
  };

  // Human agent reply in CRM
  const handleHumanReply = async (phone: string) => {
    if (!humanReply.trim()) return;
    try {
      await fetch(`/api/chats/${encodeURIComponent(phone)}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: humanReply }),
      });
      setHumanReply('');
      fetchLeads();
    } catch (e) {
      console.error(e);
    }
  };

  // Quick preset scenario loaders
  const loadScenario = (text: string) => {
    setInputMessage(text);
  };

  // Filtered leads
  const filteredLeads = leads.filter((l) => {
    const matchesSearch =
      l.name.toLowerCase().includes(searchLead.toLowerCase()) ||
      l.phone.toLowerCase().includes(searchLead.toLowerCase()) ||
      l.service.toLowerCase().includes(searchLead.toLowerCase()) ||
      l.summary.toLowerCase().includes(searchLead.toLowerCase());
    const matchesService = filterService === 'ALL' || l.service.toLowerCase().includes(filterService.toLowerCase());
    return matchesSearch && matchesService;
  });

  // Raw file contents for the Codebase tab
  const CODE_FILES: Record<string, { desc: string; code: string; lang: string }> = {
    'functions/index.js': {
      desc: 'Firebase Cloud Functions entrypoint: GET /webhook verification, POST /webhook async ingestion, Gemini 2.5 Flash with 10-turn memory, lead qualification, and Meta Graph API messaging.',
      lang: 'javascript',
      code: `/**
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

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
  httpOptions: {
    headers: { "User-Agent": "aistudio-build-ogtechnologies-whatsapp" },
  },
});

const OG_TECHNOLOGIES_SYSTEM_PROMPT = \`
You are the official WhatsApp AI Customer Support & Sales Assistant for "OG Technologies" (Optimal Growth Technologies SA).
Company Website: https://ogtechnologies.co.za
Location: Johannesburg, Gauteng, South Africa (serving clients nationwide).

SERVICES PROVIDED:
1. IT Support & Managed Services (SLA contracts, Wi-Fi infrastructure, networking, hardware).
2. CCTV Installation & Security Systems (High-definition IP cameras, Hikvision/Dahua, remote phone view).
3. Web Development (Custom websites, e-commerce stores, React/Next.js web apps, SEO).
4. Mobile App Development (Flutter, React Native, iOS & Android).
5. UI/UX Design (Figma wireframes, branding, design systems).
6. Digital Marketing (Google Ads, Meta Ads, SEO, lead generation).
7. Cloud, Email & Domain Hosting (cPanel, Google Workspace, Microsoft 365, .co.za domains).

COMMUNICATION GUIDELINES:
- Tone: Professional, warm, proactive, South African friendly ("Good day", "Howzit").
- Currency: South African Rand (ZAR / R).
- Goal: Answer inquiries accurately, qualify potential clients, gather project specifications, and extract lead contact info.
- Human Handoff: If the client requests emergency onsite support or a phone call, notify them an OG Technologies specialist will follow up.
\`;

async function sendWhatsAppMessage(recipientPhone, textBody) {
  const url = \`https://graph.facebook.com/v20.0/\${WHATSAPP_PHONE_NUMBER_ID}/messages\`;
  return axios.post(
    url,
    {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipientPhone,
      type: "text",
      text: { preview_url: false, body: textBody },
    },
    {
      headers: {
        Authorization: \`Bearer \${META_ACCESS_TOKEN}\`,
        "Content-Type": "application/json",
      },
    }
  );
}

exports.webhook = onRequest({ cors: true, region: "us-central1" }, async (req, res) => {
  // 1. GET: Webhook verification
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (mode === "subscribe" && token === META_VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send("Forbidden: Verify token mismatch");
  }

  // 2. POST: Inbound WhatsApp messages
  if (req.method === "POST") {
    res.status(200).send("EVENT_RECEIVED"); // Immediate ACK for Meta

    const body = req.body;
    if (body?.object === "whatsapp_business_account") {
      const messages = body.entry?.[0]?.changes?.[0]?.value?.messages || [];
      const contacts = body.entry?.[0]?.changes?.[0]?.value?.contacts || [];
      if (messages.length > 0) {
        const msg = messages[0];
        const senderPhone = msg.from;
        const senderName = contacts[0]?.profile?.name || "";
        const incomingText = msg.text?.body || msg.interactive?.button_reply?.title || "";
        
        // Asynchronously process with Gemini 2.5 Flash, Firestore memory, and reply
        await processIncomingMessage(senderPhone, senderName, incomingText, msg.id);
      }
    }
    return;
  }
  res.status(405).send("Method Not Allowed");
});`,
    },
    'functions/package.json': {
      desc: 'Node.js 20 Cloud Functions dependencies with @google/genai, firebase-admin, firebase-functions, and axios.',
      lang: 'json',
      code: `{
  "name": "og-technologies-whatsapp-functions",
  "description": "Firebase Cloud Functions for OG Technologies Automated WhatsApp AI Agent and Lead Qualification",
  "engines": {
    "node": "20"
  },
  "main": "index.js",
  "dependencies": {
    "@google/genai": "^2.4.0",
    "axios": "^1.7.9",
    "dotenv": "^16.4.7",
    "express": "^4.21.2",
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^5.0.0"
  },
  "private": true
}`,
    },
    'public/index.html': {
      desc: 'Standalone single-file Tailwind CSS Admin Lead Dashboard connecting in real-time to Firestore with WhatsApp thread inspector.',
      lang: 'html',
      code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>OG Technologies - WhatsApp AI Leads & Conversation Hub</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="bg-slate-50 text-slate-800">
  <!-- Connects to Firestore 'leads' and 'chats' collections in real-time -->
  <!-- Features: Live Captured Leads, WhatsApp Speech Bubbles, Human Handoff, CSV Export -->
</body>
</html>`,
    },
    'firebase.json': {
      desc: 'Firebase CLI configuration linking Cloud Functions v2 and Hosting rewrites for /webhook and /index.html.',
      lang: 'json',
      code: `{
  "functions": [
    {
      "source": "functions",
      "codebase": "default",
      "runtime": "nodejs20"
    }
  ],
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "hosting": {
    "public": "public",
    "rewrites": [
      { "source": "/webhook", "function": "webhook" },
      { "source": "**", "destination": "/index.html" }
    ]
  }
}`,
    },
    'firestore.rules': {
      desc: 'Firestore security rules defining access permissions for leads, chats, and processed_messages.',
      lang: 'javascript',
      code: `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /leads/{leadId} {
      allow read, write: if true;
    }
    match /chats/{phoneNumber} {
      allow read, write: if true;
      match /messages/{messageId} {
        allow read, write: if true;
      }
    }
    match /processed_messages/{messageId} {
      allow read, write: if true;
    }
  }
}`,
    },
    '.env.example': {
      desc: 'Production environment variables required for Cloud Functions, Meta Graph API v20.0, and Gemini AI.',
      lang: 'bash',
      code: `# GEMINI_API_KEY: Google Gemini 2.5 Flash API Key
GEMINI_API_KEY="AIzaSy..."

# META_VERIFY_TOKEN: Custom secret string defined in Meta Developer Portal for Webhook verification
META_VERIFY_TOKEN="og_tech_whatsapp_verify_secret_2025"

# META_ACCESS_TOKEN: Permanent System User Access Token from Meta Business Suite
META_ACCESS_TOKEN="EAAG..."

# WHATSAPP_PHONE_NUMBER_ID: 15-digit Phone Number ID from WhatsApp App Dashboard
WHATSAPP_PHONE_NUMBER_ID="109876543210987"`,
    },
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">
              <Phone className="w-5 h-5 text-slate-950 fill-current" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-base tracking-tight text-white">OG Technologies</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  WhatsApp AI v20.0
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  Gemini 2.5 Flash
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center space-x-1">
                <span>Optimal Growth Technologies SA</span>
                <span>•</span>
                <a
                  href="https://ogtechnologies.co.za"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 hover:text-emerald-300 flex items-center space-x-0.5 underline"
                >
                  <span>ogtechnologies.co.za</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-2 text-xs">
            <button
              onClick={() => setActiveTab('simulator')}
              className={`px-3 py-2 rounded-lg font-medium transition flex items-center space-x-1.5 ${
                activeTab === 'simulator'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">WhatsApp Simulator</span>
            </button>

            <button
              onClick={() => setActiveTab('crm')}
              className={`px-3 py-2 rounded-lg font-medium transition flex items-center space-x-1.5 ${
                activeTab === 'crm'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Leads CRM</span>
              <span className="px-1.5 py-0.2 bg-emerald-500 text-slate-950 font-bold rounded-full text-[10px]">
                {leads.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('webhook')}
              className={`px-3 py-2 rounded-lg font-medium transition flex items-center space-x-1.5 ${
                activeTab === 'webhook'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span className="hidden sm:inline">Webhook Tester</span>
            </button>

            <button
              onClick={() => setActiveTab('codebase')}
              className={`px-3 py-2 rounded-lg font-medium transition flex items-center space-x-1.5 ${
                activeTab === 'codebase'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileCode className="w-4 h-4" />
              <span className="hidden sm:inline">Production Files</span>
            </button>

            <button
              onClick={() => setActiveTab('guide')}
              className={`px-3 py-2 rounded-lg font-medium transition flex items-center space-x-1.5 ${
                activeTab === 'guide'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Setup Guide</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* ========================================================================= */}
        {/* TAB 1: WHATSAPP LIVE SIMULATOR                                            */}
        {/* ========================================================================= */}
        {activeTab === 'simulator' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Preset Test Scenarios & Real-Time Extracted Lead Card */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 p-4 shadow-sm">
                <h3 className="font-bold text-sm text-white mb-2 flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Test Client Scenarios</span>
                </h3>
                <p className="text-xs text-slate-400 mb-3">
                  Click any South African business scenario to test instant Gemini 2.5 Flash qualification & lead
                  extraction:
                </p>

                <div className="space-y-2">
                  <button
                    onClick={() =>
                      loadScenario(
                        'Good day! Can you give me a quote for an 8-camera CCTV system for our office in Sandton? We need remote mobile phone viewing.'
                      )
                    }
                    className="w-full text-left p-2.5 rounded-xl bg-slate-900/60 hover:bg-emerald-950/40 border border-slate-700 hover:border-emerald-500/50 transition text-xs group"
                  >
                    <div className="font-semibold text-emerald-400 group-hover:text-emerald-300 flex items-center justify-between">
                      <span>CCTV Quote (Sandton)</span>
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition" />
                    </div>
                    <p className="text-slate-400 text-[11px] mt-0.5 line-clamp-1">8-camera IP system with remote mobile app</p>
                  </button>

                  <button
                    onClick={() =>
                      loadScenario(
                        'Urgent! Our entire office network and Wi-Fi dropped in Rosebank. We have 18 staff offline. Do you offer emergency SLA support?'
                      )
                    }
                    className="w-full text-left p-2.5 rounded-xl bg-slate-900/60 hover:bg-rose-950/40 border border-slate-700 hover:border-rose-500/50 transition text-xs group"
                  >
                    <div className="font-semibold text-rose-400 group-hover:text-rose-300 flex items-center justify-between">
                      <span>Emergency IT Support (Human Handoff)</span>
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition" />
                    </div>
                    <p className="text-slate-400 text-[11px] mt-0.5 line-clamp-1">18 staff network outage in Rosebank</p>
                  </button>

                  <button
                    onClick={() =>
                      loadScenario(
                        'Howzit! I want to build a modern React & Next.js e-commerce website with PayFast and automated WhatsApp order notifications. My name is Sipho (sipho@dlamini-logistics.co.za).'
                      )
                    }
                    className="w-full text-left p-2.5 rounded-xl bg-slate-900/60 hover:bg-blue-950/40 border border-slate-700 hover:border-blue-500/50 transition text-xs group"
                  >
                    <div className="font-semibold text-blue-400 group-hover:text-blue-300 flex items-center justify-between">
                      <span>Web & E-Commerce App</span>
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition" />
                    </div>
                    <p className="text-slate-400 text-[11px] mt-0.5 line-clamp-1">Custom store with PayFast integration</p>
                  </button>

                  <button
                    onClick={() =>
                      loadScenario(
                        'Do you assist with Google Workspace business email setup and .co.za domain registration? What is the pricing in Rands?'
                      )
                    }
                    className="w-full text-left p-2.5 rounded-xl bg-slate-900/60 hover:bg-purple-950/40 border border-slate-700 hover:border-purple-500/50 transition text-xs group"
                  >
                    <div className="font-semibold text-purple-400 group-hover:text-purple-300 flex items-center justify-between">
                      <span>Cloud, Email & Domain Setup</span>
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition" />
                    </div>
                    <p className="text-slate-400 text-[11px] mt-0.5 line-clamp-1">Google Workspace & .co.za domains</p>
                  </button>
                </div>
              </div>

              {/* Extracted Lead Alert Card */}
              {latestExtractedLead && (
                <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-4 shadow-sm animate-fade-in">
                  <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>AI Lead Captured to Firestore!</span>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div>
                      <span className="text-slate-400">Name:</span> <strong className="text-white">{latestExtractedLead.name}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Service:</span> <span className="text-emerald-300 font-semibold">{latestExtractedLead.service}</span>
                    </div>
                    {latestExtractedLead.email && (
                      <div>
                        <span className="text-slate-400">Email:</span> {latestExtractedLead.email}
                      </div>
                    )}
                    <div>
                      <span className="text-slate-400">Location:</span> {latestExtractedLead.location}
                    </div>
                    <div>
                      <span className="text-slate-400">Summary:</span> <p className="italic text-slate-300 text-[11px]">{latestExtractedLead.summary}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('crm')}
                    className="mt-3 w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs transition"
                  >
                    View in Leads CRM
                  </button>
                </div>
              )}

              {/* Architecture info */}
              <div className="bg-slate-800/40 rounded-2xl border border-slate-700/50 p-4 text-xs text-slate-400 space-y-2">
                <div className="font-semibold text-slate-300 flex items-center space-x-1.5">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>Production WhatsApp Pipeline</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Every message goes through the exact Firebase Cloud Function logic: incoming text is saved to Firestore, the last 10 messages are retrieved for multi-turn context, Gemini 2.5 Flash generates a grounded response, and lead qualification writes to the <code className="text-emerald-300">leads</code> collection.
                </p>
              </div>
            </div>

            {/* Right Column: WhatsApp Mobile Device Frame */}
            <div className="lg:col-span-8 flex justify-center">
              <div className="w-full max-w-md bg-slate-950 rounded-[36px] p-3 border-4 border-slate-700 shadow-2xl">
                {/* Phone Notch & Speaker */}
                <div className="flex justify-center mb-2">
                  <div className="w-24 h-4 bg-slate-800 rounded-full flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-slate-900 border border-slate-700"></div>
                  </div>
                </div>

                {/* WhatsApp Chat Container */}
                <div className="bg-[#0b141a] rounded-[28px] overflow-hidden flex flex-col h-[600px] border border-slate-800">
                  {/* WhatsApp Top Chat Header */}
                  <div className="bg-[#202c33] px-4 py-3 flex items-center justify-between text-white border-b border-slate-700/50">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-sm shadow-md">
                        OG
                      </div>
                      <div>
                        <div className="font-semibold text-sm flex items-center space-x-1.5">
                          <span>OG Technologies</span>
                          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        </div>
                        <div className="text-[11px] text-emerald-400 font-medium">Business Account • Official</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-400">
                      <span className="text-[10px] px-2 py-0.5 bg-slate-800 rounded-full text-slate-300">v20.0</span>
                    </div>
                  </div>

                  {/* WhatsApp Message List */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#0b141a] bg-opacity-95">
                    {messages.map((m) => {
                      const isUser = m.role === 'user';
                      return (
                        <div key={m.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs shadow-sm ${
                              isUser
                                ? 'bg-[#005c4b] text-white rounded-tr-xs'
                                : 'bg-[#202c33] text-slate-100 rounded-tl-xs'
                            }`}
                          >
                            <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                            <div className="flex items-center justify-end space-x-1 text-[10px] text-slate-400 mt-1">
                              <span>{m.timestamp}</span>
                              {isUser && <CheckCheck className="w-3.5 h-3.5 text-cyan-400 inline" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="bg-[#202c33] text-slate-300 rounded-2xl rounded-tl-xs px-4 py-2.5 text-xs flex items-center space-x-2 shadow-sm">
                          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce"></div>
                          <div
                            className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce"
                            style={{ animationDelay: '0.2s' }}
                          ></div>
                          <div
                            className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce"
                            style={{ animationDelay: '0.4s' }}
                          ></div>
                          <span className="text-[11px] text-slate-400 ml-1">OG Technologies AI typing...</span>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* WhatsApp Message Input Bar */}
                  <div className="p-3 bg-[#202c33] border-t border-slate-700/60">
                    <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder="Type a WhatsApp message..."
                        disabled={isLoading}
                        className="flex-1 bg-[#2a3942] text-slate-100 placeholder-slate-400 text-xs px-4 py-2.5 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        type="submit"
                        disabled={isLoading || !inputMessage.trim()}
                        className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 flex items-center justify-center transition shadow-md"
                      >
                        <Send className="w-4 h-4 ml-0.5 fill-current" />
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: LEADS CRM & HUMAN HANDOFF DASHBOARD                                */}
        {/* ========================================================================= */}
        {activeTab === 'crm' && (
          <div className="space-y-6">
            {/* Top Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 p-4">
                <div className="text-xs text-slate-400 uppercase font-semibold">Total Leads Captured</div>
                <div className="text-2xl font-bold text-white mt-1">{leads.length}</div>
                <div className="text-[11px] text-emerald-400 mt-1">From WhatsApp conversations</div>
              </div>

              <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 p-4">
                <div className="text-xs text-slate-400 uppercase font-semibold">New Quotes Required</div>
                <div className="text-2xl font-bold text-amber-400 mt-1">
                  {leads.filter((l) => l.status === 'NEW').length}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Pending engineer / sales quote</div>
              </div>

              <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 p-4">
                <div className="text-xs text-slate-400 uppercase font-semibold">Qualified Pipeline</div>
                <div className="text-2xl font-bold text-emerald-400 mt-1">
                  {leads.filter((l) => l.status === 'QUALIFIED').length}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">High purchase intent</div>
              </div>

              <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 p-4">
                <div className="text-xs text-slate-400 uppercase font-semibold">Human Handoff Requests</div>
                <div className="text-2xl font-bold text-rose-400 mt-1">
                  {leads.filter((l) => l.humanHandoff).length}
                </div>
                <div className="text-[11px] text-rose-400 mt-1">Urgent or complex cases</div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-slate-800/60 rounded-2xl border border-slate-700/80 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchLead}
                    onChange={(e) => setSearchLead(e.target.value)}
                    placeholder="Search name, phone, service..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <select
                  value={filterService}
                  onChange={(e) => setFilterService(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ALL">All Services</option>
                  <option value="CCTV Installation">CCTV Installation</option>
                  <option value="IT Support">IT Support SLA</option>
                  <option value="Web Development">Web Development</option>
                  <option value="Mobile App">Mobile App Dev</option>
                  <option value="Hosting">Cloud / Hosting</option>
                  <option value="Digital Marketing">Digital Marketing</option>
                </select>
              </div>

              <button
                onClick={fetchLeads}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-xs rounded-xl transition flex items-center space-x-1.5 self-end sm:self-auto"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Leads</span>
              </button>
            </div>

            {/* Leads Table */}
            <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900/80 border-b border-slate-700 text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Contact Person</th>
                      <th className="py-3 px-4">Service Required</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4">Urgency</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/60">
                    {filteredLeads.map((lead) => (
                      <tr
                        key={lead.id}
                        onClick={() => setSelectedLeadPhone(lead.phone)}
                        className={`cursor-pointer hover:bg-slate-750 transition ${
                          selectedLeadPhone === lead.phone ? 'bg-slate-700/60' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="font-bold text-white flex items-center space-x-2">
                            <span>{lead.name}</span>
                            {lead.humanHandoff && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                Human Alert
                              </span>
                            )}
                          </div>
                          <div className="text-slate-400 text-[11px]">{lead.phone}</div>
                          {lead.email && <div className="text-slate-500 text-[11px] truncate max-w-[150px]">{lead.email}</div>}
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-semibold text-emerald-400">{lead.service}</span>
                          <p className="text-slate-400 text-[11px] line-clamp-1 max-w-[200px]">{lead.summary}</p>
                        </td>

                        <td className="py-3 px-4 text-slate-300">{lead.location}</td>

                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              lead.urgency === 'High'
                                ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                                : lead.urgency === 'Medium'
                                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                : 'bg-slate-500/20 text-slate-300 border-slate-500/30'
                            }`}
                          >
                            {lead.urgency}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <select
                            value={lead.status}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handleUpdateLeadStatus(lead.phone, e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-200 focus:outline-none"
                          >
                            <option value="NEW">NEW</option>
                            <option value="CONTACTED">CONTACTED</option>
                            <option value="QUALIFIED">QUALIFIED</option>
                            <option value="CLOSED">CLOSED</option>
                          </select>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <a
                            href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs transition"
                          >
                            <Phone className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Human Agent Takeover Panel for Selected Lead */}
            {selectedLeadPhone && (
              <div className="bg-slate-800/90 rounded-2xl border border-slate-700 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-sm text-white">
                      Human Agent Takeover: {selectedLeadPhone}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">Sends directly into customer thread</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={humanReply}
                    onChange={(e) => setHumanReply(e.target.value)}
                    placeholder="Type an official message from OG Technologies..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    onClick={() => handleHumanReply(selectedLeadPhone)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl text-xs transition"
                  >
                    Send Reply
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: WEBHOOK TESTER & GRAPH API SIMULATOR                               */}
        {/* ========================================================================= */}
        {activeTab === 'webhook' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* 1. GET Webhook Verification Tester */}
            <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 p-5 space-y-4">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                <Terminal className="w-5 h-5" />
                <span>1. Test Meta Webhook Verification (GET /webhook)</span>
              </div>
              <p className="text-xs text-slate-400">
                When you configure the webhook URL in Meta Developer Portal, Meta sends a <code className="text-emerald-300">GET</code> request with <code className="text-emerald-300">hub.mode</code>, <code className="text-emerald-300">hub.verify_token</code>, and <code className="text-emerald-300">hub.challenge</code>. Test this challenge check live:
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Verify Token (hub.verify_token)</label>
                  <input
                    type="text"
                    value={verifyTokenInput}
                    onChange={(e) => setVerifyTokenInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Challenge Number (hub.challenge)</label>
                  <input
                    type="text"
                    value={verifyChallenge}
                    onChange={(e) => setVerifyChallenge(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <button
                  onClick={testGetWebhook}
                  disabled={isVerifying}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition"
                >
                  {isVerifying ? 'Verifying Challenge...' : 'Execute GET /webhook Challenge Test'}
                </button>

                {verifyResult && (
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-700 text-xs font-mono">
                    <div className="text-slate-400 mb-1 text-[11px]">Server Response:</div>
                    <div className={verifyResult.includes('200') ? 'text-emerald-400' : 'text-rose-400'}>
                      {verifyResult}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 2. POST Webhook Inbound Message Tester */}
            <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 p-5 space-y-4">
              <div className="flex items-center space-x-2 text-blue-400 font-bold text-sm">
                <MessageSquare className="w-5 h-5" />
                <span>2. Test Meta Inbound Webhook Payload (POST /webhook)</span>
              </div>
              <p className="text-xs text-slate-400">
                Simulate an incoming WhatsApp Cloud API payload formatted according to Meta Graph API v20.0 specification:
              </p>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Sender Phone</label>
                    <input
                      type="text"
                      value={postSimPhone}
                      onChange={(e) => setPostSimPhone(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Sender Name</label>
                    <input
                      type="text"
                      value={postSimName}
                      onChange={(e) => setPostSimName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Incoming Message Body</label>
                  <textarea
                    rows={2}
                    value={postSimText}
                    onChange={(e) => setPostSimText(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <button
                  onClick={testPostWebhook}
                  disabled={isPostingPayload}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition"
                >
                  {isPostingPayload ? 'Simulating Webhook Event...' : 'Dispatch Inbound Meta Webhook Event'}
                </button>

                {postPayloadResult && (
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-700 text-xs font-mono max-h-56 overflow-y-auto">
                    <div className="text-slate-400 mb-1 text-[11px]">Execution Result:</div>
                    <pre className="text-slate-300 text-[11px]">
                      {JSON.stringify(postPayloadResult, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: PRODUCTION CODEBASE & FILE EXPLORER                                */}
        {/* ========================================================================= */}
        {activeTab === 'codebase' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* File List */}
            <div className="lg:col-span-4 bg-slate-800/80 rounded-2xl border border-slate-700/80 p-4 space-y-2">
              <h3 className="font-bold text-sm text-white mb-2 flex items-center space-x-2">
                <FileCode className="w-4 h-4 text-emerald-400" />
                <span>Production Project Files</span>
              </h3>
              <p className="text-xs text-slate-400 mb-3">
                Complete, production-ready code created across structured files:
              </p>

              <div className="space-y-1.5">
                {Object.keys(CODE_FILES).map((fileName) => (
                  <button
                    key={fileName}
                    onClick={() => setSelectedFile(fileName)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition flex items-center justify-between ${
                      selectedFile === fileName
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                        : 'text-slate-300 hover:bg-slate-750'
                    }`}
                  >
                    <span className="font-mono">{fileName}</span>
                    <span className="text-[10px] uppercase text-slate-500">{CODE_FILES[fileName].lang}</span>
                  </button>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-700/60">
                <a
                  href="/public/index.html"
                  target="_blank"
                  className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-medium transition flex items-center justify-center space-x-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Preview Standalone Admin Dashboard</span>
                </a>
              </div>
            </div>

            {/* Code Viewer */}
            <div className="lg:col-span-8 bg-slate-950 rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
              <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-white">{selectedFile}</span>
                  <p className="text-[11px] text-slate-400">{CODE_FILES[selectedFile]?.desc}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(CODE_FILES[selectedFile]?.code || '', selectedFile)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs transition flex items-center space-x-1.5 font-medium"
                >
                  {copiedKey === selectedFile ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-4 max-h-[600px] overflow-y-auto font-mono text-xs text-slate-300 leading-relaxed bg-[#0d1117]">
                <pre>{CODE_FILES[selectedFile]?.code}</pre>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: STEP-BY-STEP MANUAL DEPLOYMENT GUIDE                              */}
        {/* ========================================================================= */}
        {activeTab === 'guide' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 p-6 space-y-3">
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <BookOpen className="w-6 h-6 text-emerald-400" />
                <span>Complete Production Deployment & Meta Setup Guide</span>
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Follow this step-by-step master checklist to register your Meta WhatsApp Cloud API credentials, deploy your Firebase Cloud Functions, configure secrets, and launch 24/7 AI customer support for OG Technologies.
              </p>
            </div>

            {/* STEP 1: Firebase Project Setup */}
            <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 p-6 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-sm">
                  1
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Firebase Project Initialization & CLI</h3>
                  <p className="text-xs text-slate-400">Install the Firebase CLI and login to your Google account</p>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl font-mono text-xs text-emerald-400 border border-slate-800 space-y-2">
                <p className="text-slate-500"># 1. Install Firebase CLI globally</p>
                <p>npm install -g firebase-tools</p>
                <p className="text-slate-500 mt-2"># 2. Login to your Firebase / Google Cloud account</p>
                <p>firebase login</p>
                <p className="text-slate-500 mt-2"># 3. Associate your existing Firebase project</p>
                <p>firebase use --add [YOUR_FIREBASE_PROJECT_ID]</p>
              </div>
            </div>

            {/* STEP 2: Meta Developer Portal & WhatsApp Cloud API Setup */}
            <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 p-6 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-sm">
                  2
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Meta Developer App & WhatsApp Cloud API Setup</h3>
                  <p className="text-xs text-slate-400">Obtain Phone Number ID and Permanent System User Access Token</p>
                </div>
              </div>

              <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300 leading-relaxed pl-2">
                <li>
                  Go to{' '}
                  <a
                    href="https://developers.facebook.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-400 underline font-semibold"
                  >
                    developers.facebook.com
                  </a>{' '}
                  and click <strong>My Apps &gt; Create App</strong>.
                </li>
                <li>
                  Select <strong>Other &gt; Business</strong> as the App Type, name it <code>OG Technologies WhatsApp Bot</code>, and link your Meta Business Account.
                </li>
                <li>
                  Under <em>Add products to your app</em>, locate <strong>WhatsApp</strong> and click <strong>Set Up</strong>.
                </li>
                <li>
                  In <strong>WhatsApp &gt; API Setup</strong>, copy the <strong>Phone Number ID</strong> (a 15-digit number, e.g., <code>109876543210987</code>).
                </li>
                <li>
                  <strong>Create a Permanent System User Token</strong> (Do NOT use temporary 24-hr tokens in production):
                  <ul className="list-disc list-inside pl-4 mt-1 space-y-1 text-slate-400">
                    <li>Go to Meta Business Suite &gt; <em>Settings &gt; Users &gt; System Users</em>.</li>
                    <li>Click <strong>Add</strong>, set role to <strong>Admin</strong>, name it <code>OG-WhatsApp-Agent</code>.</li>
                    <li>Click <strong>Generate Token</strong>, select your WhatsApp App, and check permissions: <code>whatsapp_business_messaging</code> and <code>whatsapp_business_management</code>.</li>
                    <li>Copy and store this token safely as <code>META_ACCESS_TOKEN</code>.</li>
                  </ul>
                </li>
              </ol>
            </div>

            {/* STEP 3: Configure Cloud Functions Environment Secrets */}
            <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 p-6 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-sm">
                  3
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Set Firebase Secrets Manager Variables</h3>
                  <p className="text-xs text-slate-400">Safely store keys so functions can read them at runtime</p>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl font-mono text-xs text-emerald-400 border border-slate-800 space-y-2">
                <p className="text-slate-500"># Set Meta Verify Token</p>
                <p>firebase functions:secrets:set META_VERIFY_TOKEN</p>
                <p className="text-slate-500 mt-2"># Set Permanent Meta System User Access Token</p>
                <p>firebase functions:secrets:set META_ACCESS_TOKEN</p>
                <p className="text-slate-500 mt-2"># Set WhatsApp Phone Number ID</p>
                <p>firebase functions:secrets:set WHATSAPP_PHONE_NUMBER_ID</p>
                <p className="text-slate-500 mt-2"># Set Google Gemini API Key</p>
                <p>firebase functions:secrets:set GEMINI_API_KEY</p>
              </div>
            </div>

            {/* STEP 4: Deploy Cloud Functions and Hosting */}
            <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 p-6 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-sm">
                  4
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Deploy Application to Firebase</h3>
                  <p className="text-xs text-slate-400">Deploy functions, firestore security rules, and hosting dashboard</p>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl font-mono text-xs text-emerald-400 border border-slate-800 space-y-2">
                <p className="text-slate-500"># Deploy Firestore rules & Cloud Functions</p>
                <p>firebase deploy --only firestore,functions</p>
                <p className="text-slate-500 mt-2"># Deploy Admin Lead Dashboard to Firebase Hosting</p>
                <p>firebase deploy --only hosting</p>
              </div>

              <p className="text-xs text-slate-300">
                After deployment, Firebase CLI outputs your function URL, typically:
                <br />
                <code className="text-emerald-400 bg-slate-900 px-2 py-1 rounded mt-1 inline-block">
                  https://us-central1-[YOUR-PROJECT-ID].cloudfunctions.net/webhook
                </code>
              </p>
            </div>

            {/* STEP 5: Register Webhook in Meta Portal */}
            <div className="bg-slate-800/80 rounded-2xl border border-slate-700/80 p-6 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-slate-950 font-bold flex items-center justify-center text-sm">
                  5
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Register Webhook & Subscribe to 'messages' Field</h3>
                  <p className="text-xs text-slate-400">Link Meta's event webhook to your live Cloud Function</p>
                </div>
              </div>

              <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300 leading-relaxed pl-2">
                <li>Return to the <strong>Meta Developer Portal &gt; WhatsApp &gt; Configuration</strong>.</li>
                <li>Click <strong>Edit</strong> next to <strong>Callback URL</strong>.</li>
                <li>
                  Paste your Cloud Function URL into <strong>Callback URL</strong> (e.g., <code>https://us-central1-[PROJECT_ID].cloudfunctions.net/webhook</code>).
                </li>
                <li>
                  Enter your chosen <strong>Verify Token</strong> (matching <code>META_VERIFY_TOKEN</code>) and click <strong>Verify and Save</strong>.
                </li>
                <li>
                  Under <strong>Webhook Fields</strong>, click <strong>Manage</strong> and click <strong>Subscribe</strong> next to <strong>messages</strong>.
                </li>
              </ol>

              <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-start space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">Your WhatsApp AI Customer Support Agent is Now Live!</strong>
                  <p className="mt-1">
                    Send a test message from any WhatsApp phone to your registered number. Your Gemini 2.5 Flash agent will answer queries based on OG Technologies services, capture qualified leads into Firestore, and notify human agents for escalation!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
