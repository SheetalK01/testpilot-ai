import { expect, test } from '../../fixtures/index.js';
import { expectErrorShape } from '../../helpers/assertions.js';
import { newUser, PASSWORD, uniqueEmail } from '../../helpers/data.js';

test.describe('API · auth', { tag: ['@api', '@regression'] }, () => {
  test('POST /auth/register → 201 with token and user', { tag: '@smoke' }, async ({ api }) => {
    const user = newUser();
    const response = await api.post('/auth/register', user);

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.token.split('.')).toHaveLength(3);
    expect(body.user).toEqual({ id: expect.any(Number), name: user.name, email: user.email });
  });

  test('POST /auth/register with a duplicate email → 409', async ({ api, user }) => {
    const response = await api.post('/auth/register', newUser({ email: user.email.toUpperCase() }));

    expect(response.status()).toBe(409);
    expectErrorShape(await response.json(), 409, '/api/auth/register');
  });

  test('POST /auth/register validates every field → 400 with field errors', async ({ api }) => {
    const response = await api.post('/auth/register', {
      name: 'A',
      email: 'nope',
      password: 'letters',
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expectErrorShape(body, 400, '/api/auth/register');
    expect(body.message).toBe('Validation failed');
    expect(Object.keys(body.errors).sort()).toEqual(['email', 'name', 'password']);
  });

  const boundaries = [
    ['name of 2 characters', { name: 'Al' }, 201],
    ['name of 100 characters', { name: 'n'.repeat(100) }, 201],
    ['name of 101 characters', { name: 'n'.repeat(101) }, 400],
    ['password of 8 characters', { password: 'abcdefg1' }, 201],
    ['password of 7 characters', { password: 'abcdef1' }, 400],
    ['password of 72 characters', { password: 'a1'.repeat(36) }, 201],
    ['password of 73 characters', { password: `${'a1'.repeat(36)}b` }, 400],
    ['password without a digit', { password: 'abcdefgh' }, 400],
    ['password without a letter', { password: '12345678' }, 400],
  ];
  for (const [label, override, status] of boundaries) {
    test(`register boundary: ${label} → ${status}`, async ({ api }) => {
      const response = await api.post(
        '/auth/register',
        newUser({ email: uniqueEmail(), ...override }),
      );
      expect(response.status()).toBe(status);
    });
  }

  test('POST /auth/login → 200 with token; email is case-insensitive', async ({ api, user }) => {
    const response = await api.post('/auth/login', {
      email: user.email.toUpperCase(),
      password: PASSWORD,
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.token).toBeTruthy();
    expect(body.user.email).toBe(user.email);
  });

  test('POST /auth/login with a wrong password or unknown email → 401, same message', async ({
    api,
    user,
  }) => {
    const wrongPassword = await api.post('/auth/login', {
      email: user.email,
      password: 'Wrong12345',
    });
    const unknownEmail = await api.post('/auth/login', {
      email: uniqueEmail(),
      password: PASSWORD,
    });

    expect(wrongPassword.status()).toBe(401);
    expect(unknownEmail.status()).toBe(401);
    expect((await wrongPassword.json()).message).toBe('Invalid email or password');
    expect((await unknownEmail.json()).message).toBe('Invalid email or password');
  });

  test('GET /auth/me returns the current user', async ({ userApi, user }) => {
    const body = await userApi.expectJson(userApi.get('/auth/me'), 200);
    expect(body).toEqual({ id: user.id, name: user.name, email: user.email });
  });

  test('every response carries an X-Request-Id, and a client-supplied one is echoed', async ({
    api,
  }) => {
    const generated = await api.get('/auth/me');
    expect(generated.headers()['x-request-id']).toBeTruthy();

    const echoed = await api.get('/auth/me', { headers: { 'X-Request-Id': 'e2e-trace-42' } });
    expect(echoed.headers()['x-request-id']).toBe('e2e-trace-42');
    expect((await echoed.json()).requestId).toBe('e2e-trace-42');
  });
});
