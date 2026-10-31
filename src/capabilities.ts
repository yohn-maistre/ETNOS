/** Honest adapter contract; capability does not imply deployed UI or live AT. */
export const capabilities = {
  version:'0.1.0-alpha.0',
  auth:{localCredentials:true,atOAuth:false,remoteSignup:false,institutionalAccess:false},
  communities:{visibility:true,admission:true,applications:true,invitations:true,ownershipTransfer:false},
  conversation:{text:true,replies:true,votes:true,bookmarks:true,cursorPagination:true,publicTopics:true,
    edits:false,authorDeletion:false,media:false,polls:false,events:false,notifications:false},
  moderation:{hide:true,reports:true,appeals:false,blocks:false},
  knowledge:{publicWiki:true,restrictedProposals:true,reviewedRevisions:true,privateLibrary:false,publicWork:false},
  publication:{local:true,atIntent:true,liveAT:false,ingestion:false,activityPub:false},
  interop:{aksara:false,a2a:false,iroh:false,hardware:false,offlineSync:false},
} as const
