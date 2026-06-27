import Link from 'next/link';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function BillingSuccessPage() {
  return (
    <div className="flex items-center justify-center min-h-[70vh] px-4">
      <Card className="max-w-md w-full text-center">
        <CardContent className="flex flex-col items-center pt-8 pb-8 gap-6">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
            <CheckCircle2 size={28} className="text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              You&apos;re all set!
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              You&apos;re on Rivalscope Pro. You&apos;ll receive your first intelligence digest next Monday. Welcome aboard.
            </p>
          </div>
          <Button asChild size="lg" className="w-full gap-2">
            <Link href="/dashboard">
              Go to dashboard
              <ArrowRight size={16} />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
