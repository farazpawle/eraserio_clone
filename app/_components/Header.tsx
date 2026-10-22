'use client'
import Image from "next/image"
import Link from "next/link"
import { ThemeToggle } from "@/components/ui/theme-toggle"

const Header = () => {
  return (
    <div>
      <header className="bg-black dark:bg-gray-900 border-b border-gray-800 dark:border-gray-700">
        <div className="mx-auto flex h-16 max-w-screen-xl items-center gap-8 px-4 sm:px-6 lg:px-8">
          <Image src='/logo-1.svg' width={100} height={100} alt="logo"/>

          <div className="flex flex-1 items-center justify-end md:justify-between">
            <nav aria-label="Global" className="hidden md:block">
              <ul className="flex items-center gap-6 text-sm">
                <li>
                  <a className="text-white dark:text-gray-200 transition hover:text-gray-100/75 dark:hover:text-white" href="#"> About </a>
                </li>

                <li>
                  <a className="text-white dark:text-gray-200 transition hover:text-gray-100/75 dark:hover:text-white" href="#"> Careers </a>
                </li>

                <li>
                  <a className="text-white dark:text-gray-200 transition hover:text-gray-100/75 dark:hover:text-white" href="#"> History </a>
                </li>

                <li>
                  <a className="text-white dark:text-gray-200 transition hover:text-gray-100/75 dark:hover:text-white" href="#"> Services </a>
                </li>

                <li>
                  <a className="text-white dark:text-gray-200 transition hover:text-gray-100/75 dark:hover:text-white" href="#"> Projects </a>
                </li>
              </ul>
            </nav>

            <div className="flex items-center gap-4">
              {/* Theme Toggle */}
              <ThemeToggle />
              
              <div className="sm:flex sm:gap-4">
                <Link href="/login" className="block rounded-md bg-teal-600 dark:bg-teal-700 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700 dark:hover:bg-teal-600">
                  Login
                </Link>

                <Link href="/signup" className="hidden rounded-md bg-gray-100 dark:bg-gray-800 px-5 py-2.5 text-sm font-medium text-teal-600 dark:text-teal-400 transition hover:text-teal-600/75 dark:hover:text-teal-300 sm:block">
                  Register
                </Link>
              </div>

              <button
                className="block rounded bg-gray-100 dark:bg-gray-800 p-2.5 text-gray-600 dark:text-gray-400 transition hover:text-gray-600/75 dark:hover:text-gray-300 md:hidden"
              >
                <span className="sr-only">Toggle menu</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>
    </div>
 
  )
}

export default Header