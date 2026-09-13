import { createContext, useContext } from 'react'

// Which person's hours editor is open. It lives above the table so a row's
// double-click and the capacity cell's button open the same popover, and so
// only one editor is open at a time.
type Editing = {
  editingId: number | null
  setEditingId: (id: number | null) => void
}

const EditingContext = createContext<Editing>({ editingId: null, setEditingId: () => {} })

export const EditingProvider = EditingContext.Provider

export function useEditing() {
  return useContext(EditingContext)
}
