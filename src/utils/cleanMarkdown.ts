export function cleanMarkdownForDisplay(input: string): string {
  // Clean up the markdown input
  const cleaned = cleanMarkdown(input);
  
  // Convert headers to a more compact format
  return convertToCompactHeaders(cleaned);
}

/**
 * Cleans up LLM-generated Markdown for better display in Markdown renderers like ReactMarkdown.
 *
 * Key behaviors:
 * - Collapses multiple blank lines into a single blank line to avoid excessive vertical spacing.
 * - Removes blank lines that appear just before bolded bullet points (e.g., "- **Average**"),
 *   ensuring the bullet renders visually connected to the content above.
 * - Preserves Markdown headers (e.g., #, ##, ###).
 *
 * This is especially useful when displaying generated Markdown in UIs where extra line breaks
 * can make bullets or paragraphs appear disjointed.
 *
 * @param input - The raw Markdown string to clean.
 * @returns A cleaned Markdown string with improved structure for rendering.
 */
function cleanMarkdown(input: string): string {
  const lines = input.split("\n");
  const output: string[] = [];

  let i = 0;
  let prevWasEmpty = false;

  while (i < lines.length) {
    const line = lines[i].trim();

    // Collapse excess blank lines
    if (line === "") {
      const nextLine = lines[i + 1]?.trim();

      // Skip blank line if next line is a bolded bullet (like - **Average**)
      if (/^[-*]\s+\*\*[^\n]+?\*\*/.test(nextLine)) {
        i++;
        continue;
      }

      if (!prevWasEmpty) {
        output.push("");
        prevWasEmpty = true;
      }

      i++;
      continue;
    }

    prevWasEmpty = false;

    // Preserve markdown headers
    if (line.startsWith("#")) {
      output.push(line);
      i++;
      continue;
    }

    output.push(line);
    i++;
  }

  return output.join("\n");
}


/**
 * Converts numbered list headers like "1. **Title**:" into compact bold headers with soft line breaks.
 *
 * Example:
 *   Converts:
 *     "1. **Price Comparison**:"
 *   Into:
 *     "**1. Price Comparison**  "
 *
 * This avoids extra vertical space between the header and the following content
 * by using a Markdown soft line break (two trailing spaces).
 *
 * Also removes the blank line immediately after the converted header if present.
 *
 * Useful for formatting LLM output that uses numbered section headers and needs tighter visual layout.
 *
 * @param input - The raw Markdown string to convert.
 * @returns A Markdown string with compact section headers.
 */
function convertToCompactHeaders(input: string): string {
  const lines = input.split("\n");
  const output: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Convert "1. **Something**:" into "**1. Something**  "
    const match = line.match(/^(\d+)\.\s+\*\*(.+?)\*\*:?$/);
    if (match) {
      const newHeader = `**${match[1]}. ${match[2]}**  `;
      output.push(newHeader);
      continue;
    }

    // Skip extra blank lines after converted header
    if (line.trim() === "" && output.at(-1)?.endsWith("  ")) {
      continue;
    }

    output.push(line);
  }

  return output.join("\n");
}
