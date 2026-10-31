// Existing behavior fixtures used to invoke the anonymous DB entry directly.
// Route ONLY their pre-order submissions through the new service-only transaction RPC,
// as the Edge handler does. Other role checks remain unchanged. Direct public denial
// is tested separately in release-63a.cjs, not hidden by a production permission grant.
module.exports=async function edgeIntakeQuery(db,sql,params){
 if(!/^select submit_catalogue_preorder\(/i.test(sql))return db.query(sql,params);
 const role=(await db.query('select current_role as role')).rows[0].role;
 if(!['postgres','anon','authenticated','service_role'].includes(role))throw Error('Unknown fixture role');
 await db.exec('set role service_role');
 try{return await db.query(sql.replace('submit_catalogue_preorder(','submit_preorder_edge(')+" -> 'confirmation'",params)}finally{await db.exec('set role '+role)}
};
