import Image from "next/image";
import Link from "next/link";

export const metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-12">
      <article className="mx-auto w-full max-w-2xl rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 sm:p-10 shadow-sm text-gray-800 dark:text-gray-200">
        <Link href="/" className="flex mb-8" aria-label="Home">
          <Image src="/logo-black-_1_.svg" width={140} height={40} alt="logo" className="dark:invert" />
        </Link>
        <h1 className="text-2xl font-bold mb-2">Privacy policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: 22 October 2026</p>

        <h2 className="text-lg font-semibold mt-6 mb-2">What we collect</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Your email address and password (the password is stored only as a hash).</li>
          <li>If you sign in with Google: your name, email address and profile picture.</li>
          <li>What you create in the app: teams, files (documents and whiteboards), invitations and share links.</li>
        </ul>

        <h2 className="text-lg font-semibold mt-6 mb-2">How we use it</h2>
        <p>
          Only to run the app: to sign you in, show your name and picture, and store and share your files with the
          people you choose. We do not sell your data, show ads, or use analytics trackers.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">Where it is stored</h2>
        <p>
          On a private server run by the operator of this site. Access to each team&apos;s data is limited to
          that team&apos;s members. A share link gives access to its file to anyone who has the link, until you
          revoke it or it expires.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">Cookies</h2>
        <p>Only the cookies needed to keep you signed in. There are no advertising or tracking cookies.</p>

        <h2 className="text-lg font-semibold mt-6 mb-2">Google user data</h2>
        <p>
          Google sign-in is used only to identify you. We do not share Google user data with anyone else and do not
          use it for advertising.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-2">Deleting your data</h2>
        <p>
          You can delete your files and teams in the app at any time. To delete your account and everything linked
          to it, ask the operator of this site.
        </p>
      </article>
    </main>
  );
}
