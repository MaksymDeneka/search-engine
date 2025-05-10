        <div className="fixed inset-x-0 bottom-0 z-10">
          <div className="mx-auto max-w-3xl px-4 pb-8 pt-6">
            {mentionQuery && (
              <div className="mb-4 bg-neutral-800 rounded-lg border border-stone-700 overflow-hidden animate-in slide-in-from-bottom duration-300">
                <ul className="divide-y divide-stone-700">
                  {mentionTools
                    .filter((tool) => tool.name.toLowerCase().includes(mentionQuery.toLowerCase()))
                    .map((tool) => (
                      <li
                        key={tool.id}
                        className="flex items-center cursor-pointer hover:bg-neutral-700 p-3 transition-colors"
                        onClick={() => {
                          setSelectedMentionTool(tool.id);
                          setSelectedMentionToolLogo(tool.logo);
                          tool.enableRAG && setShowRAG(true);
                          setMentionQuery('');
                          setInputValue(' '); // Update the input value with a single blank space
                        }}>
                        {tool.logo ? (
                          <img
                            src={tool.logo || '/placeholder.svg'}
                            alt={tool.name}
                            className="w-6 h-6 rounded-full"
                          />
                        ) : (
                          <span role="img" aria-label="link" className="mr-2 text-gray-400">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 256 256"
                              fill="currentColor"
                              className="h-4 w-4">
                              <path d="M224 128a8 8 0 0 1-8 8h-80v80a8 8 0 0 1-16 0v-80H40a8 8 0 0 1 0-16h80V40a8 8 0 0 1 16 0v80h80a8 8 0 0 1 8 8Z"></path>
                            </svg>
                          </span>
                        )}

                        <p className="ml-2 text-gray-200 font-medium">@{tool.name}</p>
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {fileName && (
              <div className="mb-2 px-3 py-2 bg-gray-800 rounded-md text-sm flex items-center justify-between animate-in fade-in duration-300">
                <span className="truncate text-gray-300">{fileName}</span>
                <button
                  type="button"
                  onClick={clearFile}
                  className="ml-2 text-gray-400 hover:text-gray-200 transition-colors">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M18 6L6 18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M6 6L18 18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            )}

            <form
              ref={formRef}
              onSubmit={async (e: FormEvent<HTMLFormElement>) => {
                e.preventDefault();
                handleFormSubmit(e);
                setCurrentLlmResponse('');
                if (window.innerWidth < 600) {
                  (e.target as HTMLFormElement)['message']?.blur();
                }
                const value = inputValue.trim();
                setInputValue('');
                if (!value) return;
              }}
              className="relative">
              <div className="relative flex items-center w-full overflow-hidden rounded-full border border-stone-600 bg-neutral-800 shadow-lg transition-shadow focus-within:ring-1 focus-within:ring-gray-600">
                {showRAG && (
                  <label
                    htmlFor="fileInput"
                    className="flex items-center justify-center w-10 h-10 cursor-pointer text-gray-400 hover:text-gray-200 transition-colors ml-2">
                    <Paperclip size={18} />
                  </label>
                )}

                <input
                  id="fileInput"
                  type="file"
                  accept=".doc,.docx,.pdf,.txt,.js,.tsx"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload(file);
                    }
                  }}
                />

                {selectedMentionToolLogo && (
                  <div className="flex items-center justify-center w-10 h-10 ml-2">
                    <img
                      src={selectedMentionToolLogo || '/placeholder.svg'}
                      className="w-6 h-6 rounded-full"
                      alt="Tool"
                    />
                  </div>
                )}

                <Textarea
                  ref={inputRef}
                  tabIndex={0}
                  onKeyDown={onKeyDown}
                  placeholder="Ask anything..."
                  className={cn(
                    'flex-1 resize-none bg-transparent py-4 px-3 focus-within:outline-none text-base text-gray-200 min-h-[52px] max-h-32 leading-[1.25]', // Adjust py- and leading
                    selectedMentionToolLogo || showRAG ? 'pl-2' : 'pl-4',
                  )}
                  autoFocus
                  spellCheck={false}
                  autoComplete="off"
                  autoCorrect="off"
                  name="message"
                  rows={1}
                  value={inputValue}
                  onChange={(e) => {
                    const value = e.target.value;
                    setInputValue(value);

                    if (value.includes('@')) {
                      const mentionIndex = value.lastIndexOf('@');
                      const query = value.slice(mentionIndex + 1);
                      setMentionQuery(query);
                    } else {
                      setMentionQuery('');
                    }

                    if (value.trim() === '') {
                      setSelectedMentionTool(null);
                      setSelectedMentionToolLogo(null);
                      setShowRAG(false);
                    }
                  }}
                />

                <div className="flex items-center pr-2 gap-2">
                  {/* <button
                    type="button"
                    className="rounded-full w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-200 transition-colors">
                    <Mic size={18} />
                  </button> */}

                  <button
                    type="submit"
                    disabled={inputValue === ''}
                    className={cn(
                      'rounded-full w-9 h-9 flex items-center justify-center transition-all',
                      inputValue
                        ? 'bg-stone-600 text-gray-200 hover:bg-gray-600'
                        : 'bg-stone-700 text-gray-500',
                    )}>
                    <Send size={16} />
                    <span className="sr-only">Send message</span>
                  </button>
                </div>
              </div>
            </form>

            <div className="mt-2 text-xs text-center text-gray-500">
              <span className="inline-flex items-center">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="mr-1">
                  <path
                    d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 16V12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 8H12.01"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Press / to focus the input box
              </span>
            </div>
          </div>
        </div>