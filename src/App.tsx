import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  FileText,
  CheckCircle2,
  Loader2,
  Copy,
  Download,
  RefreshCw,
  AlertCircle,
  FileUp,
  Sparkles,
  ArrowRight,
  MessageSquare,
  Send,
  FileJson,
  FileCode,
  ChevronDown
} from 'lucide-react';
import Markdown from 'react-markdown';
import { extractTextFromFile } from './lib/fileParser';
import { polishResume, refineResume } from './services/resumeService';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';
// @ts-ignore
import html2pdf from 'html2pdf.js';
// @ts-ignore
import { asBlob } from 'html-docx-js-typescript';
import { saveAs } from 'file-saver';

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [polishedResume, setPolishedResume] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [refineInstruction, setRefineInstruction] = useState('');
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('preview');

  const resumeRef = useRef<HTMLDivElement>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError(null);
      setPolishedResume(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    },
    multiple: false
  });

  const handleProcess = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      const rawText = await extractTextFromFile(file);
      if (!rawText.trim()) {
        throw new Error("Could not extract any text from the file. Please try another file.");
      }
      const polished = await polishResume(rawText);
      setPolishedResume(polished);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while processing your resume.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRefine = async () => {
    if (!polishedResume || !refineInstruction.trim()) return;

    setIsRefining(true);
    setError(null);

    try {
      const refined = await refineResume(polishedResume, refineInstruction);
      setPolishedResume(refined);
      setRefineInstruction('');
    } catch (err: any) {
      console.error(err);
      setError("Failed to refine the resume. Please try again.");
    } finally {
      setIsRefining(false);
    }
  };

  const handleRapRemix = async () => {
    if (!polishedResume) return;
    setIsRefining(true);
    setError(null);
    try {
      const refined = await refineResume(
        polishedResume,
        "Recreate my entire resume in the form of a hip rap. Make sure to include many, many mentions of hotdogs!"
      );
      setPolishedResume(refined);
    } catch (err: any) {
      console.error(err);
      setError("Failed to remix the resume. Please try again.");
    } finally {
      setIsRefining(false);
    }
  };

  const handleCopy = () => {
    if (polishedResume) {
      navigator.clipboard.writeText(polishedResume);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const downloadFile = (type: 'md' | 'html' | 'pdf' | 'docx') => {
    if (!polishedResume) return;

    const fileName = 'polished-resume';

    if (type === 'md') {
      const blob = new Blob([polishedResume], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (type === 'html') {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Resume</title>
          <style>
            body { font-family: sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 800px; margin: 40px auto; padding: 20px; }
            h1 { font-size: 32px; border-bottom: 2px solid #eee; padding-bottom: 10px; text-transform: uppercase; }
            h2 { font-size: 20px; margin-top: 30px; text-transform: uppercase; color: #444; }
            ul { padding-left: 20px; }
            li { margin-bottom: 5px; }
          </style>
        </head>
        <body>
          ${resumeRef.current?.innerHTML || ''}
        </body>
        </html>
      `;
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (type === 'pdf') {
      const element = resumeRef.current;
      const opt = {
        margin: 1,
        filename: `${fileName}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' as const }
      };
      html2pdf().set(opt).from(element).save();
    } else if (type === 'docx') {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Resume</title>
        </head>
        <body>
          ${resumeRef.current?.innerHTML || ''}
        </body>
        </html>
      `;
      asBlob(htmlContent).then((data: Blob) => {
        saveAs(data, `${fileName}.docx`);
      }).catch((err: Error) => {
        console.error("Error generating DOCX", err);
        setError("Failed to generate DOCX file.");
      });
    }
    setShowDownloadMenu(false);
  };

  const reset = () => {
    setFile(null);
    setPolishedResume(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-[#1a1a1a] font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-black/5 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/hotdog_profile.png" alt="Happy Hotdog" className="w-10 h-10 rounded-full object-cover border-2 border-orange-500" />
            <h1 className="text-xl font-semibold tracking-tight text-orange-600">Shane Wyman's Hotdog Polisher</h1>
          </div>
          <div className="flex items-center gap-4 text-sm text-black/50 font-medium uppercase tracking-wider">
            <span>Mustard Powered</span>
            <div className="w-1 h-1 bg-black/20 rounded-full" />
            <span>Premium Franks</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 relative">
        <img src="/hotdog_decorative.png" alt="" className="absolute -z-10 top-0 right-0 w-64 opacity-20 pointer-events-none" />
        <AnimatePresence mode="wait">
          {!polishedResume ? (
            <motion.div
              key="upload-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="text-center space-y-3 max-w-2xl mx-auto">
                <h2 className="text-4xl font-light tracking-tight text-black sm:text-5xl">
                  Transform your hotdog narrative, Shane.
                </h2>
                <p className="text-lg text-black/60 font-light">
                  Upload your raw recipe or draft dog concepts. Our Mustard AI will refine the flavor,
                  structure, and impact to help your franks stand out.
                </p>
                <div className="pt-4 pb-8 flex justify-center">
                  <img src="/hotdog_hero.png" alt="Delicious Hotdog" className="w-full max-w-md rounded-2xl shadow-xl object-cover h-64 border border-black/10" />
                </div>
              </div>

              <div className="max-w-xl mx-auto">
                <div
                  {...getRootProps()}
                  className={cn(
                    "relative group cursor-pointer rounded-3xl border-2 border-dashed transition-all duration-300 p-12 flex flex-col items-center justify-center gap-4",
                    isDragActive
                      ? "border-emerald-500 bg-emerald-50/50"
                      : "border-black/10 bg-white hover:border-black/20 hover:shadow-xl hover:shadow-black/5"
                  )}
                >
                  <input {...getInputProps()} />
                  <div className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center transition-colors duration-300",
                    isDragActive ? "bg-orange-100 text-orange-600" : "bg-black/5 text-black/40 group-hover:bg-black/10 group-hover:text-black/60"
                  )}>
                    {file ? <FileText size={32} /> : <FileUp size={32} />}
                  </div>

                  <div className="text-center">
                    <p className="text-lg font-medium">
                      {file ? file.name : "Drop your file here"}
                    </p>
                    <p className="text-sm text-black/40 mt-1">
                      {file
                        ? `${(file.size / 1024).toFixed(1)} KB`
                        : "Supports PDF, DOCX, and TXT"}
                    </p>
                  </div>

                  {file && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProcess();
                      }}
                      disabled={isProcessing}
                      className="mt-4 px-8 py-3 bg-black text-white rounded-full font-medium flex items-center gap-2 hover:bg-black/80 disabled:bg-black/40 transition-all active:scale-95"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="animate-spin" size={18} />
                          Grilling...
                        </>
                      ) : (
                        <>
                          Polish Hotdog Strategy
                          <ArrowRight size={18} />
                        </>
                      )}
                    </button>
                  )}
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-700"
                  >
                    <AlertCircle className="shrink-0 mt-0.5" size={18} />
                    <p className="text-sm font-medium">{error}</p>
                  </motion.div>
                )}
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
                {[
                  { title: "Impactful Flavor", desc: "Replaces bland relish with high-impact mustard verbs." },
                  { title: "Smart Bun Structuring", desc: "Organizes your toppings into a scannable, delicious layout." },
                  { title: "Grill Focused", desc: "Highlights quantifiable grill marks to showcase your true wiener shape." }
                ].map((feature, i) => (
                  <div key={i} className="bg-white p-6 rounded-2xl border border-orange-500/20 shadow-sm hover:shadow-md transition-shadow">
                    <h3 className="font-semibold mb-2 text-orange-700">{feature.title}</h3>
                    <p className="text-sm text-black/60 leading-relaxed">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="result-section"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Mobile Tab Switcher */}
              <div className="lg:hidden flex p-1 bg-black/5 rounded-2xl mb-4">
                <button
                  onClick={() => setActiveTab('preview')}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all",
                    activeTab === 'preview' ? "bg-white shadow-sm text-black" : "text-black/40"
                  )}
                >
                  Preview
                </button>
                <button
                  onClick={() => setActiveTab('edit')}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all",
                    activeTab === 'edit' ? "bg-white shadow-sm text-black" : "text-black/40"
                  )}
                >
                  Edit & AI
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Sidebar Controls - Hidden on mobile unless 'edit' tab active */}
                <div className={cn(
                  "lg:col-span-4 space-y-6 lg:sticky lg:top-24",
                  activeTab !== 'edit' && "hidden lg:block"
                )}>
                  <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm space-y-6">
                    <div className="hidden lg:block">
                      <h3 className="text-lg font-semibold mb-1 text-orange-600 flex items-center gap-2">
                        <CheckCircle2 size={20} />
                        Grilled & Ready
                      </h3>
                      <p className="text-sm text-black/50">Review and refine the Mustard-generated content.</p>
                    </div>

                    {/* Refinement AI */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-black/40 mb-1">
                        <MessageSquare size={14} />
                        AI Refinement
                      </div>
                      <div className="relative">
                        <textarea
                          value={refineInstruction}
                          onChange={(e) => setRefineInstruction(e.target.value)}
                          placeholder="e.g., 'Make it spicier', 'Add a section for my relish work'..."
                          className="w-full p-4 bg-black/5 border border-transparent focus:border-orange-500/30 focus:bg-white rounded-2xl text-sm resize-none h-24 transition-all outline-none"
                        />
                        <button
                          onClick={handleRefine}
                          disabled={isRefining || !refineInstruction.trim()}
                          className="absolute bottom-3 right-3 p-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 disabled:bg-black/10 disabled:text-black/30 transition-all active:scale-90"
                        >
                          {isRefining ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      <button
                        onClick={handleCopy}
                        className="w-full py-3 px-4 bg-black text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-black/80 transition-all active:scale-95"
                      >
                        {copySuccess ? (
                          <>
                            <CheckCircle2 size={18} />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy size={18} />
                            Copy Markdown
                          </>
                        )}
                      </button>

                      <div className="relative">
                        <button
                          onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                          className="w-full py-3 px-4 bg-white border border-black/10 text-black rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-black/5 transition-all active:scale-95"
                        >
                          <Download size={18} />
                          Download As...
                          <ChevronDown size={16} className={cn("transition-transform", showDownloadMenu && "rotate-180")} />
                        </button>

                        <AnimatePresence>
                          {showDownloadMenu && (
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                              className="absolute z-30 top-full left-0 right-0 mt-2 bg-white border border-black/10 rounded-2xl shadow-xl overflow-hidden"
                            >
                              <button onClick={() => downloadFile('pdf')} className="w-full px-4 py-3 text-left text-sm hover:bg-black/5 flex items-center gap-3 transition-colors">
                                <FileText size={16} className="text-red-500" /> PDF Document
                              </button>
                              <button onClick={() => downloadFile('docx')} className="w-full px-4 py-3 text-left text-sm hover:bg-black/5 flex items-center gap-3 transition-colors border-t border-black/5">
                                <FileText size={16} className="text-blue-600" /> Word Document (DOCX)
                              </button>
                              <button onClick={() => downloadFile('md')} className="w-full px-4 py-3 text-left text-sm hover:bg-black/5 flex items-center gap-3 transition-colors border-t border-black/5">
                                <FileCode size={16} className="text-blue-500" /> Markdown File
                              </button>
                              <button onClick={() => downloadFile('html')} className="w-full px-4 py-3 text-left text-sm hover:bg-black/5 flex items-center gap-3 transition-colors border-t border-black/5">
                                <FileJson size={16} className="text-orange-500" /> HTML Web Page
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <button
                        onClick={reset}
                        className="w-full py-3 px-4 bg-white border border-black/10 text-black rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-black/5 transition-all active:scale-95"
                      >
                        <RefreshCw size={18} />
                        Start Over
                      </button>

                      <button
                        onClick={handleRapRemix}
                        disabled={isRefining}
                        className="w-full py-3 px-4 bg-orange-100 border border-orange-200 text-orange-800 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-orange-200 transition-all active:scale-95"
                      >
                        {isRefining ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                        Turn into a Rap Song
                      </button>
                    </div>
                  </div>
                </div>

                {/* Preview Area - Hidden on mobile unless 'preview' tab active */}
                <div className={cn(
                  "lg:col-span-8",
                  activeTab !== 'preview' && "hidden lg:block"
                )}>
                  <div className="bg-white rounded-3xl border border-black/5 shadow-2xl shadow-black/5 overflow-hidden">
                    <div className="bg-black/[0.02] px-6 lg:px-8 py-4 border-b border-black/5 flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-widest text-black/30">Preview Mode</span>
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-black/10" />
                        <div className="w-2.5 h-2.5 rounded-full bg-black/10" />
                        <div className="w-2.5 h-2.5 rounded-full bg-black/10" />
                      </div>
                    </div>
                    <div className="p-6 lg:p-12 prose prose-slate max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-p:text-black/70 prose-li:text-black/70 overflow-x-auto">
                      <div className="markdown-body" ref={resumeRef}>
                        <Markdown>{polishedResume}</Markdown>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-6 py-12 border-t border-black/5 text-center">
        <p className="text-sm text-black/30 font-medium flex items-center justify-center gap-2">
          <span>Crafted with Mustard AI for Shane Wyman.</span>
          <img src="/hotdog_decorative.png" className="w-6 h-6 inline-block" alt="hotdog icon" />
        </p>
      </footer>
    </div>
  );
}
