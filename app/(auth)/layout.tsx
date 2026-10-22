import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex justify-center mb-8" aria-label="Home">
          <Image src="/logo-black-_1_.svg" width={140} height={40} alt="logo" className="dark:invert" />
        </Link>
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
          {children}
        </div>
      </div>
    </main>
  );
}
