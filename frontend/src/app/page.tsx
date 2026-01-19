'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileVideo, Zap, FileText, Share2, Layers, Mic, Upload, Brain, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';
import { motion, ScrollReveal, StaggerContainer, StaggerItem, Float, AnimatedCard } from '@/components/ui/animations';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="border-b-2 border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50"
      >
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-3 group">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 bg-primary rounded-sm flex items-center justify-center border-2 border-line shadow-blueprint transition-shadow group-hover:shadow-glow"
            >
              <Layers className="h-5 w-5 text-primary-foreground stroke-[1.5]" />
            </motion.div>
            <span className="font-mono font-bold text-xl tracking-tight">
              <span className="text-foreground">Blueprint</span>
              <span className="text-line">AI</span>
            </span>
          </Link>
          <div className="space-x-4">
            <Link href="/login">
              <Button variant="ghost" className="hover-lift">Login</Button>
            </Link>
            <Link href="/register">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button className="press-effect">Get Started</Button>
              </motion.div>
            </Link>
          </div>
        </div>
      </motion.header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Animated grid background */}
        <div className="absolute inset-0 bg-blueprint-grid-lg opacity-30" />
        <motion.div
          className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
        />

        <div className="relative container mx-auto px-4 py-24 text-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-block mb-6 px-4 py-2 border-2 border-line rounded-sm bg-line/5 hover-glow"
          >
            <span className="font-mono text-sm text-line uppercase tracking-widest flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              AI-Powered Documentation
            </span>
          </motion.div>

          <motion.h2
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-6xl font-mono font-bold mb-6"
          >
            Turn Recordings into
            <motion.span
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-gradient block mt-2"
            >
              Technical Blueprints
            </motion.span>
          </motion.h2>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-muted-foreground mb-4 max-w-2xl mx-auto"
          >
            Upload screen recordings or audio instructions and let AI automatically create
            step-by-step procedures with annotated screenshots and precise documentation.
          </motion.p>

          {/* Input types badges */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex items-center justify-center gap-4 mb-8"
          >
            <motion.div
              whileHover={{ scale: 1.05, y: -2 }}
              className="flex items-center gap-2 px-3 py-1.5 bg-card border-2 border-border rounded-sm hover:border-line transition-colors cursor-default"
            >
              <FileVideo className="h-4 w-4 text-line" />
              <span className="text-sm font-mono">Video</span>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05, y: -2 }}
              className="flex items-center gap-2 px-3 py-1.5 bg-card border-2 border-border rounded-sm hover:border-line transition-colors cursor-default"
            >
              <Mic className="h-4 w-4 text-line" />
              <span className="text-sm font-mono">Audio</span>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Link href="/register">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button size="lg" className="text-lg px-8 py-6 hover-glow">
                  Start Creating Blueprints
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* How It Works - Redesigned */}
      <section className="py-24 bg-card border-y-2 border-border">
        <div className="container mx-auto px-4">
          <ScrollReveal direction="up" className="text-center mb-16">
            <h3 className="text-3xl font-mono font-bold mb-4 uppercase tracking-tight">
              How It Works
            </h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Transform any workflow recording into professional documentation in minutes.
              Whether you prefer screen recordings or voice instructions, BlueprintAI handles it all.
            </p>
          </ScrollReveal>

          {/* Steps */}
          <div className="max-w-5xl mx-auto">
            {/* Step 1 */}
            <ScrollReveal direction="left" className="relative grid md:grid-cols-2 gap-8 items-center mb-16">
              <AnimatedCard className="relative p-8 bg-background border-2 border-border rounded-sm card-shine">
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
                  <StaggerContainer staggerDelay={0.1} className="space-y-2">
                    <StaggerItem className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span>Screen recordings (MP4, MOV, WebM)</span>
                    </StaggerItem>
                    <StaggerItem className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span>Audio instructions (MP3, WAV, M4A)</span>
                    </StaggerItem>
                    <StaggerItem className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span>Support for long recordings up to 5GB</span>
                    </StaggerItem>
                  </StaggerContainer>
                </div>
              </AnimatedCard>
              <div className="hidden md:flex items-center justify-center">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="relative w-48 h-48 bg-background border-2 border-border rounded-sm flex items-center justify-center hover:border-line transition-colors"
                >
                  <div className="absolute inset-0 bg-blueprint-grid opacity-50" />
                  <div className="relative flex gap-4">
                    <Float>
                      <FileVideo className="h-12 w-12 text-line" />
                    </Float>
                    <Float>
                      <Mic className="h-12 w-12 text-line" style={{ animationDelay: '0.5s' }} />
                    </Float>
                  </div>
                </motion.div>
              </div>
            </ScrollReveal>

            {/* Connector */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="hidden md:flex justify-center mb-16"
            >
              <motion.div
                animate={{ y: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <ArrowRight className="h-8 w-8 text-line rotate-90" />
              </motion.div>
            </motion.div>

            {/* Step 2 */}
            <ScrollReveal direction="right" className="relative grid md:grid-cols-2 gap-8 items-center mb-16">
              <div className="hidden md:flex items-center justify-center order-1 md:order-none">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="relative w-48 h-48 bg-background border-2 border-border rounded-sm flex items-center justify-center hover:border-line transition-colors"
                >
                  <div className="absolute inset-0 bg-blueprint-grid opacity-50" />
                  <motion.div
                    animate={{
                      scale: [1, 1.1, 1],
                      opacity: [1, 0.7, 1],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="relative"
                  >
                    <Brain className="h-16 w-16 text-line" />
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      animate={{
                        boxShadow: [
                          '0 0 0 0 rgba(34, 211, 238, 0.4)',
                          '0 0 0 20px rgba(34, 211, 238, 0)',
                        ],
                      }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  </motion.div>
                </motion.div>
              </div>
              <AnimatedCard className="relative p-8 bg-background border-2 border-border rounded-sm card-shine">
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
                  <StaggerContainer staggerDelay={0.1} className="space-y-2">
                    <StaggerItem className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span>Automatic scene detection & frame extraction</span>
                    </StaggerItem>
                    <StaggerItem className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span>Click location identification with markers</span>
                    </StaggerItem>
                    <StaggerItem className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span>Speech-to-text with context understanding</span>
                    </StaggerItem>
                  </StaggerContainer>
                </div>
              </AnimatedCard>
            </ScrollReveal>

            {/* Connector */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="hidden md:flex justify-center mb-16"
            >
              <motion.div
                animate={{ y: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
              >
                <ArrowRight className="h-8 w-8 text-line rotate-90" />
              </motion.div>
            </motion.div>

            {/* Step 3 */}
            <ScrollReveal direction="left" className="relative grid md:grid-cols-2 gap-8 items-center mb-16">
              <AnimatedCard className="relative p-8 bg-background border-2 border-border rounded-sm card-shine">
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
                  <StaggerContainer staggerDelay={0.1} className="space-y-2">
                    <StaggerItem className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span>Numbered steps with clear descriptions</span>
                    </StaggerItem>
                    <StaggerItem className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span>Screenshots with numbered click annotations</span>
                    </StaggerItem>
                    <StaggerItem className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span>Drag-and-drop step reordering</span>
                    </StaggerItem>
                  </StaggerContainer>
                </div>
              </AnimatedCard>
              <div className="hidden md:flex items-center justify-center">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="relative w-48 h-48 bg-background border-2 border-border rounded-sm p-4 hover:border-line transition-colors overflow-hidden"
                >
                  <div className="absolute inset-0 bg-blueprint-grid opacity-50" />
                  <StaggerContainer staggerDelay={0.15} className="relative space-y-2">
                    <StaggerItem>
                      <div className="h-3 bg-line/20 rounded-sm w-full" />
                    </StaggerItem>
                    <StaggerItem>
                      <div className="h-3 bg-line/20 rounded-sm w-3/4" />
                    </StaggerItem>
                    <StaggerItem>
                      <div className="h-16 bg-line/10 rounded-sm w-full border border-line/30" />
                    </StaggerItem>
                    <StaggerItem>
                      <div className="h-3 bg-line/20 rounded-sm w-5/6" />
                    </StaggerItem>
                    <StaggerItem>
                      <div className="h-3 bg-line/20 rounded-sm w-2/3" />
                    </StaggerItem>
                  </StaggerContainer>
                </motion.div>
              </div>
            </ScrollReveal>

            {/* Connector */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="hidden md:flex justify-center mb-16"
            >
              <motion.div
                animate={{ y: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
              >
                <ArrowRight className="h-8 w-8 text-line rotate-90" />
              </motion.div>
            </motion.div>

            {/* Step 4 */}
            <ScrollReveal direction="right" className="relative grid md:grid-cols-2 gap-8 items-center">
              <div className="hidden md:flex items-center justify-center order-1 md:order-none">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="relative w-48 h-48 bg-background border-2 border-border rounded-sm flex items-center justify-center gap-6 hover:border-line transition-colors"
                >
                  <div className="absolute inset-0 bg-blueprint-grid opacity-50" />
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="relative flex flex-col items-center gap-2"
                  >
                    <div className="w-12 h-12 bg-line/10 rounded-sm border-2 border-line flex items-center justify-center hover:bg-line/20 transition-colors">
                      <span className="font-mono font-bold text-line text-xs">PDF</span>
                    </div>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: -5 }}
                    className="relative flex flex-col items-center gap-2"
                  >
                    <div className="w-12 h-12 bg-line/10 rounded-sm border-2 border-line flex items-center justify-center hover:bg-line/20 transition-colors">
                      <span className="font-mono font-bold text-line text-[10px]">Notion</span>
                    </div>
                  </motion.div>
                </motion.div>
              </div>
              <AnimatedCard className="relative p-8 bg-background border-2 border-border rounded-sm card-shine">
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
                  <StaggerContainer staggerDelay={0.1} className="space-y-2">
                    <StaggerItem className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span>One-click Notion integration</span>
                    </StaggerItem>
                    <StaggerItem className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span>PDF export with images and annotations</span>
                    </StaggerItem>
                    <StaggerItem className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span>Track export history</span>
                    </StaggerItem>
                  </StaggerContainer>
                </div>
              </AnimatedCard>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Input Types Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <ScrollReveal direction="up" className="text-center mb-16">
            <h3 className="text-3xl font-mono font-bold mb-4 uppercase tracking-tight">
              Multiple Input Methods
            </h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Choose the method that fits your workflow best
            </p>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Video Input */}
            <ScrollReveal direction="left" delay={0.1}>
              <AnimatedCard className="relative p-8 bg-card border-2 border-border rounded-sm group hover:border-line transition-all duration-300 card-shine h-full">
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-line opacity-0 group-hover:opacity-100 transition-opacity"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-line opacity-0 group-hover:opacity-100 transition-opacity"
                />

                <motion.div
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  className="w-16 h-16 rounded-sm bg-primary/10 border-2 border-primary/20 flex items-center justify-center mb-6 group-hover:border-line transition-colors"
                >
                  <FileVideo className="h-8 w-8 text-line stroke-[1.5]" />
                </motion.div>
                <h4 className="font-mono font-bold text-xl uppercase tracking-wide mb-3">Screen Recordings</h4>
                <p className="text-muted-foreground mb-4">
                  Perfect for software tutorials, process documentation, and any visual workflow.
                  AI detects every click, scroll, and UI change.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <motion.span
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-1.5 h-1.5 bg-line rounded-full"
                    />
                    Automatic screenshot extraction
                  </li>
                  <li className="flex items-center gap-2">
                    <motion.span
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
                      className="w-1.5 h-1.5 bg-line rounded-full"
                    />
                    Click position detection
                  </li>
                  <li className="flex items-center gap-2">
                    <motion.span
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
                      className="w-1.5 h-1.5 bg-line rounded-full"
                    />
                    Scene change detection
                  </li>
                </ul>
              </AnimatedCard>
            </ScrollReveal>

            {/* Audio Input */}
            <ScrollReveal direction="right" delay={0.2}>
              <AnimatedCard className="relative p-8 bg-card border-2 border-border rounded-sm group hover:border-line transition-all duration-300 card-shine h-full">
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  className="absolute top-0 left-0 w-4 h-4 border-l-2 border-t-2 border-line opacity-0 group-hover:opacity-100 transition-opacity"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  className="absolute bottom-0 right-0 w-4 h-4 border-r-2 border-b-2 border-line opacity-0 group-hover:opacity-100 transition-opacity"
                />

                <motion.div
                  whileHover={{ scale: 1.05, rotate: -5 }}
                  className="w-16 h-16 rounded-sm bg-primary/10 border-2 border-primary/20 flex items-center justify-center mb-6 group-hover:border-line transition-colors"
                >
                  <Mic className="h-8 w-8 text-line stroke-[1.5]" />
                </motion.div>
                <h4 className="font-mono font-bold text-xl uppercase tracking-wide mb-3">Audio Instructions</h4>
                <p className="text-muted-foreground mb-4">
                  Dictate your procedures naturally. Ideal for quick documentation,
                  verbal instructions, or when you can not record your screen.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <motion.span
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-1.5 h-1.5 bg-line rounded-full"
                    />
                    Automatic transcription
                  </li>
                  <li className="flex items-center gap-2">
                    <motion.span
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
                      className="w-1.5 h-1.5 bg-line rounded-full"
                    />
                    Step detection from speech
                  </li>
                  <li className="flex items-center gap-2">
                    <motion.span
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
                      className="w-1.5 h-1.5 bg-line rounded-full"
                    />
                    Multiple language support
                  </li>
                </ul>
              </AnimatedCard>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground py-20">
        <motion.div
          className="absolute inset-0 bg-blueprint-grid opacity-10"
          animate={{ backgroundPosition: ['0px 0px', '50px 50px'] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        />
        <div className="relative container mx-auto px-4 text-center">
          <ScrollReveal direction="up">
            <h3 className="text-3xl font-mono font-bold mb-4 uppercase tracking-tight">
              Ready to Save Hours on Documentation?
            </h3>
            <p className="text-xl mb-8 opacity-90">
              Create your first blueprint in minutes, not hours.
            </p>
            <Link href="/register">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button size="lg" variant="outline" className="text-lg px-8 border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>
            </Link>
          </ScrollReveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-2 border-border py-8 bg-card">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="flex items-center justify-center space-x-2 text-muted-foreground"
          >
            <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }}>
              <Layers className="h-4 w-4 text-line" />
            </motion.div>
            <span className="font-mono text-sm">BlueprintAI</span>
            <span className="text-border">|</span>
            <span className="text-sm">Powered by Claude AI</span>
          </motion.div>
        </div>
      </footer>
    </div>
  );
}
