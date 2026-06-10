import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getReviewCards, reviewFlashcard } from '../api/flashcards'

const labels = ['', 'Muito difícil', 'Difícil', 'Médio', 'Fácil', 'Muito fácil']

export default function Flashcards() {
  const queryClient = useQueryClient()
  const [virado, setVirado] = useState(false)

  const { data: cards, isLoading } = useQuery({
    queryKey: ['flashcards', 'review'],
    queryFn: getReviewCards,
  })

  const reviewMut = useMutation({
    mutationFn: ({ id, qualidade }: { id: number; qualidade: number }) =>
      reviewFlashcard(id, qualidade),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flashcards', 'review'] })
      setVirado(false)
    },
  })

  const currentCard = cards?.[0]
  const total = cards?.length || 0

  if (isLoading) {
    return <div className="p-6 text-text-muted text-sm">Carregando...</div>
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Flashcards</h1>
      <p className="text-sm text-text-muted mb-6">{total} cards para revisar hoje</p>

      {!currentCard ? (
        <div className="bg-bg-secondary rounded-xl border border-border p-12 text-center">
          <p className="text-text-muted text-lg mb-2">Nenhum card pendente</p>
          <p className="text-text-muted text-sm">Crie flashcards a partir das suas notas para começar</p>
        </div>
      ) : (
        <div>
          <div
            onClick={() => setVirado(!virado)}
            className="bg-bg-secondary rounded-xl border border-border p-8 min-h-[200px] cursor-pointer flex items-center justify-center text-center hover:border-accent/50 transition-colors"
          >
            <div>
              <p className="text-xs text-text-muted mb-4">{virado ? 'Resposta' : 'Pergunta'}</p>
              <p className="text-lg whitespace-pre-wrap">{virado ? currentCard.resposta : currentCard.pergunta}</p>
            </div>
          </div>

          {virado && (
            <div className="mt-6">
              <p className="text-xs text-text-muted mb-3 text-center">Como foi sua resposta?</p>
              <div className="flex gap-2 justify-center flex-wrap">
                {[1, 2, 3, 4, 5].map(q => (
                  <button
                    key={q}
                    onClick={() => reviewMut.mutate({ id: currentCard.id, qualidade: q })}
                    className="px-4 py-2 bg-bg-tertiary rounded-lg text-sm hover:bg-accent/20 hover:text-accent transition-colors"
                  >
                    {labels[q]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {cards && cards.length > 1 && (
        <p className="text-xs text-text-muted mt-4 text-center">
          +{cards.length - 1} cards depois deste
        </p>
      )}
    </div>
  )
}
