// "Plain language" (reading.plain): a case file shrinks to its plot
// paragraph, the short hand-written summary every panel opens with, and drops
// the review, the chat and the debrief. Nothing is rewritten or simplified by
// machine; it is his panel, shorter. A leaf module so the ?text route can use
// it without pulling in the 3D bundle.
export function plainPanel(html) {
  if (!html) return null
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const plot = doc.querySelector('.plot') || doc.querySelector('p')
  return plot ? plot.outerHTML : null
}
