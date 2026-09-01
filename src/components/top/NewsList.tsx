"use client";

import { formatDateTime } from "@/config/ui-strings";
import type { NewsItem, SiteLanguage } from "@/types/top-page";

type Props = {
  heading: string;
  updatedLabel: string;
  items: NewsItem[];
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
                <span className="news-list__category">{item.category}</span>
                <time dateTime={item.updatedAt} className="news-list__time">
                  {updatedLabel}: {formatDateTime(item.updatedAt, lang)}
                </time>
              </header>
              <h3 className="news-list__title">{item.title}</h3>
              <p className="news-list__summary">{item.summary}</p>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function NewsListPlaceholder({ heading }: { heading: string }) {
  return (
    <section className="news-list" aria-labelledby="news-list-heading">
      <h2 id="news-list-heading">{heading}</h2>
      <p aria-busy="true">読み込み中…</p>
    </section>
  );
}
