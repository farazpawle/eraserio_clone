
const Hero = () => {
  return (
    <div>
      <section className="bg-black dark:bg-gray-950">
        <div className="flex items-baseline justify-center pt-20">
          <h2 className='text-white dark:text-gray-100 border border-white dark:border-gray-300 text-center px-3 p-2 rounded-full'>
            See what's new | <span className="text-sky-400 dark:text-sky-300">AI Diagram</span>
          </h2>
        </div>
        
        <div className="mx-auto h-screen max-w-screen-xl px-4 py-12 lg:flex">
          <div className="mx-auto max-w-xl text-center">
            <h1 className="text-3xl font-extrabold text-sky-300 dark:text-sky-200 sm:text-5xl">
              Documents & diagrams
              <strong className="font-extrabold text-white dark:text-gray-100 sm:block"> for engineering teams </strong>
            </h1>

            <p className="mt-4 text-slate-200 dark:text-gray-300 sm:text-xl/relaxed">
              All-in-one markdown editor, collaborative canvas, and diagram-as-code builder
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <button
                className="block w-full rounded bg-white dark:bg-gray-100 text-black dark:text-gray-900 px-12 py-3 text-sm font-medium shadow hover:bg-gray-100 dark:hover:bg-gray-200 focus:outline-none focus:ring active:bg-gray-200 dark:active:bg-gray-300 sm:w-auto transition-colors"
              >
                Learn more
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Hero