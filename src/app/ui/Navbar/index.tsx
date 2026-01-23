const Navbar = () => {
  return (
    <nav className="bg-white dark:bg-neutral-950 fixed w-full z-20 top-0 start-0 border-b border-neutral-200 dark:border-neutral-800">
      <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
        <a href="#" className="flex items-center space-x-3 rtl:space-x-reverse">
          <img src="https://flowbite.com/docs/images/logo.svg" className="h-7" alt="Flowbite Logo" />
          <span className="self-center text-xl text-neutral-900 dark:text-neutral-0 font-semibold whitespace-nowrap">GitGarden</span>
        </a>
        <button 
          data-collapse-toggle="navbar-multi-level-dropdown" 
          type="button" 
          className="inline-flex items-center p-2 w-10 h-10 justify-center text-sm text-neutral-500 dark:text-neutral-400 rounded-md md:hidden hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-200 dark:focus:ring-neutral-700" 
          aria-controls="navbar-multi-level-dropdown" 
          aria-expanded="false"
        >
          <span className="sr-only">Open main menu</span>
          <svg className="w-6 h-6" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="M5 7h14M5 12h14M5 17h14"/>
          </svg>
        </button>
        <div className="hidden w-full md:block md:w-auto" id="navbar-multi-level-dropdown">
          <ul className="flex flex-col font-medium p-4 md:p-0 mt-4 border border-neutral-200 dark:border-neutral-700 rounded-md bg-neutral-50 dark:bg-neutral-800 md:space-x-8 rtl:space-x-reverse md:flex-row md:mt-0 md:border-0 md:bg-white dark:md:bg-neutral-950">
            <li>
              <a href="#" className="block py-2 px-3 text-white bg-brand-600 rounded md:bg-transparent md:text-brand-600 dark:md:text-brand-400 md:p-0" aria-current="page">Home</a>
            </li>
            <li>
              <button id="multiLevelDropdownButton" data-dropdown-toggle="multi-dropdown" className="flex items-center justify-between w-full py-2 px-3 rounded font-medium text-neutral-900 dark:text-neutral-0 md:w-auto hover:bg-neutral-100 dark:hover:bg-neutral-700 md:hover:bg-transparent md:border-0 md:hover:text-brand-600 dark:md:hover:text-brand-400 md:p-0">
                Dropdown 
                <svg className="w-4 h-4 ms-1.5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 9-7 7-7-7"/>
                </svg>
              </button>
              <div id="multi-dropdown" className="z-10 hidden bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md shadow-lg w-44">
                <ul className="p-2 text-sm text-neutral-700 dark:text-neutral-300 font-medium" aria-labelledby="multiLevelDropdownButton">
                  <li>
                    <a href="#" className="inline-flex items-center w-full p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-neutral-0 rounded">Dashboard</a>
                  </li>
                  <li>
                    <button id="doubleDropdownButton" data-dropdown-toggle="doubleDropdown" data-dropdown-placement="right-start" type="button" className="inline-flex items-center w-full p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-neutral-0 rounded">
                      Dropdown
                      <svg className="h-4 w-4 ms-auto rtl:rotate-180" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m9 5 7 7-7 7"/>
                      </svg>
                    </button>
                    <div id="doubleDropdown" className="z-10 hidden bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md shadow-lg w-44">
                      <ul className="p-2 text-sm text-neutral-700 dark:text-neutral-300 font-medium" aria-labelledby="dropdownMultiLevelButton">
                        <li>
                          <a href="#" className="inline-flex items-center w-full p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-neutral-0 rounded">Overview</a>
                        </li>
                        <li>
                          <a href="#" className="inline-flex items-center w-full p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-neutral-0 rounded">My downloads</a>
                        </li>
                        <li>
                          <a href="#" className="inline-flex items-center w-full p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-neutral-0 rounded">Billing</a>
                        </li>
                        <li>
                          <a href="#" className="inline-flex items-center w-full p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-neutral-0 rounded">Rewards</a>
                        </li>
                      </ul>
                    </div>
                  </li>
                  <li>
                    <a href="#" className="inline-flex items-center w-full p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-neutral-0 rounded">Earnings</a>
                  </li>
                  <li>
                    <a href="#" className="inline-flex items-center w-full p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-neutral-0 rounded">Sign out</a>
                  </li>
                </ul>
              </div>
            </li>
            <li>
              <a href="#" className="block py-2 px-3 text-neutral-900 dark:text-neutral-0 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 md:hover:bg-transparent md:border-0 md:hover:text-brand-600 dark:md:hover:text-brand-400 md:p-0">Services</a>
            </li>
            <li>
              <a href="#" className="block py-2 px-3 text-neutral-900 dark:text-neutral-0 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 md:hover:bg-transparent md:border-0 md:hover:text-brand-600 dark:md:hover:text-brand-400 md:p-0">Pricing</a>
            </li>
            <li>
              <a href="#" className="block py-2 px-3 text-neutral-900 dark:text-neutral-0 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 md:hover:bg-transparent md:border-0 md:hover:text-brand-600 dark:md:hover:text-brand-400 md:p-0">Contact</a>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;