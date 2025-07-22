export function cleanMarkdownForDisplay(input: string): string {
  const lines = input.split("\n");
  const output: string[] = [];

  let currentTitle = "";
  let currentDetail = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Fix 1: Heading or regular line — preserve it
    if (line.startsWith("#")) {
      output.push(line);
      continue;
    }

    // Fix 2: Flatten ordered list
    const titleMatch = line.match(/^\d+\.\s+\*\*(.+?)\*\*:?/);
    if (titleMatch) {
      if (currentTitle && currentDetail) {
        output.push(`- ${currentTitle}: ${currentDetail.trim()}`);
      }
      currentTitle = `**${titleMatch[1]}**`;
      currentDetail = "";
      continue;
    }

    // Fix 3: Capture bullet-style explanation under an ordered item
    if (line.startsWith("-") || line.startsWith("*")) {
      if (/^[-*]\s*$/.test(line)) {
        // Dangling bullet, join with next line
        const nextLine = lines[i + 1]?.trim();
        if (nextLine) {
          output.push(`- ${nextLine}`);
          i++;
        }
        continue;
      }

      // It's a real flat bullet, keep as-is
      if (currentTitle && currentDetail) {
        output.push(`- ${currentTitle}: ${currentDetail.trim()}`);
        currentTitle = "";
        currentDetail = "";
      }
      output.push(line);
      continue;
    }

    // Capture multi-line content under an ordered item
    if (currentTitle) {
      currentDetail += line + " ";
    } else {
      output.push(line);
    }
  }

  // Push any remaining ordered item
  if (currentTitle && currentDetail) {
    output.push(`- ${currentTitle}: ${currentDetail.trim()}`);
  }

  return output.join("\n").replace(/\n{3,}/g, "\n\n"); // limit max spacing
}
