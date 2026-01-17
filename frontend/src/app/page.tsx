'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileVideo, Zap, FileText, Share2, Layers, Mic, Upload, Brain, CheckCircle2, ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b-2 border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-sm flex items-center justify-center border-2 border-line shadow-blueprint">
              <Layers className="h-5 w-5 text-primary-foreground stroke-[1.5]" />
            </div>
            <span className="font-mono font-bold text-xl tracking-tight">
              <span className="text-foreground">Blueprint</span>
              <span className="text-line">AI</span>
            </span>
          </Link>
          <div className="space-x-4">
            <Link href="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Grid background */}
        <div className="absolute inset-0 bg-blueprint-grid-lg opacity-30" />

        <div className="relative container mx-auto px-4 py-24 text-center">
          <div className="inline-block mb-6 px-4 py-2 border-2 border-line rounded-sm bg-line/5">
            <span className="font-mono text-sm text-line uppercase tracking-widest">
              AI-Powered Documentation
            </span>
          </div>

          <h2 className="text-5xl md:text-6xl font-mono font-bold mb-6">
            Turn Recordings into
            <span className="text-line block mt-2">Technical Blueprints</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-4 max-w-2xl mx-auto">
            Upload screen recordings or audio instructions and let AI automatically create
            step-by-step procedures with annotated screenshots and precise documentation.
          </p>

          {/* Input types badges */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-card border-2 border-border rounded-sm">
              <FileVideo className="h-4 w-4 text-line" />
              <span className="text-sm font-mono">Video</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-card border-2 border-border rounded-sm">
              <Mic className="h-4 w-4 text-line" />
              <span className="text-sm font-mono">Audio</span>
            </div>
          </div>

          <Link href="/register">
            <Button size="lg" className="text-lg px-8 py-6">
              Start Creating Blueprints
            </Button>
          </Link>
        </div>
      </section>

      {/* How It Works - Redesigned */}
      <section className="py-24 bg-card border-y-2 border-border">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-mono font-bold mb-4 uppercase tracking-tight">
              How It Works
            </h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Transform any workflow recording into professional documentation in minutes.
              Whether you prefer screen recordings or voice instructions, BlueprintAI handles it all.
            </p>
          </div>

          {/* Steps */}
          <div className="max-w-5xl mx-auto">
            {/* Step 1 */}
            <div className="relative grid md:grid-cols-2 gap-8 items-center mb-16">
              <div className="relative p-8 bg-background border-2 border-border rounded-sm">
                <div className="absolute -top-4 -left-4 w-10 h-10 bg-primary rounded-sm flex items-center justify-center border-2 border-line font-mono font-bold text-primary-foreground">
                  01
                </div>
                <div className="pt-2">
                  <div className="flex items-center gap-3 mb-4">
                    <Upload className="h-6 w-6 text-line" />
                    <h4 className="font-mono font-bold text-xl uppercase tracking-wide">Upload Your Content</h4>
                  </div>
                  <p className="text-muted-foreground mb-4">
                    Choose your preferred input method. Upload screen recordings to capture visual workflows,
                    or use audio recordings to describe procedures verbally.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span>Screen recordings (MP4, MOV, WebM)</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span>Audio instructions (MP3, WAV, M4A)</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span>Support for long recordings up to 5GB</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="hidden md:flex items-center justify-center">
                <div className="relative w-48 h-48 bg-background border-2 border-border rounded-sm flex items-center justify-center">
                  <div className="absolute inset-0 bg-blueprint-grid opacity-50" />
                  <div className="relative flex gap-4">
                    <FileVideo className="h-12 w-12 text-line" />
                    <Mic className="h-12 w-12 text-line" />
                  </div>
                </div>
              </div>
            </div>

            {/* Connector */}
            <div className="hidden md:flex justify-center mb-16">
              <ArrowRight className="h-8 w-8 text-border rotate-90" />
            </div>

            {/* Step 2 */}
            <div className="relative grid md:grid-cols-2 gap-8 items-center mb-16">
              <div className="hidden md:flex items-center justify-center order-1 md:order-none">
                <div className="relative w-48 h-48 bg-background border-2 border-border rounded-sm flex items-center justify-center">
                  <div className="absolute inset-0 bg-blueprint-grid opacity-50" />
                  <Brain className="relative h-16 w-16 text-line animate-blueprint-pulse" />
                </div>
              </div>
              <div className="relative p-8 bg-background border-2 border-border rounded-sm">
                <div className="absolute -top-4 -left-4 w-10 h-10 bg-primary rounded-sm flex items-center justify-center border-2 border-line font-mono font-bold text-primary-foreground">
                  02
                </div>
                <div className="pt-2">
                  <div className="flex items-center gap-3 mb-4">
                    <Zap className="h-6 w-6 text-line" />
                    <h4 className="font-mono font-bold text-xl uppercase tracking-wide">AI Analysis</h4>
                  </div>
                  <p className="text-muted-foreground mb-4">
                    Claude AI processes your content with advanced understanding. For videos, it detects
                    UI changes, mouse clicks, and key actions. For audio, it transcribes and structures your instructions.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span>Automatic scene detection & frame extraction</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span>Click location identification with markers</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span>Speech-to-text with context understanding</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Connector */}
            <div className="hidden md:flex justify-center mb-16">
              <ArrowRight className="h-8 w-8 text-border rotate-90" />
            </div>

            {/* Step 3 */}
            <div className="relative grid md:grid-cols-2 gap-8 items-center mb-16">
              <div className="relative p-8 bg-background border-2 border-border rounded-sm">
                <div className="absolute -top-4 -left-4 w-10 h-10 bg-primary rounded-sm flex items-center justify-center border-2 border-line font-mono font-bold text-primary-foreground">
                  03
                </div>
                <div className="pt-2">
                  <div className="flex items-center gap-3 mb-4">
                    <FileText className="h-6 w-6 text-line" />
                    <h4 className="font-mono font-bold text-xl uppercase tracking-wide">Generate Blueprint</h4>
                  </div>
                  <p className="text-muted-foreground mb-4">
                    Get a complete, professional SOP with numbered steps, clear descriptions,
                    annotated screenshots, and visual click markers. Edit and refine as needed.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span>Numbered steps with clear descriptions</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span>Screenshots with numbered click annotations</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span>Drag-and-drop step reordering</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="hidden md:flex items-center justify-center">
                <div className="relative w-48 h-48 bg-background border-2 border-border rounded-sm p-4">
                  <div className="absolute inset-0 bg-blueprint-grid opacity-50" />
                  <div className="relative space-y-2">
                    <div className="h-3 bg-line/20 rounded-sm w-full" />
                    <div className="h-3 bg-line/20 rounded-sm w-3/4" />
                    <div className="h-16 bg-line/10 rounded-sm w-full border border-line/30" />
                    <div className="h-3 bg-line/20 rounded-sm w-5/6" />
                    <div className="h-3 bg-line/20 rounded-sm w-2/3" />
                  </div>
                </div>
              </div>
            </div>

            {/* Connector */}
            <div className="hidden md:flex justify-center mb-16">
              <ArrowRight className="h-8 w-8 text-border rotate-90" />
            </div>

            {/* Step 4 */}
            <div className="relative grid md:grid-cols-2 gap-8 items-center">
              <div className="hidden md:flex items-center justify-center order-1 md:order-none">
                <div className="relative w-48 h-48 bg-background border-2 border-border rounded-sm flex items-center justify-center gap-6">
                  <div className="absolute inset-0 bg-blueprint-grid opacity-50" />
                  <div className="relative flex flex-col items-center gap-2">
                    <div className="w-12 h-12 bg-line/10 rounded-sm border-2 border-line flex items-center justify-center">
                      <span className="font-mono font-bold text-line text-xs">PDF</span>
                    </div>
                  </div>
                  <div className="relative flex flex-col items-center gap-2">
                    <div className="w-12 h-12 bg-line/10 rounded-sm border-2 border-line flex items-center justify-center">
                      <span className="font-mono font-bold text-line text-[10px]">Notion</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative p-8 bg-background border-2 border-border rounded-sm">
                <div className="absolute -top-4 -left-4 w-10 h-10 bg-primary rounded-sm flex items-center justify-center border-2 border-line font-mono font-bold text-primary-foreground">
                  04
                </div>
                <div className="pt-2">
                  <div className="flex items-center gap-3 mb-4">
                    <Share2 className="h-6 w-6 text-line" />
                    <h4 className="font-mono font-bold text-xl uppercase tracking-wide">Export & Share</h4>
                  </div>
                  <p className="text-muted-foreground mb-4">
                    Share your blueprints with your team in the format that works best.
                    Export directly to Notion or download as a professionally formatted PDF.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span>One-click Notion integration</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span>PDF export with images and annotations</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span>Track export history</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Input Types Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-mono font-bold mb-4 uppercase tracking-tight">
              Multiple Input Methods
            </h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Choose the method that fits your workflow best
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Video Input */}
            <div className="relative p-8 bg-card border-2 border-border rounded-sm group hover:border-line transition-colors">
              <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-line opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-line opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="w-16 h-16 rounded-sm bg-primary/10 border-2 border-primary/20 flex items-center justify-center mb-6">
                <FileVideo className="h-8 w-8 text-line stroke-[1.5]" />
              </div>
              <h4 className="font-mono font-bold text-xl uppercase tracking-wide mb-3">Screen Recordings</h4>
              <p className="text-muted-foreground mb-4">
                Perfect for software tutorials, process documentation, and any visual workflow.
                AI detects every click, scroll, and UI change.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-line rounded-full" />
                  Automatic screenshot extraction
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-line rounded-full" />
                  Click position detection
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-line rounded-full" />
                  Scene change detection
                </li>
              </ul>
            </div>

            {/* Audio Input */}
            <div className="relative p-8 bg-card border-2 border-border rounded-sm group hover:border-line transition-colors">
              <div className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-line opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-line opacity-0 group-hover:opacity-100 transition-opacity" />

              <div className="w-16 h-16 rounded-sm bg-primary/10 border-2 border-primary/20 flex items-center justify-center mb-6">
                <Mic className="h-8 w-8 text-line stroke-[1.5]" />
              </div>
              <h4 className="font-mono font-bold text-xl uppercase tracking-wide mb-3">Audio Instructions</h4>
              <p className="text-muted-foreground mb-4">
                Dictate your procedures naturally. Ideal for quick documentation,
                verbal instructions, or when you can not record your screen.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-line rounded-full" />
                  Automatic transcription
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-line rounded-full" />
                  Step detection from speech
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-line rounded-full" />
                  Multiple language support
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground py-20">
        <div className="absolute inset-0 bg-blueprint-grid opacity-10" />
        <div className="relative container mx-auto px-4 text-center">
          <h3 className="text-3xl font-mono font-bold mb-4 uppercase tracking-tight">
            Ready to Save Hours on Documentation?
          </h3>
          <p className="text-xl mb-8 opacity-90">
            Create your first blueprint in minutes, not hours.
          </p>
          <Link href="/register">
            <Button size="lg" variant="outline" className="text-lg px-8 border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
              Get Started Free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-2 border-border py-8 bg-card">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 text-muted-foreground">
            <Layers className="h-4 w-4 text-line" />
            <span className="font-mono text-sm">BlueprintAI</span>
            <span className="text-border">|</span>
            <span className="text-sm">Powered by Claude AI</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
