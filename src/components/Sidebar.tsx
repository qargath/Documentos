import { Icon, toolIcons } from './icons'

export const tools = [
  { id: 'ordenar', label: 'Ordenar páginas', ready: true },
  { id: 'dividir', label: 'Dividir', ready: true },
  { id: 'unir', label: 'Unir', ready: true },
  { id: 'extraer', label: 'Extraer páginas', ready: false },
  { id: 'numerar', label: 'Numerar páginas', ready: false },
  { id: 'comprimir', label: 'Comprimir', ready: false },
  { id: 'convertir', label: 'Convertir', ready: false },
  { id: 'proteger', label: 'Proteger', ready: false },
] as const

export type ToolId = (typeof tools)[number]['id']

export function toolById(id: ToolId) {
  return tools.find((tool) => tool.id === id) ?? tools[0]
}

export function Sidebar({ tool, onTool }: { tool: ToolId; onTool: (id: ToolId) => void }) {
  return (
    <aside className="flex min-h-0 w-60 shrink-0 flex-col border-r border-line bg-card/80">
      <div className="border-b border-line px-5 py-5">
        <p
          className="inline-flex items-center gap-[0.16em] text-xs font-semibold tracking-[0.16em] text-stamp uppercase"
          aria-label="Documentos"
        >
          <span aria-hidden="true">Document</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="h-[1.15em] w-[1.15em] shrink-0"
          >
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
          <span aria-hidden="true">s</span>
        </p>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Funciones">
        <p className="px-2 pb-2 text-[11px] font-semibold tracking-[0.16em] text-muted uppercase">Funciones</p>
        <ul className="space-y-1">
          {tools.map((item) => {
            const active = item.id === tool
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-left text-[15px] ${
                    active
                      ? 'bg-stamp font-medium text-white shadow-[0_4px_12px_rgba(196,81,44,0.25)]'
                      : 'font-normal text-ink hover:bg-white'
                  }`}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => onTool(item.id)}
                >
                  <Icon svg={toolIcons[item.id]} className="h-[18px] w-[18px]" />
                  <span>{item.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
      <p className="px-5 py-4 text-xs text-muted">El PDF no sale de este equipo.</p>
    </aside>
  )
}
