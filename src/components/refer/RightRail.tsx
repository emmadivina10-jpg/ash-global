import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Briefcase,
  CalendarDays,
  Cake,
  CloudSun,
  Flame,
  Newspaper,
  PartyPopper,
  Sparkles,
  Tag,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";
import { Avatar } from "@/components/refer/AvatarUpload";
import { Button } from "@/components/ui/button";
import { VerifiedBadge } from "@/components/refer/VerifiedBadge";
import { openMemberConversation, sendOpeningMessage } from "@/lib/contact-vendor";
import { getLocalNews } from "@/lib/rail.functions";
import {
  useRailArticles,
  useRailDeals,
  useRailEvents,
  useRailJobs,
  useRailPlace,
  useTrendingPosts,
  useUpcomingBirthdays,
  useWeather,
  weatherLabel,
  type BirthdayPerson,
} from "@/lib/rail.queries";

/** A titled block inside the rail. */
function Block({
  icon: Icon,
  title,
  action,
  children,
}: {
  icon: typeof Cake;
  title: string;
  action?: { label: string; to: string };
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card/70 p-3.5 shadow-sm">
      <header className="mb-2.5 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="grid size-7 place-items-center rounded-full bg-muted text-muted-foreground">
            <Icon className="size-3.5" />
          </span>
          {title}
        </h2>
        {action ? (
          <Link to={action.to} className="text-xs font-medium text-primary hover:underline">
            {action.label}
          </Link>
        ) : null}
      </header>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-xs text-muted-foreground">{text}</p>;
}

/** One birthday row with a one-tap celebration message. */
function BirthdayRow({ person, fr }: { person: BirthdayPerson; fr: boolean }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const today = person.inDays === 0;
  const when = today
    ? tx("Today", "Aujourd'hui")
    : person.inDays === 1
      ? tx("Tomorrow", "Demain")
      : fr
        ? `Dans ${person.inDays} jours`
        : `In ${person.inDays} days`;

  async function celebrate() {
    setBusy(true);
    try {
      const conversationId = await openMemberConversation(person.user_id);
      if (!conversationId) {
        toast.error(tx("Could not open the chat.", "Impossible d'ouvrir la discussion."));
        return;
      }
      const first = person.full_name.split(" ")[0] ?? person.full_name;
      await sendOpeningMessage(
        conversationId,
        fr
          ? `Joyeux anniversaire ${first} ! 🎉 Que cette année t'apporte santé, joie et de belles réussites.`
          : `Happy birthday ${first}! 🎉 Wishing you health, joy and a brilliant year ahead.`,
      );
      toast.success(tx("Celebration sent", "Message de célébration envoyé"));
      navigate({ to: "/messages", search: { c: conversationId } });
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex items-center gap-2.5 py-1.5">
       <Avatar path={person.avatar_url} name={person.full_name} online={person.online} className="size-9" />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 truncate text-sm font-medium text-foreground">
          {person.full_name}
          <VerifiedBadge tier={person.verified_tier} until={person.verified_until} size={13} />
        </p>
        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
          {today ? (
            <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 font-semibold text-amber-600">
              🎂 {tx("Birthday", "Anniversaire")}
            </span>
          ) : null}
          {when}
        </p>
      </div>
      <Button size="sm" variant={today ? "default" : "outline"} className="h-7 px-2 text-[11px]" disabled={busy} onClick={celebrate}>
        <PartyPopper className="mr-1 size-3" />
        {tx("Celebrate", "Fêter")}
      </Button>
    </li>
  );
}

function timeAgo(value: string | null, fr: boolean): string {
  if (!value) return "";
  const minutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 60) return fr ? `il y a ${minutes} min` : `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return fr ? `il y a ${hours} h` : `${hours}h ago`;
  const days = Math.round(hours / 24);
  return fr ? `il y a ${days} j` : `${days}d ago`;
}

/**
 * Desktop-only right rail: weather where the member is, local headlines,
 * birthdays with a one-click celebration, plus events, deals, jobs,
 * trending posts and fresh articles. Scrolls on its own.
 */
export function RightRail() {
  const { tx, lang } = useI18n();
  const fr = lang === "fr";

  const place = useRailPlace();
  const weather = useWeather(place.data);
  const news = useServerFn(getLocalNews);
  const headlines = useQuery({
    queryKey: ["rail", "news", place.data?.countryCode, fr ? "fr" : "en"],
    enabled: Boolean(place.data),
    staleTime: 30 * 60_000,
    queryFn: () => news({ data: { country: place.data?.countryCode ?? "CM", lang: fr ? "fr" : "en" } }),
  });

  const birthdays = useUpcomingBirthdays();
  const events = useRailEvents();
  const deals = useRailDeals();
  const jobs = useRailJobs();
  const posts = useTrendingPosts();
  const articles = useRailArticles();

  const dateLabel = (value: string) =>
    new Date(value).toLocaleDateString(fr ? "fr-FR" : "en-GB", { day: "numeric", month: "short" });

  return (
    <aside className="app-shell-scroll sticky top-0 hidden h-dvh w-[22rem] shrink-0 overflow-y-auto border-l border-border px-4 py-5 xl:block">
      <div className="space-y-3.5">
        {/* Weather */}
        <section className="rounded-2xl border border-border bg-gradient-to-br from-sky-500/10 to-primary/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {place.data ? `${place.data.city}, ${place.data.country}` : tx("Your area", "Votre région")}
              </p>
              <p className="text-xs text-muted-foreground">
                {weather.data ? weatherLabel(weather.data.code, fr) : tx("Loading weather…", "Chargement de la météo…")}
              </p>
              {weather.data ? (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  ↑ {weather.data.high}° · ↓ {weather.data.low}°
                </p>
              ) : null}
            </div>
            <div className="flex flex-col items-center">
              <CloudSun className="size-7 text-sky-500" />
              <span className="text-2xl font-bold text-foreground">{weather.data ? `${weather.data.temperature}°` : "--"}</span>
            </div>
          </div>
        </section>

        {/* Birthdays */}
        <Block icon={Cake} title={tx("Birthdays", "Anniversaires")}>
          {birthdays.data && birthdays.data.length > 0 ? (
            <ul className="divide-y divide-border/60">
              {birthdays.data.map((person) => (
                <BirthdayRow key={person.user_id} person={person} fr={fr} />
              ))}
            </ul>
          ) : (
            <Empty
              text={
                tx("No birthdays in the next two weeks. Add yours in your profile.", "Aucun anniversaire cette quinzaine. Ajoutez le vôtre dans votre profil.")
              }
            />
          )}
        </Block>

        {/* News */}
        <Block icon={Newspaper} title={fr ? `Actualités · ${place.data?.country ?? ""}` : `News · ${place.data?.country ?? ""}`}>
          {headlines.data && headlines.data.items.length > 0 ? (
            <ul className="space-y-2.5">
              {headlines.data.items.map((item) => (
                <li key={item.link}>
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="block text-[13px] leading-snug text-foreground hover:text-primary hover:underline"
                  >
                    {item.title}
                  </a>
                  <p className="text-[11px] text-muted-foreground">
                    {item.source} · {timeAgo(item.published, fr)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <Empty text={tx("Headlines are unavailable right now.", "Actualités indisponibles pour le moment.")} />
          )}
        </Block>

        {/* Events */}
        <Block icon={CalendarDays} title={tx("Upcoming events", "Événements à venir")} action={{ label: tx("See all", "Tout voir"), to: "/events" }}>
          {events.data && events.data.length > 0 ? (
            <ul className="space-y-2">
              {events.data.map((event) => (
                <li key={event.id}>
                  <Link to="/events" className="flex items-center gap-2.5 rounded-xl p-1.5 hover:bg-muted/60">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-[11px] font-semibold text-primary">
                      {dateLabel(event.starts_at)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium text-foreground">{event.title}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {event.city ?? ""} {event.is_free ? (tx("· Free", "· Gratuit")) : ""}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty text={tx("Nothing scheduled yet.", "Rien de prévu pour l'instant.")} />
          )}
        </Block>

        {/* Trending posts */}
        <Block icon={Flame} title={tx("Trending posts", "Publications populaires")} action={{ label: tx("Feed", "Fil"), to: "/feed" }}>
          {posts.data && posts.data.length > 0 ? (
            <ul className="space-y-2">
              {posts.data.map((post) => (
                <li key={post.id}>
                  <Link to="/post/$postId" params={{ postId: post.id }} className="block rounded-xl p-1.5 hover:bg-muted/60">
                    <span className="line-clamp-2 text-[13px] text-foreground">{post.caption || (tx("Shared photo", "Photo partagée"))}</span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {post.author} · {post.like_count} ♥ · {post.comment_count} 💬
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty text={tx("Nothing trending this week yet.", "Encore rien de populaire cette semaine.")} />
          )}
        </Block>

        {/* Articles */}
        <Block icon={Sparkles} title={tx("Fresh articles", "Articles récents")} action={{ label: tx("See all", "Tout voir"), to: "/articles" }}>
          {articles.data && articles.data.length > 0 ? (
            <ul className="space-y-2">
              {articles.data.map((article) => (
                <li key={article.id}>
                  <Link to="/articles/$articleId" params={{ articleId: article.id }} className="block rounded-xl p-1.5 hover:bg-muted/60">
                    <span className="block truncate text-[13px] font-medium text-foreground">{article.title}</span>
                    {article.excerpt ? (
                      <span className="line-clamp-2 text-[11px] text-muted-foreground">{article.excerpt}</span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty text={tx("Be the first to publish an article.", "Publiez le premier article.")} />
          )}
        </Block>

        {/* Deals */}
        <Block icon={Tag} title={tx("Deals near you", "Bons plans")} action={{ label: tx("See all", "Tout voir"), to: "/deals" }}>
          {deals.data && deals.data.length > 0 ? (
            <ul className="space-y-2">
              {deals.data.map((deal) => (
                <li key={deal.id}>
                  <Link to="/deals" className="flex items-center justify-between gap-2 rounded-xl p-1.5 hover:bg-muted/60">
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium text-foreground">{deal.title}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">{deal.city ?? ""}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
                      {deal.deal_price.toLocaleString()} XAF
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty text={tx("No live deals right now.", "Aucune offre active.")} />
          )}
        </Block>

        {/* Jobs */}
        <Block icon={Briefcase} title={tx("Open roles", "Offres d'emploi")} action={{ label: tx("See all", "Tout voir"), to: "/jobs" }}>
          {jobs.data && jobs.data.length > 0 ? (
            <ul className="space-y-2">
              {jobs.data.map((job) => (
                <li key={job.id}>
                  <Link to="/jobs/$jobId" params={{ jobId: job.id }} className="block rounded-xl p-1.5 hover:bg-muted/60">
                    <span className="block truncate text-[13px] font-medium text-foreground">{job.title}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {[job.company, job.city].filter(Boolean).join(" · ")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty text={tx("No open roles yet.", "Aucune offre ouverte.")} />
          )}
        </Block>

        <p className="pb-6 text-center text-[11px] text-muted-foreground">
          {tx("Public weather and headlines · ASH", "Météo et actualités publiques · ASH")}
        </p>
      </div>
    </aside>
  );
}
