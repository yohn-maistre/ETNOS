/** Honest adapter contract; capability does not imply deployed UI or live AT. */
export const capabilities = {
  version:'0.1.0-alpha.0',
  auth:{localCredentials:true,atOAuth:false,remoteSignup:false,institutionalAccess:false},
  communities:{visibility:true,admission:true,applications:true,invitations:true,ownershipTransfer:false},
  conversation:{text:true,replies:true,votes:true,bookmarks:true,cursorPagination:true,publicTopics:true,
    edits:true,authorDeletion:true,localRichText:true,titles:true,links:true,media:true,polls:true,events:true,notifications:true,directMessages:true,localFollowing:true,crossEntitySearch:true},
  groups:{local:true,forumSpaces:true,protectedMembership:true,externalATGroups:false,publicContexts:true,institutionalSponsorship:true},
  messaging:{local:true,experimental:true,encryptedClient:true,independentSecurityReview:false,multiDevice:false,attachments:false,interop:false},
  activity:{localInbox:true,readState:true,permissionFiltered:true,email:false,webPush:false,liveUpdates:false},
  moderation:{hide:true,reports:true,locks:true,pins:true,restrictedLog:true,appeals:false,blocks:false},
  knowledge:{publicWiki:true,restrictedProposals:true,reviewedRevisions:true,privateLibrary:false,publicWork:true,agentProposals:true,agentAcceptance:false},
  publication:{local:true,atIntent:true,liveAT:false,ingestion:false,activityPub:false},
  interop:{aksara:false,a2a:false,iroh:false,hardware:false,offlineSync:false},
} as const
