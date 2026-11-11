import { useEffect } from 'react'

/** Sets the tab title while the page is shown, and puts the previous one back after. */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    const previous = document.title
    document.title = title
    return () => { document.title = previous }
  }, [title])
}
