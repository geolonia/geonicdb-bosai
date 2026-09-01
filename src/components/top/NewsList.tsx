"use client";

import { formatDateTime } from "@/config/ui-strings";
import { SafeMarkdown } from "@/components/SafeMarkdown";
import type { SiteLanguage } from "@/config/site-language";
import type { BosaiNotice } from "@/types/top-page";

type Props = {
  heading: string;
  updatedLabel: string;
  items: BosaiNotice[];
  lang: SiteLanguage;
};

export function NewsList({ heading, updatedLabel, items, lang }: Props) {
  return (
    <section className="news-list" aria-labelledby="news-list-heading">
      <h2 id="news-list-heading">{heading}</h2>
      <ul className="news-list__items">
        {items.map((item) => (
          <li key={item.id} className="news-list__item">
            <article>
              <header className="news-list__header">
                <time dateTime={item.updatedAt} className="news-list__time">
                  {updatedLabel}: {formatDateTime(item.updatedAt, lang)}
                </time>
              </header>
              <h3 className="news-list__title">{item.title}</h3>
              <SafeMarkdown className="news-list__summary">
                {item.body}
              </SafeMarkdown>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function NewsListPlaceholder({
  heading,
  loadingText,
}: {
  heading: string;
  loadingText: string;
}) {
  return (
    <section className="news-list" aria-labelledby="news-list-heading">
      <h2 id="news-list-heading">{heading}</h2>
      <p aria-busy="true">{loadingText}</p>
    </section>
  );
}

export function NewsListError({
  heading,
  message,
}: {
  heading: string;
  message: string;
}) {
  return (
    <section className="news-list" aria-labelledby="news-list-heading">
      <h2 id="news-list-heading">{heading}</h2>
      <p role="status">{message}</p>
    </section>
  );
}
