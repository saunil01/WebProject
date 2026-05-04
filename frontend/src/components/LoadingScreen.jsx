export default function LoadingScreen({ label = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="w-10 h-10 rounded-full border-2 border-primary-200 border-t-primary-600 animate-spin" />
      <p className="mt-3 text-sm text-surface-500">{label}</p>
    </div>
  );
}
