import Link from "next/link";
import { Story, TopBar } from "@/components/AuthShell";

export default function Home() {
  return (
    <>
      <TopBar />
      <div className="gate intro">
        <Story animate />
        <div className="authcard reveal">
          <h2 className="text-2xl font-bold">Get started</h2>
          <p className="mt-2 text-ink-2">Students find and claim food. Dining halls and cafés post what&apos;s left.</p>
          <div className="mt-6 flex flex-col gap-3">
            <Link href="/signup" className="btn">Create an account</Link>
            <Link href="/login" className="btn ghost">Sign in</Link>
          </div>
        </div>
      </div>
    </>
  );
}
