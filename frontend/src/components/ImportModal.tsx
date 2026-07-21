import { useState, useEffect, useRef } from 'react'
import { useImport } from '../hooks/useImport'
import { useFocusTrap } from '../hooks/useFocusTrap'
interface Props {
  onClose: () => void
  onSuccess: () => void
}
export default function ImportModal({ onClose, onSuccess }: Props) {
  const { mutate, isLoading, resultado, erro, reset } = useImport()
  const [step, setStep] = useState<'select' | 'confirm' | 'result'>('select')
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  useFocusTrap(modalRef, true)
  const onCloseRef = useRef(onClose)
  const onSuccessRef = useRef(onSuccess)
  onCloseRef.current = onClose
  onSuccessRef.current = onSuccess
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
  function handleClose() {
    reset()
    onCloseRef.current()
  }
  function handleFile(f: File) {
    if (!f.name.endsWith('.json')) return
    setFile(f)
    setStep('confirm')
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(true)
  }
  function handleDragLeave() {
    setDragOver(false)
  }
  async function handleImport() {
    if (!file) return
    setStep('result')
    await mutate(file)
  }
  function handleResultClose() {
    if (resultado?.sucesso) {
      onSuccessRef.current()
    }
    handleClose()
  }
  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]" onClick={handleClose}>
      <div ref={modalRef} className="bg-bg-secondary rounded-xl border border-border shadow-2xl w-full max-w-lg mx-4 animate-fade-in" onClick={e => e.stopPropagation()}>
        {step === 'select' && (
          <>
            <div className="p-4 border-b border-border">
              <h3 className="text-base font-semibold">Importar dados</h3>
            </div>
            <div
              className={`p-8 m-4 rounded-lg border-2 border-dashed transition-colors cursor-pointer text-center
                ${dragOver ? 'border-accent bg-accent/10' : 'border-border hover:border-accent/50'}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              />
              <div className="text-3xl mb-2 text-text-muted">📄</div>
              <p className="text-sm text-text-muted">
                Arraste um arquivo <span className="text-accent">.json</span> aqui ou clique para selecionar
              </p>
            </div>
            <div className="flex justify-end px-5 pb-4">
              <button onClick={handleClose}
                className="px-4 py-1.5 text-sm rounded-lg bg-bg-tertiary hover:bg-bg-hover transition-colors">
                Cancelar
              </button>
            </div>
          </>
        )}
        {step === 'confirm' && file && (
          <>
            <div className="p-4 border-b border-border">
              <h3 className="text-base font-semibold">Confirmar importação</h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="bg-bg-tertiary rounded-lg p-3 text-sm space-y-1">
                <p><span className="text-text-muted">Arquivo:</span> {file.name}</p>
                <p><span className="text-text-muted">Tamanho:</span> {formatSize(file.size)}</p>
              </div>
              <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-sm text-warning">
                Os dados existentes serão mesclados. Nenhum dado ser? apagado.
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 pb-4">
              <button onClick={() => { setStep('select'); setFile(null) }}
                className="px-4 py-1.5 text-sm rounded-lg bg-bg-tertiary hover:bg-bg-hover transition-colors">
                Voltar
              </button>
              <button onClick={handleImport} disabled={isLoading}
                className="px-4 py-1.5 text-sm rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-50">
                {isLoading ? 'Importando...' : 'Importar'}
              </button>
            </div>
          </>
        )}
        {step === 'result' && (
          <>
            <div className="p-4 border-b border-border">
              <h3 className="text-base font-semibold">
                {isLoading ? 'Importando...' : resultado ? 'Importação concluída' : 'Erro na importação'}
              </h3>
            </div>
            <div className="p-4">
              {isLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin h-6 w-6 border-2 border-accent border-t-transparent rounded-full" />
                </div>
              )}
              {erro && (
                <div className="bg-danger/10 border border-danger/30 rounded-lg p-3 text-sm text-danger">
                  {erro}
                </div>
              )}
              {resultado && (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-text-muted text-xs uppercase tracking-wide">
                      <th className="text-left py-1 pr-4">Tabela</th>
                      <th className="text-right py-1 pr-2">Inseridos</th>
                      <th className="text-right py-1">Atualizados</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(resultado.tabelas)
                      .filter(([, v]) => v.inseridos > 0 || v.atualizados > 0)
                      .map(([tabela, v]) => (
                        <tr key={tabela} className="border-t border-border">
                          <td className="py-1.5 pr-4">{tabela.replace(/_/g, ' ')}</td>
                          <td className="text-right py-1.5 pr-2 text-success">{v.inseridos}</td>
                          <td className="text-right py-1.5 text-accent">{v.atualizados}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="flex justify-end px-5 pb-4">
              <button onClick={handleResultClose}
                className="px-4 py-1.5 text-sm rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors">
                {resultado?.sucesso ? 'OK' : 'Fechar'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
