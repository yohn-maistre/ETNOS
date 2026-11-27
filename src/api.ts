import { Buffer } from 'node:buffer'
import { EtnosCore, Fault, type Community, type Actor } from './core.ts'
import { Social } from './social.ts'
import { Search } from './search.ts'
import { Wiki } from './wiki.ts'
import {Seasons} from './seasons.ts'
import {Founding} from './founding.ts'
import {Lembaga} from './lembaga.ts'
import {Kios,type KiosOwner} from './kios.ts'
import {activeRules,kiosRules} from './kios-rules.ts'
import {Situs} from './situs.ts'
import {Deployment} from './deployment.ts'
import {renderSitus} from './situs-render.ts'
import {SITUS_STYLE_VERSION} from './situs-style.ts'
import {updateProfile} from './profile.ts'
import {Groups,strings,type Group,type Context,type SeedLabels} from './groups.ts'
import {suggestCommunities} from './first-run.ts'
import {DirectMessages} from './dm.ts'
import {Activity} from './activity.ts'
import {PublicWork} from './public-work.ts'
import {AksaraRequests} from './aksara-requests.ts'
import {Forum} from './forum.ts'
import {Periksa} from './periksa.ts'
import {Kamus,glossPrompt,parseGlosses} from './kamus.ts'
import {kamusLexicon} from './kamus-data.ts'
import {KamusAsk,type ConceptList} from './kamus-ask.ts'
import {kamusCsv,kamusCldf} from './kamus-export.ts'
import leipzigJakarta from '../seed/kamus/leipzig-jakarta-100.json' with { type: 'json' }
import type {Models} from './models.ts'
import { Media } from './media.ts'
import { Voice, type VoiceBucket } from './voice.ts'
import { AtSpaces } from './spaces.ts'
import { Captures3d } from './captures.ts'
import { Saluran } from './saluran.ts'
import { PetaKata } from './peta-kata.ts'
import { SemanticMap, type Embedder } from './semantic-map.ts'
import { TopicClassifier } from './topic-classifier.ts'
import {Decisions,type DecisionProvider} from './decisions.ts'
import {Desk} from './desk.ts'
import {AgentAccess} from './agent-access.ts'
import { capabilities } from './capabilities.ts'
import {Discovery,type SourceFetcher} from './discovery.ts'
import {Offerings} from './offerings.ts'
import {Ranking} from './ranking.ts'
import {Clustering} from './clustering.ts'
import {Knowledge} from './knowledge.ts'
import {Resident,type ResidentBudget,type ResidentProvider,type ResidentSkill} from './resident.ts'
import {catalogue,catalogueSummary,contextFamily} from './catalogue.ts'
import seedLabels from './catalogues/tanah-papua-seed-labels.json' with { type: 'json' }
import knowledgeSeed from './catalogues/tanah-papua-knowledge-seed.json' with { type: 'json' }
import {KnowledgeModel,type KnowledgeSeed} from './knowledge-model.ts'
import {Datasets,type DatasetSeed} from './datasets.ts'
import datasetSeed from './catalogues/tanah-papua-datasets.json' with { type: 'json' }
import {entryIndex,readEntry,viewerRecords,catalogue as entryCatalogue,resolve} from './entri.ts'
import {storeSource} from './entri-store.ts'
import {Tentang,entryNames} from './tentang.ts'

