// Rows that scroll sideways (tabs, filter chips, card strips) hide their scrollbar, which leaves a mouse with no way
// to move them. This lets the mouse wheel and a mouse drag scroll the nearest sideways row. Touch and trackpads
// already scroll sideways on their own and are left alone.
function sidewaysRow(start: EventTarget | null) {
  for (let el = start instanceof Element ? start : null; el && el !== document.body; el = el.parentElement) {
    if (!(el instanceof HTMLElement) || el.scrollWidth <= el.clientWidth + 1) continue
    const style = getComputedStyle(el)
    if (!/(auto|scroll)/.test(style.overflowX)) continue
    // A box that also scrolls vertically keeps the wheel for its own vertical scroll.
    if (/(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight + 1) return null
    return el
  }
  return null
}

export function enableSidewaysScroll(root: Document = document) {
  root.addEventListener('wheel', (event) => {
    if (event.ctrlKey || event.shiftKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return
    const row = sidewaysRow(event.target)
    // Only slim rows (tabs and chips) take the wheel, so scrolling down a page never stalls on a tall card strip.
    if (!row || row.clientHeight > 72) return
    const step = event.deltaMode === 1 ? event.deltaY * 32 : event.deltaY
    const max = row.scrollWidth - row.clientWidth
    if ((step < 0 && row.scrollLeft <= 0) || (step > 0 && row.scrollLeft >= max - 1)) return // let the page scroll on
    row.scrollLeft += step
    event.preventDefault()
  }, { passive: false })

  let drag: { row: HTMLElement; x: number; left: number; moved: boolean } | null = null
  root.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return
    if ((event.target as Element | null)?.closest('input,textarea,select,[contenteditable="true"]')) return
    const row = sidewaysRow(event.target)
    if (row) drag = { row, x: event.clientX, left: row.scrollLeft, moved: false }
  })
  root.addEventListener('pointermove', (event) => {
    if (!drag) return
    const dx = event.clientX - drag.x
    if (!drag.moved && Math.abs(dx) < 6) return
    drag.moved = true
    drag.row.scrollLeft = drag.left - dx
    drag.row.style.cursor = 'grabbing'
  })
  const end = () => {
    if (!drag) return
    const { row, moved } = drag
    drag = null
    row.style.cursor = ''
    // A drag is not a click on the chip it ended over.
    if (moved) root.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault() }, { capture: true, once: true })
  }
  root.addEventListener('pointerup', end)
  root.addEventListener('pointercancel', end)
}
