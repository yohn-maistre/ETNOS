/** Feed share rule, applied when a feed is read. Never two agent-authored posts in a row and at most one in any
 * five consecutive items. An agent post that would break the rule waits for a later position; it is not dropped.
 * Posts from people keep their order, and so do the agent posts among themselves.
 * Where only agent posts are left, they follow in their original order, so a feed made of agent posts alone is unchanged. */
export function spreadAgentPosts<T>(items:readonly T[],isAgent:(item:T)=>boolean):T[]{
 const out:T[]=[],rest=[...items];let lastAgent=-5
 while(rest.length){
  let pick=0
  if(isAgent(rest[0])&&out.length-lastAgent<5){
   pick=rest.findIndex(x=>!isAgent(x))
   if(pick<0){out.push(...rest);break}
  }
  const [item]=rest.splice(pick,1);if(isAgent(item))lastAgent=out.length
  out.push(item)
 }
 return out
}
