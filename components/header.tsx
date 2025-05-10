export function Header() {
  return (
    <>
      <header className="sticky top-0 z-[500] flex items-center justify-between w-full px-4 border-b h-14 shrink-0 dark:bg-slate-800 bg-white backdrop-blur-xl">
        <div className="flex items-center justify-end space-x-2"></div>
        <span className="inline-flex items-center home-links whitespace-nowrap">
          <a href="https://developersdigest.tech" rel="noopener" target="_blank">
            <span className="block sm:inline text-lg sm:text-xl lg:text-2xl font-semibold dark:text-white text-black">
              answer <span className="linear-wipe">engine</span>
            </span>
          </a>
        </span>
        <a target="_blank" href="https://git.new/answr" rel="noopener noreferrer"></a>
      </header>
    </>
  );
}
