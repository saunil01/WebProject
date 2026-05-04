export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="text-center py-10">
      {Icon && (
        <div className="mx-auto w-12 h-12 rounded-2xl bg-primary-50 text-primary-600
                        dark:bg-primary-900/30 dark:text-primary-300
                        flex items-center justify-center mb-3">
          <Icon size={22} />
        </div>
      )}
      <p className="font-semibold text-surface-800 dark:text-surface-100">{title}</p>
      {description && (
        <p className="text-sm text-surface-500 mt-1 max-w-sm mx-auto">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
