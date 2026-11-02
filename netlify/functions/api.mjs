import {getUser} from '@netlify/identity';import {getDatabase} from '@netlify/database';import {createHandler} from '../lib/handler.mjs';
export default createHandler({getUser,getPool:()=>getDatabase().pool,readEnv:name=>Netlify.env.get(name)});
