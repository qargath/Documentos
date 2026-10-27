import { useState } from 'react'
import { Icon, toolIcons } from './icons'

export const tools = [
  { id: 'ordenar', label: 'Ordenar páginas', ready: true },
  { id: 'dividir', label: 'Dividir', ready: true },
  { id: 'unir', label: 'Unir', ready: true },
  { id: 'extraer', label: 'Extraer páginas', ready: true },
  { id: 'numerar', label: 'Numerar páginas', ready: true },
  { id: 'comprimir', label: 'Comprimir', ready: false },
  { id: 'convertir', label: 'Convertir', ready: false },
  { id: 'proteger', label: 'Proteger', ready: false },
] as const

export type ToolId = (typeof tools)[number]['id']

export function toolById(id: ToolId) {
  return tools.find((tool) => tool.id === id) ?? tools[0]
}

const themeKey = 'documentos-tema'

export function Sidebar({
  tool,
  notesOpen,
  onTool,
  onNotes,
}: {
  tool: ToolId
  notesOpen: boolean
  onTool: (id: ToolId) => void
  onNotes: () => void
}) {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  function toggleTheme() {
    const next = !document.documentElement.classList.contains('dark')
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem(themeKey, next ? 'dark' : 'light')
    setDark(next)
  }
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
      <div className="flex min-h-0 flex-1 flex-col">
      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4" aria-label="Funciones">
        <p className="px-2 pb-2 text-[11px] font-semibold tracking-[0.16em] text-muted uppercase">Funciones</p>
        <ul className="space-y-1">
          {tools.map((item) => {
            const active = item.id === tool
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-left text-[15px] ${
                    active && !notesOpen
                      ? 'bg-stamp font-medium text-white shadow-[0_4px_12px_rgba(196,81,44,0.25)]'
                      : 'font-normal text-ink hover:bg-raise'
                  }`}
                  aria-current={active && !notesOpen ? 'page' : undefined}
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
      </div>
      <footer className="border-t border-line px-3 py-3">
        <div className="flex gap-1">
          <button
            type="button"
            className={`h-9 min-w-0 flex-1 rounded-xl text-sm font-semibold ${
              notesOpen ? 'bg-stamp text-white' : 'bg-well text-ink hover:bg-raise'
            }`}
            aria-current={notesOpen ? 'page' : undefined}
            onClick={onNotes}
          >
            {__APP_VERSION__}
          </button>
          <button
            type="button"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-well text-ink hover:bg-raise"
            aria-label={dark ? 'Tema claro' : 'Tema oscuro'}
            aria-pressed={dark}
            onClick={toggleTheme}
          >
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
        <p className="px-2 pt-3 text-xs text-muted">El PDF no sale de este equipo.</p>
      </footer>
    </aside>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 14.5A8.5 8.5 0 1 1 9.5 3 7 7 0 0 0 21 14.5z" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
}
