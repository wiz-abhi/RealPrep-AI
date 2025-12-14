import React from 'react';
import { Navbar } from './Navbar';

interface AppLayoutProps {
    children: React.ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
    return (
        <div className="min-h-screen w-full bg-[#050505] text-white relative selection:bg-[#00f3ff]/30">
            {/* Background Gradients */}
            <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-[#00f3ff]/10 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-[#bc13fe]/10 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2 pointer-events-none" />

            <Navbar />

            <main className="container mx-auto pt-32 px-4 pb-12 relative z-10">
                {children}
            </main>
        </div>
    );
};
