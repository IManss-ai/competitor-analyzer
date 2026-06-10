import { Metadata } from 'next';
import DiscoverClient from './discover-client';

export const metadata: Metadata = {
  title: 'Discover web apps — Rivalscope',
  description: 'Search a database of web apps and SaaS by category, pricing, tech stack, and shipping velocity.',
};

export default function DiscoverPage() {
  return <DiscoverClient />;
}
