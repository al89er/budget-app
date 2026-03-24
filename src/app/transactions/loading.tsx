export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center p-24 space-y-4">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-surface-200 border-t-brand-600" />
      <p className="text-surface-500 font-medium animate-pulse">Loading transactions...</p>
    </div>
  );
}
