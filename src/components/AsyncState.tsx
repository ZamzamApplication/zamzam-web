interface AsyncStateProps {
  title?: string
  message: string
  onRetry?: () => void
}

export default function AsyncState({
  title = 'تعذر تحميل البيانات',
  message,
  onRetry,
}: AsyncStateProps) {
  return (
    <div className="glass-card rounded-2xl p-8 text-center" role="alert">
      <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-xl text-red-600 dark:bg-red-950/40 dark:text-red-300" aria-hidden="true">
        !
      </div>
      <h2 className="font-bold text-deep-800">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-deep-500">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="water-btn mt-5 rounded-lg px-5 py-2 text-sm font-semibold text-white">
          إعادة المحاولة
        </button>
      )}
    </div>
  )
}
