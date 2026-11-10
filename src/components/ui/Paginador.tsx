import { ChevLeftIcon, ChevRightIcon } from '../icons'
import './Paginador.css'

interface PaginadorProps {
  range: string
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

export function Paginador({
  range,
  page,
  totalPages,
  onPageChange,
  className = '',
}: Readonly<PaginadorProps>) {
  const isFirstPage = page <= 1
  const isLastPage = page >= totalPages
  const isSinglePage = totalPages <= 1

  return (
    <nav className={`ui-paginador${className ? ` ${className}` : ''}`} aria-label="Paginación">
      <span className="ui-paginador__range">{range}</span>
      <button
        className="ui-paginador__button"
        type="button"
        aria-label="Página anterior"
        disabled={isFirstPage || isSinglePage}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevLeftIcon />
      </button>
      <button
        className="ui-paginador__button"
        type="button"
        aria-label="Página siguiente"
        disabled={isLastPage || isSinglePage}
        onClick={() => onPageChange(page + 1)}
      >
        <ChevRightIcon />
      </button>
    </nav>
  )
}
