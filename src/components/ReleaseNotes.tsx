import notes from '../release-notes.json'

type Note = {
  version: string
  date: string
  title: string
  added?: string[]
  changed?: string[]
  fixed?: string[]
}

const history = notes as Note[]

const groups = [
  ['added', 'Novedades'],
  ['changed', 'Cambios'],
  ['fixed', 'Correcciones'],
] as const

export function ReleaseNotesView() {
  return (
    <main id="trabajo" className="min-w-0 flex-1 overflow-y-auto px-8 py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-3xl">Notas de la versión</h1>
        <p className="mt-2 text-sm text-muted">Todos los cambios, correcciones y novedades de la aplicación.</p>
        <ol className="mt-8 space-y-8">
          {history.map((note) => (
            <li key={note.version} className="rounded-2xl border border-line bg-card px-6 py-5">
              <p className="text-xs font-semibold tracking-[0.08em] text-stamp">
                {note.version}
                <span className="font-normal tracking-normal text-muted"> · {note.date}</span>
              </p>
              <h2 className="mt-1 font-display text-2xl">{note.title}</h2>
              {groups.map(([key, label]) => {
                const items = note[key]
                if (!items || items.length === 0) return null
                return (
                  <div key={key} className="mt-4">
                    <p className="text-[11px] font-semibold tracking-[0.14em] text-quiet uppercase">{label}</p>
                    <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-snug">
                      {items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </li>
          ))}
        </ol>
      </div>
    </main>
  )
}
