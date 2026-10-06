/**
 * Builds the inside of a map popup. Uses textContent instead of an HTML string, because street
 * names come from an outside service and must never be able to run code in the app.
 */
export function popupContent(title: string, lines: string[]): HTMLElement {
  const content = document.createElement('div')
  const heading = document.createElement('strong')
  heading.textContent = title
  content.append(heading)

  for (const line of lines.filter(Boolean)) {
    const paragraph = document.createElement('p')
    paragraph.textContent = line
    content.append(paragraph)
  }
  return content
}