const MAX_BODY = 1500000
export async function body(req: Request,maximum=MAX_BODY): Promise<Record<string, unknown>> {
  if (req.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new Fault(415, 'JSON required')
  const reader = req.body?.getReader()
  if (!reader) throw new Fault(400, 'Invalid JSON')
  const chunks: Uint8Array[] = []; let size=0
  try {
    while (true) {
      const {done,value}=await reader.read()
      if (done) break
      size+=value.byteLength
      if(size>maximum) { await reader.cancel(); throw new Fault(413,'Request too large') }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  try {
    const value=JSON.parse(Buffer.concat(chunks).toString('utf8'))
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error()
    return value
  } catch { throw new Fault(400,'Invalid JSON') }
}
const string = (v: unknown) => { if (typeof v !== 'string') throw new Fault(400, 'String required'); return v }
export function json(code: number, data: unknown) {
  return Response.json(data,{status:code,headers:{'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}})
}
export type ApiOptions={models?:()=>Promise<Models|undefined>;newsFetcher?:typeof fetch;researchFetcher?:typeof fetch;voiceBucket?:VoiceBucket;transcribeVoice?:(bytes:Uint8Array,mime:string)=>Promise<string>;embedTexts?:Embedder;splatWorkerUrl?:string;splatSecret?:string;plantNetKey?:()=>Promise<string|undefined>|string|undefined;saluranFetcher?:typeof fetch;sourceFetcher?:SourceFetcher;residentProvider?:ResidentProvider;residentBudget?:ResidentBudget;modelRoute?:{keyless:string|null;keyed:{host:string;fast:string;synthesis:string}|null};agentAccess?:AgentAccess;decisions?:DecisionProvider;custodyFixture?:boolean;sources?:string[];runtime?:string;stewardDid?:string;catalogue?:string;authMode?:'atproto'|'local';enrollmentMode?:'open'|'invite'|'closed';principal?:(request:Request)=>Actor|undefined;writeGuard?:(request:Request)=>void}
export function api(store: EtnosCore, options: ApiOptions = {}) {
  const agents=options.agentAccess??new AgentAccess(store,{stewardDid:options.stewardDid})
  const forum=new Forum(store)
  const periksa=new Periksa(store),kamus=new Kamus(store,kamusLexicon(),{operator:id=>!!options.stewardDid&&store.actor(id).did===options.stewardDid})
  const ask=new KamusAsk(store,kamus,kamusLexicon(),leipzigJakarta as ConceptList,viewerRecords)
  const decisions=new Decisions(store,options.decisions),desk=new Desk(store)
  const media=new Media(store),voice=new Voice(store,options.voiceBucket),spaces=new AtSpaces(store)
  const captures=new Captures3d(store,{bucket:options.voiceBucket,workerUrl:options.splatWorkerUrl,workerSecret:options.splatSecret})
  const saluran=new Saluran(store,{plantNetKey:options.plantNetKey,fetcher:options.saluranFetcher??options.researchFetcher,origin:store.base})
  const petaKata=new PetaKata(store,kamusLexicon())
  const semanticMap=new SemanticMap(store,kamusLexicon(),options.embedTexts)
  const topicClassifier=new TopicClassifier(store,options.embedTexts)
  const dm=new DirectMessages(store)
  const activity=new Activity(store)
  const social=new Social(store),search=new Search(store)
  const wiki=new Wiki(store),seasons=new Seasons(store),founding=new Founding(store)
  const groups=new Groups(store,{stewardDid:options.stewardDid}),work=new PublicWork(store,groups),model=new KnowledgeModel(store,groups),datasets=new Datasets(store,groups,{datasets:datasetSeed as DatasetSeed,things:(knowledgeSeed as KnowledgeSeed).entities.map(e=>({slug:e.slug,class:e.class,title:e.title,context:e.context}))})
  const clustering=new Clustering(store),discovery=new Discovery(store,options.sourceFetcher),knowledge=new Knowledge(store),resident=new Resident(store,agents,options.residentProvider,undefined,{models:options.models,newsFetcher:options.newsFetcher,fetcher:options.researchFetcher})
  if(options.residentBudget)resident.budget=options.residentBudget
  const requests=new AksaraRequests(store,groups)
  const lembaga=new Lembaga(store,groups),kios=new Kios(store,groups),situs=new Situs(store,groups,lembaga,kios)
  const tentang=new Tentang(store),entryCat=()=>entryCatalogue(entrySource())
  const entrySource=()=>storeSource({store,groups,wiki,model,datasets,kamus,seed:knowledgeSeed as KnowledgeSeed,catalogue:options.catalogue,localNames:id=>ask.localNames(id),lembaga,kios})
  const deployment=new Deployment(store,groups,()=>({origin:store.base,catalogue:options.catalogue,enrollment:options.enrollmentMode,sources:options.sources,stewardDid:options.stewardDid,model:options.modelRoute?.keyed??null}))
  const siteName=()=>deployment.name()
  const programSkill=(id:string|null)=>{if(id===null)return undefined;const slot=resident.slots.jadwal.slots.find(x=>x.id===id);if(!slot)throw new Fault(400,'Unknown program');return slot.skill}
  return async (req: Request): Promise<Response> => {
    try {
      const url=new URL(req.url)
      // The Fetch URL is authoritative at the edge. The Node adapter separately
      // validates raw Host before constructing it; proxy transport Host can differ.
      if (url.origin !== store.base) throw new Fault(400,'Unexpected host')
      const origin = req.headers.get('origin')
      if (origin && origin !== store.base) throw new Fault(403,'Origin not allowed')
      const path = url.pathname
      const auth = req.headers.get('authorization')
      const principal=()=>options.principal ? options.principal(req) : auth ? store.authenticate(auth.startsWith('Bearer ') ? auth.slice(7) : '') : undefined
      const actor = principal()
      const authenticated = () => { if (!actor) throw new Fault(401,'Authentication required'); return actor.id }
      const parts = path.split('/').filter(Boolean)
      if (path !== '/health' && parts[0] !== 'v1') throw new Fault(404, 'Not found')
      if (['sources','releases'].includes(parts[1]) && !options.custodyFixture) throw new Fault(501,'Custody fixture disabled; Aksara adapter is not connected')
      let result: unknown
      if (req.method === 'GET') {
        if(path==='/v1/studio'){
          const who=authenticated();if(store.actor(who).kind!=='human')throw new Fault(403,'Human steward required')
          result={communities:store.all<Community>("SELECT c.* FROM communities c JOIN memberships m ON m.community_id=c.id WHERE m.actor_id=? AND m.active=1 AND m.role IN ('owner','moderator') ORDER BY c.title",who).map(c=>({...c,sourceCount:store.get<{n:number}>('SELECT count(*) n FROM discovery_sources WHERE community_id=?',c.id)!.n,knowledgeCount:store.get<{n:number}>("SELECT count(*) n FROM knowledge_notes WHERE community_id=? AND state!='withdrawn'",c.id)!.n,pendingJobs:store.get<{n:number}>("SELECT count(*) n FROM resident_jobs WHERE community_id=? AND state IN ('queued','running')",c.id)!.n})),acquisitionConfigured:!!options.sourceFetcher,residentProvider:options.residentProvider?.label??'source-linked, model-free',backupStatus:'daily-export'}
        }
        else if(path==='/v1/discovery/sources')result=discovery.sources(authenticated(),string(url.searchParams.get('community')))
        else if(path==='/v1/discovery/items')result=discovery.items(actor?.id,url.searchParams.get('community')??undefined,url.searchParams.get('review')==='true')
        else if(parts.length===4&&parts[1]==='discovery'&&parts[2]==='items')result=discovery.item(parts[3],actor?.id,url.searchParams.get('review')==='true')
        else if(path==='/v1/offerings')result=new Offerings(store).list(actor?.id,{communityId:url.searchParams.get('community')??undefined,authorId:url.searchParams.get('author')??undefined,kind:url.searchParams.get('kind')??undefined,includeClosed:url.searchParams.get('closed')==='true'})
        else if(parts.length===3&&parts[1]==='offerings')result=new Offerings(store).read(parts[2],actor?.id)
        else if(path==='/v1/discovery/posts')result=new Ranking(store).explore({sort:url.searchParams.get('sort')??undefined,limit:url.searchParams.has('limit')?Number(url.searchParams.get('limit')):undefined,communityId:url.searchParams.get('community')??undefined})
        else if(path==='/v1/clustering/snapshot')result=clustering.snapshot(authenticated(),string(url.searchParams.get('community')))
        else if(parts.length===4&&parts[1]==='discovery'&&parts[2]==='related')result=clustering.related(parts[3])
        else if(path==='/v1/knowledge')result=knowledge.list(actor?.id,url.searchParams.get('community')??undefined)
        else if(parts.length===3&&parts[1]==='knowledge')result=knowledge.read(parts[2],actor?.id)
        else if(parts.length===4&&parts[1]==='knowledge'&&parts[3]==='history')result=knowledge.history(parts[2],actor?.id)
        else if(path==='/v1/aksara/jadwal')result=resident.publicJadwal()
        else if(path==='/v1/resident/config')result=resident.get(authenticated(),string(url.searchParams.get('community')))
        else if(path==='/v1/resident/overview')result={...resident.overview(authenticated()),model:options.modelRoute??null}
        else if(path==='/v1/resident/choices')result=resident.routing.choices(authenticated(),string(url.searchParams.get('community')))
        else if(path==='/v1/resident/requests')result=resident.questions.statuses(string(url.searchParams.get('post')),actor?.id)
        else if(path==='/v1/resident/sitewide')result=resident.routing.globalInfo(authenticated())
        else if(path==='/v1/resident/destinations')result=resident.routing.participation(authenticated(),string(url.searchParams.get('community')))
        else if(path==='/v1/resident/jobs')result=resident.jobs(authenticated(),string(url.searchParams.get('community')))
        else if(parts.length===4&&parts[1]==='resident'&&parts[2]==='jobs')result=resident.job(authenticated(),parts[3])
        else if(path==='/v1/agents')result=agents.list(authenticated())
        else if(parts.length===4&&parts[1]==='communities'&&parts[3]==='desk')result=desk.list(authenticated(),parts[2])
        else if(parts.length===3&&parts[1]==='media')return media.response(actor?.id,parts[2])
        else if(parts.length===3&&parts[1]==='voice')return await voice.response(actor?.id,parts[2],req.headers.get('range'))
        else if(path==='/v1/captures')result={captures:captures.list(actor?.id,{communityId:url.searchParams.get('community')??undefined,entrySlug:url.searchParams.get('entry')??undefined})}
        else if(parts.length===3&&parts[1]==='captures')result=captures.read(actor?.id,parts[2])
        else if(parts.length===4&&parts[1]==='captures'&&parts[3]==='file')return await captures.fileResponse(actor?.id,parts[2])
        else if(parts.length===4&&parts[1]==='viewer'&&parts[3]==='pins')result={pins:captures.pinsFor(actor?.id,decodeURIComponent(parts[2]))}
        else if(path==='/v1/peta-kata/concepts')result=petaKata.concepts()
        else if(path==='/v1/peta-kata/semantic')result=await semanticMap.build()
        else if(path==='/v1/peta-kata')result=petaKata.lookup({concept:url.searchParams.get('concept')??undefined,q:url.searchParams.get('q')??undefined})
        else if(parts.length===4&&parts[1]==='communities'&&parts[3]==='saluran')result=saluran.settings(actor?.id,parts[2])
        else if(parts.length===4&&parts[1]==='communities'&&parts[3]==='kurasi')result={annotations:saluran.listAnnotations(actor?.id,parts[2])}
        else if(path==='/v1/kurasi/annotations.jsonld')return new Response(JSON.stringify(saluran.exportJsonLd(url.searchParams.get('target')??undefined)),{status:200,headers:{'content-type':'application/ld+json; charset=utf-8','cache-control':'public, max-age=60','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}})
        else if (path === '/health') result = { status:'ok', version:'0.1.0-alpha.0', auth:options.authMode==='atproto'?'atproto-oauth':'local-provisioned-credentials', enrollment:options.authMode==='atproto'?(options.enrollmentMode??'invite'):null, atproto:'draft-schema-and-sandbox-adapter', liveFederation:false, runtime:options.runtime ?? 'node', custodyFixture:options.custodyFixture === true }
        else if (path === '/v1/search') result=search.query(actor?.id,url.searchParams.get('q')??'')
        else if (path === '/v1/search/semantic') result=await topicClassifier.searchSemantic({query:url.searchParams.get('q')??'',topic:url.searchParams.get('topic')??undefined,limit:url.searchParams.has('limit')?Number(url.searchParams.get('limit')):undefined})
        else if (path === '/v1/topics/suggest') result=await topicClassifier.classifyText(url.searchParams.get('q')??'')
        else if (parts.length===4 && parts[1]==='posts' && parts[3]==='related-public') result=await topicClassifier.relatedPublic(parts[2],url.searchParams.has('limit')?Number(url.searchParams.get('limit')):undefined)
        else if (path === '/v1/people') result=social.people(authenticated(),url.searchParams.get('q')??'')
        else if (path === '/v1/following') result=social.following(authenticated())
        else if (path === '/v1/me') result = store.actor(authenticated())
        else if(parts.length===4&&parts[1]==='communities'&&parts[3]==='moderation')result=forum.moderation(authenticated(),parts[2])
        else if (path === '/v1/memberships') result=store.all<{community_id:string;role:string}>('SELECT community_id,role FROM memberships WHERE actor_id=? AND active=1',authenticated())
        else if (path === '/v1/capabilities') result={...capabilities,agents:{enrollment:true,publicMcp:true,remoteCredentials:'registered-jwt-bearer',institutionalVerification:false},decisions:{enabled:!!options.decisions},auth:{...capabilities.auth,localCredentials:options.authMode!=='atproto',atOAuth:options.authMode==='atproto',remoteSignup:options.authMode==='atproto'&&options.enrollmentMode==='open',signupProvider:options.authMode==='atproto'?'bluesky':null,hostedAccounts:false}}
        else if(path==='/v1/dm/contacts')result=dm.contacts(authenticated(),url.searchParams.get('q')??'')
        else if(path==='/v1/dm/me')result=dm.me(authenticated())
        else if(path==='/v1/dm/threads')result=dm.list(authenticated())
        else if(parts.length===4&&parts[1]==='dm'&&parts[2]==='threads')result=dm.read(authenticated(),parts[3])
        else if(parts.length===5&&parts[1]==='dm'&&parts[2]==='threads'&&parts[4]==='messages')result=dm.messages(authenticated(),parts[3],Number(url.searchParams.get('after')??0))
        else if(path==='/v1/notifications')result=activity.list(authenticated())
        else if(path==='/v1/groups')result=groups.list(actor?.id)
        else if(path==='/v1/group-memberships')result=groups.memberships(authenticated())
        else if(parts.length===3&&parts[1]==='groups')result=lembaga.page(actor?.id,parts[2])
        // Lembaga, claims and Kios (docs/plan/one-page-system-2026-11-21.md §5 and §7).
        else if(parts.length===4&&parts[1]==='groups'&&parts[3]==='logo')return lembaga.logo(actor?.id,parts[2])
        else if(parts.length===4&&parts[1]==='groups'&&parts[3]==='claims')result=lembaga.claims(authenticated(),parts[2])
        else if(path==='/v1/entry-claims')result=lembaga.queue(authenticated())
        else if(path==='/v1/my-lembaga')result=groups.stewarded(authenticated())
        else if(path==='/v1/kios/rules')result=kiosRules(activeRules(store))
        else if(parts.length===4&&parts[1]==='kios'&&['actor','group'].includes(parts[2]))result={kios:kios.view({kind:parts[2] as KiosOwner['kind'],id:parts[3]},actor?.id)}
        // etnos.yaml (src/deployment.ts), for the node operator in Studio.
        else if(path==='/v1/deployment/etnos-yaml')result=deployment.view(authenticated())
        // Situs (docs/plan/one-page-system-2026-11-21.md §8). The page itself is HTML; the web Worker serves it at /situs/<name>.
        else if(parts.length===4&&parts[1]==='groups'&&parts[3]==='situs')result=situs.info(actor?.id,parts[2])
        else if(parts.length===5&&parts[1]==='groups'&&parts[3]==='situs'&&parts[4]==='state')result=situs.state(authenticated(),parts[2])
        else if(parts.length===5&&parts[1]==='groups'&&parts[3]==='situs'&&parts[4]==='export')result=situs.exportFiles(authenticated(),parts[2])
        else if(parts.length===3&&parts[1]==='situs'){const found=situs.byName(parts[2]);if(!found||groups.group(found.group_id).visibility!=='public')throw new Fault(404,'Not found');result={groupId:found.group_id,published:!!found.published}}
        else if(parts.length===4&&parts[1]==='situs'&&parts[3]==='page'){
          const draft=url.searchParams.get('versi')==='draf',cat=draft?await entryCat():null
          const page=situs.page(parts[2],{draft,actorId:actor?.id,entryTitle:slug=>cat?.nodes.get(slug)?.title??null})
          // On <name>.etnos.space (src/situs-dispatch.ts) the page names its own host as the canonical address.
          const base=new URL(store.base),canonical=url.searchParams.get('alamat')==='sub'?base.protocol+'//'+page.name+'.'+base.host+'/':store.base+'/situs/'+page.name
          const html=renderSitus(page,{origin:store.base,canonical,siteName:siteName(),styleVersion:SITUS_STYLE_VERSION})
          return new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':draft?'private, no-store':'public, max-age=60','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin',...(draft?{'x-robots-tag':'noindex, nofollow'}:{})}})
        }
        // Requests between organisations
        else if(parts.length===4&&parts[1]==='groups'&&parts[3]==='requests')result=url.searchParams.get('direction')==='out'?requests.outgoing(authenticated(),parts[2]):requests.incoming(authenticated(),parts[2])
        else if(parts.length===3&&parts[1]==='aksara-requests')result=requests.open(authenticated(),parts[2])
        else if(parts.length===4&&parts[1]==='groups'&&parts[3]==='spaces')result=groups.spaces(actor?.id,parts[2])
        else if(parts.length===4&&parts[1]==='groups'&&parts[3]==='members')result=groups.members(authenticated(),parts[2])
        else if(path==='/v1/contexts')result=groups.contexts()
        // One public shape for every entry page (docs/plan/one-page-system-2026-11-21.md §3); always read as an anonymous reader.
        else if(path==='/v1/entri')result=await entryIndex(entrySource())
        // Percakapan (docs/plan/one-page-system-2026-11-21.md §4, src/tentang.ts): names for the composer, an entry's tab, the prompt after posting.
        else if(path==='/v1/tentang/names')result={entries:entryNames(await entryCat())}
        else if(parts.length===4&&parts[1]==='entri'&&parts[3]==='percakapan')result=tentang.percakapan(actor?.id,await entryCat(),decodeURIComponent(parts[2]),{inside:url.searchParams.get('inside')==='1',cursor:url.searchParams.get('cursor')??undefined,limit:url.searchParams.has('limit')?Number(url.searchParams.get('limit')):undefined})
        else if(parts.length===4&&parts[1]==='posts'&&parts[3]==='tandai')result=tentang.suggest(authenticated(),parts[2],await entryCat())
        else if(parts.length===3&&parts[1]==='entri'){result=await readEntry(entrySource(),decodeURIComponent(parts[2]));if(!result)throw new Fault(404,'Not found')}
        else if(path==='/v1/knowledge-model')result=model.summary(actor?.id)
        else if(path==='/v1/knowledge-model/entities')result=model.entities(actor?.id,{class:url.searchParams.get('class')??undefined,q:url.searchParams.get('q')??undefined})
        else if(parts.length===4&&parts[1]==='knowledge-model'&&parts[2]==='entities')result=model.entity(actor?.id,parts[3])
        else if(path==='/v1/knowledge-model/graph')result=model.graph(actor?.id,{publicOnly:url.searchParams.get('public')==='1'})
        else if(path==='/v1/knowledge-model/export')result=model.graph(undefined,{publicOnly:true,train:url.searchParams.get('train')==='1',excerpts:url.searchParams.get('train')!=='1'})
        else if(path==='/v1/knowledge-model/queue')result=model.queue(authenticated(),url.searchParams.get('community')??undefined)
        else if(path==='/v1/datasets')result=datasets.list(actor?.id,{thing:url.searchParams.get('thing')??undefined,context:url.searchParams.get('context')??undefined,q:url.searchParams.get('q')??undefined,kind:url.searchParams.get('kind')??undefined})
        else if(path==='/v1/datasets/queue')result=datasets.queue(authenticated())
        else if(parts.length===3&&parts[1]==='datasets')result=datasets.read(actor?.id,parts[2])
        else if(path==='/v1/contexts/catalogue')result=catalogueSummary(options.catalogue)
        else if(path==='/v1/contexts/talked')result=groups.talked(Number(url.searchParams.get('days')??7))
        else if(parts.length===3&&parts[1]==='contexts'){const detail=groups.contextDetail(parts[2]);result={...detail,family:contextFamily(detail,options.catalogue),work:work.list({contextId:parts[2]})}}
        else if(path==='/v1/work')result=work.list({groupId:url.searchParams.get('group')??undefined,contextId:url.searchParams.get('context')??undefined})
        else if(parts.length===3&&parts[1]==='work')result=work.read(parts[2])
        else if(parts.length===4&&parts[1]==='work'&&parts[3]==='proposals')result=work.proposals(authenticated(),parts[2])
        else if(parts.length===3&&parts[1]==='actors'){
          result=search.profile(actor?.id,parts[2])
        }
        else if (path === '/v1/communities') result = store.listCommunities(actor?.id)
        // The first-run screen: public communities labelled with the places and languages someone picked.
        else if (path === '/v1/communities/suggest') result = suggestCommunities(store,groups,actor?.id,url.searchParams.get('contexts'))
        else if (path === '/v1/topics') result=social.topics()
        else if (path === '/v1/wiki') result=wiki.all(actor?.id)
        else if (path === '/v1/wiki/discover') result=wiki.discover()
        else if (path === '/v1/wiki/growing') result=knowledge.discoverPublic()
        else if (path === '/v1/wiki/gaps') result=wiki.gaps()
        else if (path === '/v1/wiki/timeline') result=wiki.timeline()
        else if (parts.length === 4 && parts[1] === 'wiki' && parts[3] === 'trail') result=wiki.trail(parts[2])
        else if (path === '/v1/bookmarks') result=social.bookmarks(authenticated())
        else if (parts.length === 4 && parts[1] === 'communities' && parts[3] === 'wiki') result=wiki.list(parts[2],actor?.id)
        else if(parts.length===4&&parts[1]==='communities'&&parts[3]==='periksa')result=periksa.queue(authenticated(),parts[2])
        else if(parts.length===4&&parts[1]==='communities'&&parts[3]==='kamus')result=kamus.list(actor?.id,parts[2],{q:url.searchParams.get('q')??undefined,state:url.searchParams.get('state')??undefined,context:url.searchParams.get('context')??undefined,limit:url.searchParams.has('limit')?Number(url.searchParams.get('limit')):undefined})
        // Kamus in posts (src/kamus-ask.ts): underlines, the word card, the deck, Kata saya, Kata hari ini, export.
        else if(path==='/v1/kamus/annotate')result=ask.annotate(actor?.id,(url.searchParams.get('posts')??'').split(',').filter(Boolean))
        else if(parts.length===5&&parts[1]==='communities'&&parts[3]==='kamus'&&parts[4]==='word')result=ask.word(actor?.id,parts[2],url.searchParams.get('w')??'',url.searchParams.get('post')??undefined)
        else if(parts.length===5&&parts[1]==='communities'&&parts[3]==='kamus'&&parts[4]==='voice')result={voices:voice.forWord(actor?.id,parts[2],url.searchParams.get('w')??'')}
        else if(parts.length===5&&parts[1]==='communities'&&parts[3]==='kamus'&&parts[4]==='questions')result=ask.questions(authenticated(),parts[2])
        else if(parts.length===5&&parts[1]==='communities'&&parts[3]==='kamus'&&parts[4]==='mine')result=ask.mine(authenticated(),parts[2])
        else if(parts.length===5&&parts[1]==='communities'&&parts[3]==='kamus'&&parts[4]==='today')result=ask.today(authenticated(),parts[2])
        else if(parts.length===5&&parts[1]==='communities'&&parts[3]==='kamus'&&parts[4]==='suffixes'){store.requireSteward(authenticated(),parts[2]);result=ask.suffixes(parts[2])}
        else if(parts.length===5&&parts[1]==='communities'&&parts[3]==='kamus'&&parts[4]==='export'){
          const x=ask.exportRows(authenticated(),parts[2]),day=new Date(store.clock()).toISOString().slice(0,10),name='kamus-'+(x.languageName||'komunitas').toLowerCase().replace(/[^a-z0-9]+/g,'-')+'-'+day
          const cldf=url.searchParams.get('format')==='cldf'
          return new Response(cldf?kamusCldf(x,store.base,day):kamusCsv(x,store.base),{status:200,headers:{'content-type':cldf?'application/zip':'text/csv; charset=utf-8','content-disposition':`attachment; filename="${name}${cldf?'-cldf.zip':'.csv'}"`,'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}})
        }
        else if(parts.length===4&&parts[1]==='posts'&&parts[3]==='artinya')result=ask.artinya(actor?.id,parts[2])
        else if(parts.length===4&&parts[1]==='communities'&&parts[3]==='claims')result=periksa.list(actor?.id,parts[2],url.searchParams.get('state')??undefined)
        else if (parts.length === 4 && parts[1] === 'communities' && parts[3] === 'seasons') result=seasons.list(parts[2],actor?.id)
        else if (parts.length === 4 && parts[1] === 'communities' && parts[3] === 'wiki-policy') result=wiki.policy(authenticated(),parts[2])
        else if (parts.length === 4 && parts[1] === 'communities' && parts[3] === 'wiki-unreviewed') result=wiki.unreviewed(authenticated(),parts[2])
        else if (parts.length === 4 && parts[1] === 'communities' && parts[3] === 'wiki-live') result={live:wiki.isLive(parts[2])}
        else if (parts.length === 3 && parts[1] === 'wiki') result=wiki.read(parts[2],actor?.id)
        else if (parts.length === 4 && parts[1] === 'wiki' && parts[3] === 'history') {wiki.read(parts[2],actor?.id);result=wiki.history(parts[2])}
        else if (parts.length === 4 && parts[1] === 'wiki' && parts[3] === 'proposals') result=wiki.proposals(authenticated(),parts[2])
        else if (parts.length === 3 && parts[1] === 'wiki-proposals') result=wiki.proposal(authenticated(),parts[2])
        else if (parts.length === 4 && parts[1] === 'communities' && parts[3] === 'reports') result=social.reports(authenticated(),parts[2])
        else if (parts.length === 4 && parts[1] === 'communities' && parts[3] === 'requests') result = store.joinRequests(authenticated(),parts[2])
        else if (parts.length === 4 && parts[1] === 'communities' && parts[3] === 'at-space') result = spaces.view(actor?.id,parts[2])
        else if (parts.length === 3 && parts[1] === 'communities') {
          const c = store.community(parts[2])
          if (c.visibility === 'hidden-private' && !store.canRead(actor?.id,c)) throw new Fault(404,'Not found')
          result = {...c,forming:Founding.state(c,store.clock()),contexts:groups.communityContexts(c.id),group:groups.communityGroup(actor?.id,c.id)} // Listed-private metadata is intentionally public; no membership or counts.
        }
        else if (path === '/v1/feed') result = store.feed(actor?.id, url.searchParams.get('q') ?? '')
        else if (path === '/v1/feed/page') {const page=store.feedPage(actor?.id,{aksara:url.searchParams.get('aksara')==='true',work:url.searchParams.get('work')==='true',programSkill:programSkill(url.searchParams.get('program')),sort:url.searchParams.get('sort')==='discussed'?'discussed':undefined,
          linkUrls:url.searchParams.has('links')?(()=>{try{return JSON.parse(url.searchParams.get('links')!)}catch{throw new Fault(400,'Invalid related links')}})():undefined,
          followingId:url.searchParams.get('following')==='true'?authenticated():undefined,authorId:url.searchParams.get('author')??undefined,query:url.searchParams.get('q')??undefined,communityId:url.searchParams.get('community')??undefined,
          topicId:url.searchParams.get('topic')??undefined,cursor:url.searchParams.get('cursor')??undefined,
          limit:url.searchParams.has('limit')?Number(url.searchParams.get('limit')):undefined,
          pollsOnly:url.searchParams.get('polls')==='true',rootsOnly:url.searchParams.get('roots')==='true',contextId:url.searchParams.has('context')?groups.context(url.searchParams.get('context')!).id:undefined,
        });result={...page,items:requests.annotate(page.items,actor?.id),pinned:requests.annotate(page.pinned,actor?.id)}}
        else if (parts.length===4 && parts[1]==='posts' && parts[3]==='replies') {
          const target=store.getPost(actor?.id,parts[2])
          result=store.feedPage(actor?.id,{rootId:target.rootId,branchId:target.id===target.rootId?undefined:target.id,limit:100,cursor:url.searchParams.get('cursor')??undefined})
        }
        else if (parts.length === 3 && parts[1] === 'posts') result = requests.annotate([store.getPost(actor?.id,parts[2])],actor?.id)[0]
        else if (parts.length === 3 && parts[1] === 'sources') {
          const s = store.source(authenticated(),parts[2]); result = { ...s, bytes: Buffer.from(s.bytes).toString('base64') }
        }
        else if (parts.length === 3 && parts[1] === 'releases') result = store.release(authenticated(),parts[2])
        else if (path === '/v1/outbox') result = store.jobs(authenticated()).map(({id,state,operation,post_id,cid})=>({id,state,operation,post_id,cid}))
        else throw new Fault(404, 'Not found')
        return json(200,result)
      }
      if (req.method !== 'POST') throw new Fault(405, 'Method not allowed')
      // Signed webhook callback from packages/splat-worker (Modal GPU): verified by HMAC-SHA256, no browser session.
      if (parts.length === 4 && parts[1] === 'captures' && parts[3] === 'callback') {
        const rawText = await req.text()
        if (rawText.length > 6_000_000) throw new Fault(413, 'Request too large')
        return json(200, await captures.handleCallback(parts[2], rawText, req.headers.get('x-etnos-signature')))
      }
      options.writeGuard?.(req)
      // A founding link is read before signing in: the token travels in the body, never in a URL.
      if (path === '/v1/founding/preview') return json(200, founding.preview((await body(req)).token, principal()?.id))
      const caller = authenticated(), b = await body(req, path === '/v1/voice' ? 3000000 : path === '/v1/captures' ? 6000000 : MAX_BODY)
      const send=(x:Record<string,unknown>):{id:string}=>x.requestOf!==undefined?(()=>{throw new Fault(400,'Tag this post after sending it')})():x.agentMention===undefined&&typeof x.artinya==='string'&&x.artinya.trim()?store.tx(()=>{const {artinya,...rest}=x;const post=forum.create(caller,rest,groups);ask.setArtinya(caller,post.id,artinya);return post}):x.agentMention===undefined?forum.create(caller,x,groups):resident.createMentionPost(caller,x,groups)
      const current=principal() // Recheck after awaiting an untrusted body.
      if(current?.id!==caller)throw new Fault(401,'Authentication required')
      if(path==='/v1/discovery/sources')result=discovery.add(caller,b)
      else if(parts.length===5&&parts[1]==='discovery'&&parts[2]==='sources'&&parts[4]==='state')result=discovery.state(caller,parts[3],b)
      else if(parts.length===5&&parts[1]==='discovery'&&parts[2]==='sources'&&parts[4]==='refresh')result=await discovery.refresh(caller,parts[3],()=>{if(principal()?.id!==caller)throw new Fault(401,'Authentication required');options.writeGuard?.(req)})
      else if(parts.length===5&&parts[1]==='discovery'&&parts[2]==='items'&&parts[4]==='state')result=discovery.decide(caller,parts[3],b)
      else if(path==='/v1/offerings')result=new Offerings(store).create(caller,b)
      else if(parts.length===4&&parts[1]==='offerings'&&parts[3]==='edit')result=new Offerings(store).update(caller,parts[2],b)
      else if(path==='/v1/clustering/runs')result=clustering.accept(caller,b)
      else if(path==='/v1/knowledge')result=knowledge.create(caller,b)
      else if(parts.length===4&&parts[1]==='knowledge'&&parts[3]==='edit')result=knowledge.update(caller,parts[2],b)
      else if(parts.length===4&&parts[1]==='knowledge'&&parts[3]==='withdraw')result=knowledge.withdraw(caller,parts[2],b)
      else if(parts.length===4&&parts[1]==='knowledge'&&parts[3]==='promote')result=knowledge.promote(caller,parts[2],b)
      else if(path==='/v1/resident/setup')result=resident.setup(caller,b)
      else if(path==='/v1/resident/config')result=resident.configure(caller,b)
      else if(path==='/v1/resident/renew')result=resident.renew(caller,b)
      else if(path==='/v1/resident/all')result=resident.switchAll(caller,b)
      else if(path==='/v1/resident/sitewide')result=resident.routing.setGlobal(caller,b)
      else if(path==='/v1/resident/destinations')result=resident.routing.setDestination(caller,b)
      else if(path==='/v1/resident/jobs')result=resident.enqueue(caller,string(b.communityId),string(b.skill) as ResidentSkill,string(b.requestKey))
      else if(path==='/v1/resident/run-now')result=await resident.runNow(caller,string(b.communityId),string(b.skill) as ResidentSkill,string(b.requestKey),()=>{if(principal()?.id!==caller)throw new Fault(401,'Authentication required');options.writeGuard?.(req)})
      else if(parts.length===5&&parts[1]==='resident'&&parts[2]==='jobs'&&parts[4]==='run'){resident.job(caller,parts[3]);result=await resident.run(parts[3],()=>{if(principal()?.id!==caller)throw new Fault(401,'Authentication required');options.writeGuard?.(req);resident.job(caller,parts[3])})}
      else if(parts.length===5&&parts[1]==='resident'&&parts[2]==='jobs'&&parts[4]==='cancel')result=resident.cancel(caller,parts[3])
      else if(path==='/v1/agents')result=agents.enroll(caller,b)
      else if(parts.length===4&&parts[1]==='agents'&&parts[3]==='deployments')result=agents.addDeployment(caller,parts[2],string(b.label),b.jwk)
      else if(parts.length===4&&parts[1]==='agents'&&parts[3]==='suspend')result=agents.suspend(caller,parts[2])
      else if(parts.length===4&&parts[1]==='agents'&&parts[3]==='resume')result=agents.resume(caller,parts[2])
      else if(parts.length===4&&parts[1]==='agents'&&parts[3]==='admit')result=agents.admit(caller,parts[2])
      else if(parts.length===4&&parts[1]==='agents'&&parts[3]==='grants')result=agents.grant(caller,parts[2],b)
      else if(parts.length===4&&parts[1]==='agents'&&parts[3]==='switch')result=agents.setSwitch(caller,parts[2],b)
      else if(parts.length===6&&parts[1]==='agents'&&parts[3]==='deployments'&&parts[5]==='revoke')result=agents.revokeDeployment(caller,parts[2],parts[4])
      else if(parts.length===4&&parts[1]==='posts'&&parts[3]==='suggestions') result=await decisions.suggest(caller,parts[2],string(b.requestKey),()=>{if(principal()?.id!==caller)throw new Fault(401,'Authentication required');options.writeGuard?.(req)})
      else if(path==='/v1/profile')result=updateProfile(store,caller,b)
      else if(path==='/v1/media')result=media.upload(caller,string(b.communityId),string(b.bytes),string(b.alt??''))
      else if(path==='/v1/voice')result=await voice.upload(caller,{communityId:string(b.communityId),bytes:string(b.bytes),durationMs:b.durationMs,peaks:b.peaks,speaker:b.speaker,language:b.language,transcript:b.transcript,consentPublic:b.consentPublic,protocol:b.protocol})
      else if(parts.length===4&&parts[1]==='voice'&&parts[3]==='transcript')result=voice.updateTranscript(caller,parts[2],b.transcript,b.language)
      else if(parts.length===4&&parts[1]==='voice'&&parts[3]==='withdraw')result=await voice.withdraw(caller,parts[2])
      else if(parts.length===4&&parts[1]==='voice'&&parts[3]==='transcribe'){
        if(!options.transcribeVoice)throw new Fault(503,'Transkrip otomatis belum aktif di simpul ini; gunakan Bantu tulis')
        const {row,bytes}=await voice.readBytesForMember(caller,parts[2])
        // Owner rule: no hosted model hears a private room or a restricted clip. Only public clips in public communities go to the cloud transcriber.
        if(store.community(row.community_id).visibility!=='public'||row.protocol==='restricted')throw new Fault(403,'Suara dari ruang privat atau rekaman terbatas tidak dikirim ke layanan transkrip luar. Gunakan Bantu tulis.')
        const textOut=await options.transcribeVoice(bytes,row.mime)
        if(principal()?.id!==caller)throw new Fault(401,'Authentication required')
        result=textOut?voice.updateTranscript(caller,parts[2],textOut,b.language??'id'):{transcript:'',empty:true}
      }
      else if(parts.length===5&&parts[1]==='communities'&&parts[3]==='kamus'&&parts[4]==='voice')result=voice.attachToWord(caller,parts[2],string(b.word),string(b.clipId))
      else if(path==='/v1/captures')result=await captures.upload(caller,{communityId:string(b.communityId),title:string(b.title),summary:b.summary,entrySlug:b.entrySlug,bytes:string(b.bytes),splatCount:b.splatCount})
      else if(path==='/v1/captures/video')result=await captures.queueVideoJob(caller,{communityId:string(b.communityId),title:string(b.title),summary:b.summary,entrySlug:b.entrySlug,videoUrl:string(b.videoUrl),mode:b.mode})
      else if(parts.length===4&&parts[1]==='captures'&&parts[3]==='withdraw')result=await captures.withdraw(caller,parts[2])
      else if(parts.length===4&&parts[1]==='viewer'&&parts[3]==='pins')result=captures.addPin(caller,decodeURIComponent(parts[2]),{x:b.x,y:b.y,z:b.z,label:b.label,note:b.note,kamusWord:b.kamusWord,voiceClipId:b.voiceClipId,communityId:b.communityId})
      else if(parts.length===5&&parts[1]==='viewer'&&parts[2]==='pins'&&parts[4]==='delete')result=captures.deletePin(caller,parts[3])
      else if(parts.length===4&&parts[1]==='communities'&&parts[3]==='saluran')result=saluran.setSettings(caller,parts[2],b)
      else if(parts.length===5&&parts[1]==='communities'&&parts[3]==='saluran'&&parts[4]==='usulan')result=saluran.proposeUsulan(caller,parts[2],{jenis:string(b.jenis) as 'kata'|'tentang'|'entri-baru'|'nilai',subject:string(b.subject),statement:string(b.statement),source:string(b.source),postId:typeof b.postId==='string'?b.postId:undefined})
      else if(parts.length===5&&parts[1]==='communities'&&parts[3]==='saluran'&&parts[4]==='plant-id')result=await saluran.identifyPlant(caller,parts[2],b)
      else if(path==='/v1/saluran/iiif-inspect')result=await saluran.inspectIiif(caller,b.manifestUrl)
      else if(parts.length===4&&parts[1]==='communities'&&parts[3]==='kurasi')result=saluran.addAnnotation(caller,parts[2],b)
      else if(parts.length===4&&parts[1]==='kurasi'&&parts[3]==='withdraw')result=saluran.withdrawAnnotation(caller,parts[2])
      else if (path === '/v1/communities' && b.forming === true) result = founding.found(caller,{title:string(b.title),description:string(b.description),visibility:string(b.visibility) as Community['visibility'],admission:b.admission === undefined ? undefined : string(b.admission) as Community['admission'],about:strings(b.about??[]),languages:strings(b.languages??[]),groupId:b.groupId===undefined||b.groupId===null?undefined:string(b.groupId)},groups)
      else if (path === '/v1/communities') result = store.createCommunity(caller,string(b.title),string(b.description),string(b.visibility) as Community['visibility'],b.automation === true,b.admission === undefined ? undefined : string(b.admission) as Community['admission'],b.publication===undefined?'local':string(b.publication) as Community['publication'])
      else if(path==='/v1/dm/device'){
        if(!Array.isArray(b.packages)||b.packages.some(p=>!p||typeof p!=='object'||typeof p.id!=='string'||typeof p.data!=='string'))throw new Fault(400,'Key packages required')
        result=dm.register(caller,{deviceId:string(b.deviceId),signatureKey:string(b.signatureKey),packages:b.packages as {id:string;data:string}[]})
      }
      else if(path==='/v1/dm/requests')result=dm.reserve(caller,string(b.recipientId),string(b.deviceId),string(b.requestKey))
      else if(parts.length===5&&parts[1]==='dm'&&parts[2]==='threads'){
        const id=parts[3]
        if(parts[4]==='start')result=dm.start(caller,id,string(b.deviceId),string(b.welcome))
        else if(parts[4]==='decide'){if(typeof b.accept!=='boolean')throw new Fault(400,'Boolean required');result=dm.decide(caller,id,string(b.deviceId),b.accept)}
        else if(parts[4]==='messages')result=dm.send(caller,id,string(b.deviceId),string(b.clientId),string(b.ciphertext))
        else if(parts[4]==='read')result=dm.markRead(caller,id,Number(b.version))
        else if(parts[4]==='close')result=dm.close(caller,id,b.block===true)
        else throw new Fault(404,'Not found')
      }
      else if(path==='/v1/notifications/read')result=activity.markRead(caller,b.ids)
      else if(parts.length===4&&parts[1]==='groups'&&parts[3]==='profile')result=lembaga.setProfile(caller,parts[2],b)
      else if(parts.length===4&&parts[1]==='groups'&&parts[3]==='logo')result=lembaga.setLogo(caller,parts[2],b.bytes)
      else if(parts.length===4&&parts[1]==='groups'&&parts[3]==='jenis')result=lembaga.setJenis(caller,parts[2],b.contextId===null||b.contextId===undefined?null:string(b.contextId))
      else if(parts.length===4&&parts[1]==='groups'&&parts[3]==='claims'){
        // An existing entry is resolved by the entry adapter, so an old address claims the entry it now opens.
        let entry:{slug:string;kind:string}|undefined
        if(b.entry!==undefined){const cat=await entryCatalogue(entrySource()),found=resolve(cat,string(b.entry));if(!found)throw new Fault(404,'Not found');entry={slug:found.slug,kind:cat.nodes.get(found.slug)!.kind}}
        result=lembaga.request(caller,parts[2],{entry,listing:b.listing===undefined?undefined:b.listing as Record<string,unknown>})
      }
      else if(parts.length===5&&parts[1]==='groups'&&parts[3]==='claims'&&parts[4]==='release')result=lembaga.release(caller,parts[2])
      else if(parts.length===4&&parts[1]==='entry-claims'&&parts[3]==='decide'){
        if(typeof b.approve!=='boolean')throw new Fault(400,'Boolean required')
        const cat=b.approve?await entryCatalogue(entrySource()):null
        result=lembaga.decide(caller,parts[2],b.approve,slug=>!!cat&&(cat.nodes.has(slug)||cat.alias.has(slug)))
      }
      else if(path==='/v1/kios')result={kios:kios.set(caller,{kind:string(b.ownerKind) as KiosOwner['kind'],id:string(b.ownerId)},b)}
      else if(path==='/v1/deployment/etnos-yaml/check')result=deployment.check(caller,b.text)
      else if(path==='/v1/deployment/etnos-yaml/apply')result=deployment.apply(caller,b.text)
      else if(parts.length===4&&parts[1]==='groups'&&parts[3]==='situs')result=situs.save(caller,parts[2],b)
      else if(parts.length===5&&parts[1]==='groups'&&parts[3]==='situs'&&parts[4]==='publish'){const cat=await entryCat();result=situs.publish(caller,parts[2],slug=>cat.nodes.get(slug)?.title??null)}
      else if(parts.length===5&&parts[1]==='groups'&&parts[3]==='situs'&&parts[4]==='unpublish')result=situs.unpublish(caller,parts[2])
      else if(parts.length===5&&parts[1]==='groups'&&parts[3]==='situs'&&parts[4]==='active'){if(typeof b.active!=='boolean')throw new Fault(400,'Boolean required');result=situs.setActive(caller,parts[2],b.active)}
      else if(parts.length===5&&parts[1]==='groups'&&parts[3]==='situs'&&parts[4]==='restore')result=situs.restore(caller,parts[2],Number(b.version))
      else if(parts.length===4&&parts[1]==='communities'&&parts[3]==='group')result=b.groupId===null?groups.unbind(caller,parts[2]):(groups.bind(caller,string(b.groupId),parts[2]),groups.communityGroup(caller,parts[2]))
      else if(path==='/v1/groups')result=groups.create(caller,string(b.title),string(b.description),string(b.kind) as Group['kind'],string(b.visibility) as Group['visibility'])
      else if(parts.length===4&&parts[1]==='groups'&&parts[3]==='members'){
        if(typeof b.active!=='boolean')throw new Fault(400,'Boolean required')
        result=groups.setMember(caller,parts[2],string(b.actorId),b.active,b.role===undefined?'member':string(b.role) as 'member'|'steward')
      }
      else if(parts.length===4&&parts[1]==='groups'&&parts[3]==='spaces'){
        result=b.communityId===undefined?groups.createSpace(caller,parts[2],{title:string(b.title),description:string(b.description),visibility:string(b.visibility) as Community['visibility'],automation:b.automation===true}):groups.bind(caller,parts[2],string(b.communityId))
      }
      else if(parts.length===4&&parts[1]==='groups'&&parts[3]==='request-sponsorship')result=groups.requestSponsorship(caller,parts[2])
      else if(parts.length===4&&parts[1]==='groups'&&parts[3]==='sponsorship'){
        if(typeof b.enabled!=='boolean')throw new Fault(400,'Boolean required')
        result=groups.recognize(caller,parts[2],b.enabled)
      }
      else if(parts.length===4&&parts[1]==='actors'&&parts[3]==='follow'){if(typeof b.following!=='boolean')throw new Fault(400,'Boolean required');result=social.follow(caller,parts[2],b.following)}
      else if(path==='/v1/contexts')result=groups.createContext(caller,{slug:string(b.slug),title:string(b.title),kind:string(b.kind) as Context['kind'],description:string(b.description),language:string(b.language),aliases:strings(b.aliases??[],20),facet:b.facet===undefined?undefined:string(b.facet)})
      else if(parts.length===4&&parts[1]==='contexts'&&parts[3]==='retire'){if(typeof b.retired!=='boolean')throw new Fault(400,'Boolean required');result=groups.retireContext(caller,parts[2],b.retired)}
      else if(parts.length===4&&parts[1]==='contexts'&&parts[3]==='aliases')result=groups.setContextAliases(caller,parts[2],b.aliases)
      else if(path==='/v1/contexts/seed-labels')result=groups.applySeedLabels(caller,seedLabels as SeedLabels)
      else if(path==='/v1/knowledge-model/seed')result=model.importSeed(caller,knowledgeSeed as KnowledgeSeed)
      else if(path==='/v1/knowledge-model/entities')result=model.proposeEntity(caller,b)
      else if(parts.length===5&&parts[1]==='knowledge-model'&&parts[2]==='entities'&&parts[4]==='coordinates')result=model.setCoordinates(caller,parts[3],b)
      else if(path==='/v1/datasets/seed')result=datasets.importSeed(caller,datasetSeed as DatasetSeed)
      else if(path==='/v1/datasets')result=datasets.propose(caller,b)
      else if(parts.length===4&&parts[1]==='datasets'&&parts[3]==='review')result=datasets.review(caller,parts[2],b)
      else if(parts.length===5&&parts[1]==='knowledge-model'&&parts[2]==='entities'&&parts[4]==='review')result=model.reviewEntity(caller,parts[3],b)
      else if(parts.length===5&&parts[1]==='knowledge-model'&&parts[2]==='entities'&&parts[4]==='merge')result=model.mergeEntity(caller,parts[3],b)
      else if(path==='/v1/knowledge-model/assertions')result=model.proposeAssertion(caller,b)
      else if(parts.length===5&&parts[1]==='knowledge-model'&&parts[2]==='assertions'&&parts[4]==='review')result=model.reviewAssertion(caller,parts[3],b)
      else if(path==='/v1/knowledge-model/witnesses/post')result=model.citePost(caller,b)
      else if(parts.length===5&&parts[1]==='knowledge-model'&&parts[2]==='witnesses'&&parts[4]==='withdraw')result=model.withdrawWitness(caller,parts[3],b)
      else if(path==='/v1/contexts/catalogue'){const c=catalogue(options.catalogue);result={catalogue:c.key,...groups.importCatalogue(caller,c.catalogue)}}
      else if(parts.length===4&&parts[1]==='contexts'&&parts[3]==='parents')result=b.remove===true?groups.unlinkContext(caller,parts[2],string(b.parentId)):groups.linkContext(caller,parts[2],string(b.parentId))
      else if(parts.length===4&&['posts','groups','wiki'].includes(parts[1])&&parts[3]==='contexts'){
        const kind=parts[1]==='posts'?'post':parts[1]==='groups'?'group':'wiki'
        result=b.remove===true?groups.detach(caller,kind,parts[2],string(b.contextId)):groups.attach(caller,kind,parts[2],string(b.contextId))
      }
      else if(path==='/v1/work')result=work.create(caller,{mandateId:b.mandateId===undefined?undefined:string(b.mandateId),groupId:string(b.groupId),communityId:string(b.communityId),title:string(b.title),description:string(b.description),requestKey:string(b.requestKey),originPostId:b.originPostId===undefined?undefined:string(b.originPostId),contextIds:strings(b.contextIds??[]),grantId:b.grantId===undefined?undefined:string(b.grantId)})
      else if(parts.length===4&&parts[1]==='posts'&&parts[3]==='work-consent')result=b.revoke===true?work.revokeConsent(caller,parts[2],string(b.groupId)):work.consent(caller,parts[2],string(b.groupId),Number(b.expires))
      else if(parts.length===4&&parts[1]==='work'&&parts[3]==='state')result=work.update(caller,parts[2],Number(b.revision),string(b.state) as 'active'|'blocked'|'withdrawn',b.grantId===undefined?undefined:string(b.grantId))
      else if(parts.length===4&&parts[1]==='work'&&parts[3]==='proposals')result=work.proposeResult(caller,parts[2],string(b.text),strings(b.citations??[],20),b.grantId===undefined?undefined:string(b.grantId))
      else if(parts.length===4&&parts[1]==='work-results'&&parts[3]==='reject')result=work.rejectResult(caller,parts[2],string(b.digest))
      else if(parts.length===4&&parts[1]==='work-results'&&parts[3]==='accept')result=work.acceptResult(caller,parts[2],string(b.digest),Number(b.revision))
      else if(parts.length===4&&parts[1]==='groups'&&parts[3]==='work-grants')result=work.grant(caller,parts[2],string(b.agentId),Number(b.expires),b.hourlyLimit===undefined?5:Number(b.hourlyLimit))
      else if(parts.length===4&&parts[1]==='work-grants'&&parts[3]==='revoke')result=work.revoke(caller,parts[2])
      else if(path==='/v1/editorial-mandates')result=wiki.grant(caller,string(b.agentId),string(b.communityId),string(b.purpose),Number(b.expires),b.hourlyLimit===undefined?3:Number(b.hourlyLimit))
      else if(parts.length===4&&parts[1]==='editorial-mandates'&&parts[3]==='revoke')result=wiki.revoke(caller,parts[2])
      else if (parts.length === 4 && parts[1] === 'communities' && parts[3] === 'contexts') result=groups.labelCommunity(caller,parts[2],string(b.contextId),b.remove===true,b.role===undefined?undefined:string(b.role) as 'about'|'language')
      else if (parts.length === 4 && parts[1] === 'communities' && parts[3] === 'settings') result = store.updateCommunity(caller,parts[2],{title:b.title===undefined?undefined:string(b.title),description:b.description===undefined?undefined:string(b.description),admission:b.admission===undefined?undefined:string(b.admission) as Community['admission']})
      else if (parts.length === 4 && parts[1] === 'communities' && parts[3] === 'join') result = store.join(caller,parts[2])
      else if (parts.length === 4 && parts[1] === 'communities' && parts[3] === 'requests') result = store.requestJoin(caller,parts[2],string(b.message))
      else if (parts.length === 4 && parts[1] === 'communities' && parts[3] === 'decide') {
        if(typeof b.approve!=='boolean') throw new Fault(400,'Boolean required')
        result=store.decideJoin(caller,parts[2],string(b.actorId),b.approve)
      }
      else if (parts.length === 4 && parts[1] === 'communities' && parts[3] === 'invitations') result=store.inviteMember(caller,parts[2],string(b.actorId),Number(b.expires))
      else if (parts.length === 4 && parts[1] === 'communities' && parts[3] === 'revoke-invitations') result=store.revokeInvitations(caller,parts[2],string(b.actorId))
      else if (path === '/v1/invitations/accept') result=store.acceptInvitation(caller,string(b.token))
      else if (parts.length === 4 && parts[1] === 'communities' && parts[3] === 'members') {
        if (typeof b.active !== 'boolean') throw new Fault(400,'Boolean required')
        result = store.setMember(caller,parts[2],string(b.actorId),b.active,b.role === undefined ? 'member' : string(b.role) as 'member'|'moderator')
      }
      else if (parts.length === 4 && parts[1] === 'communities' && parts[3] === 'at-space') result = spaces.enable(caller,parts[2],b)
      else if (parts.length === 5 && parts[1] === 'communities' && parts[3] === 'at-space' && parts[4] === 'sync') result = spaces.sync(caller,parts[2])
      else if (parts.length === 5 && parts[1] === 'communities' && parts[3] === 'at-space' && parts[4] === 'revoke') result = spaces.revoke(caller,parts[2])
      else if(parts.length===4&&parts[1]==='aksara-requests'&&parts[3]==='decide')result=requests.decide(caller,parts[2],b.decision)
      else if(parts.length===4&&parts[1]==='aksara-requests'&&parts[3]==='withdraw')result=requests.withdraw(caller,parts[2])
      // A post may carry the entries it is about (Percakapan); they are checked first and saved with the post, in one unit.
      else if (path === '/v1/posts'&&b.tentang!==undefined){const {tentang:asked,...rest}=b;const tags=tentang.resolve(await entryCat(),asked);result=store.tx(()=>{const post=send(rest);if(tags.length)tentang.set(caller,post.id,tags);return store.getPost(caller,post.id)})}
      else if(parts.length===4&&parts[1]==='posts'&&parts[3]==='tentang'){const tags=tentang.resolve(await entryCat(),b.entries);result=tentang.set(caller,parts[2],tags)}
      else if (path === '/v1/posts'&&b.requestOf!==undefined) result=requests.createPost(caller,b,forum)
      // In a Kamus community the composer may send the post's Indonesian translation (Artinya) with it, in one unit.
      else if (path === '/v1/posts'&&b.agentMention===undefined&&typeof b.artinya==='string'&&b.artinya.trim()) result=store.tx(()=>{const {artinya,...rest}=b;const post=forum.create(caller,rest,groups);ask.setArtinya(caller,post.id,artinya);return post})
      else if (path === '/v1/posts') result=b.agentMention===undefined?forum.create(caller,b,groups):resident.createMentionPost(caller,b,groups)
      else if(parts.length===4&&parts[1]==='posts'&&parts[3]==='edit')result=forum.edit(caller,parts[2],b)
      else if(parts.length===5&&parts[1]==='desk'&&parts[2]==='drafts'&&parts[4]==='review'){if(b.state!=='released'&&b.state!=='rejected')throw new Fault(400,'Release or reject');result=desk.review(caller,parts[3],{state:b.state,draft:b.draft as string|undefined})}
      else if(parts.length===5&&parts[1]==='desk'&&parts[2]==='shelf'&&parts[4]==='withdraw')result=desk.withdraw(caller,parts[3])
      else if(parts.length===4&&parts[1]==='posts'&&parts[3]==='delete')result=forum.delete(caller,parts[2],b.revision)
      else if(parts.length===4&&parts[1]==='posts'&&parts[3]==='moderate')result=forum.moderate(caller,parts[2],b)
      else if(parts.length===4&&parts[1]==='posts'&&parts[3]==='poll')result=forum.poll(caller,parts[2],b.choice)
      else if(parts.length===4&&parts[1]==='posts'&&parts[3]==='rsvp')result=forum.rsvp(caller,parts[2],b.response)
      else if(parts.length===4&&parts[1]==='posts'&&parts[3]==='confirm')result=forum.confirm(caller,parts[2],b.value)
      else if(parts.length===5&&parts[1]==='communities'&&parts[3]==='kamus'&&parts[4]==='settings')result=kamus.setSettings(caller,parts[2],b)
      else if(parts.length===6&&parts[1]==='communities'&&parts[3]==='kamus'&&parts[5]==='meaning')result=kamus.proposeMeaning(caller,parts[2],parts[4],b)
      else if(parts.length===5&&parts[1]==='communities'&&parts[3]==='kamus'&&parts[4]==='seed')result=kamus.importSeed(caller,parts[2])
      else if(parts.length===5&&parts[1]==='communities'&&parts[3]==='kamus'&&parts[4]==='scan')result=kamus.scan(caller,parts[2])
      else if(parts.length===5&&parts[1]==='communities'&&parts[3]==='kamus'&&parts[4]==='describe'){
        // Check every gate before any text leaves for the model; applyGlosses checks them again when writing.
        store.requireSteward(caller,parts[2])
        if(!kamus.settings(parts[2]).machineReading)throw new Fault(409,'Machine reading is off for this community')
        if(!kamus.modelAllowed(parts[2]))throw new Fault(409,'A hosted model may not read a private community')
        if(!kamus.aksara(parts[2]))throw new Fault(409,'Aksara is not active in this community')
        const items=kamus.candidatesForGloss(parts[2],5)
        if(!items.length)result={proposed:0}
        else{
          const models=await options.models?.();if(!models)throw new Fault(503,'No model is available')
          const reply=await models.chat({purpose:'fast',messages:glossPrompt(kamus.settings(parts[2]).languageName||'daerah',items),maxTokens:900,temperature:0.2}).catch(()=>{throw new Fault(503,'The model did not answer')})
          result=kamus.applyGlosses(caller,parts[2],parseGlosses(reply.text,new Set(items.map(i=>i.id))))
        }
      }
      else if(parts.length===5&&parts[1]==='communities'&&parts[3]==='kamus'&&parts[4]==='answer')result=ask.answer(caller,parts[2],b)
      else if(parts.length===5&&parts[1]==='communities'&&parts[3]==='kamus'&&parts[4]==='mine')result=ask.saveMine(caller,parts[2],b)
      else if(parts.length===5&&parts[1]==='communities'&&parts[3]==='kamus'&&parts[4]==='today')result=ask.answerToday(caller,parts[2],b)
      else if(parts.length===5&&parts[1]==='communities'&&parts[3]==='kamus'&&parts[4]==='suffixes')result=ask.setSuffixes(caller,parts[2],b)
      else if(parts.length===6&&parts[1]==='communities'&&parts[3]==='kamus'&&parts[5]==='sensitive')result=ask.setSensitive(caller,parts[2],parts[4],b)
      else if(parts.length===4&&parts[1]==='posts'&&parts[3]==='artinya')result=ask.setArtinya(caller,parts[2],b.text)
      else if(parts.length===5&&parts[1]==='posts'&&parts[3]==='artinya'&&parts[4]==='remove')result=ask.removeArtinya(caller,parts[2],b)
      else if(parts.length===4&&parts[1]==='communities'&&parts[3]==='claims')result=periksa.propose(caller,parts[2],b)
      else if(parts.length===4&&parts[1]==='communities'&&parts[3]==='periksa')result=periksa.setQuorum(caller,parts[2],b.quorum)
      else if(parts.length===4&&parts[1]==='claims'&&parts[3]==='answer')result=periksa.answer(caller,parts[2],b)
      else if(parts.length===4&&parts[1]==='claims'&&parts[3]==='withdraw')result=periksa.withdraw(caller,parts[2])
      else if (parts.length === 4 && parts[1] === 'posts' && parts[3] === 'vote') {
        if(typeof b.value!=='number') throw new Fault(400,'Numeric vote required')
        result=social.vote(caller,parts[2],b.value)
      }
      else if (parts.length === 4 && parts[1] === 'posts' && parts[3] === 'bookmark') {
        if(typeof b.save!=='boolean') throw new Fault(400,'Boolean required')
        result=social.bookmark(caller,parts[2],b.save)
      }
      else if (parts.length === 4 && parts[1] === 'posts' && parts[3] === 'report') result=social.report(caller,parts[2],string(b.reason))
      else if (parts.length === 4 && parts[1] === 'reports' && parts[3] === 'decide') result=social.decideReport(caller,parts[2],string(b.state) as 'resolved'|'dismissed',string(b.decision))
      else if (parts.length === 4 && parts[1] === 'communities' && parts[3] === 'topics') result=social.addTopic(caller,parts[2],string(b.title))
      else if (parts.length === 4 && parts[1] === 'communities' && parts[3] === 'seasons') result=seasons.add(caller,parts[2],b)
      else if (parts.length === 4 && parts[1] === 'communities' && parts[3] === 'founding-link') result=founding.renew(caller,parts[2])
      else if (parts.length === 4 && parts[1] === 'communities' && parts[3] === 'founding-withdraw') result=founding.withdraw(caller,parts[2])
      else if (path === '/v1/founding/accept') result=founding.accept(caller,b.token)
      else if (parts.length === 5 && parts[1] === 'communities' && parts[3] === 'seasons') result=seasons.update(caller,parts[2],parts[4],b)
      else if (parts.length === 4 && parts[1] === 'communities' && parts[3] === 'wiki-live') result=wiki.setLive(caller,parts[2],b.live as boolean)
      else if (parts.length === 4 && parts[1] === 'wiki-revisions' && parts[3] === 'review') result=wiki.review(caller,parts[2],b.accept as boolean)
      else if (parts.length === 4 && parts[1] === 'communities' && parts[3] === 'wiki-policy') result=wiki.setPolicy(caller,parts[2],b.contributorGroupId===null?null:string(b.contributorGroupId),b.reviewerGroupId===null?null:string(b.reviewerGroupId))
      else if (parts.length === 4 && parts[1] === 'communities' && parts[3] === 'wiki') {
        if(b.draft!==undefined){const d=b.draft as Record<string,unknown>;if(!d||typeof d!=='object'||!Array.isArray(d.citations)||d.citations.some(c=>typeof c!=='string'))throw new Fault(400,'Draft and citations required');result=wiki.createDraft(caller,parts[2],string(b.title),{text:string(d.text),citations:d.citations as string[],language:string(d.language),perspective:string(d.perspective)},b.requestKey===undefined?undefined:string(b.requestKey))}
        else result=wiki.create(caller,parts[2],string(b.title))
      }
      else if (parts.length === 4 && parts[1] === 'wiki' && parts[3] === 'time') result=wiki.setTime(caller,parts[2],b.remove===true?null:{from:Number(b.from),to:Number(b.to),precision:string(b.precision),note:b.note===undefined?'':string(b.note)})
      else if (parts.length === 4 && parts[1] === 'wiki' && parts[3] === 'proposals') {
        if(!Array.isArray(b.citations) || b.citations.some(c=>typeof c!=='string')) throw new Fault(400,'Citation URLs required')
        result=wiki.propose(caller,parts[2],b.baseRevision===null?null:string(b.baseRevision),string(b.text),b.citations as string[],string(b.language),string(b.perspective),b.editorialMandateId===undefined?undefined:string(b.editorialMandateId))
      }
      else if (parts.length === 4 && parts[1] === 'wiki-proposals' && parts[3] === 'decide') {
        if(typeof b.accept!=='boolean')throw new Fault(400,'Boolean required')
        result=wiki.decide(caller,parts[2],string(b.digest),b.accept)
      }
      else if (parts.length === 4 && parts[1] === 'posts' && parts[3] === 'hide') result = store.hidePost(caller,parts[2])
      else if (path === '/v1/mandates') result = { id:store.mandate(caller,string(b.agentId),string(b.communityId),string(b.purpose),Number(b.expires),b.hourlyLimit === undefined ? 5 : Number(b.hourlyLimit)) }
      else if (parts.length === 4 && parts[1] === 'mandates' && parts[3] === 'revoke') result = store.revokeMandate(caller,parts[2])
      else if (path === '/v1/sources') {
        const encoded = string(b.bytes)
        if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) throw new Fault(400,'Canonical base64 required')
        const bytes = Buffer.from(encoded,'base64')
        if (bytes.toString('base64') !== encoded) throw new Fault(400,'Canonical base64 required')
        result = { id:store.createSource(caller,bytes) }
      }
      else if (parts.length === 4 && parts[1] === 'sources' && parts[3] === 'withdraw') result = store.withdrawSource(caller,parts[2])
      else if (path === '/v1/releases') result = { id:store.draftRelease(caller,string(b.sourceId),string(b.communityId),string(b.publisherId),string(b.text)) }
      else if (parts.length === 4 && parts[1] === 'releases' && parts[3] === 'approve') result = store.approveRelease(caller,parts[2],string(b.digest))
      else if (parts.length === 4 && parts[1] === 'releases' && parts[3] === 'publish') result = store.publishRelease(caller,parts[2],b.mandateId === undefined ? undefined : string(b.mandateId))
      else throw new Fault(404,'Not found')
      return json(200,result ?? { ok:true })
    } catch (error) {
      return json(error instanceof Fault ? error.status : 500,{ error:error instanceof Fault ? error.message : 'Internal error' })
    }
  }
}
