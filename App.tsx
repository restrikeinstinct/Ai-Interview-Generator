import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GoogleGenAI } from "@google/genai";

// --- Type Definition ---
interface InterviewEntry {
    id: string;
    title: string;
    output: string;
    settings: {
        role: string;
        topic: string;
        tone: string;
        numQuestions: number;
        persona: string;
        interviewerPersona: string;
        outputFormat: string;
    };
    timestamp: string;
}

// --- Background Component ---
const CosmicBackground = () => (
    <div 
        className="absolute top-0 left-0 w-full h-full -z-10"
        style={{
            backgroundColor: '#0d021a',
            backgroundImage: `
                radial-gradient(at 20% 25%, hsla(320, 70%, 55%, 0.4) 0px, transparent 50%),
                radial-gradient(at 75% 70%, hsla(293, 85%, 60%, 0.3) 0px, transparent 50%),
                radial-gradient(at 50% 95%, hsla(260, 60%, 30%, 0.2) 0px, transparent 50%)
            `,
            backgroundAttachment: 'fixed'
        }}
    />
);

// --- Helper Component for Keyword Highlighting ---
const HighlightKeywords = ({ text }: { text: string }) => {
    // Regex to find **word** or *word*, prioritizing the double asterisk
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g); 
    return (
        <>
            {parts.map((part, i) => {
                // Handle **word**
                if (part.startsWith('**') && part.endsWith('**')) {
                    return (
                        <strong key={i} className="font-bold text-pink-400 [text-shadow:0_0_10px_theme(colors.pink.400/0.8)]">
                            {part.slice(2, -2)}
                        </strong>
                    );
                }
                // Handle *word*
                if (part.startsWith('*') && part.endsWith('*')) {
                    return (
                        <strong key={i} className="font-bold text-pink-400 [text-shadow:0_0_10px_theme(colors.pink.400/0.8)]">
                            {part.slice(1, -1)}
                        </strong>
                    );
                }
                // Return plain text part
                return part;
            })}
        </>
    );
};


