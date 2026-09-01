"use client";

import { formatDateTime } from "@/config/ui-strings";
import { resolveLocalizedString } from "@/lib/localized-string";
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
                <span className="news-list__category">
                  {resolveLocalizedString(item.category, lang)}
                </span>
                <time dateTime={item.updatedAt} className="news-list__time">
                  {updatedLabel}: {formatDateTime(item.updatedAt, lang)}
                </time>
              </header>
              <h3 className="news-list__title">
                {resolveLocalizedString(item.title, lang)}
              </h3>
              <p className="news-list__summary">
                {resolveLocalizedString(item.summary, lang)}
              </p>
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
