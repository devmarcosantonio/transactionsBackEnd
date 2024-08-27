import {FastifyInstance} from "fastify";
import { knex } from "../database";
import {z} from "zod"
import crypto from 'node:crypto'
import { checkSessionIdExists } from "../middlewares/check-session-id-exists";


export async function transactionsRoutes (app: FastifyInstance) {

    app.addHook('preHandler', async (request) => {
        // console.log(`passou aqui, método: ${request.method}, path: ${request.url}`)
        // tudo que eu ponho aqui roda: como se fosse um middlaware para todas as rotas

    })

    app.get('/summary', 
    {
        preHandler: [checkSessionIdExists]
    },
    async (request, reply) => {
        const sessionId = request.cookies.sessionId

        const summary = await knex('transactions')
                                .where('session_id', sessionId)
                                .sum('amount', {as: 'amount'})
                                .first()

        return {summary}
    })

    app.get('/', 
    {
        preHandler: [checkSessionIdExists]
    },
    async (request, reply) => {
        
        const sessionId = request.cookies.sessionId

        const transactions = await knex('transactions')
                                    .select()
                                    .where('session_id', sessionId)

        return { transactions }
    })

    app.get('/:id',
        {
            preHandler: [checkSessionIdExists]
        }
        ,
        async (request) => {

            const sessionId = request.cookies.sessionId
            
            const getTransactionParamsSchema = z.object({
                id: z.string().uuid()
            })

            const {id} = getTransactionParamsSchema.parse(request.params)

            const transaction = await knex('transactions').select().where({'id':id, 'session_id': sessionId}).first()

            return {
                transaction
            }
        })

    app.post('/', async (request, reply) => {
        const createTransactionSchema = z.object({
            title: z.string(),
            amount: z.number(),
            type: z.enum(['credit', 'debit', ])
        })
        const {title, amount, type} = createTransactionSchema.parse(request.body);

        let sessionId = request.cookies.sessionId 
    
        if (!sessionId) {
            sessionId = crypto.randomUUID()
            reply.setCookie('sessionId', sessionId, {
                path: '/',
                maxAge: 60 * 60 * 24 * 7, // 7 days
                // expires: new Date('2024-12-06T08:00:00') 
            })
        }
    
        
        const transaction = await knex('transactions').insert({
            id: crypto.randomUUID(),
            title,
            amount: type === 'credit' ? amount : amount * -1,
            session_id: sessionId
            
        })


        

        return reply.status(201).send()

    })
    
}