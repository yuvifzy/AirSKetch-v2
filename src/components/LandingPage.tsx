import { Link } from 'react-router-dom';
import { Layers, Zap, Route, ShieldAlert, Cpu } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LandingPage() {
    return (
        <div className="min-h-screen canvas-dots relative flex flex-col font-brutal text-black overflow-y-auto overflow-x-hidden">
            {/* Top Navigation Bar */}
            <nav className="w-full flex items-center justify-between p-6 z-20">
                <div className="flex items-center gap-3">
                    <div className="bg-brutal-primary w-12 h-12 flex items-center justify-center brutal-border shadow-brutal translate-y-[-2px]">
                        <Layers size={28} className="text-white" strokeWidth={3} />
                    </div>
                    <h1 className="text-3xl font-black tracking-tight">AIR <span className="italic">SKETCH</span></h1>
                </div>
                <div className="hidden md:flex items-center gap-6 text-sm font-bold opacity-60 uppercase tracking-widest">
                    <span>CODE ATLAS</span>
                    <span>·</span>
                    <span>EdgeIQ</span>
                    <span>·</span>
                    <span className="flex items-center gap-2 text-brutal-green">
                        <div className="w-2 h-2 rounded-full bg-brutal-green animate-pulse"></div>
                        Edge Ready
                    </span>
                </div>
            </nav>

            {/* Main Stage */}
            <main className="flex-1 flex flex-col items-center justify-center p-6 z-10 w-full max-w-6xl mx-auto -mt-12">
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="flex flex-col items-center text-center relative"
                >
                    {/* Badge */}
                    <div className="bg-brutal-primary text-white font-bold px-6 py-2 brutal-border shadow-brutal flex items-center gap-2 mb-8 rotate-[-2deg]">
                        GAMIFIED DRONE ROUTE OPTIMIZER
                    </div>

                    {/* Massive Title */}
                    <div className="relative mb-6">
                        <h1 className="text-7xl md:text-9xl font-black tracking-tighter mix-blend-multiply opacity-90">
                            AIR
                        </h1>
                        <div className="absolute top-1/2 left-[80%] md:left-[90%] -translate-y-1/2 -rotate-3">
                            <div className="bg-brutal-primary text-white px-6 py-2 text-6xl md:text-8xl font-black brutal-border shadow-brutal whitespace-nowrap">
                                SKETCH
                            </div>
                        </div>
                    </div>

                    {/* Fly Badge */}
                    <div className="bg-black text-white font-black text-4xl px-8 py-3 brutal-border absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-8 z-10 rotate-3 shadow-brutal-md">
                        Fly.
                    </div>
                </motion.div>

                {/* Subtitle */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="max-w-xl text-center mt-16 text-lg font-medium opacity-80 leading-relaxed"
                >
                    Design drone flight paths through a living city. Dodge no-fly zones, avoid mid-air collisions, and let edge AI score your routes — all in real time, entirely on-device.
                </motion.p>

                {/* Call to Action */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mt-12 mb-20"
                >
                    <div className="relative group">
                        <Link to="/app" className="block bg-brutal-green text-black font-black text-2xl px-12 py-5 brutal-border shadow-brutal-lg transition-transform hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[12px_12px_0_0_rgba(0,0,0,1)] active:translate-y-1 active:translate-x-1 active:shadow-brutal z-20 relative flex items-center gap-4">
                            Start Sketching
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter">
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                <polyline points="12 5 19 12 12 19"></polyline>
                            </svg>
                        </Link>
                        {/* Decorative background element behind button mimicking shadow that doesn't move */}
                    </div>
                    <p className="text-center font-bold text-sm opacity-50 mt-6 tracking-wide">
                        No login required · Works offline
                    </p>
                </motion.div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 w-full px-4 pt-12 pb-24">
                    <FeatureCard
                        icon={<Route size={32} />}
                        title="SKETCH FLIGHT PATHS"
                        desc="Draw drone routes freehand on an interactive city map. Like Freeways, but for the sky."
                    />
                    <FeatureCard
                        icon={<ShieldAlert size={32} />}
                        title="AVOID NO-FLY ZONES"
                        desc="Navigate around restricted airspace, military zones, and temporary VIP corridors in real time."
                    />
                    <FeatureCard
                        icon={<Zap size={32} />}
                        title="REAL-TIME SCORING"
                        desc="Instant feedback on efficiency, safety, and energy. Edge AI scores your paths on-device."
                    />
                    <FeatureCard
                        icon={<Cpu size={32} />}
                        title="EDGE AI OPTIMIZED"
                        desc="Compare your routes against algorithm-generated paths. All inference runs at the edge."
                    />
                </div>
            </main>

            {/* Background Decorations simulating the map */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-30">
                {/* Curved paths mimicking routes */}
                <svg className="absolute w-full h-full" xmlns="http://www.w3.org/2000/svg">
                    <path d="M-100 200 Q 400 300 800 100 T 1500 400" stroke="black" strokeWidth="4" fill="none" strokeDasharray="10 15" />
                    <path d="M300 800 Q 500 500 1000 600 T 1600 200" stroke="black" strokeWidth="8" fill="none" />
                </svg>
                {/* Simulated No Fly Zone */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-4 border-brutal-red border-dashed rounded-full flex items-center justify-center opacity-50 bg-brutal-red/10">
                    <span className="text-brutal-red font-black text-center leading-tight uppercase tracking-widest bg-[#efece5] px-2 py-1">
                        Restricted<br />Airspace
                    </span>
                </div>
                {/* Drone stand-ins */}
                <div className="absolute top-[30%] left-[60%] w-6 h-4 bg-brutal-primary brutal-border rotate-45"></div>
                <div className="absolute top-[60%] left-[20%] w-6 h-4 bg-brutal-yellow brutal-border -rotate-12"></div>
            </div>

            {/* Footer */}
            <footer className="w-full py-6 flex justify-center text-xs font-bold tracking-[0.2em] opacity-40 uppercase absolute bottom-0 z-10">
                REACT + VITE · KONVA.JS · TENSORFLOW.JS · EDGE IMPULSE
            </footer>
        </div>
    );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
    return (
        <motion.div
            whileHover={{ y: -5 }}
            className="bg-white brutal-border shadow-brutal p-6 flex flex-col gap-4 z-10 hover:shadow-brutal-lg transition-all"
        >
            <div className="w-14 h-14 bg-brutal-bg brutal-border flex items-center justify-center text-black mb-2">
                {icon}
            </div>
            <h3 className="font-black text-xl leading-tight">{title}</h3>
            <p className="font-medium text-sm opacity-80 leading-relaxed">
                {desc}
            </p>
        </motion.div>
    );
}
