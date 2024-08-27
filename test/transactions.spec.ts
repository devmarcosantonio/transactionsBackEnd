import { afterAll, beforeAll, expect, test, beforeEach, describe} from "vitest";
import {execSync} from 'node:child_process'
import supertest from "supertest"
import { app } from "../src/app";


describe ('Testes de rotas de transações!', async () => {
    // Antes de todos os testes
    beforeAll( async () => {
        app.ready()
    })

    // Depois de todos os testes
    afterAll( async () => {
        app.close()
    })

    beforeEach(async () => {
        execSync('npm run knex migrate:rollback --all')
        execSync('npm run knex migrate:latest')
    })

    test('O usuário consegue criar uma nova transação.', async () => {
        const response = await supertest(app.server)
            .post('/transactions')
            .send({
                title: 'Transição de teste com testes',
                amount: 3000,
                type: 'credit'
            })

            expect(response.statusCode).toEqual(201)
        })

    test('o usuário deve ser possível listar todas as transações.', async () => {
        const createTransactionResponse = await supertest(app.server)
            .post('/transactions')
            .send({
                title: 'Transição de teste com testes',
                amount: 3000,
                type: 'credit'
            })

        const cookie = createTransactionResponse.get('Set-Cookie')

        let listTransactionResponse = null

        if (cookie) {
            listTransactionResponse = await supertest(app.server)
                .get('/transactions')
                .set('Cookie', cookie)
                .expect(200)
        }

        expect(listTransactionResponse?.body.transactions).toEqual([
           expect.objectContaining({
                title: 'Transição de teste com testes',
                amount: 3000
           })
        ])
    })

    test('deve ser possível buscar transação específica por id.', async () => {
        const createTransactionResponse = await supertest(app.server)
        .post('/transactions')
        .send({
            title: 'Transição de teste com testes',
            amount: 3000,
            type: 'credit'
        })

        const cookie = createTransactionResponse.get('Set-Cookie')

        let listTransactionResponse = null

        if (cookie) {
            listTransactionResponse = await supertest(app.server)
                .get('/transactions/')
                .set('Cookie', cookie)

            if(listTransactionResponse) {
                const transaction = listTransactionResponse.body.transactions[0]
                const getTransactionForIdResponse = await supertest(app.server)
                    .get(`/transactions/${transaction.id}`)  
                    .set('Cookie', cookie)
                    .expect(200)   
                
                expect(getTransactionForIdResponse.body.transaction).toEqual(
                    expect.objectContaining(
                        {
                            title: 'Transição de teste com testes',
                            amount: 3000
                        }
                    )
                )}
            }
        })


        test ('Deve ser possível ver o resumo de transações.', async () => {
            const transactionCreated = await supertest(app.server)
                .post('/transactions')
                .send({
                    title: 'Transição de teste com testes',
                    amount: 3000,
                    type: 'credit'
                })

            const cookies = transactionCreated.get('Set-Cookie')

            if (!cookies) throw Error('houve erro aqui')

            await supertest(app.server)
                .post('/transactions')
                .set('Cookie', cookies)
                .send({
                    title: 'Transição de teste com testes 2',
                    amount: 200,
                    type: 'debit'
                })

            const summaryResponse = await supertest(app.server)
                .get('/transactions/summary')
                .set('Cookie', cookies)
                .expect(200)

            expect(summaryResponse.body.summary).toEqual({
                amount: 2800
            })
            
        })
    })

