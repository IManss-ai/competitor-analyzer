import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 px-4">
        {/* Brand */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <span className="text-white font-semibold text-xl tracking-tight">TDCR</span>
          </div>
          <p className="text-slate-400 text-sm">Training Data Compliance Registry</p>
        </div>

        {/* Clerk sign-in */}
        <SignIn
          appearance={{
            elements: {
              rootBox: "shadow-2xl",
              card: "bg-slate-900/80 border border-slate-700/50 backdrop-blur-xl shadow-2xl",
              headerTitle: "text-white",
              headerSubtitle: "text-slate-400",
              socialButtonsBlockButton:
                "bg-slate-800 border-slate-700 text-white hover:bg-slate-700",
              dividerLine: "bg-slate-700",
              dividerText: "text-slate-500",
              formFieldLabel: "text-slate-300",
              formFieldInput:
                "bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500",
              formButtonPrimary:
                "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg",
              footerActionLink: "text-indigo-400 hover:text-indigo-300",
              identityPreviewText: "text-white",
              identityPreviewEditButton: "text-indigo-400",
            },
          }}
        />
      </div>
    </main>
  );
}
