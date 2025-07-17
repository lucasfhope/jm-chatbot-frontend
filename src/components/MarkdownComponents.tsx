// components/MarkdownComponents.tsx
import { ComponentPropsWithoutRef, ReactNode } from "react";
import { InlineMath, BlockMath } from "react-katex";

type ComponentProps = ComponentPropsWithoutRef<any> & {
  children?: ReactNode;
};

export const markdownComponents = {
  h1: ({ children }: ComponentProps) => (
    <h1 className="text-xl font-bold text-black mt-1 mb-[2px]">{children}</h1>
  ),
  h2: ({ children }: ComponentProps) => (
    <h2 className="text-lg font-semibold text-black mt-1 mb-[2px]">{children}</h2>
  ),
  h3: ({ children }: ComponentProps) => (
    <h3 className="text-base font-semibold text-black mt-1 mb-[2px]">{children}</h3>
  ),
  ol: ({ children }: ComponentProps) => (
    <ol className="list-inside text-sm text-black leading-snug mb-[0px]">{children}</ol>
  ),
  ul: ({ children }: ComponentProps) => (
    <ul className="list-disc list-inside text-black text-sm mb-[0px]">{children}</ul>
  ),
  li: ({ children }: ComponentProps) => (
    <li className="text-black text-sm leading-snug my-[0px]">{children}</li>
  ),
  hr: () => <hr className="my-2 border-gray-400" />,
  p: ({ children }: ComponentProps) => (
    <p className="text-sm text-black leading-snug mb-[2px] whitespace-pre-wrap">{children}</p>
  ),
  table: ({ children, ...props }: ComponentProps) => (
    <div className="overflow-x-auto w-full my-2">
        <table
        className="min-w-full text-sm text-left text-black border border-collapse border-gray-400"
        {...props}
        >
        {children}
        </table>
    </div>
    ),

  thead: ({ children }: ComponentProps) => (
    <thead className="bg-gray-200 text-black">{children}</thead>
  ),
  tbody: ({ children }: ComponentProps) => <tbody>{children}</tbody>,
  tr: ({ children }: ComponentProps) => <tr className="border-b border-gray-300">{children}</tr>,
  th: ({ children }: ComponentProps) => (
    <th className="px-3 py-2 border border-gray-300 font-semibold">{children}</th>
  ),
  td: ({ children }: ComponentProps) => (
    <td className="px-3 py-2 border border-gray-300">{children}</td>
  ),
  span({ children }: ComponentProps) {
    let content: string | undefined;
    if (Array.isArray(children) && typeof children[0] === "string") {
      content = children[0];
    } else if (typeof children === "string") {
      content = children;
    }

    if (typeof content === "string" && content.startsWith("$") && content.endsWith("$")) {
      return <InlineMath math={content.slice(1, -1)} />;
    }

    if (typeof content === "string" && content.startsWith("$$") && content.endsWith("$$")) {
      return <BlockMath math={content.slice(2, -2)} />;
    }

    return <span className="text-black">{children}</span>;
  },
};