// --- Icon Components ---
const UserIcon = ({ className = "h-5 w-5" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const BookIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>;
const ToneIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>;
const HashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M5 9h14M5 15h14" /></svg>;
const SparklesIcon = ({ className = "h-5 w-5" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.293 2.293a1 1 0 010 1.414L10 16l-4 4-4-4 5.293-5.293a1 1 0 011.414 0z" /></svg>;
const ClipboardIcon = ({ className = "h-5 w-5" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>;
const TrashIcon = ({ className = "h-5 w-5" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const DownloadIcon = ({ className = "h-4 w-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;
const WandIcon = ({ className = "h-4 w-4" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>;
const MicIcon = ({ className = "h-5 w-5" }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm5 10.5a7.5 7.5 0 00-1.243-4.123A5.965 5.965 0 0112 8V4a4 4 0 10-8 0v4c0 .713.109 1.404.31 2.062A7.47 7.47 0 005 14.5V16h1.5v-1.5a.5.5 0 01.5-.5h6a.5.5 0 01.5.5V16H15v-1.5z" clipRule="evenodd" /></svg>;
const FileTextIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;


const INSPIRATION_PROMPTS = [
    { role: "Time-Traveling Historian", topic: "The biggest misconceptions about the Roman Empire", persona: "Slightly jaded and annoyed by inaccurate movies.", interviewerPersona: "A curious high-school student." },
    { role: "AI Chef", topic: "Creating flavors that don't exist in nature", persona: "Excited, bubbly, and constantly experimenting.", interviewerPersona: "A skeptical, world-renowned food critic." },
    { role: "Deep Sea Biologist", topic: "The strange creatures of the Mariana Trench", persona: "Calm, fascinated by the unknown, and deeply respectful of the ocean.", interviewerPersona: "An enthusiastic podcast host." },
    { role: "Lead Architect on Mars", topic: "The challenges of building the first Martian city", persona: "Pragmatic, visionary, and a little stressed out.", interviewerPersona: "A hard-hitting investigative journalist." }
];

export default function App() {
  const [role, setRole] = useState("");
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("semi-formal");
  const [numQuestions, setNumQuestions] = useState(8);
  const [persona, setPersona] = useState("");
  const [interviewerPersona, setInterviewerPersona] = useState("");
  const [outputFormat, setOutputFormat] = useState("qa");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);
  const [history, setHistory] = useState<InterviewEntry[]>(() => {
    try {
        const localHistory = localStorage.getItem("interviewHistory");
        return localHistory ? JSON.parse(localHistory) : [];
    } catch (e) {
        return [];
    }
  });
  
  const outputRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    localStorage.setItem("interviewHistory", JSON.stringify(history));
  }, [history]);
  
  useEffect(() => {
    const slider = document.querySelector('.cosmic-slider') as HTMLInputElement;
    if (slider) {
      const value = ((slider.valueAsNumber - Number(slider.min)) / (Number(slider.max) - Number(slider.min))) * 100;
      slider.style.backgroundPosition = `${value}% 0`;
    }
  }, [numQuestions]);

  const generateInterview = async () => {
    if (!role.trim() || !topic.trim()) {
      setError("Please fill in both role and topic!");
      return;
    }
    setLoading(true);
    setOutput("");
    setError("");

    const personaPrompt = persona.trim() ? `\n- Interviewee Persona: ${persona.trim()}` : '';
    const interviewerPersonaPrompt = interviewerPersona.trim() ? `\n- Interviewer Persona: ${interviewerPersona.trim()}` : '';

    let formatInstructions = '';
    switch(outputFormat) {
        case 'article':
            formatInstructions = `Output Format: Narrative Article\n\nInstructions:\n- Write a compelling article based on a fictional interview with the specified person.\n- Start with a strong, engaging title and an introductory paragraph that sets the scene.\n- Weave the ${numQuestions} key questions and their answers into a flowing narrative. Do not use a "Q1/A1" format. Instead, integrate the conversation naturally (e.g., "When asked about the challenges, she explained...").\n- The article's tone should match the specified tone, and the interviewee's quotes should reflect their persona. Within direct quotes, wrap key phrases in double asterisks for emphasis (e.g., "It was a **truly groundbreaking** moment.").\n- Conclude with a summary or a final thought-provoking statement.`;
            break;
        case 'podcast':
            formatInstructions = `Output Format: Podcast Script\n\nInstructions:\n- Write a podcast script for a segment of an episode.\n- Start with a creative title for the episode segment.\n- The script should contain roughly ${numQuestions} questions from the interviewer.\n- Format the script with speaker labels (e.g., "Interviewer:", "${role}:").\n- The dialogue should feel natural and conversational, reflecting the specified tone and personas. Within the interviewee's dialogue, wrap key phrases in double asterisks for emphasis.\n- Include brief, non-intrusive action notes in brackets where appropriate (e.g., [laughs], [intro music fades]).\n- End with the interviewer wrapping up the segment.`;
            break;
        case 'qa':
        default:
            formatInstructions = `Output Format: Standard Q&A\n\nInstructions:\n- A creative and engaging title for the interview.\n- Exactly ${numQuestions} question and answer pairs. Format them clearly with each question starting with "Q1:", "Q2:", etc., and each answer starting with "A1:", "A2:", etc. Each Q&A pair should be on a new line.\n- Each answer should be 3–6 sentences, realistic, insightful, and match the specified persona if provided. Within each answer, wrap the 3-5 most important keywords or phrases in double asterisks (e.g., **keyword**). Do not wrap the question or speaker labels in asterisks.\n- End with a short, natural-sounding closing statement from the interviewer.`
            break;
    }

    const prompt = `You are InterviewGen, an AI that creates realistic written content based on an interview. Generate a complete piece with the following details:\n- Role: ${role}\n- Topic: ${topic}\n- Tone: ${tone}\n- Number of Questions: ${numQuestions}${personaPrompt}${interviewerPersonaPrompt}\n\n${formatInstructions}`;
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const responseStream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      let fullResponse = "";
      for await (const chunk of responseStream) {
        const chunkText = chunk.text;
        fullResponse += chunkText;
        setOutput(prev => prev + chunkText);
        if (outputRef.current) {
          outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
      }

      const newEntry: InterviewEntry = {
        id: crypto.randomUUID(),
        title: fullResponse.split('\n')[0].replace(/\*/g, '').trim() || "Untitled Interview",
        output: fullResponse,
        settings: { role, topic, tone, numQuestions, persona, interviewerPersona, outputFormat },
        timestamp: new Date().toLocaleString()
      };
      setHistory(prev => [newEntry, ...prev.slice(0, 19)]); // Keep history to 20 items

    } catch (err) {
      console.error("Error generating interview:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred. Please check the console.");
      setOutput("");
    } finally {
      setLoading(false);
    }
  };
  
  const formatOutput = (text: string, format: string) => {
    const lines = text.split('\n');
    let title = "";
    if (lines.length > 0) {
        if (!lines[0].match(/^(Q\d+:|A\d+:|Interviewer:|.+:)/) && lines[0].trim().length > 0) {
             title = lines.shift()?.replace(/\*|\#|Title:/g, '').trim() || "Generated Interview";
        }
    }

    if (format === 'article') {
        const content = lines.map((line, index) => {
            if(line.trim() === '') return null; // Don't render empty paragraphs
            return <p key={index} className="text-gray-300 mb-3"><HighlightKeywords text={line} /></p>
        }).filter(Boolean);
        return { title: title || "Generated Article", content };
    }

    // Handle Q&A and Podcast formats
    const content = lines.map((line, index) => {
        if(line.trim() === '') return null;

        const isInterviewer = line.match(/^(Q\d+:|Interviewer:)/);
        const isInterviewee = line.match(/^(A\d+:|.+\:)/) && !isInterviewer;

        if (isInterviewer) {
            const speakerMatch = line.match(/^(.+?:)/);
            const speaker = speakerMatch ? speakerMatch[0].replace(':', '') : "Interviewer";
            const message = line.substring((speakerMatch ? speakerMatch[0].length : 0)).trim();
            return (
                <div key={index} className="flex items-start gap-3 my-2">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-900 flex items-center justify-center shadow-md"><MicIcon className="w-4 h-4 text-purple-300"/></div>
                    <div className="bg-gray-800 rounded-lg p-3 w-full max-w-xl">
                        <p className="font-semibold text-purple-300 mb-1">{speaker}</p>
                        <p className="text-gray-300">{message}</p>
                    </div>
                </div>
            );
        }

        if (isInterviewee) {
            const speakerMatch = line.match(/^(.+?:)/);
            const speaker = speakerMatch ? speakerMatch[0].replace(':', '') : role;
            const message = line.substring((speakerMatch ? speakerMatch[0].length : 0)).trim();
            return (
                <div key={index} className="flex items-start gap-3 my-2 ml-auto max-w-xl justify-end">
                    <div className="bg-fuchsia-900/80 rounded-lg p-3 w-full order-1">
                        <p className="font-semibold text-fuchsia-200 mb-1 text-right">{speaker}</p>
                        <p className="text-gray-300"><HighlightKeywords text={message} /></p>
                    </div>
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-fuchsia-800 flex items-center justify-center shadow-md order-2"><UserIcon className="w-4 h-4 text-fuchsia-200"/></div>
                </div>
            );
        }

        if (line.startsWith('[')) {
            return <p key={index} className="text-gray-500 italic text-sm my-3 text-center">{line}</p>;
        }

        return null; // Don't render lines that don't match
    }).filter(Boolean); // remove nulls
    
    return { title: title || "Generated Script", content };
  };


  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };
  
  const handleDownload = () => {
    if (!output) return;
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/ /g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
      setRole("");
      setTopic("");
      setTone("semi-formal");
      setNumQuestions(8);
      setPersona("");
      setInterviewerPersona("");
      setOutputFormat("qa");
      setOutput("");
      setError("");
  };
  
  const handleInspireMe = () => {
    const randomPrompt = INSPIRATION_PROMPTS[Math.floor(Math.random() * INSPIRATION_PROMPTS.length)];
    setRole(randomPrompt.role);
    setTopic(randomPrompt.topic);
    setPersona(randomPrompt.persona);
    setInterviewerPersona(randomPrompt.interviewerPersona);
  };
  
  const handleViewHistory = (entry: InterviewEntry) => {
      setOutput(entry.output);
  };
  
  const handleReloadHistory = (entry: InterviewEntry) => {
    const { role, topic, tone, numQuestions, persona, interviewerPersona, outputFormat } = entry.settings;
    setRole(role);
    setTopic(topic);
    setTone(tone);
    setNumQuestions(numQuestions);
    setPersona(persona);
    setInterviewerPersona(interviewerPersona || "");
    setOutputFormat(outputFormat || "qa");
  };

  const handleDeleteHistory = (id: string) => {
    setHistory(prev => prev.filter(entry => entry.id !== id));
  };


  const { title, content } = formatOutput(output, outputFormat);

  return (
    <div className="relative min-h-screen text-white flex flex-col items-center py-10 px-4 sm:px-6 lg:px-8 font-sans overflow-hidden">
        <CosmicBackground />
        <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl font-bold mb-2 text-center text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-pink-500">
            🎤 AI Interview Generator
        </motion.h1>
        <p className="text-gray-400 mb-8 text-center">Craft compelling Q&A scripts, articles, and podcasts in real-time.</p>

        <div className="w-full max-w-7xl mx-auto lg:grid lg:grid-cols-12 lg:gap-8">
            {/* --- CONTROLS --- */}
            <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-4 space-y-4 bg-gray-900/50 backdrop-blur-sm p-6 rounded-2xl border border-purple-900/50">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Settings</h2>
                    <button onClick={handleInspireMe} className="flex items-center space-x-2 text-sm bg-purple-800/50 hover:bg-purple-700/50 px-3 py-1.5 rounded-md transition duration-200">
                        <WandIcon className="h-4 w-4" /><span>Inspire Me</span>
                    </button>
                </div>
                
                <div>
                    <label className="flex items-center space-x-2 text-gray-300 mb-2 font-medium"><UserIcon /><span>Interviewee Role</span></label>
                    <input type="text" placeholder="e.g. Time-Traveling Historian" value={role} onChange={(e) => setRole(e.target.value)}
                        className="w-full p-3 rounded-lg bg-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 transition" aria-label="Role"/>
                </div>
                <div>
                    <label className="flex items-center space-x-2 text-gray-300 mb-2 font-medium"><BookIcon /><span>Topic</span></label>
                    <input type="text" placeholder="e.g. Roman Empire Misconceptions" value={topic} onChange={(e) => setTopic(e.target.value)}
                        className="w-full p-3 rounded-lg bg-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 transition" aria-label="Topic"/>
                </div>
                 <div>
                    <label className="flex items-center space-x-2 text-gray-300 mb-2 font-medium"><FileTextIcon /><span>Output Format</span></label>
                    <select value={outputFormat} onChange={(e) => setOutputFormat(e.target.value)} className="w-full p-3 rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500 transition appearance-none" aria-label="Output Format">
                        <option value="qa">Standard Q&A</option><option value="article">Narrative Article</option><option value="podcast">Podcast Script</option>
                    </select>
                </div>
                <div>
                    <label className="flex items-center space-x-2 text-gray-300 mb-2 font-medium"><ToneIcon /><span>Tone</span></label>
                    <select value={tone} onChange={(e) => setTone(e.target.value)} className="w-full p-3 rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500 transition appearance-none" aria-label="Tone">
                        <option value="formal">Formal</option><option value="semi-formal">Semi-formal</option><option value="casual">Casual</option><option value="inspiring">Inspiring</option><option value="humorous">Humorous</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="numQuestions" className="flex items-center space-x-2 text-gray-300 mb-2 font-medium"><HashIcon /><span>Questions: {numQuestions}</span></label>
                    <input id="numQuestions" type="range" min="3" max="15" value={numQuestions} onChange={(e) => setNumQuestions(Number(e.target.value))} className="w-full h-2 rounded-lg cursor-pointer cosmic-slider" aria-label="Number of Questions"/>
                </div>
                <div>
                    <label className="flex items-center space-x-2 text-gray-300 mb-2 font-medium"><SparklesIcon /><span>Interviewee Persona (Optional)</span></label>
                    <textarea placeholder="e.g. A cynical veteran with a dry wit." value={persona} onChange={(e) => setPersona(e.target.value)} rows={2} className="w-full p-3 rounded-lg bg-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 transition" aria-label="Persona"/>
                </div>
                <div>
                    <label className="flex items-center space-x-2 text-gray-300 mb-2 font-medium"><MicIcon /><span>Interviewer Persona (Optional)</span></label>
                    <textarea placeholder="e.g. An enthusiastic podcast host." value={interviewerPersona} onChange={(e) => setInterviewerPersona(e.target.value)} rows={2} className="w-full p-3 rounded-lg bg-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 transition" aria-label="Interviewer Persona"/>
                </div>
                <div className="flex gap-3 pt-2">
                    <button onClick={generateInterview} disabled={loading} className="w-full py-3 bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 rounded-lg font-semibold shadow-lg transition duration-200 transform hover:scale-105 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center space-x-2">
                        {loading ? "Generating..." : "Generate"}
                    </button>
                    <button onClick={handleClear} disabled={loading} title="Clear Form" className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold shadow-lg transition duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center">
                        <TrashIcon />
                    </button>
                </div>
            </motion.div>

            {/* --- OUTPUT --- */}
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-5 mt-8 lg:mt-0">
                 <div ref={outputRef} className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-2xl border border-purple-900/50 h-[600px] lg:h-[calc(100vh-12rem)] flex flex-col">
                    <AnimatePresence>
                    {error && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg mb-4" role="alert">{error}</motion.div>}
                    </AnimatePresence>

                    {loading && !output && <div className="flex justify-center items-center h-full"><svg className="animate-spin h-10 w-10 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>}
                    
                    {output && <>
                        <div className="flex justify-between items-center pb-4 border-b border-purple-900/50 mb-4 flex-shrink-0">
                            <h2 className="text-xl font-bold text-white truncate pr-4">{title}</h2>
                            <div className="flex items-center space-x-2">
                                <button onClick={handleDownload} className="flex items-center space-x-2 text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-md transition duration-200">
                                    <DownloadIcon /><span>Save</span>
                                </button>
                                <button onClick={handleCopy} className="flex items-center space-x-2 text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-md transition duration-200">
                                    <ClipboardIcon className="h-4 w-4" /><span>{copySuccess ? "Copied!" : "Copy"}</span>
                                </button>
                            </div>
                        </div>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-2 overflow-y-auto pr-2 h-full">
                            {content}
                        </motion.div>
                    </>}
                    
                    {!output && !loading && !error && <div className="text-center text-gray-500 m-auto"><SparklesIcon className="h-12 w-12 mx-auto text-gray-600"/>
                        <p className="mt-4 text-lg">Your generated interview will appear here.</p><p className="text-sm">Fill out the settings and click generate!</p></div>}
                 </div>
            </motion.div>
            
            {/* --- HISTORY --- */}
            <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="lg:col-span-3 mt-8 lg:mt-0 bg-gray-900/50 backdrop-blur-sm p-6 rounded-2xl border border-purple-900/50 h-[600px] lg:h-[calc(100vh-12rem)] flex flex-col">
                <h2 className="text-xl font-semibold pb-4 border-b border-purple-900/50 mb-4">History</h2>
                {history.length > 0 ? (
                    <div className="space-y-3 overflow-y-auto pr-2">
                        {history.map(entry => (
                            <div key={entry.id} className="bg-gray-800/50 p-3 rounded-lg">
                                <p className="font-semibold truncate text-gray-200">{entry.title}</p>
                                <p className="text-xs text-gray-400 truncate"><span className="font-medium text-gray-500">Role:</span> {entry.settings.role}</p>
                                <p className="text-xs text-gray-400 truncate"><span className="font-medium text-gray-500">Topic:</span> {entry.settings.topic}</p>
                                <div className="flex justify-between items-center mt-2">
                                    <p className="text-xs text-fuchsia-400 bg-fuchsia-900/50 px-2 py-0.5 rounded">
                                        {entry.settings.outputFormat === 'qa' ? 'Q&A' : entry.settings.outputFormat === 'article' ? 'Article' : 'Podcast'}
                                    </p>
                                    <p className="text-xs text-gray-500">{entry.timestamp.split(',')[0]}</p>
                                </div>
                                <div className="flex gap-2 mt-3">
                                    <button onClick={() => handleViewHistory(entry)} className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded w-full transition-colors">View</button>
                                    <button onClick={() => handleReloadHistory(entry)} className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded w-full transition-colors">Reload</button>
                                    <button onClick={() => handleDeleteHistory(entry.id)} className="text-xs text-red-400 hover:bg-red-500/20 p-1 rounded transition-colors"><TrashIcon className="h-4 w-4"/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-gray-500 m-auto">
                        <p className="text-sm">Your generated interviews will be saved here.</p>
                    </div>
                )}
            </motion.div>
        </div>
    </div>
  );
}