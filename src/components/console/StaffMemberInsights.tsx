import {useState} from 'react';
import {Link} from '@tanstack/react-router';
import {useQuery} from '@tanstack/react-query';
import {useServerFn} from '@tanstack/react-start';
import {Users,Target,TrendingUp,ChevronLeft,ChevronRight,Search} from 'lucide-react';
import {getStaffMemberDirectory,getStaffMemberMetrics} from '@/lib/member-insights.functions';
import {hasFreshPresence,MEMBER_TARGET} from '@/lib/member-insights';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Avatar,AvatarImage,AvatarFallback} from '@/components/ui/avatar';
import {useI18n} from '@/lib/i18n';

export function StaffMemberInsights(){
 const {lang}=useI18n();const fr=lang==='fr';
 const metricsFn=useServerFn(getStaffMemberMetrics);const directoryFn=useServerFn(getStaffMemberDirectory);
 const [search,setSearch]=useState('');const [page,setPage]=useState(0);const [expanded,setExpanded]=useState(false);
 const metrics=useQuery({queryKey:['console','member-metrics'],queryFn:metricsFn,refetchInterval:60_000,retry:false});
 const directory=useQuery({queryKey:['console','member-directory',search,page],queryFn:()=>directoryFn({data:{search,page}}),enabled:expanded,refetchInterval:30_000,retry:false});
 const m=metrics.data;const fmt=(n:number|undefined)=>n===undefined?'—':n.toLocaleString(fr?'fr-FR':'en-CA');
 return <section aria-label="Member growth" className="space-y-3 border-b border-border pb-5">
  <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">{fr?'Communauté ASH Glo':'ASH Glo community'}</h2><Button variant="outline" size="sm" onClick={()=>setExpanded(v=>!v)}><Users className="size-4"/>{fr?'Membres':'Members'}</Button></div>
  <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
   {[{icon:Users,label:fr?'Membres inscrits':'Registered members',value:fmt(m?.total)},{icon:TrendingUp,label:fr?'Inscriptions aujourd’hui · UTC':'Joined today · UTC',value:fmt(m?.joinedToday)},{icon:Users,label:fr?'Actifs · 30 jours':'Active · 30 days',value:fmt(m?.active30d)},{icon:Target,label:fr?'Objectif au 18 mai 2027':'Target by May 18, 2027',value:'10,000'}].map(({icon:Icon,label,value})=><div key={label} className="min-w-0 border-l-2 border-border pl-3"><p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="size-3.5 shrink-0"/>{label}</p><p className="mt-1 text-xl font-bold tabular-nums">{value}</p></div>)}
  </div>
  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>18 Nov 2026 — 18 May 2027 · {m?`${m.target.percent?.toFixed(1)}%`:fr?'Données non disponibles':'Data not available'}</span><span>{m?`${fr?'Actualisé':'Updated'} ${new Date(m.asOf).toLocaleTimeString()}`:metrics.isPending?(fr?'Chargement…':'Loading…'):fr?'Statistiques en attente de l’approbation':'Statistics awaiting approval'}</span></div>
  {m?<><progress className="h-1.5 w-full accent-primary" max={MEMBER_TARGET.count} value={m.active30d}/><details className="text-xs text-muted-foreground"><summary>{fr?'Qualité des mesures':'Measurement quality'}</summary><p className="mt-2">{m.quality}</p></details><div className="flex h-8 items-end gap-0.5" aria-label="Daily registrations, last 30 days">{m.daily.map(d=><div key={d.day} title={`${d.day}: ${d.registrations}`} className="flex h-full min-w-0 flex-1 flex-col justify-end"><progress className="h-2 w-full accent-primary" value={d.registrations} max={Math.max(1,...m.daily.map(v=>v.registrations))}/></div>)}</div></>:null}
  {metrics.isError?<p role="status" className="text-xs text-muted-foreground">{fr?'Les mesures d’activité sécurisées seront disponibles après approbation de cette mise à jour.':'Secure activity measurements become available after this update is approved.'}</p>:null}
  {expanded?<div className="space-y-3"><div className="relative"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground"/><Input aria-label="Search members" className="pl-9" placeholder={fr?'Rechercher un membre':'Search members'} value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}}/></div>
   {directory.isError?<p role="alert">{fr?'Membres indisponibles':'Members could not be loaded.'}</p>:directory.isPending?<p>{fr?'Chargement…':'Loading members…'}</p>:<div className="grid gap-x-5 sm:grid-cols-2 xl:grid-cols-3">{directory.data.members.map(member=><div key={member.userId} className="flex min-w-0 items-center gap-3 border-b border-border py-3"><Avatar className="size-10 shrink-0"><AvatarImage src={member.avatar??undefined}/><AvatarFallback>{member.name?.slice(0,2).toUpperCase()||'—'}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{member.name|| (fr?'Nom indisponible':'Name unavailable')}</p><p className="text-xs text-muted-foreground">{hasFreshPresence(member.lastActiveAt)?fr?'Récemment actif':'Recently active':fr?'Hors ligne':'Offline'}</p></div>{directory.data.canReview?<Button asChild variant="ghost" size="sm"><Link to="/console/members/$memberId" params={{memberId:member.userId}}>{fr?'Examiner':'Review'}</Link></Button>:null}</div>)}</div>}
   <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>{fmt(directory.data?.total)} {fr?'membres':'members'}</span><div className="flex items-center gap-2"><Button variant="outline" size="icon" aria-label="Previous members" disabled={page===0} onClick={()=>setPage(p=>p-1)}><ChevronLeft/></Button><span>{page+1}</span><Button variant="outline" size="icon" aria-label="Next members" disabled={!directory.data||(page+1)*24>=directory.data.total} onClick={()=>setPage(p=>p+1)}><ChevronRight/></Button></div></div>
  </div>:null}
 </section>;
}
