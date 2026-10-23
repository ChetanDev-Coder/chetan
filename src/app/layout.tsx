import type { Metadata } from 'next';
import './globals.css';
import { RoleProvider } from '@/components/RoleContext';
import { IntegrationsBanner } from '@/components/IntegrationsBanner';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'RescueGrid AI — Autonomous Food Rescue & Redistribution Platform',
  description:
    'An agentic food rescue platform coordinating surplus commercial food donations with eligible recipient organizations through intelligent recommendations, controlled automation, and verified delivery tracking.',
  keywords: [
    'food rescue',
    'agentic AI',
    'food redistribution',
    'hunger relief',
    'surplus food',
    'Gemini API',
    'sustainability',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-[#fbfbf9] text-[#141f17]">
        <RoleProvider>
          <IntegrationsBanner />
          <Navbar />
          <main className="flex-1 pb-16">{children}</main>
          <Footer />
        </RoleProvider>
      </body>
    </html>
  );
}
