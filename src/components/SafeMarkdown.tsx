"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";
import Markdown from "markdown-to-jsx";
import { isSafeHref } from "@/lib/validate-top-page-data";

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children?: ReactNode;
};

function SafeMarkdownLink({ href, children, ...rest }: LinkProps) {
  if (typeof href === "string" && isSafeHref(href)) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  }
  return <span {...rest}>{children}</span>;
}

type Props = {
  children: string;
  className?: string;
};

/** Markdown を React 要素化し、リンク href はスキーム検証を通す。 */
export function SafeMarkdown({ children, className }: Props) {
  return (
    <div className={className}>
      <Markdown
        options={{
          forceBlock: true,
          overrides: {
            a: { component: SafeMarkdownLink },
          },
        }}
      >
        {children}
      </Markdown>
    </div>
  );
}
