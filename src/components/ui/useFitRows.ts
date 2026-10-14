import { useEffect, useState } from 'react'

/**
 * How many table rows fit in the window without the page scrolling: (window height - everything else on the
 * page) / row height. `reserved` is the height of everything that is not table rows (header, cards, toolbar,
 * table head, pager, paddings). Re-computed when the window is resized.
 */
export function useFitRows(reserved: number, rowHeight = 57, min = 3) {
  // On phones / small tablets the page simply scrolls, so a fixed page size is used.
  const calc = () => (window.innerWidth < 992 ? 8 : Math.max(min, Math.floor((window.innerHeight - reserved) / rowHeight)))
  const [rows, setRows] = useState(calc)
  useEffect(() => {
    const onResize = () => setRows(calc())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reserved])
  return rows
}
