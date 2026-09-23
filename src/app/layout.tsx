import './globals.css';
import Navbar from '@/components/Navbar';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Interview Prep Kit | Automated Personalised Prep Generator',
  description:
    'Turn any job description and company URL into a structured, editable, multi-day interview preparation kit.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">{children}</main>
        <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
          AI Interview Prep Kit Generator &copy; 2026. Appendix A & B Schema Compliant.
        </footer>
      </body>
    </html>
  );
}
