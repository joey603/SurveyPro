const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../server');

describe('Auth API', () => {
  let accessToken;
  let refreshToken;

  beforeAll(async () => {
    await mongoose.connection.dropDatabase();
  });

  it('should register a user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testuser',
        email: 'testuser@example.com',
        password: 'password123',
      });
    expect(res.statusCode).toEqual(201);
    expect(res.body.message).toEqual('Inscription réussie !');
  });

  it('should login a user and receive tokens', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'testuser@example.com',
        password: 'password123',
      });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  it('should refresh the access token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh-token')
      .send({ refreshToken });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('accessToken');
  });

  it('should logout the user', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .send({ refreshToken });
    expect(res.statusCode).toEqual(200);
    expect(res.body.message).toEqual('Déconnexion réussie !');
  });

  it('should deny access to protected route with expired token', async () => {
    // Générer un token avec une durée de vie très courte (1 seconde)
    const shortLivedToken = jwt.sign({ id: "dummyId" }, process.env.JWT_SECRET, { expiresIn: '1s' });

    // Attendre que le token expire
    await new Promise(resolve => setTimeout(resolve, 2000));

    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${shortLivedToken}`);

    expect(res.statusCode).toEqual(401);
    expect(res.body.message).toEqual('Token expiré. Veuillez rafraîchir votre token.');
  });

  it('should deny access to protected route with invalid token', async () => {
    const invalidToken = "thisIsAnInvalidToken";

    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${invalidToken}`);

    expect(res.statusCode).toEqual(401);
    expect(res.body.message).toEqual('Token invalide.');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });
});
