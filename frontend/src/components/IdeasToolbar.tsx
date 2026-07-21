import { useRef } from 'react'
import { Menu, Popover, Transition } from '@headlessui/react'
import { Plus, Search, FileText, GitBranch, Calendar, Archive, Trash2, Square, MoreHorizontal, ArrowUpDown, Download, Upload, Bookmark, FolderOpen, Eye, EyeOff, Star, Tag, Folder, Table } from 'lucide-react'
import type { IdeasToolbarProps } from '../types'

export default function IdeasToolbar({
  onNewNota,
  onSearch,
  onLocalTemplate,
  onServerTemplate,
  onGraph,
  selectedCount,
  onDeleteSelected,
  onSelectMode,
  showFavoritas,
  onToggleFavoritas,
  tags,
  tagFilter,
  onToggleTag,
  onClearTags,
  onSort,
  onExport,
  onImport,
  onImportMarkdown,
  onImportCSV,
  onSavedFilters,
  onSaveAsQuery,
  onDailyNote,
  onRevealInExplorer,
  onToggleView,
  isViewMode,
  pastaFilter,
  pastas,
  onSelectPasta,
}: IdeasToolbarProps) {
  const importInputRef = useRef<HTMLInputElement>(null)
  const importMdRef = useRef<HTMLInputElement>(null)
  const importCsvRef = useRef<HTMLInputElement>(null)
  return (
    <div className="flex flex-wrap items-center gap-2 p-2 bg-bg-secondary border-b border-border">
      <div className="flex items-center gap-1 border-r border-border pr-2">
        <button
          onClick={onNewNota}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-bg-tertiary hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
          title="Nova nota (Ctrl+N)"
        >
          <Plus size={16} />
        </button>
        <button
          onClick={onSearch}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-bg-tertiary hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
          title="Buscar (Ctrl+K)"
        >
          <Search size={16} />
        </button>
        <Menu as="div" className="relative">
          <Menu.Button className="w-8 h-8 flex items-center justify-center rounded-lg bg-bg-tertiary hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors" title="Modelos">
            <FileText size={16} />
          </Menu.Button>
          <Transition
            as={Menu.Items}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <div className="absolute left-0 mt-1 w-48 origin-top-left rounded-md bg-bg-secondary border border-border shadow-elevation-4 focus:outline-none z-50">
              <div className="py-1">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={onLocalTemplate}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${active ? 'bg-bg-tertiary text-text-primary' : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'}`}
                    >
                      <FileText size={14} />
                      <span>Modelos locais</span>
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={onServerTemplate}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${active ? 'bg-bg-tertiary text-text-primary' : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'}`}
                    >
                      <FileText size={14} />
                      <span>Modelos servidor</span>
                    </button>
                  )}
                </Menu.Item>
              </div>
            </div>
          </Transition>
        </Menu>
        <button
          onClick={onGraph}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-bg-tertiary hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
          title="Grafo de conexões"
        >
          <GitBranch size={16} />
        </button>
        <button
          onClick={onDailyNote}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-bg-tertiary hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
          title="Nota diária (Ctrl+Shift+D)"
        >
          <Calendar size={16} />
        </button>
        {onToggleView && (
          <button
            onClick={onToggleView}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-bg-tertiary hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
            title={isViewMode ? 'Editar' : 'Visualizar'}
          >
            {isViewMode ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>

      {selectedCount > 0 && (
        <div className="flex items-center gap-1 border-r border-border pr-2">
          <button
            disabled
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-bg-tertiary text-text-muted opacity-50 cursor-not-allowed"
            title="Arquivar (indisponível)"
          >
            <Archive size={16} />
          </button>
          <button
            onClick={onDeleteSelected}
            disabled={!selectedCount}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-bg-tertiary hover:bg-danger/10 hover:text-danger text-text-secondary disabled:opacity-disabled disabled:hover:bg-bg-tertiary disabled:hover:text-text-secondary transition-colors"
            title={`Excluir ${selectedCount} nota${selectedCount > 1 ? 's' : ''}`}
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}

      <div className="flex items-center gap-1 border-r border-border pr-2">
        <button
          onClick={onToggleFavoritas}
          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
            showFavoritas
              ? 'bg-accent/15 text-accent'
              : 'bg-bg-tertiary hover:bg-bg-hover text-text-secondary hover:text-text-primary'
          }`}
          title={showFavoritas ? 'Mostrar todas as notas' : 'Mostrar apenas favoritas'}
        >
          <Star size={16} fill={showFavoritas ? 'currentColor' : 'none'} />
        </button>

        <Popover as="div" className="relative">
          <Popover.Button className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
            tagFilter.length > 0
              ? 'bg-accent/15 text-accent'
              : 'bg-bg-tertiary hover:bg-bg-hover text-text-secondary hover:text-text-primary'
          }`} title={tagFilter.length > 0 ? `Filtro: ${tagFilter.length} tag(s)` : 'Filtrar por tags'}>
            <Tag size={16} />
            {tagFilter.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-accent text-accent-foreground text-xs font-bold rounded-full flex items-center justify-center">
                {tagFilter.length}
              </span>
            )}
          </Popover.Button>
          <Transition
            as={Popover.Panel}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <div className="absolute left-0 mt-1 w-56 rounded-md bg-bg-secondary border border-border shadow-elevation-4 focus:outline-none z-50 p-3">
              {tagFilter.length > 0 && (
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-text-muted">{tagFilter.length} tag{tagFilter.length > 1 ? 's' : ''} ativa{tagFilter.length > 1 ? 's' : ''}</span>
                  <button onClick={onClearTags} className="text-xs text-danger hover:underline">Limpar</button>
                </div>
              )}
              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                {tags.map(tag => {
                  const isActive = tagFilter.includes(tag.id)
                  const cor = tag.cor || '#6B7280'
                  return (
                    <button key={tag.id} onClick={() => onToggleTag(tag.id)}
                      className={`text-xs px-2 py-1 rounded-full transition-all flex items-center gap-1 ${
                        isActive
                          ? 'bg-accent/10 ring-2 ring-accent text-accent font-medium'
                          : 'text-text-muted hover:text-text-primary hover:bg-bg-hover'
                      }`}>
                      <span style={{ color: cor }}>●</span>
                      {tag.nome}
                    </button>
                  )
                })}
                {tags.length === 0 && (
                  <p className="text-xs text-text-muted py-2">Nenhuma tag criada</p>
                )}
              </div>
            </div>
          </Transition>
        </Popover>
      </div>

      <div className="flex items-center gap-1 border-r border-border pr-2">
        <Popover as="div" className="relative">
          <Popover.Button className={`w-auto h-8 flex items-center gap-1 px-2 rounded-lg transition-colors ${
            pastaFilter !== null
              ? 'bg-accent/15 text-accent'
              : 'bg-bg-tertiary hover:bg-bg-hover text-text-secondary hover:text-text-primary'
          }`} title={pastaFilter !== null ? `Filtro: ${pastas.find(p => p.id === pastaFilter)?.nome}` : 'Filtrar por pasta'}>
            <Folder size={16} />
            <span className="text-xs max-w-[80px] truncate">
              {pastaFilter !== null ? (pastas.find(p => p.id === pastaFilter)?.nome || '...') : 'Todas'}
            </span>
          </Popover.Button>
          <Transition
            as={Popover.Panel}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <div className="absolute left-0 mt-1 w-48 rounded-md bg-bg-secondary border border-border shadow-elevation-4 focus:outline-none z-50 p-1">
              <button onClick={() => onSelectPasta(null)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                  pastaFilter === null
                    ? 'bg-accent/10 text-accent font-medium'
                    : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                }`}>
                <Folder size={14} />
                <span className="flex-1 text-left">Todas</span>
              </button>
              {pastas.length > 0 && <div className="border-t border-border my-1" />}
              {pastas.map(pasta => (
                <button key={pasta.id} onClick={() => onSelectPasta(pasta.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                    pastaFilter === pasta.id
                      ? 'bg-accent/10 text-accent font-medium'
                      : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                  }`}>
                  <Folder size={14} />
                  <span className="flex-1 text-left truncate">{pasta.nome}</span>
                </button>
              ))}
              {pastas.length === 0 && (
                <p className="text-xs text-text-muted py-2 px-3">Nenhuma pasta criada</p>
              )}
            </div>
          </Transition>
        </Popover>
      </div>

      <Menu as="div" className="relative">
        <Menu.Button className="w-8 h-8 flex items-center justify-center rounded-lg bg-bg-tertiary hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors">
          <MoreHorizontal size={16} />
        </Menu.Button>
        <Transition
          as={Menu.Items}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <div className="absolute right-0 mt-1 w-48 origin-top-right rounded-md bg-bg-secondary border border-border shadow-elevation-4 focus:outline-none z-50">
            <div className="py-1">
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={() => onSort?.('titulo')}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${active ? 'bg-bg-tertiary text-text-primary' : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'}`}
                  >
                    <ArrowUpDown size={14} />
                    <span>A-Z Ordenar</span>
                  </button>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={onExport}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${active ? 'bg-bg-tertiary text-text-primary' : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'}`}
                  >
                    <Download size={14} />
                    <span>Exportar nota (.md)</span>
                  </button>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <div>
                    <input type="file" accept=".json" ref={importInputRef}
                      onChange={e => { if (e.target.files?.[0]) { onImport?.(e.target.files[0]); e.target.value = '' } }}
                      className="hidden" />
                    <button
                      onClick={() => importInputRef.current?.click()}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${active ? 'bg-bg-tertiary text-text-primary' : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'}`}
                    >
                      <Upload size={14} />
                      <span>Importar (.json)</span>
                    </button>
                  </div>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <div>
                    <input type="file" accept=".md" ref={importMdRef}
                      onChange={e => { if (e.target.files?.[0]) { onImportMarkdown?.(e.target.files[0]); e.target.value = '' } }}
                      className="hidden" />
                    <button
                      onClick={() => importMdRef.current?.click()}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${active ? 'bg-bg-tertiary text-text-primary' : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'}`}
                    >
                      <Upload size={14} />
                      <span>Importar (.md)</span>
                    </button>
                  </div>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <div>
                    <input type="file" accept=".csv" ref={importCsvRef}
                      onChange={e => { if (e.target.files?.[0]) { onImportCSV?.(e.target.files[0]); e.target.value = '' } }}
                      className="hidden" />
                    <button
                      onClick={() => importCsvRef.current?.click()}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${active ? 'bg-bg-tertiary text-text-primary' : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'}`}
                    >
                      <Upload size={14} />
                      <span>Importar (.csv)</span>
                    </button>
                  </div>
                )}
              </Menu.Item>
              <div className="border-t border-border my-1" />
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={onSavedFilters}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${active ? 'bg-bg-tertiary text-text-primary' : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'}`}
                  >
                    <Bookmark size={14} />
                    <span>Filtros salvos</span>
                  </button>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={onSaveAsQuery}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${active ? 'bg-bg-tertiary text-text-primary' : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'}`}
                  >
                    <Table size={14} />
                    <span>Salvar como consulta</span>
                  </button>
                )}
              </Menu.Item>
              <div className="border-t border-border my-1" />
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={onRevealInExplorer}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${active ? 'bg-bg-tertiary text-text-primary' : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'}`}
                  >
                    <FolderOpen size={14} />
                    <span>Revelar no Explorer</span>
                  </button>
                )}
              </Menu.Item>
            </div>
          </div>
        </Transition>
      </Menu>

      <div className="ml-auto">
        <button
          onClick={() => onSelectMode(true)}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-bg-tertiary hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors"
          title="Selecionar múltiplas notas"
        >
          <Square size={16} />
        </button>
      </div>
    </div>
  )
}
