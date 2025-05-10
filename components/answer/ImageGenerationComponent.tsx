interface ImageProps {
  src?: string;
  query?: string;
}

export default function ImageGenerationComponent({ src, query }: ImageProps) {
  return (
    <div className="bg-neutral-800 rounded-lg border border-stone-700 p-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row gap-6 items-center">
        {!src ? (
          <div className="w-full md:w-1/2 aspect-square bg-gray-800 rounded-lg animate-pulse"></div>
        ) : (
          <div className="w-full md:w-1/2 aspect-square rounded-lg overflow-hidden">
            <img
              src={src || '/placeholder.svg'}
              alt="Generated image"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="w-full md:w-1/2 flex flex-col items-center md:items-start">
          {query && (
            <div className="mb-4">
              <h2 className="text-xl font-medium text-gray-200 mb-2">Prompt</h2>
              <p className="text-gray-300 bg-gray-800 p-3 rounded-lg">{query}</p>
            </div>
          )}

          <div className="mt-auto flex items-center self-end">
            <img src="./fal.svg" alt="powered by fal.ai" className="h-6" />
          </div>
        </div>
      </div>
    </div>
  );
}
