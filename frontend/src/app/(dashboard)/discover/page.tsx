import { Metadata } from 'next';
import Topbar from '@/components/topbar';
import DiscoverClient from './discover-client';

export const metadata: Metadata = {
  title: 'Discover web apps — Rivalscope',
  description: 'Search a database of web apps and SaaS by category, pricing, tech stack, and shipping velocity.',
};

export default function DiscoverPage() {
  return (
    <div className="pb-12">
      <Topbar title="Discover" subtitle="Search web apps by category, pricing, and tech stack" />
      <DiscoverClient />
    </div>
  );
}
