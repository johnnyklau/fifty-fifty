import { useState } from 'react'

interface Props {
  onSubmit: (stars: number) => void
  submitting: boolean
}

export function RatingUI({ onSubmit, submitting }: Props) {
  const [hovered, setHovered] = useState(0)
  const [selected, setSelected] = useState(0)

  return (
    <div className="rating-ui">
      <p className="rating-label">Rate this drawing</p>
      <div className="rating-stars">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            className={`star-btn${n <= (hovered || selected) ? ' star-btn--active' : ''}`}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => setSelected(n)}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
          >
            ★
          </button>
        ))}
      </div>
      <button
        className="btn btn--primary"
        disabled={selected === 0 || submitting}
        onClick={() => onSubmit(selected)}
      >
        {submitting ? 'Submitting…' : 'Submit rating'}
      </button>
    </div>
  )
}
